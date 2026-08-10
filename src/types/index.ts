export type TopicStatus = 'not_started' | 'learning' | 'completed' | 'revision_due' | 'mastered';
export interface Topic {
  id: string;
  title_hi: string;
  title_en: string;
  completed: boolean;
  revision: boolean;
  bookmarked: boolean;
  notes: string;
  progress: number;
  children: Topic[];
}
export interface Subject {
  id: string;
  title_hi: string;
  title_en: string;
  completed: boolean;
  progress: number;
  topics: Topic[];
}
export interface Syllabus {
  exam: string;
  subjects: Subject[];
}
export interface Note {
  noteId: string;
  topicId: string;
  content: string;
  updatedAt: string;
}
export interface Asset {
  assetId: string;
  topicId: string;
  type: AssetType;
  title: string;
  driveFileId: string;
  createdAt: string;
  mimeType?: string;
  sizeBytes?: number;
  relativePath?: string;
  modifiedAt?: string;
  durationSeconds?: number;
  pageCount?: number;
  thumbnailUrl?: string;
}

export type AssetType = 'video' | 'pdf' | 'audio' | 'image';

export type UploadTaskStatus = 'queued' | 'uploading' | 'uploaded' | 'failed' | 'cancelled';

export interface UploadTask {
  id: string;
  file: File;
  topicId: string;
  status: UploadTaskStatus;
  progress: number;
  error: string | null;
  asset: Asset | null;
}

export interface UploadProgress {
  completed: number;
  total: number;
  bytesUploaded: number;
  bytesTotal: number;
}
