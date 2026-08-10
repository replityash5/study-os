import { create } from 'zustand';
import type { ActivityDay } from '../types/activity';
import { emptyActivityDay, formatLocalDay, localActivityAdapter, mergeActivityDays, type ActivityAdapter } from '../services/activityAdapter';
import { addStudyTime, recordStatusChange, splitTimeByDay } from '../lib/activity';
import type { TopicStatus } from '../types';
import { firestoreActivityAdapter } from '../services/firestoreActivityAdapter';

interface ActivityState {
  days: Record<string, ActivityDay>;
  loadedRange: { start: string; end: string } | null;
  adapter: ActivityAdapter;
  setAdapter: (adapter: ActivityAdapter) => void;
  recordStudyTime: (topicRef: string, milliseconds: number, at?: Date) => void;
  recordInterval: (topicRef: string, startMs: number, endMs: number) => void;
  recordStatusChange: (examId: string, topicId: string, to: TopicStatus, at?: Date) => void;
  hydrateRange: (days: string[]) => Promise<void>;
  clear: () => void;
}

export const useActivityStore = create<ActivityState>((set, get) => ({
  days: {},
  loadedRange: null,
  adapter: localActivityAdapter,
  setAdapter: (adapter) => set({ adapter }),
  recordStudyTime: (topicRef, milliseconds, at = new Date()) => {
    const day = formatLocalDay(at);
    const next = addStudyTime(get().days[day] ?? emptyActivityDay(day), topicRef, milliseconds);
    set((state) => ({ days: { ...state.days, [day]: next } }));
    void get().adapter.save(day, next);
  },
  recordInterval: (topicRef, startMs, endMs) => {
    for (const segment of splitTimeByDay(startMs, endMs)) get().recordStudyTime(topicRef, segment.milliseconds, new Date(`${segment.day}T12:00:00`));
  },
  recordStatusChange: (examId, topicId, to, at = new Date()) => {
    const day = formatLocalDay(at);
    const next = recordStatusChange(get().days[day] ?? emptyActivityDay(day), { examId, topicId, to, at: at.toISOString() });
    set((state) => ({ days: { ...state.days, [day]: next } }));
    void get().adapter.save(day, next);
  },
  hydrateRange: async (days) => {
    const loaded = await get().adapter.list(days);
    set((state) => {
      const merged = { ...state.days };
      for (const day of days) merged[day] = mergeActivityDays(merged[day], loaded[day]) ?? emptyActivityDay(day);
      return { days: merged, loadedRange: days.length ? { start: days[0], end: days[days.length - 1] } : null };
    });
  },
  clear: () => set({ days: {}, loadedRange: null }),
}));

export function activityAdapterForUser(uid: string) {
  return firestoreActivityAdapter(uid);
}
