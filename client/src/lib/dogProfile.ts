// TODO HowlidayInn: Enhanced Firebase data models for comprehensive dog profile system
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  serverTimestamp 
} from "firebase/firestore";
import { db } from './firebase';

// Enhanced User interface with role support
export interface EnhancedFirebaseUser {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  role: 'user' | 'admin';
  createdAt?: any;
  updatedAt?: any;
}

// Enhanced Booking interface for secure dog ownership
export interface EnhancedFirebaseBooking {
  id?: string;
  userId: string; // Firebase Auth UID (owner of the booking)
  ownerUid?: string; // Backward compatibility
  dogId: string; // Single dog per booking for security (can create multiple bookings)
  dogName: string;
  serviceType: 'daycare' | 'boarding' | 'trial';
  checkInDate: string;
  checkOutDate: string;
  dropOffTime: string;
  pickUpTime: string;
  status: 'pending' | 'paid' | 'confirmed' | 'cancelled';
  totalAmount: number;
  currency: string;
  stripeSessionId?: string;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

// Enhanced Dog interface following the specification
export interface EnhancedFirebaseDog {
  id?: string;
  userId: string; // Firebase Auth UID (primary field)
  ownerUid?: string; // Backward compatibility field (should equal userId)
  name: string;
  breed?: string;
  sex?: 'Female' | 'Male'; // Gender only - separated from neutering status
  dob?: string; // ISO date string
  weightKg?: number;
  neuteredSpayed?: boolean; // Separate field for neutering status
  color?: string;
  microchip?: string;
  photoUrl?: string;
  status: 'pending' | 'verified' | 'expired' | 'rejected';
  disallowedReason?: string;
  nextExpiry?: string; // ISO date string
  createdAt?: any;
  updatedAt?: any;
}

// Vaccination record
export interface Vaccination {
  id?: string;
  dogId: string;
  type: string; // dhpp, kennel_cough, leptospirosis, rabies
  dateAdministered?: string; // ISO date string
  validUntil?: string; // ISO date string
  proofUrl?: string; // Document URL
  verified: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// Health profile
export interface HealthProfile {
  dogId: string;
  behaviourNotes?: string;
  biteHistory?: boolean;
  conditions?: string;
  medications?: string;
  allergies?: string;
  vetName?: string;
  vetPhone?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  insuranceProvider?: string;
  policyNumber?: string;
  feedingBrand?: string;
  feedingSchedule?: string;
  medicationName?: string;
  medicationDosage?: string;
  medicationNotes?: string;
  pickupContact?: string;
  mediaPermission?: 'Yes' | 'No';
  createdAt?: any;
  updatedAt?: any;
}

// System settings
export interface KennelSettings {
  id: 'main'; // Single settings document
  requiredVaccines: RequiredVaccine[];
  prohibitedBreeds: string[];
  leadTimeHours: number;
  updatedAt?: any;
}

export interface RequiredVaccine {
  type: string;
  label: string;
  min_validity_days: number;
}

// Default settings
export const DEFAULT_SETTINGS: KennelSettings = {
  id: 'main',
  requiredVaccines: [
    { type: "dhpp", label: "Core - DHPP", min_validity_days: 0 },
    { type: "kennel_cough", label: "Kennel Cough", min_validity_days: 0 },
    { type: "leptospirosis", label: "Leptospirosis", min_validity_days: 0 },
    { type: "rabies", label: "Rabies", min_validity_days: 0 }
  ],
  prohibitedBreeds: [],
  leadTimeHours: 12
};

// Collection paths
export const COLLECTIONS = {
  USERS: 'users',
  DOGS: 'dogs',
  VACCINATIONS: 'vaccinations',
  HEALTH_PROFILES: 'health_profiles',
  SETTINGS: 'settings',
  BOOKINGS: 'bookings' // Legacy collection
} as const;

// User subcollection paths (more secure approach)
export const USER_SUBCOLLECTIONS = {
  BOOKINGS: 'bookings'
} as const;

// Enhanced Dog functions
export const createEnhancedDog = async (dogData: Omit<EnhancedFirebaseDog, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  // Ensure consistent ownership fields for security rules compliance
  const sanitizedData = {
    ...dogData,
    userId: dogData.userId,
    ownerUid: dogData.userId, // Always equal to userId for security
    status: 'pending' as const, // Default status
  };
  
  const docRef = await addDoc(collection(db, COLLECTIONS.DOGS), {
    ...sanitizedData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getEnhancedDog = async (dogId: string): Promise<EnhancedFirebaseDog | null> => {
  const dogDoc = await getDoc(doc(db, COLLECTIONS.DOGS, dogId));
  if (dogDoc.exists()) {
    return { id: dogId, ...dogDoc.data() } as EnhancedFirebaseDog;
  }
  return null;
};

export const updateEnhancedDog = async (dogId: string, data: Partial<EnhancedFirebaseDog>): Promise<void> => {
  // Remove userId and ownerUid from updates to prevent ownership changes
  const { userId, ownerUid, ...updateData } = data;
  
  await updateDoc(doc(db, COLLECTIONS.DOGS, dogId), {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
};

export const getUserEnhancedDogs = async (userId: string): Promise<EnhancedFirebaseDog[]> => {
  // Try both userId and ownerUid for backward compatibility
  const queries = [
    query(collection(db, COLLECTIONS.DOGS), where('userId', '==', userId), orderBy('createdAt', 'desc')),
    query(collection(db, COLLECTIONS.DOGS), where('ownerUid', '==', userId), orderBy('createdAt', 'desc'))
  ];
  
  const results = await Promise.all(queries.map(q => getDocs(q)));
  const allDogs = results.flatMap(querySnapshot => 
    querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EnhancedFirebaseDog))
  );
  
  // Remove duplicates based on id
  const uniqueDogs = allDogs.filter((dog, index, arr) => 
    arr.findIndex(d => d.id === dog.id) === index
  );
  
  return uniqueDogs.sort((a, b) => 
    (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
  );
};

// Vaccination functions
export const addVaccination = async (vaccinationData: Omit<Vaccination, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const docRef = await addDoc(collection(db, COLLECTIONS.VACCINATIONS), {
    ...vaccinationData,
    verified: false, // Default to unverified
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getDogVaccinations = async (dogId: string): Promise<Vaccination[]> => {
  const q = query(
    collection(db, COLLECTIONS.VACCINATIONS),
    where('dogId', '==', dogId),
    orderBy('dateAdministered', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vaccination));
};

export const updateVaccination = async (vaccinationId: string, data: Partial<Vaccination>): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.VACCINATIONS, vaccinationId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// Health profile functions
export const setHealthProfile = async (healthData: Omit<HealthProfile, 'createdAt' | 'updatedAt'>): Promise<void> => {
  await setDoc(doc(db, COLLECTIONS.HEALTH_PROFILES, healthData.dogId), {
    ...healthData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

export const getHealthProfile = async (dogId: string): Promise<HealthProfile | null> => {
  const healthDoc = await getDoc(doc(db, COLLECTIONS.HEALTH_PROFILES, dogId));
  if (healthDoc.exists()) {
    return healthDoc.data() as HealthProfile;
  }
  return null;
};

export const updateHealthProfile = async (dogId: string, data: Partial<HealthProfile>): Promise<void> => {
  await updateDoc(doc(db, COLLECTIONS.HEALTH_PROFILES, dogId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

// Settings functions
export const getKennelSettings = async (): Promise<KennelSettings> => {
  const settingsDoc = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'main'));
  if (settingsDoc.exists()) {
    return settingsDoc.data() as KennelSettings;
  }
  // Return default settings if none exist
  return DEFAULT_SETTINGS;
};

export const updateKennelSettings = async (settings: Partial<KennelSettings>): Promise<void> => {
  await setDoc(doc(db, COLLECTIONS.SETTINGS, 'main'), {
    ...settings,
    updatedAt: serverTimestamp(),
  }, { merge: true });
};

// Initialize default settings (call this once during setup)
export const initializeDefaultSettings = async (): Promise<void> => {
  const existingSettings = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'main'));
  if (!existingSettings.exists()) {
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'main'), {
      ...DEFAULT_SETTINGS,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    console.log('Default kennel settings initialized');
  }
};

// Admin functions
export const getAllDogsForAdmin = async (filters?: {
  status?: string;
  expiringInDays?: number;
  owner?: string;
  breed?: string;
  q?: string;
}): Promise<EnhancedFirebaseDog[]> => {
  let q = query(collection(db, COLLECTIONS.DOGS), orderBy('createdAt', 'desc'));
  
  if (filters?.status && filters.status !== 'all') {
    q = query(collection(db, COLLECTIONS.DOGS), where('status', '==', filters.status), orderBy('createdAt', 'desc'));
  }
  
  const querySnapshot = await getDocs(q);
  let dogs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EnhancedFirebaseDog));
  
  // Client-side filtering for complex queries
  if (filters?.expiringInDays) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + filters.expiringInDays);
    dogs = dogs.filter(dog => 
      dog.nextExpiry && new Date(dog.nextExpiry) <= cutoffDate
    );
  }
  
  if (filters?.breed) {
    dogs = dogs.filter(dog => 
      dog.breed?.toLowerCase().includes(filters.breed!.toLowerCase())
    );
  }
  
  if (filters?.q) {
    const searchTerm = filters.q.toLowerCase();
    dogs = dogs.filter(dog => 
      dog.name.toLowerCase().includes(searchTerm) ||
      dog.breed?.toLowerCase().includes(searchTerm)
    );
  }
  
  return dogs;
};

export const updateDogStatus = async (dogId: string, status: string, reason?: string): Promise<void> => {
  const updateData: Partial<EnhancedFirebaseDog> = {
    status: status as EnhancedFirebaseDog['status'],
    updatedAt: serverTimestamp(),
  };
  
  if (reason) {
    updateData.disallowedReason = reason;
  }
  
  await updateDoc(doc(db, COLLECTIONS.DOGS, dogId), updateData);
};

// Zod schemas for validation
import { z } from 'zod';

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

// Enhanced Booking functions with secure user-scoped storage
export const createSecureBooking = async (
  userId: string, 
  bookingData: Omit<EnhancedFirebaseBooking, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  // Verify dog ownership before creating booking
  const dog = await getEnhancedDog(bookingData.dogId);
  if (!dog || (dog.userId !== userId && dog.ownerUid !== userId)) {
    throw new Error('You can only create bookings for your own dogs');
  }
  
  const docRef = await addDoc(collection(db, COLLECTIONS.USERS, userId, USER_SUBCOLLECTIONS.BOOKINGS), {
    ...bookingData,
    userId,
    ownerUid: userId, // Backward compatibility
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getUserBookings = async (userId: string): Promise<EnhancedFirebaseBooking[]> => {
  const q = query(
    collection(db, COLLECTIONS.USERS, userId, USER_SUBCOLLECTIONS.BOOKINGS),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EnhancedFirebaseBooking));
};

export const updateSecureBooking = async (
  userId: string, 
  bookingId: string, 
  data: Partial<EnhancedFirebaseBooking>
): Promise<void> => {
  // Remove ownership fields from updates
  const { userId: _, ownerUid: __, ...updateData } = data;
  
  await updateDoc(doc(db, COLLECTIONS.USERS, userId, USER_SUBCOLLECTIONS.BOOKINGS, bookingId), {
    ...updateData,
    updatedAt: serverTimestamp(),
  });
};