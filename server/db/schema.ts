// TODO HowlidayInn: Drizzle schema defines all tables (users/dogs/vaccinations/health/settings)
import { pgTable, text, varchar, timestamp, boolean, json, index, uniqueIndex, integer, real, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  vertical: varchar("vertical", { length: 50 }).notNull(),
  timezone: varchar("timezone", { length: 50 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  status: varchar("status", { length: 20 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const users = pgTable("users", {
  tenantId: uuid("tenant_id").notNull(), // FK → tenants.id
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 160 }),
  phone: varchar("phone", { length: 40 }),
  role: varchar("role", { length: 16 }).notNull().default("user"),
  passwordHash: text("password_hash"), // For admin password-based auth
  completedTrial: boolean("completed_trial").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const dogs = pgTable("dogs", {
  tenantId: uuid("tenant_id").notNull(),
  id: varchar("id", { length: 36 }).primaryKey(),
  ownerId: varchar("owner_id", { length: 36 }).notNull(), // FK → users.id
  name: varchar("name", { length: 120 }).notNull(),
  breed: varchar("breed", { length: 120 }),
  sex: varchar("sex", { length: 32 }),
  dob: varchar("dob", { length: 20 }), // Date of birth
  weightKg: real("weight_kg"), // Weight in kg
  neuteredSpayed: boolean("neutered_spayed"),
  color: varchar("color", { length: 60 }),
  microchip: varchar("microchip", { length: 60 }),
  photoUrl: text("photo_url"),
  // Vaccination proof - single consolidated certificate per pet
  vaccinationProofUrl: text("vaccination_proof_url"),
  vaccinationNotes: text("vaccination_notes"), // Optional notes about vaccinations
  // Flattened vaccination fields for fast UI access
  vaxTypes: text("vax_types"), // e.g., "DHPP, Kennel Cough, Rabies"
  vaxDate: varchar("vax_date", { length: 20 }), // Latest vaccination date
  vaxExpiry: varchar("vax_expiry", { length: 20 }), // Next expiry date
  temperament: text("temperament"), // Behavioral notes
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending, approved, rejected
  disallowedReason: text("disallowed_reason"),
  nextExpiry: timestamp("next_expiry", { withTimezone: true }),
  // Trial Day gating fields
  trialRequired: boolean("trial_required").notNull().default(true),
  trialCompletedAt: timestamp("trial_completed_at", { withTimezone: true }),
  trialCompletedByUserId: varchar("trial_completed_by_user_id", { length: 36 }),
  trialNote: text("trial_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  userIdx: index("dogs_user_idx").on(t.ownerId),
  statusIdx: index("dogs_status_idx").on(t.status),
  nextExpiryIdx: index("dogs_nextexpiry_idx").on(t.nextExpiry),
  trialIdx: index("dogs_trial_idx").on(t.ownerId, t.trialRequired)
}));

export const vaccinations = pgTable("vaccinations", {
  tenantId: uuid("tenant_id").notNull(),
  id: varchar("id", { length: 36 }).primaryKey(),
  dogId: varchar("dog_id", { length: 36 }).notNull(),
  type: varchar("type", { length: 40 }).notNull(), // dhpp | kennel_cough | leptospirosis
  dateAdministered: timestamp("date_administered", { withTimezone: true }),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  proofUrl: text("proof_url"),
  verified: boolean("verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  dogTypeIdx: index("vacc_dog_type_idx").on(t.dogId, t.type)
}));

export const healthProfiles = pgTable("health_profiles", {
  tenantId: uuid("tenant_id").notNull(),
  dogId: varchar("dog_id", { length: 36 }).primaryKey(),
  behaviourNotes: text("behaviour_notes"),
  biteHistory: boolean("bite_history"),
  conditions: text("conditions"),
  medications: text("medications"),
  allergies: text("allergies"),
  vetName: varchar("vet_name", { length: 160 }),
  vetPhone: varchar("vet_phone", { length: 40 }),
  emergencyName: varchar("emergency_name", { length: 160 }),
  emergencyPhone: varchar("emergency_phone", { length: 40 }),
  insuranceProvider: varchar("insurance_provider", { length: 160 }),
  policyNumber: varchar("policy_number", { length: 80 }),
  feedingBrand: varchar("feeding_brand", { length: 160 }),
  feedingSchedule: text("feeding_schedule"),
  medicationName: varchar("medication_name", { length: 160 }),
  medicationDosage: text("medication_dosage"),
  medicationNotes: text("medication_notes"),
  pickupContact: varchar("pickup_contact", { length: 200 }),
  mediaPermission: varchar("media_permission", { length: 8 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const settings = pgTable("settings", {
  tenantId: uuid("tenant_id").notNull(),
  id: integer("id").primaryKey().default(1),
  requiredVaccines: json("required_vaccines").notNull(),
  prohibitedBreeds: json("prohibited_breeds").notNull(),
  leadTimeHours: integer("lead_time_hours").notNull().default(12),
  pricing: json("pricing"),
  capacity: json("capacity"),
  policies: json("policies"),
  contact: json("contact"),
  hours: json("hours"),
  faqs: json("faqs"),
  breedPolicy: json("breed_policy"),
  trialRules: json("trial_rules"),
  reminderSettings: json("reminder_settings"),
  revenueOffsets: json("revenue_offsets"),
  featureFlags: json("feature_flags"),
  blackoutDates: json("blackout_dates"),
  openingHours: json("opening_hours"),
  bookingRules: json("booking_rules"),
  services: json("services"),
  branding: json("branding"),
});

export const bookings = pgTable("bookings", {
  tenantId: uuid("tenant_id").notNull(),
  id: varchar("id", { length: 36 }).primaryKey(),
  dogId: varchar("dog_id", { length: 36 }), // FK → dogs.id (nullable for legacy bookings)
  userId: varchar("user_id", { length: 36 }), // FK → users.id (nullable for legacy bookings)
  customerId: varchar("customer_id", { length: 36 }), // Legacy field
  
  // Service details
  serviceType: varchar("service_type", { length: 16 }).notNull(), // daycare, boarding, trial
  startDate: timestamp("start_date", { withTimezone: true }),
  endDate: timestamp("end_date", { withTimezone: true }),
  
  // Denormalized fields for display
  dogName: varchar("dog_name", { length: 120 }),
  breed: varchar("breed", { length: 120 }),
  age: varchar("age", { length: 60 }),
  weight: real("weight"),
  ownerName: varchar("owner_name", { length: 160 }),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 40 }),
  
  // Legacy date fields (for compatibility)
  serviceDate: varchar("service_date", { length: 20 }),
  checkinDate: varchar("checkin_date", { length: 20 }),
  checkoutDate: varchar("checkout_date", { length: 20 }),
  trialDate: varchar("trial_date", { length: 20 }),
  dropoffTime: varchar("dropoff_time", { length: 20 }),
  pickupTime: varchar("pickup_time", { length: 20 }),
  checkinTime: varchar("checkin_time", { length: 20 }),
  checkoutTime: varchar("checkout_time", { length: 20 }),
  alternativeDate: varchar("alternative_date", { length: 20 }),
  
  // New time slot fields for operating hours validation
  timeSlot: varchar("time_slot", { length: 30 }), // Daycare time slot (e.g., "08:00 - 10:00")
  checkinTimeSlot: varchar("checkin_time_slot", { length: 30 }), // Boarding check-in time slot
  checkoutTimeSlot: varchar("checkout_time_slot", { length: 30 }), // Boarding check-out time slot
  pickupWindow: varchar("pickup_window", { length: 2 }), // Boarding pickup window: "AM" or "PM" (v1 only, nullable)
  
  // Pricing metadata fields (feature-flagged v1 vs v2)
  pricingModel: varchar("pricing_model", { length: 16 }), // "hours_v1" or "calendar_v2"
  nights: integer("nights"), // Calculated number of nights (for boarding)
  pmSurcharge: integer("pm_surcharge"), // PM pickup surcharge in cents (€10 = 1000)
  
  // Emergency and vaccination info
  emergencyName: varchar("emergency_name", { length: 160 }),
  emergencyPhone: varchar("emergency_phone", { length: 40 }),
  vaccinationDate: varchar("vaccination_date", { length: 20 }),
  vaccinationType: varchar("vaccination_type", { length: 80 }),
  vaccinationRecordUrl: text("vaccination_record_url"),
  
  // Status and payment
  status: varchar("status", { length: 16 }).notNull().default("pending"), // pending, confirmed, completed, cancelled
  paymentStatus: varchar("payment_status", { length: 16 }).notNull().default("unpaid"), // unpaid, paid, refunded
  paymentIntentId: varchar("payment_intent_id", { length: 120 }),
  stripeSessionId: varchar("stripe_session_id", { length: 120 }),
  amount: integer("amount"), // Amount in cents
  currency: varchar("currency", { length: 3 }).default("eur"),
  
  // Additional fields
  trialCompleted: boolean("trial_completed").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  dogIdx: index("bookings_dog_idx").on(t.dogId),
  userIdx: index("bookings_user_idx").on(t.userId),
  dateIdx: index("bookings_date_idx").on(t.startDate),
  statusIdx: index("bookings_status_idx").on(t.status)
}));

export const reminders = pgTable("reminders", {
  tenantId: uuid("tenant_id").notNull(),
  id: varchar("id", { length: 36 }).primaryKey(),
  bookingId: varchar("booking_id", { length: 36 }).notNull(), // FK → bookings.id
  reminderType: varchar("reminder_type", { length: 32 }).notNull(), // upcoming_booking, day_before, etc.
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull(),
  recipientEmail: varchar("recipient_email", { length: 320 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("sent"), // sent, failed, bounced
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  bookingIdx: index("reminders_booking_idx").on(t.bookingId),
  sentAtIdx: index("reminders_sent_at_idx").on(t.sentAt),
  uniqueSentReminder: index("reminders_unique_sent_idx").on(t.bookingId, t.reminderType).where(sql`status = 'sent'`)
}));

export const availability = pgTable("availability", {
  tenantId: uuid("tenant_id").notNull(),
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  service: varchar("service", { length: 32 }).notNull(), // Daycare, Boarding, Trial Day
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  slot: varchar("slot", { length: 32 }), // e.g., "09:00-12:00" for Trial Day, null for all-day
  capacity: integer("capacity").notNull(), // Max capacity for this service/date/slot
  reserved: integer("reserved").notNull().default(0), // Active reservations not yet paid
  confirmed: integer("confirmed").notNull().default(0), // Paid bookings
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  serviceDateIdx: index("availability_service_date_idx").on(t.service, t.date),
  uniqueServiceDateSlot: uniqueIndex("availability_unique_idx").on(t.service, t.date, t.slot)
}));

export const reservations = pgTable("reservations", {
  tenantId: uuid("tenant_id").notNull(),
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  service: varchar("service", { length: 32 }).notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD
  slot: varchar("slot", { length: 32 }), // Optional slot identifier
  userEmail: varchar("user_email", { length: 320 }).notNull(),
  dogId: varchar("dog_id", { length: 36 }),
  status: varchar("status", { length: 16 }).notNull().default("active"), // active, committed, released, expired
  pendingPaymentIntentId: varchar("pending_payment_intent_id", { length: 120 }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // Reservation expiry (now + TTL)
  idempotencyKey: varchar("idempotency_key", { length: 64 }), // For duplicate prevention
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  serviceDateIdx: index("reservations_service_date_idx").on(t.service, t.date),
  statusIdx: index("reservations_status_idx").on(t.status),
  expiresIdx: index("reservations_expires_idx").on(t.expiresAt),
  idempotencyIdx: index("reservations_idempotency_idx").on(t.idempotencyKey)
}));

export const configSettings = pgTable("config_settings", {
  tenantId: uuid("tenant_id").notNull(),
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  key: varchar("key", { length: 64 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const capacityDefaults = pgTable("capacity_defaults", {
  tenantId: uuid("tenant_id").notNull(),
  service: varchar("service", { length: 32 }).primaryKey(), // Daycare, Boarding, Trial Day
  capacity: integer("capacity").notNull(), // Default max capacity for this service
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
});

export const capacityOverrides = pgTable("capacity_overrides", {
  tenantId: uuid("tenant_id").notNull(),
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  service: varchar("service", { length: 32 }).notNull(), // Daycare, Boarding, Trial Day
  dateStart: varchar("date_start", { length: 10 }).notNull(), // YYYY-MM-DD
  dateEnd: varchar("date_end", { length: 10 }).notNull(), // YYYY-MM-DD
  slot: varchar("slot", { length: 32 }).notNull().default("ALL_DAY"), // Use "ALL_DAY" sentinel for all-day services
  capacity: integer("capacity").notNull(), // Override capacity for this range
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (t) => ({
  serviceIdx: index("capacity_overrides_service_idx").on(t.service),
  dateIdx: index("capacity_overrides_date_idx").on(t.dateStart, t.dateEnd),
  uniqueOverride: uniqueIndex("capacity_overrides_unique_idx").on(t.service, t.dateStart, t.dateEnd, t.slot)
}));

// TODO HowlidayInn: Future tables should be added in server/db/schema.ts so drizzle-kit picks them up