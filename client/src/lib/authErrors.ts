// Firebase Auth error code to user-friendly message mapping
export function getAuthErrorMessage(error: any): string {
  if (!error) return 'An unexpected error occurred';
  
  // Extract Firebase error code
  const errorCode = error?.code || '';
  
  switch (errorCode) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/user-not-found':
      return 'No account found with this email. Please sign up first.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again or reset your password.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is not enabled. Please contact support.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials.';
    default:
      // Return the original error message if it's not a Firebase error code
      return error.message || 'Authentication failed. Please try again.';
  }
}
