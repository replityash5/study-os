import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Note } from '../types';
import type { NotesAdapter } from './notesAdapter';

export function firestoreNotesAdapter(uid: string): NotesAdapter {
  return {
    async load(topicId) {
      const snapshot = await getDoc(doc(db, 'users', uid, 'notes', topicId));
      return snapshot.exists() ? (snapshot.data() as Note) : null;
    },
    async save(note) {
      await setDoc(doc(db, 'users', uid, 'notes', note.topicId), note);
    },
  };
}
