import { collection, doc, getDoc, getDocs, setDoc, where, query } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ActivityDay } from '../types/activity';
import type { ActivityAdapter } from './activityAdapter';

export function firestoreActivityAdapter(uid: string): ActivityAdapter {
  return {
    async load(day) {
      const snapshot = await getDoc(doc(db, 'users', uid, 'activity', day));
      return snapshot.exists() ? (snapshot.data() as ActivityDay) : null;
    },
    async save(day, activity) {
      await setDoc(doc(db, 'users', uid, 'activity', day), activity);
    },
    async list(days) {
      const chunks: string[][] = [];
      for (let index = 0; index < days.length; index += 30) chunks.push(days.slice(index, index + 30));
      const snapshots = await Promise.all(
        chunks.map((chunk) =>
          getDocs(query(collection(db, 'users', uid, 'activity'), where('day', 'in', chunk))),
        ),
      );
      return Object.fromEntries(
        snapshots.flatMap((snapshot) => snapshot.docs.map((item) => [item.id, item.data() as ActivityDay])),
      );
    },
  };
}
