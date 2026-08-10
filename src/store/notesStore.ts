import { create } from 'zustand';
import type { Note } from '../types';

interface NotesState {
  notes: Record<string, Note>;
  setNote: (note: Note) => void;
  clear: () => void;
}

export const useNotesStore = create<NotesState>((set) => ({
  notes: {},
  setNote: (note) => set((state) => ({ notes: { ...state.notes, [note.topicId]: note } })),
  clear: () => set({ notes: {} }),
}));
