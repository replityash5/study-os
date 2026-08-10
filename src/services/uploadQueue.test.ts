import { describe, expect, it, vi } from 'vitest';
import { createUploadQueue, type UploadOne } from './uploadQueue';
import type { Asset } from '../types';

function assetFor(file: File, topicId: string): Asset {
  return {
    assetId: `${topicId}-${file.name}`,
    topicId,
    type: 'image',
    title: file.name,
    driveFileId: '',
    createdAt: new Date().toISOString(),
  };
}

function file(name: string, size = 10) {
  return new File([new Uint8Array(size)], name, { type: 'image/png', lastModified: 1 });
}

describe('upload queue', () => {
  it('never exceeds the configured concurrency', async () => {
    let active = 0;
    let maximum = 0;
    const uploadOne: UploadOne = async (item, topicId) => {
      active += 1;
      maximum = Math.max(maximum, active);
      await Promise.resolve();
      active -= 1;
      return assetFor(item, topicId);
    };
    const queue = createUploadQueue(
      [file('a'), file('b'), file('c'), file('d')].map((item) => ({
        file: item,
        topicId: 'topic',
      })),
      uploadOne,
      { concurrency: 2 },
    );

    await queue.start();

    expect(maximum).toBeLessThanOrEqual(2);
    expect(queue.tasks.every((task) => task.status === 'uploaded')).toBe(true);
  });

  it('retries transient failures with backoff', async () => {
    const sleep = vi.fn(async () => undefined);
    let attempts = 0;
    const uploadOne: UploadOne = async (item, topicId) => {
      attempts += 1;
      if (attempts === 1) throw Object.assign(new Error('rate limited'), { status: 429 });
      return assetFor(item, topicId);
    };
    const queue = createUploadQueue([{ file: file('retry'), topicId: 'topic' }], uploadOne, {
      maxRetries: 2,
      retryDelayMs: 10,
      sleep,
    });

    await queue.start();

    expect(attempts).toBe(2);
    expect(sleep).toHaveBeenCalledWith(10);
    expect(queue.tasks[0].status).toBe('uploaded');
  });

  it('retries an authorization interruption instead of permanently failing', async () => {
    const sleep = vi.fn(async () => undefined);
    let attempts = 0;
    const uploadOne: UploadOne = async (item, topicId) => {
      attempts += 1;
      if (attempts === 1) throw Object.assign(new Error('token expired'), { status: 401 });
      return assetFor(item, topicId);
    };
    const queue = createUploadQueue([{ file: file('auth-retry'), topicId: 'topic' }], uploadOne, {
      maxRetries: 1,
      retryDelayMs: 10,
      sleep,
    });

    await queue.start();

    expect(attempts).toBe(2);
    expect(sleep).toHaveBeenCalledWith(10);
    expect(queue.tasks[0].status).toBe('uploaded');
  });

  it('preserves successful files when another file fails', async () => {
    const uploadOne: UploadOne = async (item, topicId) => {
      if (item.name === 'bad') {
        throw Object.assign(new Error('invalid file'), { transient: false });
      }
      return assetFor(item, topicId);
    };
    const queue = createUploadQueue(
      [
        { file: file('good'), topicId: 'topic' },
        { file: file('bad'), topicId: 'topic' },
      ],
      uploadOne,
      { maxRetries: 2 },
    );

    await queue.start();

    expect(queue.tasks.map((task) => task.status)).toEqual(['uploaded', 'failed']);
    expect(queue.tasks[0].asset?.title).toBe('good');
  });

  it('does not retry unknown permanent errors', async () => {
    const sleep = vi.fn(async () => undefined);
    let attempts = 0;
    const uploadOne: UploadOne = async () => {
      attempts += 1;
      throw new Error('permanent failure');
    };
    const queue = createUploadQueue([{ file: file('permanent'), topicId: 'topic' }], uploadOne, {
      maxRetries: 3,
      sleep,
    });

    await queue.start();

    expect(attempts).toBe(1);
    expect(sleep).not.toHaveBeenCalled();
    expect(queue.tasks[0].status).toBe('failed');
  });

  it('reports successful assets as soon as each upload completes', async () => {
    const completed: string[] = [];
    const uploadOne: UploadOne = async (item, topicId) => {
      await Promise.resolve();
      return assetFor(item, topicId);
    };
    const queue = createUploadQueue([{ file: file('progressive'), topicId: 'topic' }], uploadOne, {
      onSuccess: (_task, asset) => {
        completed.push(asset.title);
      },
    });

    await queue.start();

    expect(completed).toEqual(['progressive']);
  });

  it('fails when persistence fails and retries persistence without re-uploading', async () => {
    let uploads = 0;
    let saves = 0;
    const uploadOne: UploadOne = async (item, topicId) => {
      uploads += 1;
      return assetFor(item, topicId);
    };
    const queue = createUploadQueue([{ file: file('persist'), topicId: 'topic' }], uploadOne, {
      onSuccess: async () => {
        saves += 1;
        if (saves === 1) throw new Error('permission denied');
      },
    });

    await queue.start();

    expect(queue.tasks[0].status).toBe('failed');
    expect(queue.tasks[0].error).toBe('permission denied');
    expect(queue.tasks[0].asset?.title).toBe('persist');

    await queue.retry(queue.tasks[0].id);

    expect(uploads).toBe(1);
    expect(saves).toBe(2);
    expect(queue.tasks[0].status).toBe('uploaded');
  });
});
