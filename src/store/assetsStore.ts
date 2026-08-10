import { create } from 'zustand';
import type { Asset, AssetType, UploadProgress, UploadTask } from '../types';
import { uploadDriveAssetWithProgress } from '../services/drive';
import { localAssetsAdapter, type AssetsAdapter } from '../services/assetsAdapter';
import { createUploadQueue, type UploadOne } from '../services/uploadQueue';

interface AssetsState {
  assets: Asset[];
  filter: 'All' | AssetType;
  selectedAsset: Asset | null;
  uploadTasks: UploadTask[];
  uploadProgress: UploadProgress;
  adapter: AssetsAdapter;
  activeQueue: ReturnType<typeof createUploadQueue> | null;
  setAdapter: (adapter: AssetsAdapter) => void;
  clear: () => void;
  appendAsset: (asset: Asset) => void;
  setFilter: (filter: AssetsState['filter']) => void;
  selectAsset: (asset: Asset | null) => void;
  hydrate: (topicId: string) => Promise<void>;
  startUpload: (files: File[], topicId: string, uploadOne?: UploadOne) => Promise<void>;
  retryUpload: (taskId: string) => Promise<void>;
  cancelUpload: () => void;
}

const emptyProgress: UploadProgress = {
  completed: 0,
  total: 0,
  bytesUploaded: 0,
  bytesTotal: 0,
};

export const useAssetsStore = create<AssetsState>((set, get) => ({
  assets: [],
  filter: 'All',
  selectedAsset: null,
  uploadTasks: [],
  uploadProgress: emptyProgress,
  adapter: localAssetsAdapter,
  activeQueue: null,
  setAdapter: (adapter) => set({ adapter }),
  clear: () => set({ assets: [], selectedAsset: null }),
  appendAsset: (asset) =>
    set((state) => ({
      assets: [...state.assets.filter((item) => item.assetId !== asset.assetId), asset],
    })),
  setFilter: (filter) => set({ filter }),
  selectAsset: (selectedAsset) => set({ selectedAsset }),
  hydrate: async (topicId) => {
    const assets = await get().adapter.list(topicId);
    set({ assets, selectedAsset: null });
  },
  startUpload: async (
    files,
    topicId,
    uploadOne = async (file, id, signal, onProgress) =>
      uploadDriveAssetWithProgress(id, file, signal, onProgress),
  ) => {
    const queue = createUploadQueue(
      files.map((file) => ({ file, topicId })),
      uploadOne,
      {
        concurrency: 3,
        onUpdate: (uploadTasks, uploadProgress) => set({ uploadTasks, uploadProgress }),
        onSuccess: async (_task, asset) => {
          await get().adapter.save(asset);
          set((state) => ({
            assets: [...state.assets.filter((item) => item.assetId !== asset.assetId), asset],
          }));
        },
      },
    );
    set({ activeQueue: queue });
    await queue.start();
  },
  retryUpload: async (taskId) => {
    await get().activeQueue?.retry(taskId);
  },
  cancelUpload: () => {
    get().activeQueue?.cancel();
    set({ activeQueue: null });
  },
}));
