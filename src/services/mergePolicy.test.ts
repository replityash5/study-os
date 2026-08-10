import { describe, expect, it } from 'vitest';
import { mergeProgress } from './mergePolicy';

describe('mergeProgress', () => {
  it('unions completed topics on the first sign-in', () => {
    const result = mergeProgress(
      {
        statusMap: { local: 'completed', shared: 'learning' },
        updatedAt: '2025-01-01T00:00:00.000Z',
      },
      {
        statusMap: { remote: 'completed', shared: 'not_started' },
        updatedAt: '2025-01-02T00:00:00.000Z',
      },
      false,
      '2025-01-03T00:00:00.000Z',
    );
    expect(result.statusMap).toEqual({
      local: 'completed',
      remote: 'completed',
      shared: 'learning',
    });
    expect(result.mergedAt).toBe('2025-01-03T00:00:00.000Z');
  });

  it('uses updatedAt for last-write-wins after the first merge', () => {
    const local = {
      statusMap: { topic: 'learning' as const },
      updatedAt: '2025-01-03T00:00:00.000Z',
    };
    const remote = {
      statusMap: { topic: 'completed' as const },
      updatedAt: '2025-01-02T00:00:00.000Z',
    };
    expect(mergeProgress(local, remote, true)).toBe(local);
    expect(mergeProgress(remote, local, true)).toBe(local);
  });
});
