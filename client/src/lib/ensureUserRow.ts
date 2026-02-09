// client/src/lib/ensureUserRow.ts
import { getAuth, onAuthStateChanged, User } from "firebase/auth";
import { api } from '@/lib/api';

function waitForUser(): Promise<User> {
  const auth = getAuth();
  const existing = auth.currentUser;
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const off = onAuthStateChanged(auth, (u) => {
      off();
      if (!u) return reject(new Error("No user after sign-in"));
      resolve(u);
    }, reject);
  });
}

export async function ensureUserRow() {
  const user = await waitForUser();
  // Force refresh to avoid "invalid-credential" when token is stale
  await user.getIdToken(true);

  try {
    await api.post('/auth/bootstrap');
  } catch (error: any) {
    if (error.response?.status === 401) {
      // Token timing edge: refresh once and retry
      await user.getIdToken(true);
      try {
        await api.post('/auth/bootstrap');
      } catch (retryError: any) {
        console.warn("Bootstrap failed after retry", retryError.response?.status, retryError.message);
      }
    } else {
      console.warn("Bootstrap failed", error.response?.status, error.message);
    }
  }
}