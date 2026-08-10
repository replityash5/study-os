import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import type { Asset } from '../types';
import { inferAssetType } from './assetType';
import { DriveAuthError, getDriveAccessToken, clearDriveAccessToken } from './driveAuth';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';
const FOLDER_MIME = 'application/vnd.google-apps.folder';
const folderCache = new Map<string, string>();
const folderPromises = new Map<string, Promise<string>>();
const studyOsFolderPromises = new Map<string, Promise<string>>();

interface DriveFile {
  id: string;
  name: string;
  mimeType?: string;
  size?: string;
  modifiedTime?: string;
  createdTime?: string;
  thumbnailLink?: string;
  videoMediaMetadata?: { durationMillis?: string };
  imageMediaMetadata?: { width?: number; height?: number };
}

interface DriveErrorShape {
  status: number;
  transient: boolean;
}

export class DriveApiError extends Error implements DriveErrorShape {
  readonly status: number;
  readonly transient: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'DriveApiError';
    this.status = status;
    this.transient = status === 401 || status === 429 || status >= 500;
  }
}

function makeAssetId() {
  return globalThis.crypto?.randomUUID?.() ?? `asset-${Date.now()}-${Math.random()}`;
}

async function driveJson<T>(path: string, init: RequestInit = {}) {
  const token = await getDriveAccessToken();
  const response = await fetch(`${DRIVE_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  });
  if (response.status === 401) {
    clearDriveAccessToken();
    throw new DriveApiError('Google Drive authorization expired.', 401);
  }
  if (!response.ok) {
    throw new DriveApiError(`Google Drive request failed (${response.status}).`, response.status);
  }
  return (await response.json()) as T;
}

async function withBackoff<T>(operation: () => Promise<T>) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const transient =
        typeof error === 'object' &&
        error !== null &&
        'transient' in error &&
        Boolean(error.transient);
      if (!transient || attempt >= 3) throw error;
      await new Promise((resolve) => globalThis.setTimeout(resolve, 400 * 2 ** attempt));
    }
  }
}

async function createFolder(name: string, parentId?: string) {
  return withBackoff(() =>
    driveJson<DriveFile>('/files?fields=id,name,mimeType,parents', {
      method: 'POST',
      body: JSON.stringify({
        name,
        mimeType: FOLDER_MIME,
        ...(parentId ? { parents: [parentId] } : {}),
      }),
    }),
  );
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function ensureFolder(name: string, parentId: string) {
  const cacheKey = `${parentId}/${name}`;
  const cachedId = folderCache.get(cacheKey);
  if (cachedId) return cachedId;
  const pending = folderPromises.get(cacheKey);
  if (pending) return pending;

  const promise = (async () => {
    const query = encodeURIComponent(
      `name = '${escapeDriveQueryValue(name)}' and '${parentId}' in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
    );
    const existing = await driveJson<{ files?: DriveFile[] }>(
      `/files?q=${query}&fields=files(id,name,mimeType,parents)&pageSize=1`,
    );
    const folder = existing.files?.[0] ?? (await createFolder(name, parentId));
    folderCache.set(cacheKey, folder.id);
    return folder.id;
  })();
  folderPromises.set(cacheKey, promise);
  try {
    return await promise;
  } finally {
    folderPromises.delete(cacheKey);
  }
}

export async function ensureStudyOsFolder(uid: string) {
  const pending = studyOsFolderPromises.get(uid);
  if (pending) return pending;

  const promise = (async () => {
    const settingsRef = doc(db, 'users', uid, 'settings', 'integrations');
    const settings = await getDoc(settingsRef);
    const existingId = settings.exists()
      ? (settings.data().driveFolderId as string | undefined)
      : undefined;
    if (existingId) return existingId;
    const folderId = await ensureFolder('Study OS', 'root');
    await setDoc(
      settingsRef,
      { driveFolderId: folderId, driveConnectedAt: new Date().toISOString() },
      { merge: true },
    );
    return folderId;
  })();
  studyOsFolderPromises.set(uid, promise);
  try {
    return await promise;
  } finally {
    studyOsFolderPromises.delete(uid);
  }
}

export async function ensureRelativeFolderPath(
  rootId: string,
  relativePath?: string,
  ensureFolderPath: (name: string, parentId: string) => Promise<string> = ensureFolder,
) {
  const directories = (relativePath ?? '').split('/').filter(Boolean).slice(0, -1);
  let parentId = rootId;
  for (const directory of directories) {
    parentId = await ensureFolderPath(directory, parentId);
  }
  return parentId;
}

