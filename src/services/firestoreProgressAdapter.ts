import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ProgressAdapter, ProgressDocument } from './progressAdapter';

export function firestoreProgressAdapter(uid: string): ProgressAdapter {
  return {
    async load(examId) {
      const snapshot = await getDoc(doc(db, 'users', uid, 'progress', examId));
      return snapshot.exists() ? (snapshot.data() as ProgressDocument) : null;
    },
    async save(examId, document) {
      await setDoc(doc(db, 'users', uid, 'progress', examId), document);
    },
  };
}
