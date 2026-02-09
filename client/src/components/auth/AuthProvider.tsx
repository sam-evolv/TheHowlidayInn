import { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { onAuthStateChange, signInUser, signUpUser, signOutUser, resetPassword, getUserData, FirebaseUser } from '@/lib/firebase';
import { ensureUserRow } from '@/lib/ensureUserRow';
import { getAuthErrorMessage } from '@/lib/authErrors';

interface AuthContextType {
  user: User | null;
  userData: FirebaseUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Fetch additional user data from Firestore
        try {
          const data = await getUserData(firebaseUser.uid);
          setUserData(data);
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      await signInUser(email, password);
      // Ensure user has a database record
      await ensureUserRow();
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const signUp = async (email: string, password: string, name: string, phone: string) => {
    try {
      await signUpUser(email, password, name, phone);
      // Ensure user has a database record
      await ensureUserRow();
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const logout = async () => {
    try {
      await signOutUser();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign out');
    }
  };

  const sendPasswordReset = async (email: string) => {
    try {
      await resetPassword(email);
    } catch (error: any) {
      throw new Error(getAuthErrorMessage(error));
    }
  };

  const value = {
    user,
    userData,
    loading,
    signIn,
    signUp,
    logout,
    sendPasswordReset,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};