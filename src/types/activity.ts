import type { TopicStatus } from './index';

export interface ActivityStatusChange {
  topicId: string;
  examId: string;
  to: TopicStatus;
  at: string;
}

export interface ActivityDay {
  day: string;
  studyMs: number;
  msByTopic: Record<string, number>;
  statusChanges: ActivityStatusChange[];
}
