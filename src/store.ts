import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TopicState, TopicStates } from './types'
type Store = { states: TopicStates; setTopic: (key: string, patch: Partial<TopicState>) => void; toggleTopic: (key: string, field: 'completed' | 'revision' | 'bookmarked') => void }
const defaults: TopicState = { completed: false, revision: false, bookmarked: false, notes: '' }
export const topicKey = (examId: string, topicId: string) => `${examId}:${topicId}`
export const useStudyStore = create<Store>()(persist((set) => ({
  states: {},
  setTopic: (key, patch) => set((state) => ({ states: { ...state.states, [key]: { ...defaults, ...state.states[key], ...patch } } })),
  toggleTopic: (key, field) => set((state) => ({ states: { ...state.states, [key]: { ...defaults, ...state.states[key], [field]: !(state.states[key]?.[field] ?? defaults[field]) } } })),
}), { name: 'study-os-topic-state', version: 1, migrate: (persisted) => persisted as Store, partialize: (state) => ({ states: state.states }) }))
export const stateFor = (states: TopicStates, key: string, defaultsFromData: TopicState): TopicState => ({ ...defaultsFromData, ...states[key] })
