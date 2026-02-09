import { randomUUID } from "crypto";
export class MemStorage {
    bookings;
    customers;
    dogs;
    constructor() {
        this.bookings = new Map();
        this.customers = new Map();
        this.dogs = new Map();
    }
    // Booking operations
    async getBooking(id) {
        return this.bookings.get(id);
    }
    async getBookings() {
        return Array.from(this.bookings.values()).sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
    }
    async createBooking(insertBooking) {
        const id = randomUUID();
        const booking = {
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
    async updateBooking(id, updates) {
        const existing = this.bookings.get(id);
        if (!existing)
            return undefined;
        const updated = { ...existing, ...updates };
        this.bookings.set(id, updated);
        return updated;
    }
    async deleteBooking(id) {
        return this.bookings.delete(id);
    }
    // Customer operations
    async getCustomer(id) {
        return this.customers.get(id);
    }
    async getCustomerByEmail(email) {
        return Array.from(this.customers.values()).find((customer) => customer.email === email);
    }
    async getCustomerByFirebaseUid(firebaseUid) {
        return Array.from(this.customers.values()).find((customer) => customer.firebaseUid === firebaseUid);
    }
    async createCustomer(insertCustomer) {
        const id = randomUUID();
        const customer = {
            ...insertCustomer,
            id,
            firebaseUid: insertCustomer.firebaseUid ?? null,
            isFirstTime: insertCustomer.isFirstTime !== undefined ? insertCustomer.isFirstTime : true,
            createdAt: new Date(),
        };
        this.customers.set(id, customer);
        return customer;
    }
    async updateCustomer(id, updates) {
        const existing = this.customers.get(id);
        if (!existing)
            return undefined;
        const updated = { ...existing, ...updates };
        this.customers.set(id, updated);
        return updated;
    }
    // Dog operations
    async getDog(id) {
        return this.dogs.get(id);
    }
    async getDogsByCustomer(customerId) {
        return Array.from(this.dogs.values()).filter((dog) => dog.customerId === customerId).sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime());
    }
    async createDog(insertDog) {
        const id = randomUUID();
        const dog = {
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
    async updateDog(id, updates) {
        const existing = this.dogs.get(id);
        if (!existing)
            return undefined;
        const updated = { ...existing, ...updates };
        this.dogs.set(id, updated);
        return updated;
    }
    async deleteDog(id) {
        return this.dogs.delete(id);
    }
}
// Use PostgreSQL storage instead of in-memory storage
import { storage as pgStorage } from "./storage-pg";
export const storage = pgStorage;
