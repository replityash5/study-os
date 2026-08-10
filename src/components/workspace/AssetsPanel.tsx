import { useEffect, useMemo } from 'react';
import { FileAudio, FileImage, FileStack, FileText, Filter, Film } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import type { Asset, AssetType } from '../../types';
import { useAssetsStore } from '../../store/assetsStore';
import { Card, IconButton } from '../ui';
import { AssetUploader } from './AssetUploader';

const filters = [
  { label: 'All', value: 'All' as const },
  { label: 'Videos', value: 'video' as const },
  { label: 'PDFs', value: 'pdf' as const },
  { label: 'Audio', value: 'audio' as const },
];

function iconForAsset(asset: Asset) {
  if (asset.thumbnailUrl) {
    return <img src={asset.thumbnailUrl} alt="" className="h-full w-full object-cover" />;
  }
  const icons: Record<AssetType, React.ReactNode> = {
    video: <Film size={18} />,
    pdf: <FileText size={18} />,
    audio: <FileAudio size={18} />,
    image: <FileImage size={18} />,
  };
  return icons[asset.type];
}

function metadataForAsset(asset: Asset) {
  if (asset.type === 'video' || asset.type === 'audio') {
    const duration = asset.durationSeconds
      ? `${Math.floor(asset.durationSeconds / 60)}:${String(Math.floor(asset.durationSeconds % 60)).padStart(2, '0')}`
      : null;
    return `${asset.type[0].toUpperCase()}${asset.type.slice(1)}${duration ? ` • ${duration}` : ''}`;
  }
  if (asset.type === 'pdf') return `PDF${asset.pageCount ? ` • ${asset.pageCount} Pages` : ''}`;
  return 'Image';
}

export function AssetsPanel({ icon, topicId }: { icon?: React.ReactNode; topicId?: string }) {
  const { user } = useAuth();
  const filter = useAssetsStore((state) => state.filter);
  const setFilter = useAssetsStore((state) => state.setFilter);
  const assets = useAssetsStore((state) => state.assets);
  const selectAsset = useAssetsStore((state) => state.selectAsset);
  const hydrate = useAssetsStore((state) => state.hydrate);

  useEffect(() => {
    if (topicId) void hydrate(topicId);
  }, [hydrate, topicId, user?.uid]);

  const visibleAssets = useMemo(
    () => assets.filter((asset) => filter === 'All' || asset.type === filter),
    [assets, filter],
  );

  return (
    <Card className="flex min-h-[270px] min-w-0 flex-col p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-violet-50 p-2 text-primary">
            {icon ?? <FileStack size={17} />}
          </span>
          <h3 className="font-bold text-slate-700">My Assets</h3>
        </div>
        <IconButton label="Asset options">
          <Filter size={15} />
        </IconButton>
      </div>
      <div className="mt-4 flex gap-1 rounded-xl bg-slate-50 p-1 text-[10px] font-semibold text-slate-400">
        {filters.map((item) => (
          <button
            key={item.label}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
            className={`rounded-lg px-3 py-1.5 transition ${
              filter === item.value
                ? 'bg-primary text-white'
                : 'hover:bg-white hover:text-slate-600'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {visibleAssets.length > 0 ? (
        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto">
          {visibleAssets.map((asset) => (
            <button
              key={asset.assetId}
              type="button"
              onClick={() => selectAsset(asset)}
              className="flex w-full items-center gap-2 rounded-xl p-1 text-left transition hover:bg-violet-50"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-violet-50 text-primary">
                {iconForAsset(asset)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[11px] font-semibold text-slate-600">
                  {asset.title}
                </span>
                <span className="block text-[9px] text-slate-400">{metadataForAsset(asset)}</span>
              </span>
              <span className="text-[9px] text-slate-400">
                {new Date(asset.createdAt).toLocaleDateString()}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <FileStack size={26} className="text-slate-200" />
          <p className="mt-2 text-sm font-semibold text-slate-500">
            {topicId ? 'No assets yet' : 'Select a topic'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {topicId
              ? 'Your saved videos, PDFs, and audio will appear here.'
              : 'Choose a syllabus topic to manage its assets.'}
          </p>
        </div>
      )}
      <AssetUploader topicId={topicId} />
    </Card>
  );
}
