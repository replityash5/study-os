import type { Note } from '../types';

export interface NotesAdapter {
  load(topicId: string): Promise<Note | null>;
  save(note: Note): Promise<void>;
}

export const localNotesAdapter: NotesAdapter = {
  async load(topicId) {
    const raw = localStorage.getItem(`study-os-note-${topicId}`);
    return raw ? (JSON.parse(raw) as Note) : null;
  },
  async save(note) {
    localStorage.setItem(`study-os-note-${note.topicId}`, JSON.stringify(note));
  },
};
