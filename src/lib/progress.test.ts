import { describe, expect, it } from 'vitest';
import type { Topic } from '../types';
import { calculateProgress, statusForTopic, updateCompletion } from './progress';

const leaf = (id: string, completed = false): Topic => ({
  id,
  title_hi: id,
  title_en: id,
  completed,
  revision: false,
  bookmarked: false,
  notes: '',
  progress: 0,
  children: [],
});

const branch = (id: string, children: Topic[], completed = false): Topic => ({
  ...leaf(id, completed),
  children,
});

describe('progress rules', () => {
  it('counts only leaf nodes', () => {
    const topics = [branch('parent', [leaf('a', true), leaf('b')])];
    expect(calculateProgress(topics)).toEqual({
      completedLeaves: 1,
      totalLeaves: 2,
      percentage: 50,
    });
  });

  it('cascades completion from a parent to every descendant', () => {
    const topics = [branch('parent', [leaf('a'), leaf('b')])];
    const completed = updateCompletion(topics, 'parent', true);

    expect(completed[0].completed).toBe(true);
    expect(completed[0].children.every((topic) => topic.completed)).toBe(true);
  });

  it('completes the parent and grandparent when the last sibling is checked', () => {
    const topics = [
      branch('grandparent', [
        branch('parent', [leaf('first', true), leaf('last')]),
        leaf('sibling', true),
      ]),
    ];
    const completed = updateCompletion(topics, 'last', true);

    expect(completed[0].children[0].completed).toBe(true);
    expect(completed[0].completed).toBe(true);
  });

  it('clears ancestor completion when unchecking a leaf but preserves siblings', () => {
    const topics = [branch('parent', [leaf('checked', true), leaf('sibling', true)], true)];
    const updated = updateCompletion(topics, 'checked', false);

    expect(updated[0].completed).toBe(false);
    expect(updated[0].children[0].completed).toBe(false);
    expect(updated[0].children[1].completed).toBe(true);
  });

  it('handles completion through three or more nested levels', () => {
    const topics = [branch('level-1', [branch('level-2', [branch('level-3', [leaf('deep')])])])];
    const updated = updateCompletion(topics, 'deep', true);

    expect(updated[0].completed).toBe(true);
    expect(updated[0].children[0].completed).toBe(true);
    expect(updated[0].children[0].children[0].completed).toBe(true);
  });

  it('calculates a mixed-tree percentage', () => {
    const topics = [
      branch('one', [leaf('one-a', true), leaf('one-b')]),
      branch('two', [branch('two-a', [leaf('two-a-i', true), leaf('two-a-ii', true)])]),
      leaf('three', true),
    ];

    expect(calculateProgress(topics).percentage).toBe(80);
  });

  it('resolves explicit and derived topic statuses', () => {
    expect(statusForTopic(leaf('new'), {})).toBe('not_started');
    expect(statusForTopic({ ...leaf('learning'), progress: 20 }, {})).toBe('learning');
    expect(statusForTopic(leaf('done', true), {})).toBe('completed');
    expect(statusForTopic(leaf('override'), { override: 'mastered' })).toBe('mastered');
  });

  it('clears descendants when unchecking a parent', () => {
    const topics = [branch('parent', [leaf('child', true)], true)];
    expect(updateCompletion(topics, 'parent', false)[0].children[0].completed).toBe(false);
  });
});
