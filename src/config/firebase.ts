import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDmHSSoVdBjRVyVyY8tRBrCRUH948ZCJUg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'syllabus-30367.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'syllabus-30367',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'syllabus-30367.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '806183151449',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:806183151449:web:40efeae911ab170dd20e48',
};
const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
