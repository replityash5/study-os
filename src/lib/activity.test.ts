import { describe, expect, it } from 'vitest';
import { advanceTimer } from '../hooks/useStudyTimer';
import {
  aggregateActivity,
  calculateStreaks,
  deriveWeakTopics,
  rollupTimeBySubject,
  splitTimeByDay,
} from './activity';
import type { ActivityDay } from '../types/activity';
import type { Syllabus } from '../types';
import { useActivityStore } from '../store/activityStore';
import type { ActivityAdapter } from '../services/activityAdapter';
import { formatLocalDay } from '../services/activityAdapter';

const syllabus: Syllabus = {
  exam: 'Exam A',
  subjects: [
    {
      id: 'subject-a',
      title_hi: 'विषय',
      title_en: 'Subject A',
      completed: false,
      progress: 0,
      topics: [
        {
          id: 'topic-a',
          title_hi: 'टॉपिक',
          title_en: 'Topic A',
          completed: false,
          revision: false,
          bookmarked: false,
          notes: '',
          progress: 0,
          children: [],
        },
      ],
    },
  ],
};

function day(day: string, studyMs: number, msByTopic: Record<string, number> = {}, statusChanges: ActivityDay['statusChanges'] = []): ActivityDay {
  return { day, studyMs, msByTopic, statusChanges };
}

describe('activity analytics logic', () => {
  it('splits active time at local midnight', () => {
    const start = new Date(2025, 0, 1, 23, 59, 30).getTime();
    const end = new Date(2025, 0, 2, 0, 0, 30).getTime();
    expect(splitTimeByDay(start, end)).toEqual([
      { day: '2025-01-01', milliseconds: 30_000 },
      { day: '2025-01-02', milliseconds: 30_000 },
    ]);
  });

  it('computes current and longest streaks', () => {
    const days = [
      day('2025-01-01', 1),
      day('2025-01-02', 0, {}, [{ examId: 'Exam A', topicId: 'topic-a', to: 'completed', at: '2025-01-02T10:00:00.000Z' }]),
      day('2025-01-04', 1),
      day('2025-01-05', 1),
    ];
    expect(calculateStreaks(days, '2025-01-05')).toEqual({ current: 2, longest: 2 });
    expect(calculateStreaks(days, '2025-01-06')).toEqual({ current: 2, longest: 2 });
  });

  it('rolls topic time up to its subject', () => {
    expect(aggregateActivity([
      day('2025-01-01', 100, { 'Exam A:topic-a': 100 }),
      day('2025-01-02', 50, { 'Exam A:topic-a': 50 }),
    ]).studyMs).toBe(150);
    expect(rollupTimeBySubject([day('2025-01-01', 120, { 'Exam A:topic-a': 120 })], [syllabus])).toEqual([
      { examId: 'Exam A', subjectId: 'subject-a', title: 'Subject A', milliseconds: 120 },
    ]);
  });

  it('derives revision and under-completed weak topics', () => {
    const revision = {
      ...syllabus,
      subjects: [{
        ...syllabus.subjects[0],
        topics: [
          syllabus.subjects[0].topics[0],
          { ...syllabus.subjects[0].topics[0], id: 'revision-topic', title_en: 'Revision Topic' },
        ],
      }],
    };
    const days = [day('2025-01-01', 6 * 60_000, { 'Exam A:topic-a': 6 * 60_000, 'Exam A:revision-topic': 1 })];
    const weak = deriveWeakTopics(days, [revision], { 'Exam A': { 'revision-topic': 'revision_due' } });
    expect(weak.map((item) => item.reason)).toEqual(['Needs reinforcement', 'Revision due']);
  });

  it('stops accruing after idle and while hidden', () => {
    const base = { topicRef: 'Exam A:topic-a', lastAt: 0, lastInteractionAt: 0, hidden: false };
    expect(advanceTimer(base, 30_000).milliseconds).toBe(30_000);
    expect(advanceTimer(base, 90_000).milliseconds).toBe(60_000);
    const hidden = advanceTimer(base, 30_000, true);
    expect(hidden.milliseconds).toBe(30_000);
    expect(advanceTimer(hidden.state, 60_000, true).milliseconds).toBe(0);
  });

  it('adds new time on top of a stored day after reload hydration', async () => {
    const today = formatLocalDay();
    const stored = day(today, 30 * 60_000, { 'Exam A:topic-a': 30 * 60_000 });
    const saved: { value: ActivityDay | null } = { value: null };
    const adapter: ActivityAdapter = {
      load: async () => stored,
      save: async (_day, value) => { saved.value = value; },
      list: async () => ({ [today]: stored }),
    };
    const store = useActivityStore.getState();
    store.clear();
    store.setAdapter(adapter);
    await new Promise((resolve) => setTimeout(resolve, 0));
    useActivityStore.getState().recordStudyTime('Exam A:topic-a', 10 * 60_000);
    useActivityStore.getState().flushPersistence();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(saved.value?.studyMs).toBe(40 * 60_000);
    expect(saved.value?.msByTopic['Exam A:topic-a']).toBe(40 * 60_000);
    useActivityStore.getState().clear();
  });
});
