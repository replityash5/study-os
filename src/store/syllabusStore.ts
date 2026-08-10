import { create } from 'zustand';
import type { Syllabus, TopicStatus } from '../types';
import ras from '../data/syllabus/RAS_Pre_Syllabus.json';
import science from '../data/syllabus/2nd_Grade_Science_Syllabus.json';
import gk from '../data/syllabus/2nd_Grade_GK_Syllabus.json';
import { getCompletionAffectedIds, getTopicById, updateCompletion } from '../lib/progress';
import { useProgressStore } from './progressStore';

function normalizeTopic(
  topic: Omit<import('../types').Topic, 'progress' | 'children'> & {
    progress?: number;
    children?: unknown[];
  },
): import('../types').Topic {
  return {
    ...topic,
    progress: topic.progress ?? 0,
    children: (topic.children ?? []).map((child) =>
      normalizeTopic(child as Parameters<typeof normalizeTopic>[0]),
    ),
  };
}
function normalizeSyllabus(input: {
  exam: string;
  subjects: Array<{
    id: string;
    title_hi: string;
    title_en: string;
    completed: boolean;
    progress: number;
    topics: Parameters<typeof normalizeTopic>[0][];
  }>;
}): Syllabus {
  return {
    ...input,
    subjects: input.subjects.map((subject) => ({
      ...subject,
      topics: subject.topics.map(normalizeTopic),
    })),
  };
}
export const syllabi: Syllabus[] = [ras, science, gk].map((item) => normalizeSyllabus(item));
interface SyllabusState {
  exams: Syllabus[];
  selectedExam: number;
  selectedTopic: string | null;
  expanded: Record<string, boolean>;
  searchQuery: string;
  setExam: (index: number) => void;
  selectTopic: (id: string | null) => void;
  toggleExpanded: (id: string) => void;
  setSearchQuery: (query: string) => void;
  toggleCompletion: (id: string, checked: boolean) => void;
}
export const useSyllabusStore = create<SyllabusState>((set) => ({
  exams: syllabi,
  selectedExam: 0,
  selectedTopic: null,
  expanded: {},
  searchQuery: '',
  setExam: (selectedExam) => {
    set({ selectedExam, selectedTopic: null });
    useProgressStore.getState().setActiveExam(syllabi[selectedExam].exam);
  },
  selectTopic: (selectedTopic) => set({ selectedTopic }),
  toggleExpanded: (id) =>
    set((state) => ({
      expanded: { ...state.expanded, [id]: !state.expanded[id] },
    })),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleCompletion: (id, checked) =>
    set((state) => {
      const exam = state.exams[state.selectedExam];
      const subjects = exam.subjects.map((subject) => ({
        ...subject,
        topics: updateCompletion(subject.topics, id, checked),
      }));
      const exams = state.exams.map((entry, index) =>
        index === state.selectedExam ? { ...entry, subjects } : entry,
      );
      const affectedIds = exam.subjects.flatMap((subject) =>
        getCompletionAffectedIds(subject.topics, id),
      );
      const statusUpdates = Object.fromEntries(
        affectedIds.map((topicId) => {
          const topic = subjects
            .map((subject) => getTopicById(subject.topics, topicId))
            .find((value) => value !== null);
          const status: TopicStatus = topic?.completed ? 'completed' : 'not_started';
          return [topicId, status];
        }),
      ) as Record<string, TopicStatus>;
      useProgressStore.getState().setStatuses(statusUpdates);
      return { exams };
    }),
}));

useProgressStore.getState().setActiveExam(syllabi[0].exam);
