import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { 
  checkAndSendReminders, 
  getReminderSettings, 
  updateReminderSettings,
  sendBookingReminder 
} from '../lib/reminderService';
import { db } from '../db/client';
import { reminders } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

export const remindersRouter = Router();

remindersRouter.post('/api/reminders/check', requireAdmin, async (req: any, res) => {
  try {
    const result = await checkAndSendReminders();
    res.json({ 
      success: true, 
      ...result,
      message: `Sent ${result.sent} reminders, ${result.failed} failed, ${result.skipped} skipped`
    });
  } catch (error: any) {
    console.error('Error checking reminders:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to check reminders' 
    });
  }
});

remindersRouter.post('/api/reminders/send/:bookingId', requireAdmin, async (req: any, res) => {
  try {
    const { bookingId } = req.params;
    const success = await sendBookingReminder(bookingId);
    
    if (success) {
      res.json({ success: true, message: 'Reminder sent successfully' });
    } else {
      res.status(400).json({ success: false, error: 'Failed to send reminder' });
    }
  } catch (error: any) {
    console.error('Error sending reminder:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to send reminder' 
    });
  }
});

remindersRouter.get('/api/reminders/settings', requireAdmin, async (req: any, res) => {
  try {
    const settings = await getReminderSettings();
    res.json(settings);
  } catch (error: any) {
    console.error('Error getting reminder settings:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get reminder settings' 
    });
  }
});

remindersRouter.put('/api/reminders/settings', requireAdmin, async (req: any, res) => {
  try {
    const { daysBefore, enabled } = req.body;
    
    if (typeof daysBefore !== 'number' || daysBefore < 0 || daysBefore > 7) {
      return res.status(400).json({ error: 'daysBefore must be between 0 and 7' });
    }
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }
    
    await updateReminderSettings({ daysBefore, enabled });
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error: any) {
    console.error('Error updating reminder settings:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to update reminder settings' 
    });
  }
});

remindersRouter.get('/api/reminders/history', requireAdmin, async (req: any, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await db
      .select()
      .from(reminders)
      .orderBy(desc(reminders.sentAt))
      .limit(limit);
    
    res.json(history);
  } catch (error: any) {
    console.error('Error getting reminder history:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to get reminder history' 
    });
  }
});

export default remindersRouter;
