# Study OS

Study OS is a local-first study tracker for Indian competitive-exam syllabi. It
includes RAS Pre 2026 and both RPSC Senior Teacher (2nd Grade) papers.

## Run

```bash
npm install
npm run dev
```

Use `npm run lint`, `npm run build`, and `npm test` for checks.

## Features

The dashboard summarizes each exam. Open a syllabus to expand subjects and
nested topics, mark leaf topics complete, bookmark items, flag revision, and
write notes. Search covers Hindi and English titles. Language and theme choices
persist locally, as does topic state.

Progress is derived from leaf topics: a parent checkbox applies its value to all
descendant leaves, while subject and exam progress are the proportion of leaves
completed. Topic state is keyed by `examId:topicId`, so duplicate IDs across
exams remain independent. Zustand persistence uses a versioned localStorage
schema.

## Data format

Each JSON file in `src/data/syllabus` contains `{ exam, subjects }`. Subjects
contain `id`, bilingual titles, and `topics`. Topics contain bilingual titles,
the default flags (`completed`, `revision`, `bookmarked`, `notes`), `progress`,
and a recursive `children` array. Science topics may additionally include
`level` and bilingual level labels.
