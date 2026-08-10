import { useEffect, useRef, useState } from 'react';
import {
  Expand,
  Maximize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  Volume2,
} from 'lucide-react';
import type { Asset } from '../../types';
import { createDriveMediaUrl } from '../../services/driveMedia';
import { IconButton } from '../ui';

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${remainder}`;
}

type MediaKind = 'video' | 'audio' | 'image' | 'pdf';

export function MediaViewer({
  title,
  source,
  asset,
}: {
  title?: string;
  source?: string;
  asset?: Asset;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const [mediaUrl, setMediaUrl] = useState(source);
  const [kind, setKind] = useState<MediaKind>(asset?.type ?? 'video');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const hasSource = Boolean(mediaUrl);
  const usesControls = kind === 'video' || kind === 'audio';
  const displayTitle = title || asset?.title;

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    setPlaying(false);
    setProgress(0);
    setDuration(0);
    setCurrentTime(0);
    setError(null);
    setKind(asset?.type ?? 'video');
    if (!asset) {
      setMediaUrl(source);
      setLoading(false);
      return () => controller.abort();
    }
    setMediaUrl(undefined);
    setLoading(true);
    void createDriveMediaUrl(asset, controller.signal)
      .then((url) => {
        objectUrl = url;
        setMediaUrl(url);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Unable to load this asset.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset, source]);

  function togglePlay() {
    const media = mediaRef.current;
    if (!media || !hasSource || !usesControls) return;
    if (media.paused) {
      void media.play();
      setPlaying(true);
    } else {
      media.pause();
      setPlaying(false);
    }
  }

  function seek(offset: number) {
    const media = mediaRef.current;
    if (media && hasSource && usesControls)
      media.currentTime = Math.max(0, media.currentTime + offset);
  }

  function toggleFullscreen() {
    if (hasSource && containerRef.current?.requestFullscreen) {
      void containerRef.current.requestFullscreen();
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative min-h-0 overflow-hidden rounded-card bg-slate-950 p-0 shadow-soft"
    >
      {!hasSource && !loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-violet-950">
          <div className="text-center text-white/70">
            <Play size={34} className="mx-auto rounded-full bg-white/10 p-2" />
            <p className="mt-2 text-xs">
              {error ??
                (asset ? 'Select an asset to start watching' : 'Select an asset to start watching')}
            </p>
          </div>
        </div>
      )}
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900 text-xs text-white/70">
          Loading asset…
        </div>
      )}
      {error && !loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900 px-6 text-center text-xs text-amber-200">
          {error}
        </div>
      )}
      {kind === 'video' && (
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={mediaUrl}
          className={`absolute inset-0 h-full w-full object-cover ${hasSource ? 'block' : 'hidden'}`}
          preload="metadata"
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onTimeUpdate={(event) => {
            const media = event.currentTarget;
            setCurrentTime(media.currentTime);
            setProgress(media.duration ? media.currentTime / media.duration : 0);
          }}
          onEnded={() => setPlaying(false)}
        />
      )}
      {kind === 'audio' && (
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={mediaUrl}
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
          onTimeUpdate={(event) => {
            const media = event.currentTarget;
            setCurrentTime(media.currentTime);
            setProgress(media.duration ? media.currentTime / media.duration : 0);
          }}
          onEnded={() => setPlaying(false)}
        />
      )}
      {kind === 'image' && mediaUrl && (
        <img
          src={mediaUrl}
          alt={displayTitle ?? 'Study asset'}
          className="h-full w-full object-contain"
        />
      )}
      {kind === 'pdf' && mediaUrl && (
        <iframe
          title={displayTitle ?? 'PDF asset'}
          src={mediaUrl}
          className="h-full w-full border-0"
        />
      )}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between p-4 text-white">
        <div>{displayTitle && <h2 className="text-lg font-bold">{displayTitle}</h2>}</div>
        <IconButton
          label="Expand viewer"
          onClick={toggleFullscreen}
          disabled={!hasSource}
          className="bg-white/10 text-white"
        >
          <Expand size={15} />
        </IconButton>
      </div>
      {usesControls && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10 text-white">
          <div className="flex items-center gap-2">
            <IconButton
              label={playing ? 'Pause' : 'Play'}
              onClick={togglePlay}
              disabled={!hasSource}
              className="text-white"
            >
              {playing ? <Pause size={16} /> : <Play size={16} />}
            </IconButton>
            <IconButton
              label="Skip back 10 seconds"
              onClick={() => seek(-10)}
              disabled={!hasSource}
              className="text-white"
            >
              <RotateCcw size={16} />
            </IconButton>
            <IconButton
              label="Skip forward 10 seconds"
              onClick={() => seek(10)}
              disabled={!hasSource}
              className="text-white"
            >
              <RotateCw size={16} />
            </IconButton>
            <span className="text-[10px] text-white/70">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
            <input
              aria-label="Media progress"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={progress}
              disabled={!hasSource}
              onChange={(event) => {
                const value = Number(event.target.value);
                setProgress(value);
                if (mediaRef.current?.duration)
                  mediaRef.current.currentTime = value * mediaRef.current.duration;
              }}
              className="h-1 min-w-0 flex-1 accent-violet-400"
            />
            <Volume2 size={15} />
            <input
              aria-label="Volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              disabled={!hasSource}
              onChange={(event) => {
                const value = Number(event.target.value);
                setVolume(value);
                if (mediaRef.current) mediaRef.current.volume = value;
              }}
              className="hidden w-16 accent-violet-400 sm:block"
            />
            <Settings size={15} className="text-white/70" />
            <button aria-label="Fullscreen" onClick={toggleFullscreen} disabled={!hasSource}>
              <Maximize size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
