import { describe, expect, it } from 'vitest';
import { ensureRelativeFolderPath } from './driveApi';

describe('Drive folder paths', () => {
  it('shares concurrent folder creation for the same relative path', async () => {
    const calls: string[] = [];
    const folderIds = new Map<string, string>();
    const pending = new Map<string, Promise<string>>();
    const ensureFolder = async (name: string, parentId: string) => {
      const key = `${parentId}/${name}`;
      const existing = pending.get(key);
      if (existing) return existing;
      const promise = (async () => {
        calls.push(key);
        await Promise.resolve();
        const id = folderIds.get(key) ?? `folder-${folderIds.size + 1}`;
        folderIds.set(key, id);
        return id;
      })();
      pending.set(key, promise);
      try {
        return await promise;
      } finally {
        pending.delete(key);
      }
    };

    const paths = await Promise.all([
      ensureRelativeFolderPath(
        'root',
        'study-os-drive-test/nested/deeper/sample.mp3',
        ensureFolder,
      ),
      ensureRelativeFolderPath(
        'root',
        'study-os-drive-test/nested/deeper/sample.mp4',
        ensureFolder,
      ),
      ensureRelativeFolderPath(
        'root',
        'study-os-drive-test/nested/deeper/sample.pdf',
        ensureFolder,
      ),
    ]);

    expect(paths).toEqual(['folder-3', 'folder-3', 'folder-3']);
    expect(calls).toEqual(['root/study-os-drive-test', 'folder-1/nested', 'folder-2/deeper']);
  });
});
