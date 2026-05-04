// client/src/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";

// ── Validate ENV ──────────────────────────────────────────
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
];

requiredEnvVars.forEach((key) => {
  if (!import.meta.env[key]) {
    console.warn(`⚠️ Missing: ${key}`);
  }
});

// ── Config ────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId:     import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// ── Initialize ────────────────────────────────────────────
const app = initializeApp(firebaseConfig);

// ── Services ──────────────────────────────────────────────
export const auth    = getAuth(app);
export const storage = getStorage(app);
export const db      = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('profile');
googleProvider.addScope('email');
googleProvider.setCustomParameters({ prompt: 'select_account' });

setPersistence(auth, browserLocalPersistence).catch(console.warn);

// ── Analytics ─────────────────────────────────────────────
let analytics = null;
isSupported()
  .then(supported => { if (supported) analytics = getAnalytics(app); })
  .catch(() => {});

export { analytics };
export default app;