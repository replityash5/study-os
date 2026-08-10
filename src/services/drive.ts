import type { Asset } from '../types';
import { auth } from '../config/firebase';
import { uploadDriveFile } from './driveApi';
import { firestoreAssetsAdapter } from './firestoreAssetsAdapter';

export class DriveNotConnectedError extends Error {
  readonly transient = false;

  constructor() {
    super('Connect Google Drive to upload assets.');
    this.name = 'DriveNotConnectedError';
  }
}

export class DriveAppAuthRequiredError extends Error {
  readonly transient = false;

  constructor() {
    super('Sign in to Study OS before uploading assets.');
    this.name = 'DriveAppAuthRequiredError';
  }
}

export async function listDriveAssets(topicId: string): Promise<Asset[]> {
  if (!auth.currentUser) throw new DriveNotConnectedError();
  return firestoreAssetsAdapter(auth.currentUser.uid).list(topicId);
}
export async function uploadDriveAsset(topicId: string, file: File): Promise<Asset> {
  if (!auth.currentUser) throw new DriveAppAuthRequiredError();
  return uploadDriveFile(topicId, file, new AbortController().signal, () => undefined);
}

export async function uploadDriveAssetWithProgress(
  topicId: string,
  file: File,
  signal: AbortSignal,
  onProgress: (bytesUploaded: number) => void,
) {
  if (!auth.currentUser) throw new DriveAppAuthRequiredError();
  return uploadDriveFile(topicId, file, signal, onProgress);
}
