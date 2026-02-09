import { db } from '../db/client';
import { bookings, reminders, dogs, users, settings as tblSettings } from '../db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { getUncachableResendClient } from './resendClient';
import { generateBookingReminderEmail } from './emailTemplates';
import { randomUUID } from 'crypto';

export interface ReminderSettings {
  daysBefore: number;
  enabled: boolean;
}

export async function getReminderSettings(): Promise<ReminderSettings> {
  const settings = await db.query.settings.findFirst({ where: eq(tblSettings.id, 1) });
  const reminderSettings = (settings?.reminderSettings as any) || {};
  
  return {
    daysBefore: reminderSettings.days_before || 1,
    enabled: reminderSettings.enabled !== false
  };
}

export async function updateReminderSettings(settings: ReminderSettings): Promise<void> {
  await db
    .update(tblSettings)
    .set({
      reminderSettings: {
        days_before: settings.daysBefore,
        enabled: settings.enabled
      }
    })
    .where(eq(tblSettings.id, 1));
}

export async function sendBookingReminder(bookingId: string): Promise<boolean> {
  try {
    const booking = await db.query.bookings.findFirst({
      where: eq(bookings.id, bookingId)
    });

    if (!booking) {
      console.error(`Booking ${bookingId} not found`);
      return false;
    }

    if (booking.status === 'cancelled' || booking.status === 'completed') {
      console.log(`Skipping reminder for ${bookingId} - status: ${booking.status}`);
      return false;
    }

    const dog = await db.query.dogs.findFirst({
      where: eq(dogs.id, booking.dogId)
    });

    const owner = await db.query.users.findFirst({
      where: eq(users.id, booking.userId)
    });

    if (!dog || !owner || !owner.email) {
      console.error(`Missing dog or owner info for booking ${bookingId}`);
      return false;
    }

    const alreadySent = await db.query.reminders.findFirst({
      where: and(
        eq(reminders.bookingId, bookingId),
        eq(reminders.reminderType, 'day_before'),
        eq(reminders.status, 'sent')
      )
    });

    if (alreadySent) {
      console.log(`Reminder already sent for booking ${bookingId}`);
      return false;
    }

    const { client, fromEmail } = await getUncachableResendClient();
    
    const emailContent = generateBookingReminderEmail({
      ownerName: owner.name || 'Dog Owner',
      dogName: dog.name,
      serviceType: booking.serviceType,
      startDate: booking.startDate,
      endDate: booking.endDate,
      bookingId: booking.id,
      notes: booking.notes || undefined
    });

    const result = await client.emails.send({
      from: fromEmail,
      to: owner.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });

    if (result.error) {
      console.error(`Failed to send reminder for booking ${bookingId}:`, result.error);
      
      await db.insert(reminders).values({
        id: randomUUID(),
        bookingId: booking.id,
        reminderType: 'day_before',
        sentAt: new Date(),
        recipientEmail: owner.email,
        status: 'failed'
      });
      
      return false;
    }

    await db.insert(reminders).values({
      id: randomUUID(),
      bookingId: booking.id,
      reminderType: 'day_before',
      sentAt: new Date(),
      recipientEmail: owner.email,
      status: 'sent'
    });

    console.log(`Reminder sent for booking ${bookingId} to ${owner.email}`);
    return true;
  } catch (error) {
    console.error(`Failed to send reminder for booking ${bookingId}:`, error);
    
    try {
      await db.insert(reminders).values({
        id: randomUUID(),
        bookingId,
        reminderType: 'day_before',
        sentAt: new Date(),
        recipientEmail: 'error@unknown.com',
        status: 'failed'
      });
    } catch (dbError) {
      console.error('Failed to log reminder failure:', dbError);
    }
    
    return false;
  }
}

export async function checkAndSendReminders(): Promise<{ sent: number; failed: number; skipped: number }> {
  try {
    const settings = await getReminderSettings();
    
    if (!settings.enabled) {
      console.log('Reminders are disabled');
      return { sent: 0, failed: 0, skipped: 0 };
    }

    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + settings.daysBefore);
    
    const startOfTargetDay = new Date(targetDate);
    startOfTargetDay.setHours(0, 0, 0, 0);
    
    const endOfTargetDay = new Date(targetDate);
    endOfTargetDay.setHours(23, 59, 59, 999);

    const upcomingBookings = await db
      .select()
      .from(bookings)
      .where(
        and(
          gte(bookings.startDate, startOfTargetDay),
          lte(bookings.startDate, endOfTargetDay),
          sql`${bookings.status} IN ('pending', 'confirmed', 'paid')`
        )
      );

    console.log(`Found ${upcomingBookings.length} bookings for ${targetDate.toDateString()}`);

    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const booking of upcomingBookings) {
      const success = await sendBookingReminder(booking.id);
      if (success) {
        sent++;
      } else {
        const alreadySent = await db.query.reminders.findFirst({
          where: and(
            eq(reminders.bookingId, booking.id),
            eq(reminders.reminderType, 'day_before'),
            eq(reminders.status, 'sent')
          )
        });
        
        if (alreadySent) {
          skipped++;
        } else {
          failed++;
        }
      }
    }

    console.log(`Reminder check complete: ${sent} sent, ${failed} failed, ${skipped} skipped`);
    return { sent, failed, skipped };
  } catch (error) {
    console.error('Error in checkAndSendReminders:', error);
    throw error;
  }
}
