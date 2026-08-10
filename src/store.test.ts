import { describe, expect, it } from 'vitest'
import { exams, leafTopics } from './data'
import { topicKey, useStudyStore } from './store'

describe('progress and topic state', () => {
  it('derives leaves through nested children', () => {
    const topic = { id: 'p', title_hi: '', title_en: '', completed: false, revision: false, bookmarked: false, notes: '', progress: 0, children: [{ id: 'c', title_hi: '', title_en: '', completed: true, revision: false, bookmarked: false, notes: '', progress: 0, children: [] }] }
    expect(leafTopics([topic]).map(item => item.id)).toEqual(['c'])
  })
  it('toggles state with an exam-scoped key', () => {
    const key = topicKey('exam-a', 'same-id')
    useStudyStore.getState().setTopic(key, { completed: false })
    useStudyStore.getState().toggleTopic(key, 'completed')
    expect(useStudyStore.getState().states[key].completed).toBe(true)
    expect(topicKey('exam-a', 'same-id')).not.toBe(topicKey('exam-b', 'same-id'))
  })
  it('loads all three exams', () => { expect(exams).toHaveLength(3) })
})
