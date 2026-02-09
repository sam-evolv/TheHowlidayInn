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

  const configuredResetUrl = import.meta.env.VITE_PASSWORD_RESET_REDIRECT_URL;
  const fallbackResetUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/login`
      : `https://${cfg.authDomain}/login`;

  return await sendPasswordResetEmail(auth, normalizedEmail, {
    url: configuredResetUrl || fallbackResetUrl,
    handleCodeInApp: false,
  });
};

// User functions
export const getUserData = async (uid: string): Promise<FirebaseUser | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { uid, ...userDoc.data() } as FirebaseUser;
    }
  } catch (e) {
    // Firestore read is optional - user data is managed in PostgreSQL
  }
  return null;
};

export const updateUserData = async (uid: string, data: Partial<FirebaseUser>) => {
  await updateDoc(doc(db, 'users', uid), data);
};

// Dog functions
export const createDog = async (dogData: Omit<FirebaseDog, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'dogs'), {
    ...dogData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getUserDogs = async (ownerUid: string): Promise<FirebaseDog[]> => {
  const q = query(
    collection(db, 'dogs'),
    where('ownerUid', '==', ownerUid),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebaseDog));
};

export const updateDog = async (dogId: string, data: Partial<FirebaseDog>) => {
  await updateDoc(doc(db, 'dogs', dogId), data);
};

export const deleteDog = async (dogId: string) => {
  await deleteDoc(doc(db, 'dogs', dogId));
};

// Booking functions
export const createBooking = async (bookingData: Omit<FirebaseBooking, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'bookings'), {
    ...bookingData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

export const getUserBookings = async (ownerUid: string): Promise<FirebaseBooking[]> => {
  const q = query(
    collection(db, 'bookings'),
    where('ownerUid', '==', ownerUid),
    orderBy('createdAt', 'desc')
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebaseBooking));
};

export const getAllBookings = async (): Promise<FirebaseBooking[]> => {
  const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebaseBooking));
};

export const updateBooking = async (bookingId: string, data: Partial<FirebaseBooking>) => {
  await updateDoc(doc(db, 'bookings', bookingId), data);
};

// Availability and capacity functions
export const getBookingsForDate = async (date: string, serviceType?: string): Promise<FirebaseBooking[]> => {
  let q = query(
    collection(db, 'bookings'),
    where('checkInDate', '<=', date),
    where('checkOutDate', '>=', date),
    where('status', 'in', ['paid', 'confirmed'])
  );
  
  const querySnapshot = await getDocs(q);
  let bookings = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FirebaseBooking));
  
  if (serviceType) {
    bookings = bookings.filter(booking => booking.serviceType === serviceType);
  }
  
  return bookings;
};

export const getDailyCapacity = async (): Promise<{ daycare: number; boarding: number }> => {
  const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
  if (settingsDoc.exists()) {
    const data = settingsDoc.data();
    return data.dailyCapByService || { daycare: 40, boarding: 20 };
  }
  return { daycare: 40, boarding: 20 };
};

// Breed validation
export const getAcceptedBreeds = async (): Promise<string[]> => {
  const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
  if (settingsDoc.exists()) {
    return settingsDoc.data().acceptedBreeds || [];
  }
  return [];
};

export const getBlockedBreeds = async (): Promise<string[]> => {
  const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
  if (settingsDoc.exists()) {
    return settingsDoc.data().blockedBreeds || [
      "pit bull", "american pit bull terrier", "staffordshire bull terrier",
      "american staffordshire terrier", "bull terrier", "rottweiler",
      "doberman pinscher", "german shepherd", "mastiff", "akita",
      "chow chow", "wolf hybrid", "presa canario", "cane corso"
    ];
  }
  return [
    "pit bull", "american pit bull terrier", "staffordshire bull terrier",
    "american staffordshire terrier", "bull terrier", "rottweiler",
    "doberman pinscher", "german shepherd", "mastiff", "akita",
    "chow chow", "wolf hybrid", "presa canario", "cane corso"
  ];
};

export const isBreedRestricted = async (breed: string): Promise<boolean> => {
  const blockedBreeds = await getBlockedBreeds();
  return blockedBreeds.some(blocked => breed.toLowerCase().includes(blocked.toLowerCase()));
};

// Helper function for existing compatibility
export const checkCustomerStatus = async (email: string) => {
  // Check if user exists
  const q = query(collection(db, 'users'), where('email', '==', email), limit(1));
  const querySnapshot = await getDocs(q);
  return { isFirstTime: querySnapshot.empty };
};