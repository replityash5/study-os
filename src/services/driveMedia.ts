import type { Asset } from '../types';
import { downloadDriveFile } from './driveApi';

export const MAX_BUFFERED_MEDIA_BYTES = 100 * 1024 * 1024;

export class DriveMediaTooLargeError extends Error {
  readonly transient = false;

  constructor() {
    super('This file is too large for buffered playback. Choose a smaller asset.');
    this.name = 'DriveMediaTooLargeError';
  }
}

export async function createDriveMediaUrl(asset: Asset, signal?: AbortSignal) {
  if (asset.sizeBytes && asset.sizeBytes > MAX_BUFFERED_MEDIA_BYTES) {
    throw new DriveMediaTooLargeError();
  }
  const response = await downloadDriveFile(asset.driveFileId, signal);
  const contentLength = Number(response.headers.get('Content-Length') ?? 0);
  if (contentLength > MAX_BUFFERED_MEDIA_BYTES) {
    throw new DriveMediaTooLargeError();
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('The browser could not read this Drive asset.');
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BUFFERED_MEDIA_BYTES) {
      await reader.cancel();
      throw new DriveMediaTooLargeError();
    }
    chunks.push(value);
  }
  const blob = new Blob(chunks, {
    type: response.headers.get('Content-Type') ?? asset.mimeType ?? 'application/octet-stream',
  });
  return URL.createObjectURL(blob);
}
