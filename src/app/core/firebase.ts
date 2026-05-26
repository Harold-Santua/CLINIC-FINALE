import { initializeApp } from 'firebase/app';
import { browserLocalPersistence, connectAuthEmulator, getAuth, setPersistence } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { environment } from '../../environments/environment';

/** Emulator-only Firebase app (Auth + Firestore). */
const emulatorFirebaseConfig = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-clinic.firebaseapp.com',
  projectId: 'demo-clinic',
  storageBucket: 'demo-clinic.appspot.com',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:0000000000000000000000',
};

const app = initializeApp(emulatorFirebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
void setPersistence(auth, browserLocalPersistence);

let emulatorsConnected = false;

export function connectFirebaseEmulators(): void {
  if (!environment.useEmulators || emulatorsConnected || typeof window === 'undefined') {
    return;
  }

  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  emulatorsConnected = true;
}
