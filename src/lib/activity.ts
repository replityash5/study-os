import type { ActivityDay, ActivityStatusChange } from '../types/activity';
import type { Syllabus, TopicStatus } from '../types';
import { emptyActivityDay, formatLocalDay } from '../services/activityAdapter';

export type TimeSegment = { day: string; milliseconds: number };

export function dayKey(date: Date) {
  return formatLocalDay(date);
}

export function splitTimeByDay(startMs: number, endMs: number): TimeSegment[] {
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return [];
  const segments: TimeSegment[] = [];
  let cursor = startMs;
  while (cursor < endMs) {
    const start = new Date(cursor);
    const nextDay = new Date(start);
    nextDay.setHours(24, 0, 0, 0);
    const end = Math.min(endMs, nextDay.getTime());
    segments.push({ day: dayKey(start), milliseconds: end - cursor });
    cursor = end;
  }
  return segments;
}

export function addStudyTime(activity: ActivityDay, topicRef: string, milliseconds: number): ActivityDay {
  const safeMs = Math.max(0, Math.min(milliseconds, 15 * 60 * 1000));
  if (!safeMs) return activity;
  return {
    ...activity,
    studyMs: activity.studyMs + safeMs,
    msByTopic: { ...activity.msByTopic, [topicRef]: (activity.msByTopic[topicRef] ?? 0) + safeMs },
  };
}

export function recordStatusChange(
  activity: ActivityDay,
  event: Omit<ActivityStatusChange, 'at'> & { at?: string },
): ActivityDay {
  const nextEvent = { ...event, at: event.at ?? new Date().toISOString() };
  return {
    ...activity,
    statusChanges: activity.statusChanges.some(
      (item) => item.topicId === nextEvent.topicId && item.examId === nextEvent.examId && item.at === nextEvent.at,
    )
      ? activity.statusChanges
      : [...activity.statusChanges, nextEvent],
  };
}

export function aggregateActivity(days: ActivityDay[]) {
  return days.reduce(
    (total, day) => {
      total.studyMs += Math.max(0, day.studyMs);
      for (const [topicRef, milliseconds] of Object.entries(day.msByTopic)) {
        total.msByTopic[topicRef] = (total.msByTopic[topicRef] ?? 0) + Math.max(0, milliseconds);
      }
      total.statusChanges.push(...day.statusChanges);
      return total;
    },
    { studyMs: 0, msByTopic: {} as Record<string, number>, statusChanges: [] as ActivityStatusChange[] },
  );
}

export function calculateStreaks(days: ActivityDay[], today = dayKey(new Date())) {
  const active = new Set(days.filter((day) => day.studyMs > 0).map((day) => day.day));
  const cursor = new Date(`${today}T00:00:00`);
  let current = 0;
  if (active.has(today)) {
    while (active.has(dayKey(cursor))) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  } else {
    cursor.setDate(cursor.getDate() - 1);
    while (active.has(dayKey(cursor))) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
  }
  const sorted = [...active].sort();
  let longest = 0;
  let run = 0;
  let previous: Date | null = null;
  for (const value of sorted) {
    const date = new Date(`${value}T00:00:00`);
    if (previous && date.getTime() - previous.getTime() === 86_400_000) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    previous = date;
  }
  return { current, longest };
}

export function completedTopicsInRange(days: ActivityDay[]) {
  return new Set(
    days.flatMap((day) =>
      day.statusChanges.filter((event) => event.to === 'completed' || event.to === 'mastered').map((event) => `${event.examId}:${event.topicId}`),
    ),
  ).size;
}

export type SubjectTime = { examId: string; subjectId: string; title: string; milliseconds: number };

export function rollupTimeBySubject(days: ActivityDay[], syllabi: Syllabus[]): SubjectTime[] {
  const time = aggregateActivity(days).msByTopic;
  return syllabi.flatMap((syllabus) =>
    syllabus.subjects.map((subject) => {
      const topicIds = new Set<string>();
      const visit = (topics: typeof subject.topics) => topics.forEach((topic) => {
        topicIds.add(topic.id);
        visit(topic.children);
      });
      visit(subject.topics);
      const milliseconds = Object.entries(time)
        .filter(([ref]) => ref.startsWith(`${syllabus.exam}:`) && topicIds.has(ref.slice(syllabus.exam.length + 1)))
        .reduce((sum, [, value]) => sum + value, 0);
      return { examId: syllabus.exam, subjectId: subject.id, title: subject.title_en, milliseconds };
    }),
  ).filter((item) => item.milliseconds > 0);
}

export function deriveWeakTopics(
  days: ActivityDay[],
  syllabi: Syllabus[],
  statusMaps: Record<string, Record<string, TopicStatus>>,
  meaningfulMs = 5 * 60 * 1000,
) {
  const time = aggregateActivity(days).msByTopic;
  return syllabi.flatMap((syllabus) =>
    syllabus.subjects.flatMap((subject) => {
      const walk = (topics: typeof subject.topics): Array<{ topicId: string; examId: string; title: string; reason: string; milliseconds: number }> =>
        topics.flatMap((topic) => {
          const ref = `${syllabus.exam}:${topic.id}`;
          const status = statusMaps[syllabus.exam]?.[topic.id] ?? (topic.completed ? 'completed' : 'not_started');
          const milliseconds = time[ref] ?? 0;
          const reason = status === 'revision_due' ? 'Revision due' : milliseconds >= meaningfulMs && status !== 'completed' && status !== 'mastered' ? 'Needs reinforcement' : '';
          return [
            ...(reason ? [{ topicId: topic.id, examId: syllabus.exam, title: topic.title_en, reason, milliseconds }] : []),
            ...walk(topic.children),
          ];
        });
      return walk(subject.topics);
    }),
  );
}

export function emptyDay(day = dayKey(new Date())) {
  return emptyActivityDay(day);
}
