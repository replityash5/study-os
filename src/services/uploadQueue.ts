import type { Asset, UploadProgress, UploadTask } from '../types';

export interface UploadOne {
  (
    file: File,
    topicId: string,
    signal: AbortSignal,
    onProgress: (bytesUploaded: number) => void,
  ): Promise<Asset>;
}

export interface UploadQueueOptions {
  concurrency?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
  onUpdate?: (tasks: UploadTask[], progress: UploadProgress) => void;
  onSuccess?: (task: UploadTask, asset: Asset) => void | Promise<void>;
}

export interface UploadQueue {
  tasks: UploadTask[];
  start: () => Promise<void>;
  cancel: () => void;
  retry: (taskId: string) => Promise<void>;
}

function isTransient(error: unknown) {
  if (typeof error === 'object' && error !== null && 'transient' in error) {
    return Boolean(error.transient);
  }
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = Number(error.status);
    return status === 401 || status === 429 || status >= 500;
  }
  if (error instanceof TypeError) return true;
  if (error instanceof Error && error.name === 'NetworkError') return true;
  return false;
}

function defaultSleep(milliseconds: number) {
  return new Promise<void>((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

export function createUploadQueue(
  files: Array<{ file: File; topicId: string }>,
  uploadOne: UploadOne,
  options: UploadQueueOptions = {},
): UploadQueue {
  const concurrency = Math.max(1, options.concurrency ?? 3);
  const maxRetries = Math.max(0, options.maxRetries ?? 3);
  const retryDelayMs = options.retryDelayMs ?? 400;
  const sleep = options.sleep ?? defaultSleep;
  const tasks = files.map<UploadTask>(({ file, topicId }, index) => ({
    id: `${topicId}-${file.name}-${file.lastModified}-${index}`,
    file,
    topicId,
    status: 'queued',
    progress: 0,
    error: null,
    asset: null,
  }));
  const controllers = new Map<string, AbortController>();
  const cancelledTaskIds = new Set<string>();
  let runPromise: Promise<void> | null = null;

  function progressSnapshot(): UploadProgress {
    return {
      completed: tasks.filter((task) => task.status === 'uploaded').length,
      total: tasks.length,
      bytesUploaded: tasks.reduce(
        (total, task) => total + Math.round(task.file.size * task.progress),
        0,
      ),
      bytesTotal: tasks.reduce((total, task) => total + task.file.size, 0),
    };
  }

  function notify() {
    options.onUpdate?.([...tasks], progressSnapshot());
  }

  async function process(task: UploadTask) {
    task.status = 'uploading';
    task.error = null;
    notify();
    const controller = new AbortController();
    controllers.set(task.id, controller);

    if (task.asset) {
      try {
        await options.onSuccess?.(task, task.asset);
        task.status = 'uploaded';
        notify();
      } catch (saveError) {
        task.status = 'failed';
        task.error = saveError instanceof Error ? saveError.message : 'Asset save failed';
        notify();
      } finally {
        controllers.delete(task.id);
      }
      return;
    }

    try {
      for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
        if (cancelledTaskIds.has(task.id)) {
          throw new DOMException('Upload cancelled', 'AbortError');
        }
        try {
          const uploadedAsset = await uploadOne(
            task.file,
            task.topicId,
            controller.signal,
            (uploaded) => {
              task.progress = task.file.size ? Math.min(1, uploaded / task.file.size) : 1;
              notify();
            },
          );
          if (cancelledTaskIds.has(task.id)) {
            throw new DOMException('Upload cancelled', 'AbortError');
          }
          task.asset = uploadedAsset;
          task.progress = 1;
          notify();
          try {
            await options.onSuccess?.(task, task.asset);
          } catch (saveError) {
            task.status = 'failed';
            task.error = saveError instanceof Error ? saveError.message : 'Asset save failed';
            notify();
            return;
          }
          task.status = 'uploaded';
          notify();
          return;
        } catch (error) {
          if (attempt >= maxRetries || !isTransient(error)) throw error;
          await sleep(retryDelayMs * 2 ** attempt);
        }
      }
    } catch (error) {
      task.status = cancelledTaskIds.has(task.id) ? 'cancelled' : 'failed';
      task.error = error instanceof Error ? error.message : 'Upload failed';
      notify();
    } finally {
      controllers.delete(task.id);
    }
  }

  async function worker() {
    while (true) {
      const next = tasks.find((task) => task.status === 'queued');
      if (!next) return;
      await process(next);
    }
  }

  async function start() {
    if (runPromise) return runPromise;
    runPromise = (async () => {
      notify();
      await Promise.all(Array.from({ length: concurrency }, () => worker()));
    })();
    try {
      await runPromise;
    } finally {
      runPromise = null;
    }
  }

  async function retry(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status !== 'failed') return;
    cancelledTaskIds.delete(taskId);
    task.status = 'queued';
    task.progress = 0;
    task.error = null;
    await start();
  }

  function cancel() {
    for (const task of tasks) {
      if (task.status === 'queued' || task.status === 'uploading') {
        cancelledTaskIds.add(task.id);
      }
    }
    for (const controller of controllers.values()) controller.abort();
    for (const task of tasks) {
      if (task.status === 'queued') task.status = 'cancelled';
    }
    notify();
  }

  return {
    tasks,
    start,
    cancel,
    retry,
  };
}
