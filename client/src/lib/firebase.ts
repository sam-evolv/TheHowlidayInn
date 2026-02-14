import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, User, type Auth } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, where, getDocs, updateDoc, deleteDoc, orderBy, limit, serverTimestamp } from "firebase/firestore";

const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Client-side configuration guard (development only)
if (import.meta.env.DEV) {
  const required = [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
  ];
  const missing = required.filter(k => !import.meta.env[k as keyof ImportMetaEnv]);
  if (missing.length) {
    console.warn("[firebase] Missing client env:", missing);
  }
}

// Validate required Firebase configuration
if (!cfg.apiKey || !cfg.authDomain || !cfg.projectId || !cfg.appId) {
  console.error('Firebase Configuration Error - Missing required fields:', {
    hasApiKey: !!cfg.apiKey,
    hasAuthDomain: !!cfg.authDomain,
    hasProjectId: !!cfg.projectId,
    hasAppId: !!cfg.appId,
  });
  throw new Error('Firebase configuration is incomplete. Please check your environment variables.');
}

let app: FirebaseApp;
let auth: Auth;

try {
  app = getApps().length ? getApp() : initializeApp(cfg);
  auth = getAuth(app);
  setPersistence(auth, browserLocalPersistence).catch(() => {});
} catch (error: any) {
  console.error('Firebase Initialization Error:', error?.message);
  if (error?.message?.includes('invalid-api-key')) {
    console.error('The Firebase API key appears to be invalid. Please verify VITE_FIREBASE_API_KEY in your environment secrets.');
  }
  throw error;
}

export { app, auth };

// Also export firestore for compatibility
export const db = getFirestore(app);

// Types for our data models
export interface FirebaseUser {
  uid: string;
  email: string;
  name: string;
  phone?: string;
  createdAt?: any;
}

export interface FirebaseDog {
  id?: string;
  ownerUid: string;
  name: string;
  breed: string;
  age: number;
  weightKg: number;
  gender: 'male' | 'female';
  photoUrl?: string;
  vaccinations: {
    rabiesDate?: string;
    dhppDate?: string;
    bordetellaDate?: string;
  };
  notes?: string;
  createdAt?: any;
}

export interface FirebaseBooking {
  id?: string;
  ownerUid: string;
  dogIds: string[];
  dogNames: string[];
  serviceType: 'daycare' | 'boarding';
  checkInDate: string;
  checkOutDate: string;
  dropOffTime: string;
  pickUpTime: string;
  vaccinationOk: boolean;
  breedCheck: 'accepted' | 'blocked';
  status: 'pending' | 'paid' | 'confirmed' | 'cancelled';
  totalAmount: number;
  currency: string;
  stripeSessionId?: string;
  createdAt?: any;
}

// Auth functions
export const signUpUser = async (email: string, password: string, name: string, phone: string) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  try {
    await setDoc(doc(db, 'users', user.uid), {
      email,
      name,
      phone,
      createdAt: serverTimestamp(),
    });
  } catch (e) {
    // Firestore write is optional - user data is managed in PostgreSQL
  }
  
  return user;
};

export const signInUser = async (email: string, password: string) => {
  return await signInWithEmailAndPassword(auth, email, password);
};

export const signOutUser = async () => {
  return await signOut(auth);
};

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export const resetPassword = async (email: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  await sendPasswordResetEmail(auth, normalizedEmail);
};

// User functions — Firestore is optional; PostgreSQL is authoritative
export const getUserData = async (uid: string): Promise<FirebaseUser | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { uid, ...userDoc.data() } as FirebaseUser;
    }
  } catch (_e) {
    // Firestore read is optional - user data is managed in PostgreSQL
  }
  return null;
};

export const updateUserData = async (uid: string, data: Partial<FirebaseUser>) => {
  try { await updateDoc(doc(db, 'users', uid), data); } catch (_e) { /* optional */ }
};

// Dog functions — all data managed via PostgreSQL API; Firestore calls are stubs
export const createDog = async (_dogData: Omit<FirebaseDog, 'id' | 'createdAt'>) => {
  return '';
};

export const getUserDogs = async (_ownerUid: string): Promise<FirebaseDog[]> => {
  return [];
};

export const updateDog = async (_dogId: string, _data: Partial<FirebaseDog>) => {};

export const deleteDog = async (_dogId: string) => {};

// Booking functions — all managed via PostgreSQL API; Firestore calls are stubs
export const createBooking = async (_bookingData: Omit<FirebaseBooking, 'id' | 'createdAt'>) => {
  return '';
};

export const getUserBookings = async (_ownerUid: string): Promise<FirebaseBooking[]> => {
  return [];
};

export const getAllBookings = async (): Promise<FirebaseBooking[]> => {
  return [];
};

export const updateBooking = async (_bookingId: string, _data: Partial<FirebaseBooking>) => {};

// Availability and capacity functions
// These no longer depend on Firestore — data lives in PostgreSQL.
// Returning safe defaults to avoid Firestore permission errors.

export const getBookingsForDate = async (_date: string, _serviceType?: string): Promise<FirebaseBooking[]> => {
  return [];
};

export const getDailyCapacity = async (): Promise<{ daycare: number; boarding: number }> => {
  return { daycare: 40, boarding: 20 };
};

// Breed validation — uses hardcoded list (no Firestore dependency)
const BLOCKED_BREEDS = [
  "pit bull", "american pit bull terrier", "staffordshire bull terrier",
  "american staffordshire terrier", "bull terrier", "rottweiler",
  "doberman pinscher", "german shepherd", "mastiff", "akita",
  "chow chow", "wolf hybrid", "presa canario", "cane corso"
];

export const getAcceptedBreeds = async (): Promise<string[]> => {
  return [];
};

export const getBlockedBreeds = async (): Promise<string[]> => {
  return BLOCKED_BREEDS;
};

export const isBreedRestricted = async (breed: string): Promise<boolean> => {
  return BLOCKED_BREEDS.some(blocked => breed.toLowerCase().includes(blocked.toLowerCase()));
};

// Helper function for existing compatibility
// No longer queries Firestore — the server-side trial gating handles first-time checks
export const checkCustomerStatus = async (_email: string) => {
  return { isFirstTime: false };
};