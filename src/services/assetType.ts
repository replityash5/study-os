import type { AssetType } from '../types';

const extensionTypes: Record<string, AssetType> = {
  '.aac': 'audio',
  '.flac': 'audio',
  '.m4a': 'audio',
  '.mp3': 'audio',
  '.ogg': 'audio',
  '.wav': 'audio',
  '.gif': 'image',
  '.jpeg': 'image',
  '.jpg': 'image',
  '.png': 'image',
  '.webp': 'image',
  '.mkv': 'video',
  '.mov': 'video',
  '.mp4': 'video',
  '.webm': 'video',
  '.pdf': 'pdf',
};

export function inferAssetType(file: File): AssetType | null {
  if (file.type.startsWith('audio/')) return 'audio';
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type === 'application/pdf') return 'pdf';
  const extension = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
  return extensionTypes[extension] ?? null;
}
