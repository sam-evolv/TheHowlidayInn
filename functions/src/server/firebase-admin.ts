// HowlidayInn: unified firebase-admin init (keyless by default)
import admin from "firebase-admin";

if (admin.apps.length === 0) {
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (svc) {
    admin.initializeApp({ credential: admin.credential.cert(JSON.parse(svc)) });
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    admin.initializeApp(projectId ? { projectId } : undefined);
  }
}

export { admin };