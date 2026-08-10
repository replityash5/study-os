import type { Asset } from '../types';

export interface AssetsAdapter {
  list(topicId: string): Promise<Asset[]>;
  save(asset: Asset): Promise<void>;
}

export const localAssetsAdapter: AssetsAdapter = {
  async list(topicId) {
    const raw = localStorage.getItem(`study-os-assets-${topicId}`);
    return raw ? (JSON.parse(raw) as Asset[]) : [];
  },
  async save(asset) {
    const key = `study-os-assets-${asset.topicId}`;
    const existing = await localAssetsAdapter.list(asset.topicId);
    const next = [...existing.filter((item) => item.assetId !== asset.assetId), asset];
    localStorage.setItem(key, JSON.stringify(next));
  },
};