function uploadResumable(
  sessionUrl: string,
  file: File,
  signal: AbortSignal,
  onProgress: (bytesUploaded: number) => void,
) {
  return new Promise<DriveFile>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => {
      xhr.abort();
      reject(new DOMException('Upload cancelled', 'AbortError'));
    };
    signal.addEventListener('abort', abort, { once: true });
    xhr.open('PUT', sessionUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.setRequestHeader('Content-Range', `bytes 0-${Math.max(0, file.size - 1)}/${file.size}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded);
    };
    xhr.onload = () => {
      signal.removeEventListener('abort', abort);
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as DriveFile);
        } catch {
          reject(new DriveApiError('Google Drive returned invalid upload metadata.', xhr.status));
        }
      } else {
        if (xhr.status === 401) clearDriveAccessToken();
        reject(new DriveApiError(`Google Drive upload failed (${xhr.status}).`, xhr.status));
      }
    };
    xhr.onerror = () => {
      signal.removeEventListener('abort', abort);
      reject(new TypeError('Google Drive upload network error.'));
    };
    xhr.onabort = () => signal.removeEventListener('abort', abort);
    xhr.send(file);
  });
}

async function startResumableUpload(
  file: File,
  parentId: string,
  signal: AbortSignal,
  onProgress: (bytesUploaded: number) => void,
) {
  return withBackoff(async () => {
    const token = await getDriveAccessToken();
    const response = await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=resumable&fields=*`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': file.type || 'application/octet-stream',
        'X-Upload-Content-Length': String(file.size),
      },
      body: JSON.stringify({
        name: file.name,
        mimeType: file.type || 'application/octet-stream',
        parents: [parentId],
      }),
    });
    if (response.status === 401) {
      clearDriveAccessToken();
      throw new DriveApiError('Google Drive authorization expired.', 401);
    }
    if (!response.ok)
      throw new DriveApiError(`Google Drive upload failed (${response.status}).`, response.status);
    const sessionUrl = response.headers.get('Location');
    if (!sessionUrl) throw new DriveApiError('Google Drive did not return an upload session.', 500);
    return uploadResumable(sessionUrl, file, signal, onProgress);
  });
}

export async function uploadDriveFile(
  topicId: string,
  file: File,
  signal: AbortSignal,
  onProgress: (bytesUploaded: number) => void,
): Promise<Asset> {
  const user = auth.currentUser;
  if (!user) throw new DriveAuthError('Sign in before connecting Google Drive.');
  const rootId = await ensureStudyOsFolder(user.uid);
  const parentId = await ensureRelativeFolderPath(rootId, file.webkitRelativePath);
  const driveFile = await startResumableUpload(file, parentId, signal, onProgress);
  const type = inferAssetType(file);
  if (!type) throw new DriveApiError('Unsupported asset type.', 400);
  return {
    assetId: makeAssetId(),
    topicId,
    type,
    title: file.name,
    driveFileId: driveFile.id,
    createdAt: driveFile.createdTime ?? new Date().toISOString(),
    mimeType: driveFile.mimeType ?? file.type,
    sizeBytes: driveFile.size ? Number(driveFile.size) : file.size,
    relativePath: file.webkitRelativePath || undefined,
    modifiedAt: driveFile.modifiedTime,
    durationSeconds: driveFile.videoMediaMetadata?.durationMillis
      ? Number(driveFile.videoMediaMetadata.durationMillis) / 1000
      : undefined,
    thumbnailUrl: driveFile.thumbnailLink,
  };
}

export async function getDriveFile(fileId: string) {
  return driveJson<DriveFile>(
    `/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size,modifiedTime,createdTime,thumbnailLink,videoMediaMetadata,imageMediaMetadata`,
  );
}

export async function downloadDriveFile(fileId: string, signal?: AbortSignal) {
  const token = await getDriveAccessToken();
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (response.status === 401) {
    clearDriveAccessToken();
    throw new DriveAuthError('Google Drive authorization expired. Connect Google Drive again.');
  }
  if (!response.ok) {
    throw new DriveApiError(`Google Drive download failed (${response.status}).`, response.status);
  }
  return response;
}
