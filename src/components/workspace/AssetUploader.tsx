import { useEffect, useRef, useState } from 'react';
import { FilePlus2, FolderOpen, UploadCloud, X } from 'lucide-react';
import { useAssetsStore } from '../../store/assetsStore';
import { inferAssetType } from '../../services/assetType';
import { connectGoogleDrive, reconnectGoogleDriveSilently } from '../../services/driveAuth';
import { useAuth } from '../../auth/useAuth';

interface FileEntry {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (callback: (file: File) => void) => void;
  createReader?: () => { readEntries: (callback: (entries: FileEntry[]) => void) => void };
}

function readEntry(entry: FileEntry, parentPath = ''): Promise<File[]> {
  if (entry.isFile && entry.file) {
    return new Promise((resolve) =>
      entry.file?.((file) => {
        const relativePath = [parentPath, entry.name].filter(Boolean).join('/');
        if (relativePath && !file.webkitRelativePath) {
          Object.defineProperty(file, 'webkitRelativePath', { value: relativePath });
        }
        resolve([file]);
      }),
    );
  }
  if (!entry.isDirectory || !entry.createReader) return Promise.resolve([]);
  const reader = entry.createReader();
  return new Promise((resolve) => {
    const files: File[] = [];
    const read = () => {
      reader.readEntries(async (entries) => {
        if (!entries.length) {
          resolve(files);
          return;
        }
        const nested = await Promise.all(
          entries.map((nestedEntry) =>
            readEntry(nestedEntry, [parentPath, entry.name].filter(Boolean).join('/')),
          ),
        );
        files.push(...nested.flat());
        read();
      });
    };
    read();
  });
}

export function AssetUploader({ topicId }: { topicId?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveChecking, setDriveChecking] = useState(true);
  const [driveMessage, setDriveMessage] = useState<string | null>(null);
  const { user } = useAuth();
  const startUpload = useAssetsStore((state) => state.startUpload);
  const uploadTasks = useAssetsStore((state) => state.uploadTasks);
  const uploadProgress = useAssetsStore((state) => state.uploadProgress);
  const cancelUpload = useAssetsStore((state) => state.cancelUpload);
  const retryUpload = useAssetsStore((state) => state.retryUpload);

  useEffect(() => {
    if (inputRef.current) {
      (inputRef.current as HTMLInputElement & { webkitdirectory?: boolean }).webkitdirectory = true;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDriveChecking(true);
    void reconnectGoogleDriveSilently().then((connected) => {
      if (cancelled) return;
      setDriveConnected(connected);
      setDriveChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [topicId, user?.uid]);

  async function addFiles(files: File[]) {
    if (!topicId) return;
    const supported = files.filter((file) => inferAssetType(file));
    if (supported.length) await startUpload(supported, topicId);
  }

  async function connectDrive() {
    setConnecting(true);
    setDriveMessage(null);
    try {
      await connectGoogleDrive();
      setDriveConnected(true);
      setDriveMessage('Google Drive connected. Choose a folder to upload.');
    } catch (reason: unknown) {
      setDriveMessage(reason instanceof Error ? reason.message : 'Unable to connect Google Drive.');
    } finally {
      setConnecting(false);
    }
  }

  async function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    const entries: FileEntry[] = [...event.dataTransfer.items]
      .map((item) => {
        const getEntry = (item as unknown as { webkitGetAsEntry?: () => FileEntry | null })
          .webkitGetAsEntry;
        return getEntry ? getEntry() : null;
      })
      .filter((entry): entry is FileEntry => Boolean(entry));
    const files = entries.length
      ? (await Promise.all(entries.map((entry) => readEntry(entry)))).flat()
      : [...event.dataTransfer.files];
    await addFiles(files);
  }

  const active = uploadTasks.some(
    (task) => task.status === 'queued' || task.status === 'uploading',
  );
  const failed = uploadTasks.filter((task) => task.status === 'failed');

  return (
    <div className="mt-3">
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          void addFiles(event.target.files ? [...event.target.files] : []);
          event.target.value = '';
        }}
      />
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => void handleDrop(event)}
        className={`rounded-xl border border-dashed px-3 py-2 text-center transition ${
          dragging ? 'border-primary bg-violet-50' : 'border-slate-200 bg-slate-50/70'
        }`}
      >
        <UploadCloud size={16} className="mx-auto text-primary" />
        <p className="mt-1 text-[10px] font-semibold text-slate-500">Drop files or a folder here</p>
        <button
          type="button"
          disabled={!topicId || active}
          onClick={() => inputRef.current?.click()}
          className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-primary disabled:opacity-40"
        >
          <FolderOpen size={12} />
          Choose folder
        </button>
        {topicId && (
          <button
            type="button"
            disabled={connecting || driveChecking || driveConnected || active}
            onClick={() => void connectDrive()}
            className="ml-2 mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 disabled:opacity-40"
          >
            {connecting || driveChecking
              ? 'Connecting…'
              : driveConnected
                ? 'Google Drive connected'
                : 'Connect Google Drive'}
          </button>
        )}
      </div>
      {!topicId && (
        <p className="mt-1 text-center text-[10px] text-slate-400">Select a topic first.</p>
      )}
      {driveMessage && (
        <p className="mt-1 text-center text-[10px] text-amber-600">{driveMessage}</p>
      )}
      {uploadTasks.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>
              {uploadProgress.completed} / {uploadProgress.total} uploaded
            </span>
            {active && (
              <button type="button" onClick={cancelUpload} className="text-slate-500">
                <X size={12} />
              </button>
            )}
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{
                width: `${uploadProgress.total ? (uploadProgress.completed / uploadProgress.total) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="max-h-20 space-y-1 overflow-y-auto">
            {uploadTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2 text-[10px]">
                <span className="min-w-0 flex-1 truncate text-slate-500">{task.file.name}</span>
                <span className="shrink-0 text-slate-400">
                  {task.status === 'uploaded'
                    ? 'Done'
                    : task.status === 'failed'
                      ? 'Failed'
                      : task.status === 'cancelled'
                        ? 'Cancelled'
                        : `${Math.round(task.progress * 100)}%`}
                </span>
              </div>
            ))}
          </div>
          {failed.map((task) => (
            <div key={task.id} className="flex items-center justify-between gap-2 text-[10px]">
              <span className="truncate text-rose-500">{task.error}</span>
              <button
                type="button"
                onClick={() => void retryUpload(task.id)}
                className="shrink-0 font-bold text-primary"
              >
                Retry
              </button>
            </div>
          ))}
          {failed.some((task) => task.error?.includes('Connect Google Drive')) && (
            <p className="flex items-center gap-1 text-[10px] font-semibold text-amber-600">
              <FilePlus2 size={12} />
              Connect Google Drive to finish uploading.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
