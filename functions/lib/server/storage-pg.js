import { randomUUID } from "crypto";
import { db } from "./db/client";
import { bookings, users } from "./db/schema";
import { eq, desc } from "drizzle-orm";
export class PostgresStorage {
    // Booking operations
    async getBooking(id) {
        const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);
        return result[0] ? this.mapDbBookingToBooking(result[0]) : undefined;
    }
    async getBookings() {
        const result = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
        return result.map(b => this.mapDbBookingToBooking(b));
    }
    async createBooking(insertBooking) {
        const id = randomUUID();
        const booking = {
            id,
            customerId: insertBooking.customerId || randomUUID(),
            dogId: insertBooking.dogId || null,
            userId: null,
            serviceType: insertBooking.serviceType,
            startDate: null,
            endDate: null,
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
    async updateBooking(id, updates) {
        const dbUpdates = {
            ...updates,
            updatedAt: new Date()
        };
        await db.update(bookings).set(dbUpdates).where(eq(bookings.id, id));
        return this.getBooking(id);
    }
    async deleteBooking(id) {
        await db.delete(bookings).where(eq(bookings.id, id));
        return true;
    }
    // Customer operations
    async getCustomer(id) {
        const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
        return result[0] ? this.mapDbUserToCustomer(result[0]) : undefined;
    }
    async getCustomerByEmail(email) {
        const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
        return result[0] ? this.mapDbUserToCustomer(result[0]) : undefined;
    }
    async getCustomerByFirebaseUid(firebaseUid) {
        const result = await db.select().from(users).where(eq(users.id, firebaseUid)).limit(1);
        return result[0] ? this.mapDbUserToCustomer(result[0]) : undefined;
    }
    async createCustomer(insertCustomer) {
        const id = randomUUID();
        const customer = {
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
    async updateCustomer(id, updates) {
        const { id: _id, createdAt: _createdAt, ...allowedUpdates } = updates;
        await db.update(users).set({ ...allowedUpdates, updatedAt: new Date() }).where(eq(users.id, id));
        return this.getCustomer(id);
    }
    // Dog operations (stub - not needed for bookings)
    async getDog(id) {
        return undefined;
    }
    async getDogsByCustomer(customerId) {
        return [];
    }
    async createDog(dog) {
        throw new Error("Not implemented");
    }
    async updateDog(id, dog) {
        throw new Error("Not implemented");
    }
    async deleteDog(id) {
        throw new Error("Not implemented");
    }
    // Mapping functions
    mapDbBookingToBooking(dbBooking) {
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
    mapDbUserToCustomer(dbUser) {
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
