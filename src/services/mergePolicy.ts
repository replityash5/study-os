import type { TopicStatus } from '../types';
import type { ProgressDocument } from './progressAdapter';

const complete = (status?: TopicStatus) => status === 'completed' || status === 'mastered';

export function mergeProgress(
  local: ProgressDocument | null,
  remote: ProgressDocument | null,
  hasMerged: boolean,
  now = new Date().toISOString(),
): ProgressDocument {
  if (!remote) return local ?? { statusMap: {}, updatedAt: now };
  if (!local) return remote;
  if (!hasMerged) {
    const statusMap: Record<string, TopicStatus> = { ...remote.statusMap, ...local.statusMap };
    const ids = new Set([...Object.keys(local.statusMap), ...Object.keys(remote.statusMap)]);
    ids.forEach((id) => {
      if (complete(local.statusMap[id]) || complete(remote.statusMap[id])) {
        statusMap[id] = 'completed';
      }
    });
    return { statusMap, updatedAt: now, mergedAt: now };
  }
  return local.updatedAt >= remote.updatedAt ? local : remote;
}
