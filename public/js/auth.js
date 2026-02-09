// Authentication module
import { auth, ADMIN_EMAILS } from './firebase-config.js';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { setDoc, doc } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { db } from './firebase-config.js';

let currentUser = null;

// Initialize auth state listener
export function initAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, async (user) => {
      currentUser = user;
      if (user) {
        // Check if user is admin
        const isAdmin = ADMIN_EMAILS.includes(user.email);
        user.isAdmin = isAdmin;
        
        // Store user data in Firestore if first time
        await ensureUserDocument(user, isAdmin);
      }
      resolve(user);
    });
  });
}

// Get current user
export function getCurrentUser() {
  return currentUser;
}

// Sign up new user
export async function signUp(email, password, name, phone) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if admin
    const isAdmin = ADMIN_EMAILS.includes(email);
    user.isAdmin = isAdmin;
    
    // Create user document in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      name: name || '',
      email: email,
      phone: phone || '',
      role: isAdmin ? 'admin' : 'user',
      createdAt: new Date()
    });
    
    return user;
  } catch (error) {
    console.error('Sign up error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

// Sign in existing user
export async function signIn(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if admin
    const isAdmin = ADMIN_EMAILS.includes(email);
    user.isAdmin = isAdmin;
    
    // Ensure user document exists
    await ensureUserDocument(user, isAdmin);
    
    return user;
  } catch (error) {
    console.error('Sign in error:', error);
    throw new Error(getAuthErrorMessage(error.code));
  }
}

// Sign out user
export async function signOutUser() {
  try {
    await signOut(auth);
    currentUser = null;
    window.location.href = '/login.html';
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

// Ensure user document exists in Firestore
async function ensureUserDocument(user, isAdmin) {
  try {
    await setDoc(doc(db, 'users', user.uid), {
      name: user.displayName || '',
      email: user.email,
      phone: '',
      role: isAdmin ? 'admin' : 'user',
      createdAt: new Date()
    }, { merge: true });
  } catch (error) {
    console.error('Error creating user document:', error);
  }
}

// Check if user is admin
export function isAdmin(user = currentUser) {
  return user && user.isAdmin;
}

// Redirect based on user role
export function redirectAfterAuth(user) {
  if (isAdmin(user)) {
    window.location.href = '/portal.html';
  } else {
    window.location.href = '/account.html';
  }
}

// Auth guard - redirect to login if not authenticated
export function requireAuth(requireAdmin = false) {
  if (!currentUser) {
    window.location.href = '/login.html';
    return false;
  }
  
  if (requireAdmin && !isAdmin(currentUser)) {
    window.location.href = '/login.html';
    return false;
  }
  
  return true;
}

// Get user-friendly error messages
function getAuthErrorMessage(errorCode) {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    default:
      return 'An error occurred during authentication. Please try again.';
  }
}