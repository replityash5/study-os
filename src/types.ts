export type Topic = {
  id: string
  title_hi: string
  title_en: string
  completed: boolean
  revision: boolean
  bookmarked: boolean
  notes: string
  progress?: number
  children: Topic[]
  level?: number | string
  level_label_en?: string
  level_label_hi?: string
}
export type Subject = { id: string; title_hi: string; title_en: string; completed: boolean; progress: number; topics: Topic[] }
export type Exam = { id: string; exam: string; subjects: Subject[] }
export type TopicState = Pick<Topic, 'completed' | 'revision' | 'bookmarked' | 'notes'>
export type TopicStates = Record<string, TopicState>
