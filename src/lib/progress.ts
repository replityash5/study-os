import type { Topic, TopicStatus } from '../types';

export function getLeaves(topics: Topic[]): Topic[] {
  return topics.flatMap((topic) => (topic.children.length ? getLeaves(topic.children) : [topic]));
}
export function calculateProgress(
  topics: Topic[],
  statusMap: Record<string, TopicStatus> = {},
): {
  completedLeaves: number;
  totalLeaves: number;
  percentage: number;
} {
  const leaves = getLeaves(topics);
  const completedLeaves = leaves.filter((leaf) => {
    const status = statusForTopic(leaf, statusMap);
    return status === 'completed' || status === 'mastered';
  }).length;
  return {
    completedLeaves,
    totalLeaves: leaves.length,
    percentage: leaves.length ? Math.round((completedLeaves / leaves.length) * 100) : 0,
  };
}
export function cascadeStatus(topic: Topic, status: TopicStatus): Topic {
  const completed = status === 'completed' || status === 'mastered';
  return {
    ...topic,
    completed,
    children: topic.children.map((child) => cascadeStatus(child, status)),
  };
}
export function clearDescendants(topic: Topic): Topic {
  return { ...topic, completed: false, children: topic.children.map(clearDescendants) };
}
export function updateCompletion(topics: Topic[], id: string, checked: boolean): Topic[] {
  const visit = (items: Topic[]): Topic[] =>
    items.map((topic) => {
      if (topic.id === id)
        return checked ? cascadeStatus(topic, 'completed') : clearDescendants(topic);
      if (!topic.children.length) return topic;
      const children = visit(topic.children);
      return {
        ...topic,
        children,
        completed: children.length > 0 && children.every((child) => child.completed),
      };
    });
  return visit(topics);
}
export function statusForTopic(topic: Topic, statusMap: Record<string, TopicStatus>): TopicStatus {
  if (statusMap[topic.id]) return statusMap[topic.id];
  return topic.completed ? 'completed' : topic.progress > 0 ? 'learning' : 'not_started';
}

export function getTopicById(topics: Topic[], id: string): Topic | null {
  for (const topic of topics) {
    if (topic.id === id) return topic;
    const nested = getTopicById(topic.children, id);
    if (nested) return nested;
  }
  return null;
}

export function getCompletionAffectedIds(topics: Topic[], id: string): string[] {
  function collectDescendantIds(topic: Topic): string[] {
    return [topic.id, ...topic.children.flatMap(collectDescendantIds)];
  }

  function visit(items: Topic[]): { found: boolean; ids: string[] } {
    for (const topic of items) {
      if (topic.id === id) return { found: true, ids: collectDescendantIds(topic) };
      const nested = visit(topic.children);
      if (nested.found) return { found: true, ids: [topic.id, ...nested.ids] };
    }
    return { found: false, ids: [] };
  }

  return visit(topics).ids;
}
