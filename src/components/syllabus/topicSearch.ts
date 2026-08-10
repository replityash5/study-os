import type { Topic } from '../../types';

export function topicMatches(topic: Topic, query: string): boolean {
  const normalizedQuery = query.toLocaleLowerCase();
  return (
    !query ||
    topic.title_en.toLocaleLowerCase().includes(normalizedQuery) ||
    topic.title_hi.includes(query) ||
    topic.children.some((child) => topicMatches(child, query))
  );
}
