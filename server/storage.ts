import { type InsertBooking, type InsertCustomer } from "@shared/schema";
import { type Booking, type Customer, type Dog, type InsertDog } from "./types/storage";
import { randomUUID } from "crypto";

export interface IStorage {
  // Booking operations
  getBooking(id: string): Promise<Booking | undefined>;
  getBookings(): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBooking(id: string, booking: Partial<Booking>): Promise<Booking | undefined>;
  deleteBooking(id: string): Promise<boolean>;
  
  // Customer operations
  getCustomer(id: string): Promise<Customer | undefined>;
  getCustomerByEmail(email: string): Promise<Customer | undefined>;
  getCustomerByFirebaseUid(firebaseUid: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<Customer>): Promise<Customer | undefined>;
  
  // Dog operations
  getDog(id: string): Promise<Dog | undefined>;
  getDogsByCustomer(customerId: string): Promise<Dog[]>;
  createDog(dog: InsertDog): Promise<Dog>;
  updateDog(id: string, dog: Partial<Dog>): Promise<Dog | undefined>;
  deleteDog(id: string): Promise<boolean>;
  
  // Settings operations
  getSettings(): Promise<any>;
}

export class MemStorage implements IStorage {
  private bookings: Map<string, Booking>;
  private customers: Map<string, Customer>;
  private dogs: Map<string, Dog>;

  constructor() {
    this.bookings = new Map();
    this.customers = new Map();
    this.dogs = new Map();
  }

  // Booking operations
  async getBooking(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values()).sort((a, b) => 
      new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    );
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const booking: Booking = {
      ...insertBooking,
      id,
      customerId: insertBooking.customerId || randomUUID(),
      dogId: insertBooking.dogId ?? null,
      status: insertBooking.status || "pending",
      weight: insertBooking.weight ?? null,
      serviceDate: insertBooking.serviceDate ?? null,
      checkinDate: insertBooking.checkinDate ?? null,
      checkoutDate: insertBooking.checkoutDate ?? null,
      dropoffTime: insertBooking.dropoffTime ?? null,
      pickupTime: insertBooking.pickupTime ?? null,
      checkinTime: insertBooking.checkinTime ?? null,
      checkoutTime: insertBooking.checkoutTime ?? null,
      trialDate: insertBooking.trialDate ?? null,
      alternativeDate: insertBooking.alternativeDate ?? null,
      notes: insertBooking.notes ?? null,
      emergencyName: insertBooking.emergencyName ?? null,
      emergencyPhone: insertBooking.emergencyPhone ?? null,
      vaccinationDate: insertBooking.vaccinationDate,
      vaccinationType: insertBooking.vaccinationType,
      vaccinationRecordUrl: insertBooking.vaccinationRecordUrl || null,
      trialCompleted: insertBooking.trialCompleted ?? false,
      createdAt: new Date(),
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async updateBooking(id: string, updates: Partial<Booking>): Promise<Booking | undefined> {
    const existing = this.bookings.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.bookings.set(id, updated);
    return updated;
  }

  async deleteBooking(id: string): Promise<boolean> {
    return this.bookings.delete(id);
  }

  // Customer operations
  async getCustomer(id: string): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async getCustomerByEmail(email: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(
      (customer) => customer.email === email,
    );
  }

  async getCustomerByFirebaseUid(firebaseUid: string): Promise<Customer | undefined> {
    return Array.from(this.customers.values()).find(
      (customer) => customer.firebaseUid === firebaseUid,
    );
  }

  async createCustomer(insertCustomer: InsertCustomer): Promise<Customer> {
    const id = randomUUID();
    const customer: Customer = {
      ...insertCustomer,
      id,
      firebaseUid: insertCustomer.firebaseUid ?? null,
      isFirstTime: insertCustomer.isFirstTime !== undefined ? insertCustomer.isFirstTime : true,
      createdAt: new Date(),
    };
    this.customers.set(id, customer);
    return customer;
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer | undefined> {
    const existing = this.customers.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.customers.set(id, updated);
    return updated;
  }

  // Dog operations
  async getDog(id: string): Promise<Dog | undefined> {
    return this.dogs.get(id);
  }

  async getDogsByCustomer(customerId: string): Promise<Dog[]> {
    return Array.from(this.dogs.values()).filter(
      (dog) => dog.customerId === customerId,
    ).sort((a, b) => 
      new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime()
    );
  }

  async createDog(insertDog: InsertDog): Promise<Dog> {
    const id = randomUUID();
    const dog: Dog = {
      ...insertDog,
      id,
      photoUrl: insertDog.photoUrl || null,
      temperamentNotes: insertDog.temperamentNotes || null,
      vaccinationRecordUrl: insertDog.vaccinationRecordUrl || null,
      createdAt: new Date(),
    };
    this.dogs.set(id, dog);
    return dog;
  }

  async updateDog(id: string, updates: Partial<Dog>): Promise<Dog | undefined> {
    const existing = this.dogs.get(id);
    if (!existing) return undefined;

    const updated = { ...existing, ...updates };
    this.dogs.set(id, updated);
    return updated;
  }

  async deleteDog(id: string): Promise<boolean> {
    return this.dogs.delete(id);
  }

  // Settings operations
  async getSettings(): Promise<any> {
    return {
      id: 1,
      prohibitedBreeds: [],
      revenueOffsets: { global: 0 },
    };
  }
}

// Use PostgreSQL storage instead of in-memory storage
import { storage as pgStorage } from "./storage-pg";
export const storage = pgStorage;
