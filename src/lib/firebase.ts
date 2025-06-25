import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Initialize Analytics (only in production)
export const analytics = typeof window !== 'undefined' && import.meta.env.PROD 
  ? getAnalytics(app) 
  : null;

// Connect to emulators only when explicitly enabled
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  try {
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
  } catch {
    // Ignore if already connected
    console.log('Auth emulator already connected');
  }
  
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch {
    // Ignore if already connected
    console.log('Firestore emulator already connected');
  }
  
  try {
    connectStorageEmulator(storage, 'localhost', 9199);
  } catch {
    // Ignore if already connected
    console.log('Storage emulator already connected');
  }
  
  try {
    connectFunctionsEmulator(functions, 'localhost', 5001);
  } catch {
    // Ignore if already connected
    console.log('Functions emulator already connected');
  }
}

export { app };
export default app;