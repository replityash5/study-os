import { create } from 'zustand';
import type { ActivityDay } from '../types/activity';
import { emptyActivityDay, formatLocalDay, localActivityAdapter, type ActivityAdapter } from '../services/activityAdapter';
import { addActivity, addStudyTime, recordStatusChange, splitTimeByDay } from '../lib/activity';
import type { TopicStatus } from '../types';

interface ActivityState {
  days: Record<string, ActivityDay>;
  loadedRange: { start: string; end: string } | null;
  adapter: ActivityAdapter;
  setAdapter: (adapter: ActivityAdapter) => void;
  recordStudyTime: (topicRef: string, milliseconds: number, at?: Date) => void;
  recordInterval: (topicRef: string, startMs: number, endMs: number) => void;
  recordStatusChange: (examId: string, topicId: string, to: TopicStatus, at?: Date) => void;
  hydrateRange: (days: string[]) => Promise<void>;
  flushPersistence: () => void;
  clear: () => void;
}

const pendingByDay: Record<string, ActivityDay> = {};
const hydratedDays: Record<string, boolean> = {};
const persistTimers = new Map<string, ReturnType<typeof globalThis.setTimeout>>();
const persistPromises = new Map<string, Promise<void>>();
let adapterVersion = 0;

export const useActivityStore = create<ActivityState>((set, get) => {
  const schedulePersistence = (day: string, immediate = false) => {
    const existingTimer = persistTimers.get(day);
    if (existingTimer) globalThis.clearTimeout(existingTimer);
    if (immediate) {
      persistTimers.delete(day);
      void persistDay(day);
      return;
    }
    persistTimers.set(day, globalThis.setTimeout(() => {
      persistTimers.delete(day);
      void persistDay(day);
    }, 45_000));
  };
  const persistDay = async (day: string): Promise<void> => {
    const running = persistPromises.get(day);
    if (running) {
      await running;
      if (pendingByDay[day]) await persistDay(day);
      return;
    }
    const delta = pendingByDay[day];
    if (!delta) return;
    delete pendingByDay[day];
    const adapter = get().adapter;
    const version = adapterVersion;
    const promise = (async () => {
      const baseline = await adapter.load(day);
      if (version !== adapterVersion || adapter !== get().adapter) {
        return;
      }
      await adapter.save(day, addActivity(baseline ?? emptyActivityDay(day), delta));
    })();
    persistPromises.set(day, promise);
    try {
      await promise;
    } finally {
      persistPromises.delete(day);
      if (pendingByDay[day]) schedulePersistence(day);
    }
  };
  const addPending = (day: string, delta: ActivityDay) => {
    pendingByDay[day] = addActivity(pendingByDay[day] ?? emptyActivityDay(day), delta);
    if (hydratedDays[day]) schedulePersistence(day);
  };
  return {
  days: {},
  loadedRange: null,
  adapter: localActivityAdapter,
  setAdapter: (adapter) => {
    adapterVersion += 1;
    for (const timer of persistTimers.values()) globalThis.clearTimeout(timer);
    persistTimers.clear();
    Object.keys(pendingByDay).forEach((day) => delete pendingByDay[day]);
    Object.keys(hydratedDays).forEach((day) => delete hydratedDays[day]);
    set({ adapter, days: {}, loadedRange: null });
    void get().hydrateRange([formatLocalDay()]);
  },
  recordStudyTime: (topicRef, milliseconds, at = new Date()) => {
    const day = formatLocalDay(at);
    const delta = addStudyTime(emptyActivityDay(day), topicRef, milliseconds);
    const next = addActivity(get().days[day] ?? emptyActivityDay(day), delta);
    set((state) => ({ days: { ...state.days, [day]: next } }));
    addPending(day, delta);
  },
  recordInterval: (topicRef, startMs, endMs) => {
    for (const segment of splitTimeByDay(startMs, endMs)) get().recordStudyTime(topicRef, segment.milliseconds, new Date(`${segment.day}T12:00:00`));
  },
  recordStatusChange: (examId, topicId, to, at = new Date()) => {
    const day = formatLocalDay(at);
    const delta = recordStatusChange(emptyActivityDay(day), { examId, topicId, to, at: at.toISOString() });
    const next = addActivity(get().days[day] ?? emptyActivityDay(day), delta);
    set((state) => ({ days: { ...state.days, [day]: next } }));
    addPending(day, delta);
  },
  hydrateRange: async (days) => {
    const adapter = get().adapter;
    const version = adapterVersion;
    const loaded = await adapter.list(days);
    if (version !== adapterVersion || adapter !== get().adapter) return;
    set((state) => {
      const merged = { ...state.days };
      for (const day of days) {
        if (hydratedDays[day]) continue;
        merged[day] = addActivity(loaded[day] ?? emptyActivityDay(day), pendingByDay[day] ?? emptyActivityDay(day));
        hydratedDays[day] = true;
        if (pendingByDay[day]) schedulePersistence(day);
      }
      return { days: merged, loadedRange: days.length ? { start: days[0], end: days[days.length - 1] } : null };
    });
  },
  flushPersistence: () => {
    for (const day of Object.keys(pendingByDay)) schedulePersistence(day, true);
  },
  clear: () => {
    adapterVersion += 1;
    for (const timer of persistTimers.values()) globalThis.clearTimeout(timer);
    persistTimers.clear();
    Object.keys(pendingByDay).forEach((day) => delete pendingByDay[day]);
    Object.keys(hydratedDays).forEach((day) => delete hydratedDays[day]);
    set({ days: {}, loadedRange: null });
  },
  };
});
