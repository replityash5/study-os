import type { ActivityDay } from '../types/activity';

export interface ActivityAdapter {
  load(day: string): Promise<ActivityDay | null>;
  save(day: string, activity: ActivityDay): Promise<void>;
  list(days: string[]): Promise<Record<string, ActivityDay>>;
}

export const ACTIVITY_RETENTION_DAYS = 180;

export function emptyActivityDay(day: string): ActivityDay {
  return { day, studyMs: 0, msByTopic: {}, statusChanges: [] };
}

export function mergeActivityDays(left: ActivityDay | null, right: ActivityDay | null): ActivityDay | null {
  if (!left) return right;
  if (!right) return left;
  const statusChanges = [...left.statusChanges, ...right.statusChanges].filter(
    (event, index, events) =>
      events.findIndex(
        (candidate) =>
          candidate.examId === event.examId &&
          candidate.topicId === event.topicId &&
          candidate.at === event.at &&
          candidate.to === event.to,
      ) === index,
  );
  const msByTopic = { ...left.msByTopic };
  for (const [topicRef, milliseconds] of Object.entries(right.msByTopic)) {
    msByTopic[topicRef] = Math.max(msByTopic[topicRef] ?? 0, milliseconds);
  }
  return {
    day: left.day,
    // Same-day cloud/local merges use the larger value to avoid double-counting
    // overlapping sessions. Distinct future sessions are saved into fresh buckets.
    studyMs: Math.max(left.studyMs, right.studyMs),
    msByTopic,
    statusChanges,
  };
}

function retainedDay(day: string) {
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - ACTIVITY_RETENTION_DAYS + 1);
  return day >= formatDay(cutoff);
}

function formatDay(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const localActivityAdapter: ActivityAdapter = {
  async load(day) {
    if (!retainedDay(day)) return null;
    const raw = localStorage.getItem(`study-os-activity-${day}`);
    return raw ? (JSON.parse(raw) as ActivityDay) : null;
  },
  async save(day, activity) {
    if (!retainedDay(day)) return;
    const existing = await localActivityAdapter.load(day);
    const merged = mergeActivityDays(existing, activity) ?? activity;
    localStorage.setItem(`study-os-activity-${day}`, JSON.stringify(merged));
    for (const key of Object.keys(localStorage)) {
      if (!key.startsWith('study-os-activity-')) continue;
      if (!retainedDay(key.replace('study-os-activity-', ''))) localStorage.removeItem(key);
    }
  },
  async list(days) {
    const entries = await Promise.all(days.map(async (day) => [day, await localActivityAdapter.load(day)] as const));
    return Object.fromEntries(entries.filter(([, value]) => value)) as Record<string, ActivityDay>;
  },
};

export function formatLocalDay(date = new Date()) {
  return formatDay(date);
}

export function daysBetween(end = new Date(), count = 7) {
  const days: string[] = [];
  const cursor = new Date(end);
  cursor.setHours(0, 0, 0, 0);
  for (let index = count - 1; index >= 0; index -= 1) {
    const day = new Date(cursor);
    day.setDate(cursor.getDate() - index);
    days.push(formatDay(day));
  }
  return days;
}
