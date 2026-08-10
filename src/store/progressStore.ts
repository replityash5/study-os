import { create } from 'zustand';
import type { TopicStatus } from '../types';
import type { ProgressDocument } from '../services/progressAdapter';
import {
  localProgressAdapter,
  migrateLegacyProgress,
  readLocalProgress,
} from '../services/progressAdapter';

interface ProgressState {
  activeExamId: string;
  statusMap: Record<string, TopicStatus>;
  examStatusMaps: Record<string, ProgressDocument>;
  setActiveExam: (examId: string) => void;
  setStatus: (id: string, status: TopicStatus) => void;
  setStatuses: (updates: Record<string, TopicStatus>) => void;
  replaceExam: (examId: string, document: ProgressDocument) => void;
  hydrate: (examIds: string[]) => Promise<void>;
}

export const useProgressStore = create<ProgressState>((set) => ({
  activeExamId: '',
  statusMap: {},
  examStatusMaps: {},
  setActiveExam: (activeExamId) =>
    set((state) => ({
      activeExamId,
      statusMap: state.examStatusMaps[activeExamId]?.statusMap ?? {},
    })),
  setStatus: (id, status) =>
    set((state) => {
      const statusMap = { ...state.statusMap, [id]: status };
      const updatedAt = new Date().toISOString();
      void localProgressAdapter.save(state.activeExamId, { statusMap, updatedAt });
      return {
        statusMap,
        examStatusMaps: {
          ...state.examStatusMaps,
          [state.activeExamId]: { statusMap, updatedAt },
        },
      };
    }),
  setStatuses: (updates) =>
    set((state) => {
      const statusMap = { ...state.statusMap, ...updates };
      const updatedAt = new Date().toISOString();
      void localProgressAdapter.save(state.activeExamId, { statusMap, updatedAt });
      return {
        statusMap,
        examStatusMaps: {
          ...state.examStatusMaps,
          [state.activeExamId]: { statusMap, updatedAt },
        },
      };
    }),
  replaceExam: (examId, document) =>
    set((state) => {
      void localProgressAdapter.save(examId, document);
      return {
        activeExamId: state.activeExamId || examId,
        statusMap: state.activeExamId === examId ? document.statusMap : state.statusMap,
        examStatusMaps: { ...state.examStatusMaps, [examId]: document },
      };
    }),
  hydrate: async (examIds) => {
    const migrated = migrateLegacyProgress(examIds);
    const documents = Object.fromEntries(
      await Promise.all(
        examIds.map(async (examId) => [
          examId,
          migrated[examId] ??
            readLocalProgress(examId) ??
            (await localProgressAdapter.load(examId)),
        ]),
      ),
    ) as Record<string, ProgressDocument | null>;
    set((state) => {
      const examStatusMaps = { ...state.examStatusMaps };
      for (const [examId, document] of Object.entries(documents)) {
        if (document) examStatusMaps[examId] = document;
      }
      const activeExamId = state.activeExamId || examIds[0];
      return {
        activeExamId,
        statusMap: examStatusMaps[activeExamId]?.statusMap ?? state.statusMap,
        examStatusMaps,
      };
    });
  },
}));
