import { type InsertBooking, type InsertCustomer } from "@shared/schema";
import { type Booking, type Customer, type Dog, type InsertDog } from "./types/storage";
import { randomUUID } from "crypto";
import { db } from "./db/client";
import { bookings, users, dogs, settings } from "./db/schema";
import { eq, desc } from "drizzle-orm";
import type { IStorage } from "./storage";
import { ensureTenant } from "./services/userService";

export class PostgresStorage implements IStorage {
  // Booking operations
  async getBooking(id: string): Promise<Booking | undefined> {
    const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
    return result[0] ? this.mapDbBookingToBooking(result[0]) : undefined;
  }

  async getBookings(): Promise<Booking[]> {
    const result = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
    return result.map(b => this.mapDbBookingToBooking(b));
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    
    // Map legacy date fields to start_date/end_date for capacity tracking
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    if (insertBooking.serviceType.startsWith('boarding') && insertBooking.checkinDate) {
      startDate = new Date(insertBooking.checkinDate + 'T00:00:00');
      endDate = insertBooking.checkoutDate ? new Date(insertBooking.checkoutDate + 'T00:00:00') : startDate;
    } else if (insertBooking.serviceType === 'daycare' && insertBooking.serviceDate) {
      startDate = new Date(insertBooking.serviceDate + 'T00:00:00');
      endDate = startDate;
    } else if (insertBooking.serviceType === 'trial' && insertBooking.trialDate) {
      startDate = new Date(insertBooking.trialDate + 'T00:00:00');
      endDate = startDate;
    }
    
    const tenantId = await ensureTenant();
    const booking = {
      tenantId,
      id,
      customerId: insertBooking.customerId || randomUUID(),
      dogId: insertBooking.dogId || null,
      userId: null,
      serviceType: insertBooking.serviceType,
      startDate,
      endDate,
      dogName: insertBooking.dogName,
      breed: insertBooking.breed,
      age: insertBooking.age,
      weight: insertBooking.weight || null,
      ownerName: insertBooking.ownerName,
      email: insertBooking.email,
      phone: insertBooking.phone,
      serviceDate: insertBooking.serviceDate || null,
      checkinDate: insertBooking.checkinDate || null,
      checkoutDate: insertBooking.checkoutDate || null,
      trialDate: insertBooking.trialDate || null,
      dropoffTime: insertBooking.dropoffTime || null,
      pickupTime: insertBooking.pickupTime || null,
      checkinTime: insertBooking.checkinTime || null,
      checkoutTime: insertBooking.checkoutTime || null,
      alternativeDate: insertBooking.alternativeDate || null,
      emergencyName: insertBooking.emergencyName || null,
      emergencyPhone: insertBooking.emergencyPhone || null,
      vaccinationDate: insertBooking.vaccinationDate || null,
      vaccinationType: insertBooking.vaccinationType || null,
      vaccinationRecordUrl: insertBooking.vaccinationRecordUrl || null,
      status: insertBooking.status || "pending",
      paymentStatus: insertBooking.paymentStatus || "unpaid",
      paymentIntentId: insertBooking.paymentIntentId || null,
      stripeSessionId: null,
      amount: insertBooking.amount || null,
      currency: insertBooking.currency || "eur",
      trialCompleted: insertBooking.trialCompleted || false,
      notes: insertBooking.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.insert(bookings).values(booking);
    return this.mapDbBookingToBooking(booking);
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | undefined> {
    const dbUpdates: any = {
      ...updates,
      updatedAt: new Date()
    };

    await db.update(bookings).set(dbUpdates).where(eq(bookings.id, id));
    return this.getBooking(id);
  }

  async deleteBooking(id: string): Promise<boolean> {
    await db.delete(bookings).where(eq(bookings.id, id));
    return true;
  }

  // Customer operations
  async getCustomer(id: string): Promise<Customer | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ? this.mapDbUserToCustomer(result[0]) : undefined;
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] ? this.mapDbUserToCustomer(result[0]) : undefined;
  }

  async getCustomerByFirebaseUid(firebaseUid: string): Promise<Customer | undefined> {
    const result = await db.select().from(users).where(eq(users.id, firebaseUid)).limit(1);
    return result[0] ? this.mapDbUserToCustomer(result[0]) : undefined;
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const tenantId = await ensureTenant();
    const customer = {
      tenantId,
      id,
      email: insertCustomer.email,
      name: insertCustomer.name,
      phone: insertCustomer.phone,
      role: 'user',
      completedTrial: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.insert(users).values(customer);
    return this.mapDbUserToCustomer(customer);
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const { id: _id, createdAt: _createdAt, ...allowedUpdates } = updates;
    await db.update(users).set({ ...allowedUpdates, updatedAt: new Date() }).where(eq(users.id, id));
    return this.getCustomer(id);
  }

  // Dog operations (stub - not needed for bookings)
  async getDog(id: string): Promise<Dog | undefined> {
    return undefined;
  }

  async getDogsByCustomer(customerId: string): Promise<Dog[]> {
    return [];
  }

  async createDog(dog: InsertDog): Promise<Dog> {
    throw new Error("Not implemented");
  }

  async updateDog(id: string, dog: Partial<Dog>): Promise<Dog | undefined> {
    throw new Error("Not implemented");
  }

  async deleteDog(id: string): Promise<boolean> {
    throw new Error("Not implemented");
  }

  // Settings operations
  async getSettings(): Promise<any> {
    const result = await db.select().from(settings).limit(1);
    if (result.length > 0) {
      return result[0];
    }
    // Return default values if no settings exist (Drizzle will map field names automatically)
    return {
      id: 1,
      prohibitedBreeds: [],
      revenueOffsets: { all: 0, byDay: {} },
    };
  }

  // Mapping functions
  private mapDbBookingToBooking(dbBooking: any): Booking {
    return {
      id: dbBooking.id,
      customerId: dbBooking.customerId,
      dogId: dbBooking.dogId,
      dogName: dbBooking.dogName,
      breed: dbBooking.breed,
      age: dbBooking.age,
      weight: dbBooking.weight,
      ownerName: dbBooking.ownerName,
      email: dbBooking.email,
      phone: dbBooking.phone,
      serviceType: dbBooking.serviceType,
      serviceDate: dbBooking.serviceDate,
      checkinDate: dbBooking.checkinDate,
      checkoutDate: dbBooking.checkoutDate,
      trialDate: dbBooking.trialDate,
      dropoffTime: dbBooking.dropoffTime,
      pickupTime: dbBooking.pickupTime,
      checkinTime: dbBooking.checkinTime,
      checkoutTime: dbBooking.checkoutTime,
      alternativeDate: dbBooking.alternativeDate,
      emergencyName: dbBooking.emergencyName,
      emergencyPhone: dbBooking.emergencyPhone,
      vaccinationDate: dbBooking.vaccinationDate,
      vaccinationType: dbBooking.vaccinationType,
      vaccinationRecordUrl: dbBooking.vaccinationRecordUrl,
      status: dbBooking.status,
      paymentStatus: dbBooking.paymentStatus,
      paymentIntentId: dbBooking.paymentIntentId,
      amount: dbBooking.amount,
      currency: dbBooking.currency,
      trialCompleted: dbBooking.trialCompleted,
      notes: dbBooking.notes,
      createdAt: dbBooking.createdAt,
    };
  }

  private mapDbUserToCustomer(dbUser: any): Customer {
    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      phone: dbUser.phone,
      firebaseUid: dbUser.id,
      isFirstTime: !dbUser.completedTrial,
      createdAt: dbUser.createdAt,
    };
  }
}

export const storage = new PostgresStorage();
