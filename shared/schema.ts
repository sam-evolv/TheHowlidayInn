import { z } from "zod";

// NOTE: Database table definitions are in server/db/schema.ts
// This file contains only API payload schemas and validation types to prevent conflicts

// Restricted dog breeds
export const restrictedBreeds = [
  "Pit Bull",
  "American Pit Bull Terrier", 
  "Staffordshire Terrier",
  "American Staffordshire Terrier",
  "Bull Terrier",
  "Rottweiler",
  "Doberman Pinscher",
  "German Shepherd", 
  "Akita",
  "Chow Chow",
  "Wolf Hybrid",
  "Mastiff",
  "Presa Canario",
  "Cane Corso"
];

// Legacy booking schema for existing booking system  
export const insertBookingSchema = z.object({
  customerId: z.string().optional(),
  dogId: z.string().optional(),
  dogName: z.string().min(1, "Dog name is required"),
  breed: z.string().min(1, "Breed is required").refine((breed) => !restrictedBreeds.includes(breed), {
    message: "We're sorry, but we cannot accommodate this breed at our facility. We'd be happy to recommend other excellent care providers in the area."
  }),
  age: z.string().min(1, "Age is required"),
  weight: z.number().positive().optional(),
  ownerName: z.string().min(1, "Owner name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().min(1, "Phone number is required"),
  serviceType: z.enum(["daycare", "boarding", "boarding:small", "boarding:large", "trial"]),
  serviceDate: z.string().optional(),
  checkinDate: z.string().optional(),
  checkoutDate: z.string().optional(),
  dropoffTime: z.string().optional(),
  pickupTime: z.string().optional(),
  checkinTime: z.string().optional(),
  checkoutTime: z.string().optional(),
  timeSlot: z.string().optional(), // Daycare time slot (e.g., "08:00 - 10:00")
  checkinTimeSlot: z.string().optional(), // Boarding check-in time slot
  checkoutTimeSlot: z.string().optional(), // Boarding check-out time slot
  pickupWindow: z.enum(["AM", "PM"]).optional(), // Boarding pickup window (AM or PM)
  trialDate: z.string().optional(),
  alternativeDate: z.string().optional(),
  notes: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  vaccinationDate: z.string().optional().refine((date) => {
    if (!date) return true;
    const vacDate = new Date(date);
    const today = new Date();
    return vacDate <= today;
  }, {
    message: "Vaccination date cannot be in the future"
  }),
  vaccinationType: z.string().optional(),
  vaccinationRecordUrl: z.string().optional(),
  trialCompleted: z.boolean().default(false),
  status: z.string().default("pending"),
  paymentStatus: z.string().default("unpaid"),
  paymentIntentId: z.string().optional(),
  amount: z.number().optional(),
  currency: z.string().default("eur"),
});

export const insertCustomerSchema = z.object({
  email: z.string().email("Valid email required"),
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone number is required"),
  firebaseUid: z.string().optional(),
  isFirstTime: z.boolean().default(true),
});

// Capacity and Reservations
export type CapacityKey = {
  service: "Daycare" | "Boarding Small" | "Boarding Large" | "Trial Day";
  date: string; // YYYY-MM-DD
  slot?: string | null; // e.g. "09:00-12:00" for Trial Day, null for all-day services
};

export type Availability = CapacityKey & {
  id: string;
  capacity: number;
  reserved: number;
  confirmed: number;
  createdAt: string;
  updatedAt: string;
};

export type Reservation = {
  id: string;
  service: string;
  date: string;
  slot?: string | null;
  userEmail: string;
  dogId?: string | null;
  status: "active" | "committed" | "released" | "expired";
  pendingPaymentIntentId?: string | null;
  expiresAt: string;
  idempotencyKey?: string | null;
  createdAt: string;
  updatedAt: string;
};

export const createReservationSchema = z.object({
  service: z.enum(["Daycare", "Boarding", "Boarding Small", "Boarding Large", "Trial Day"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format"),
  slot: z.string().optional().nullable(),
  userEmail: z.string().email("Valid email required"),
  dogId: z.string().optional().nullable(),
  idempotencyKey: z.string().min(1, "Idempotency key required"),
});

export const createPaymentIntentSchema = z.object({
  amountCents: z.number().positive("Amount must be positive"),
  currency: z.string().default("eur"),
  bookingId: z.string().optional(),
  reservationId: z.string().optional(),
});

export type CreateReservationInput = z.infer<typeof createReservationSchema>;
export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;

// Capacity Management
export type CapacityDefault = {
  service: "Daycare" | "Boarding Small" | "Boarding Large" | "Trial Day";
  capacity: number;
  updatedAt: string;
};

export type CapacityOverride = {
  id: string;
  service: "Daycare" | "Boarding Small" | "Boarding Large" | "Trial Day";
  dateStart: string; // YYYY-MM-DD
  dateEnd: string; // YYYY-MM-DD
  slot?: string | null;
  capacity: number;
  createdAt: string;
  updatedAt: string;
};

export const upsertCapacitySchema = z.object({
  service: z.enum(["Daycare", "Boarding Small", "Boarding Large", "Trial Day"]),
  mode: z.enum(["single", "range", "reset"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // For single date mode
  dateStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // For range mode
  dateEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // For range mode
  slot: z.string().optional().nullable(), // Optional for Trial Day
  capacity: z.number().positive().optional(), // Not required for reset mode
});

export type UpsertCapacityInput = z.infer<typeof upsertCapacitySchema>;

// New dog profile system API payload schemas (matches flattened database structure)
export const dogWizardInsertSchema = z.object({
  name: z.string().min(1, "Dog name is required"),
  breed: z.string().min(1, "Breed is required"),
  sex: z.string().optional(),
  ageYears: z.string().optional(),
  weightKg: z.string().optional(), 
  photoUrl: z.string().optional(),
  vaccinationProofUrl: z.string().optional(), // Single consolidated vaccination certificate
  vaxTypes: z.string().optional(), // e.g., "DHPP, Kennel Cough, Rabies"
  vaxDate: z.string().optional(), // Latest vaccination date
  vaxExpiry: z.string().optional(), // Next expiry date
  temperament: z.string().optional(), // Behavioral notes
});

// Schema for dog creation - matches actual database fields and form inputs
export const dogAboutInsertSchema = z.object({
  name: z.string().min(1, "Dog name is required"),
  breed: z.string().min(1, "Breed is required"),
  sex: z.enum(["Female", "Male"]).optional(),
  dob: z.string().optional(),
  weightKg: z.coerce.number().positive().optional().or(z.literal("").transform(() => undefined)),
  neuteredSpayed: z.boolean().optional(),
  color: z.string().optional(),
  microchip: z.string().optional(),
  photoUrl: z.string().optional(),
});

export const vaccinationUpsertSchema = z.object({
  type: z.enum(["dhpp", "kennel_cough", "leptospirosis", "rabies"]),
  dateAdministered: z.string().optional(),
  validUntil: z.string().optional(),
  proofUrl: z.string().optional(),
});

export const healthProfileUpsertSchema = z.object({
  behaviourNotes: z.string().optional(),
  biteHistory: z.boolean().optional(),
  conditions: z.string().optional(),
  medications: z.string().optional(),
  allergies: z.string().optional(),
  vetName: z.string().optional(),
  vetPhone: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyPhone: z.string().optional(),
  feedingBrand: z.string().optional(),
  feedingSchedule: z.string().optional(),
  medicationName: z.string().optional(),
  medicationDosage: z.string().optional(),
  medicationNotes: z.string().optional(),
  pickupContact: z.string().optional(),
  mediaPermission: z.enum(["Yes", "No"]).optional(),
  // Frontend consent fields that don't map to database
  accuracyConfirmation: z.boolean().optional(),
  emergencyTreatmentConsent: z.boolean().optional(),
});

// Export types for API payload schemas
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type DogWizardInsert = z.infer<typeof dogWizardInsertSchema>;
export type DogAboutInsert = z.infer<typeof dogAboutInsertSchema>;
export type VaccinationUpsert = z.infer<typeof vaccinationUpsertSchema>;
export type HealthProfileUpsert = z.infer<typeof healthProfileUpsertSchema>;

// NOTE: Database table definitions are in server/db/schema.ts
// This file contains only API payload schemas and validation types to prevent conflicts

// Re-export database tables for Drizzle Kit to pick up
export * from "../server/db/schema";
