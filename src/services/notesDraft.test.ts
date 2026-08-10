import { beforeEach, describe, expect, it } from 'vitest';
import { clearDraft, recoverDraft, saveDraft } from './notesDraft';

describe('notes draft recovery', () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
      clear: () => values.clear(),
      key: () => null,
      length: 0,
    } as Storage;
  });

  it('recovers a draft that differs from the saved note', () => {
    saveDraft('topic-1', 'unsaved text');
    expect(recoverDraft('topic-1', 'saved text')).toBe('unsaved text');
  });

  it('does not recover a matching draft and clears empty drafts', () => {
    saveDraft('topic-1', 'saved text');
    expect(recoverDraft('topic-1', 'saved text')).toBeNull();
    clearDraft('topic-1');
    expect(localStorage.getItem('study-os-note-draft-topic-1')).toBeNull();
  });
});
