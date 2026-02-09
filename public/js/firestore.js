// Firestore database helpers
import { db } from './firebase-config.js';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  runTransaction,
  writeBatch
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Users
export async function getUserProfile(uid) {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}

export async function updateUserProfile(uid, data) {
  try {
    const docRef = doc(db, 'users', uid);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// Dogs
export async function getUserDogs(uid) {
  try {
    const dogsRef = collection(db, 'users', uid, 'dogs');
    const dogsSnap = await getDocs(query(dogsRef, orderBy('createdAt', 'desc')));
    return dogsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting user dogs:', error);
    throw error;
  }
}

export async function addDog(uid, dogData) {
  try {
    const dogsRef = collection(db, 'users', uid, 'dogs');
    const docRef = await addDoc(dogsRef, {
      ...dogData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding dog:', error);
    throw error;
  }
}

export async function updateDog(uid, dogId, dogData) {
  try {
    const dogRef = doc(db, 'users', uid, 'dogs', dogId);
    await updateDoc(dogRef, {
      ...dogData,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating dog:', error);
    throw error;
  }
}

export async function deleteDog(uid, dogId) {
  try {
    const dogRef = doc(db, 'users', uid, 'dogs', dogId);
    await deleteDoc(dogRef);
  } catch (error) {
    console.error('Error deleting dog:', error);
    throw error;
  }
}

export async function getDog(uid, dogId) {
  try {
    const dogRef = doc(db, 'users', uid, 'dogs', dogId);
    const dogSnap = await getDoc(dogRef);
    return dogSnap.exists() ? { id: dogSnap.id, ...dogSnap.data() } : null;
  } catch (error) {
    console.error('Error getting dog:', error);
    throw error;
  }
}

// Bookings
export async function createBooking(bookingData) {
  try {
    const bookingsRef = collection(db, 'bookings');
    const docRef = await addDoc(bookingsRef, {
      ...bookingData,
      createdAt: serverTimestamp()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
}

export async function getBooking(bookingId) {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    const bookingSnap = await getDoc(bookingRef);
    return bookingSnap.exists() ? { id: bookingSnap.id, ...bookingSnap.data() } : null;
  } catch (error) {
    console.error('Error getting booking:', error);
    throw error;
  }
}

export async function updateBooking(bookingId, data) {
  try {
    const bookingRef = doc(db, 'bookings', bookingId);
    await updateDoc(bookingRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating booking:', error);
    throw error;
  }
}

export async function getUserBookings(uid) {
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, where('userId', '==', uid), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting user bookings:', error);
    throw error;
  }
}

export async function getAllBookings() {
  try {
    const bookingsRef = collection(db, 'bookings');
    const q = query(bookingsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting all bookings:', error);
    throw error;
  }
}

// Capacity
export async function getCapacity(date) {
  try {
    const capacityRef = doc(db, 'capacity', date);
    const capacitySnap = await getDoc(capacityRef);
    if (capacitySnap.exists()) {
      return capacitySnap.data();
    } else {
      // Return default capacity if not set
      return {
        maxSpotsDaycare: 40,
        bookedDaycare: 0,
        maxSpotsBoarding: 20,
        bookedBoarding: 0,
        updatedAt: new Date()
      };
    }
  } catch (error) {
    console.error('Error getting capacity:', error);
    throw error;
  }
}

export async function updateCapacity(date, updates) {
  try {
    const capacityRef = doc(db, 'capacity', date);
    await setDoc(capacityRef, {
      ...updates,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating capacity:', error);
    throw error;
  }
}

export async function incrementBookedCapacity(date, serviceType) {
  try {
    const capacityRef = doc(db, 'capacity', date);
    const field = serviceType === 'daycare' ? 'bookedDaycare' : 'bookedBoarding';
    
    await runTransaction(db, async (transaction) => {
      const capacityDoc = await transaction.get(capacityRef);
      const currentData = capacityDoc.exists() ? capacityDoc.data() : {
        maxSpotsDaycare: 40,
        bookedDaycare: 0,
        maxSpotsBoarding: 20,
        bookedBoarding: 0
      };
      
      const newValue = (currentData[field] || 0) + 1;
      transaction.set(capacityRef, {
        ...currentData,
        [field]: newValue,
        updatedAt: serverTimestamp()
      }, { merge: true });
    });
  } catch (error) {
    console.error('Error incrementing capacity:', error);
    throw error;
  }
}

// Settings
export async function getSettings(settingName) {
  try {
    const settingRef = doc(db, 'settings', settingName);
    const settingSnap = await getDoc(settingRef);
    return settingSnap.exists() ? settingSnap.data() : null;
  } catch (error) {
    console.error('Error getting settings:', error);
    throw error;
  }
}

export async function updateSettings(settingName, data) {
  try {
    const settingRef = doc(db, 'settings', settingName);
    await setDoc(settingRef, {
      ...data,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
}