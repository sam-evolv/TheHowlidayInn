// Server-side types for dog profile system
import { z } from 'zod';

// Collection paths
export const COLLECTIONS = {
  USERS: 'users',
  DOGS: 'dogs',
  VACCINATIONS: 'vaccinations',
  HEALTH_PROFILES: 'health_profiles',
  SETTINGS: 'settings',
  BOOKINGS: 'bookings'
} as const;

// Enhanced Dog interface
export interface EnhancedFirebaseDog {
  id?: string;
  userId: string;
  ownerUid?: string;
  name: string;
  breed?: string;
  sex?: 'Female' | 'Male';
  dob?: string;
  weightKg?: number;
  neuteredSpayed?: boolean;
  color?: string;
  microchip?: string;
  photoUrl?: string;
  status: 'pending' | 'verified' | 'expired' | 'rejected';
  disallowedReason?: string;
  nextExpiry?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Vaccination record interface
export interface Vaccination {
  id?: string;
  dogId: string;
  type: string;
  dateAdministered: string;
  validUntil?: string;
  veterinarian?: string;
  vetClinic?: string;
  batchNumber?: string;
  documentUrl?: string;
  verified: boolean;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Health profile interface
export interface HealthProfile {
  id?: string;
  dogId: string;
  allergies: string[];
  medications: string[];
  chronicConditions: string[];
  dietaryRequirements?: string;
  exerciseRestrictions?: string;
  behavioralNotes?: string;
  vetContactName?: string;
  vetContactPhone?: string;
  vetContactEmail?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Kennel settings interface
export interface KennelSettings {
  requiredVaccines: RequiredVaccine[];
  prohibitedBreeds: string[];
  leadTimeHours: number;
}

export interface RequiredVaccine {
  type: string;
  label: string;
  required: boolean;
  validityMonths: number;
}

// Zod schemas for validation
export const createInsertVaccinationSchema = () => z.object({
  dogId: z.string().min(1, 'Dog ID is required'),
  type: z.string().min(1, 'Vaccination type is required'),
  dateAdministered: z.string().min(1, 'Date administered is required'),
  validUntil: z.string().optional(),
  veterinarian: z.string().optional(),
  vetClinic: z.string().optional(),
  batchNumber: z.string().optional(),
  documentUrl: z.string().optional(),
  verified: z.boolean().default(false),
  notes: z.string().optional(),
});

export const createInsertHealthProfileSchema = () => z.object({
  dogId: z.string().min(1, 'Dog ID is required'),
  allergies: z.array(z.string()).default([]),
  medications: z.array(z.string()).default([]),
  chronicConditions: z.array(z.string()).default([]),
  dietaryRequirements: z.string().optional(),
  exerciseRestrictions: z.string().optional(),
  behavioralNotes: z.string().optional(),
  vetContactName: z.string().optional(),
  vetContactPhone: z.string().optional(),
  vetContactEmail: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelation: z.string().optional(),
});

export const createInsertKennelSettingsSchema = () => z.object({
  requiredVaccines: z.array(z.object({
    type: z.string(),
    label: z.string(),
    required: z.boolean().default(true),
    validityMonths: z.number().min(1),
  })),
  prohibitedBreeds: z.array(z.string()).default([]),
  leadTimeHours: z.number().min(0).default(12),
});

export const createInsertDogSchema = () => z.object({
  name: z.string().min(1, 'Dog name is required'),
  breed: z.string().optional(),
  sex: z.enum(['Female', 'Male']).optional(),
  dob: z.string().optional(),
  weightKg: z.number().positive().optional(),
  neuteredSpayed: z.boolean().optional(),
  color: z.string().optional(),
  microchip: z.string().optional(),
  photoUrl: z.string().optional(),
});

export const createUpdateDogSchema = () => createInsertDogSchema().partial();