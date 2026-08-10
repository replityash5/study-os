import type { TopicStatus } from '../types';

export interface ProgressDocument {
  statusMap: Record<string, TopicStatus>;
  updatedAt: string;
  mergedAt?: string;
}

export interface ProgressAdapter {
  load(examId: string): Promise<ProgressDocument | null>;
  save(examId: string, document: ProgressDocument): Promise<void>;
}

export const localProgressAdapter: ProgressAdapter = {
  async load(examId) {
    const raw = localStorage.getItem(`study-os-progress-${examId}`);
    return raw ? (JSON.parse(raw) as ProgressDocument) : null;
  },
  async save(examId, document) {
    localStorage.setItem(`study-os-progress-${examId}`, JSON.stringify(document));
  },
};

export function readLocalProgress(examId: string): ProgressDocument | null {
  const raw = localStorage.getItem(`study-os-progress-${examId}`);
  return raw ? (JSON.parse(raw) as ProgressDocument) : null;
}

export function migrateLegacyProgress(examIds: string[]): Record<string, ProgressDocument> {
  const marker = 'study-os-progress-migrated-v1';
  if (localStorage.getItem(marker)) return {};
  const raw = localStorage.getItem('study-os-progress');
  if (!raw) {
    localStorage.setItem(marker, 'true');
    return {};
  }
  const parsed = JSON.parse(raw) as { state?: { statusMap?: Record<string, TopicStatus> } };
  const statusMap = parsed.state?.statusMap ?? {};
  const updatedAt = new Date().toISOString();
  const migrated = Object.fromEntries(examIds.map((examId) => [examId, { statusMap, updatedAt }]));
  localStorage.setItem(marker, 'true');
  return migrated;
}
