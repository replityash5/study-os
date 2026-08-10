import gk from './data/syllabus/2nd_Grade_GK_Syllabus.json'
import science from './data/syllabus/2nd_Grade_Science_Syllabus.json'
import ras from './data/syllabus/RAS_Pre_Syllabus.json'
import type { Exam, Topic } from './types'

const normalizeTopic = (topic: Topic): Topic => ({ ...topic, progress: topic.progress ?? 0, children: topic.children.map(normalizeTopic) })
const normalize = (input: { exam: string; subjects: Exam['subjects'] }, id: string): Exam => ({
  id, exam: input.exam,
  subjects: input.subjects.map((subject) => ({ ...subject, topics: subject.topics.map(normalizeTopic) })),
})
export const exams: Exam[] = [
  normalize(ras as unknown as { exam: string; subjects: Exam['subjects'] }, 'ras-pre-2026'),
  normalize(gk as unknown as { exam: string; subjects: Exam['subjects'] }, '2nd-grade-paper-1'),
  normalize(science as unknown as { exam: string; subjects: Exam['subjects'] }, '2nd-grade-science'),
]
export const allTopics = (topics: Topic[]): Topic[] => topics.flatMap((topic) => [topic, ...allTopics(topic.children)])
export const leafTopics = (topics: Topic[]): Topic[] => topics.flatMap((topic) => topic.children.length ? leafTopics(topic.children) : [topic])
export const examLeaves = (exam: Exam) => exam.subjects.flatMap((subject) => leafTopics(subject.topics))
