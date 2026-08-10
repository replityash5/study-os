import { useEffect } from 'react';
import { useAuth } from '../auth/useAuth';
import { syllabi } from '../store/syllabusStore';
import { useProgressStore } from '../store/progressStore';
import { firestoreProgressAdapter } from '../services/firestoreProgressAdapter';
import { localProgressAdapter } from '../services/progressAdapter';
import { mergeProgress } from '../services/mergePolicy';
import { useCloudStore } from '../store/cloudStore';
import { useNotesStore } from '../store/notesStore';
import { firestoreNotesAdapter } from '../services/firestoreNotesAdapter';
import { localNotesAdapter } from '../services/notesAdapter';
import { localAssetsAdapter } from '../services/assetsAdapter';
import { firestoreAssetsAdapter } from '../services/firestoreAssetsAdapter';
import { useAssetsStore } from '../store/assetsStore';

let reportedCloudError = false;

export function useCloudSync() {
  const { user } = useAuth();
  const replaceExam = useProgressStore((state) => state.replaceExam);
  const setOffline = useCloudStore((state) => state.setOffline);
  const setError = useCloudStore((state) => state.setError);
  const clearNotes = useNotesStore((state) => state.clear);
  const hydrate = useProgressStore((state) => state.hydrate);
  const setAssetsAdapter = useAssetsStore((state) => state.setAdapter);
  const clearAssets = useAssetsStore((state) => state.clear);

  useEffect(() => {
    void hydrate(syllabi.map((syllabus) => syllabus.exam));
  }, [hydrate]);

  useEffect(() => {
    clearNotes();
    clearAssets();
    setAssetsAdapter(user ? firestoreAssetsAdapter(user.uid) : localAssetsAdapter);
  }, [clearAssets, clearNotes, setAssetsAdapter, user]);

  useEffect(() => {
    if (!user) return;
    const remote = firestoreAssetsAdapter(user.uid);
    let cancelled = false;

    async function migrateAssets() {
      const localKeys = Object.keys(localStorage).filter((key) =>
        key.startsWith('study-os-assets-'),
      );
      for (const key of localKeys) {
        const topicId = key.replace('study-os-assets-', '');
        try {
          const [localAssets, remoteAssets] = await Promise.all([
            localAssetsAdapter.list(topicId),
            remote.list(topicId),
          ]);
          if (cancelled) return;
          const remoteIds = new Set(remoteAssets.map((asset) => asset.assetId));
          for (const asset of localAssets) {
            if (!remoteIds.has(asset.assetId)) await remote.save(asset);
          }
        } catch (error) {
          if (!reportedCloudError) {
            console.warn('Study OS asset sync unavailable; continuing locally.', error);
            reportedCloudError = true;
          }
          setOffline(true);
          setError('Asset sync unavailable — saving locally');
        }
      }
    }

    void migrateAssets();
    return () => {
      cancelled = true;
    };
  }, [setError, setOffline, user]);

  useEffect(() => {
    if (!user) return;
    const remote = firestoreNotesAdapter(user.uid);
    let cancelled = false;

    async function migrateNotes() {
      const localKeys = Object.keys(localStorage).filter(
        (key) => key.startsWith('study-os-note-') && !key.startsWith('study-os-note-draft-'),
      );
      for (const key of localKeys) {
        const topicId = key.replace('study-os-note-', '');
        try {
          const [localNote, remoteNote] = await Promise.all([
            localNotesAdapter.load(topicId),
            remote.load(topicId),
          ]);
          if (cancelled || !localNote) continue;
          if (!remoteNote || localNote.updatedAt > remoteNote.updatedAt) {
            await remote.save(localNote);
          }
        } catch (error) {
          if (!reportedCloudError) {
            console.warn('Study OS note sync unavailable; continuing locally.', error);
            reportedCloudError = true;
          }
          setOffline(true);
          setError('Note sync unavailable — saving locally');
        }
      }
    }

    void migrateNotes();
    return () => {
      cancelled = true;
    };
  }, [setError, setOffline, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const remote = firestoreProgressAdapter(user.uid);

    async function sync() {
      for (const syllabus of syllabi) {
        try {
          const [local, remoteDocument] = await Promise.all([
            localProgressAdapter.load(syllabus.exam),
            remote.load(syllabus.exam),
          ]);
          if (cancelled) return;
          const existing = useProgressStore.getState().examStatusMaps[syllabus.exam];
          const merged = mergeProgress(
            local ?? existing ?? null,
            remoteDocument,
            Boolean(existing?.mergedAt),
          );
          replaceExam(syllabus.exam, merged);
          if (JSON.stringify(merged) !== JSON.stringify(remoteDocument)) {
            await remote.save(syllabus.exam, merged);
          }
          setOffline(false);
          setError(null);
        } catch (error) {
          if (!reportedCloudError) {
            console.warn('Study OS cloud sync unavailable; continuing locally.', error);
            reportedCloudError = true;
          }
          setOffline(true);
          setError('Cloud sync unavailable — saving locally');
        }
      }
    }

    void sync();
    return () => {
      cancelled = true;
    };
  }, [replaceExam, user]);

  useEffect(() => {
    if (!user) return;
    const remote = firestoreProgressAdapter(user.uid);
    let timer: number | null = null;
    const unsubscribe = useProgressStore.subscribe((state, previous) => {
      if (state.activeExamId === previous.activeExamId) {
        const next = state.examStatusMaps[state.activeExamId];
        const before = previous.examStatusMaps[previous.activeExamId];
        if (next === before || !next) return;
      }
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const current = useProgressStore.getState();
        const document = current.examStatusMaps[current.activeExamId];
        if (document) {
          void remote.save(current.activeExamId, document).catch((error) => {
            if (!reportedCloudError) {
              console.warn('Study OS cloud sync unavailable; continuing locally.', error);
              reportedCloudError = true;
            }
            setOffline(true);
            setError('Cloud sync unavailable — saving locally');
          });
        }
      }, 800);
    });
    return () => {
      unsubscribe();
      if (timer) window.clearTimeout(timer);
    };
  }, [setOffline, user]);
}
