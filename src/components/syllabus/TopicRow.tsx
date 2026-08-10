import { AnimatePresence, motion } from 'framer-motion';
import { Bookmark, ChevronDown, ChevronRight, Circle, FileText, Flame } from 'lucide-react';
import { memo } from 'react';
import { Badge } from '../ui';
import { statusForTopic } from '../../lib/progress';
import { useProgressStore } from '../../store/progressStore';
import { useSyllabusStore } from '../../store/syllabusStore';
import { useNotesStore } from '../../store/notesStore';
import type { Topic } from '../../types';
import { topicMatches } from './topicSearch';

function statusLabel(status: ReturnType<typeof statusForTopic>) {
  if (status === 'completed' || status === 'mastered') return 'Done';
  if (status === 'learning' || status === 'revision_due') return 'In Progress';
  return 'New';
}

function statusTone(status: ReturnType<typeof statusForTopic>) {
  if (status === 'completed' || status === 'mastered') return 'green' as const;
  if (status === 'learning' || status === 'revision_due') return 'amber' as const;
  return 'blue' as const;
}

function countLeaves(
  topic: Topic,
  statusMap: Record<string, ReturnType<typeof statusForTopic>>,
): { completed: number; total: number } {
  if (!topic.children.length) {
    const status = statusForTopic(topic, statusMap);
    return {
      completed: status === 'completed' || status === 'mastered' ? 1 : 0,
      total: 1,
    };
  }

  return topic.children.reduce(
    (result, child) => {
      const childCount = countLeaves(child, statusMap);
      return {
        completed: result.completed + childCount.completed,
        total: result.total + childCount.total,
      };
    },
    { completed: 0, total: 0 },
  );
}

export const TopicRow = memo(function TopicRow({
  topic,
  depth = 0,
  number = '',
}: {
  topic: Topic;
  depth?: number;
  number?: string;
}) {
  const { expanded, toggleExpanded, selectedTopic, selectTopic, toggleCompletion, searchQuery } =
    useSyllabusStore();
  const statusMap = useProgressStore((state) => state.statusMap);
  const note = useNotesStore((state) => state.notes[topic.id]);

  if (!topicMatches(topic, searchQuery)) return null;

  const open =
    expanded[topic.id] ||
    Boolean(searchQuery && topic.children.some((child) => topicMatches(child, searchQuery)));
  const status = statusForTopic(topic, statusMap);
  const count = countLeaves(topic, statusMap);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      selectTopic(topic.id);
    }
    if (event.key === 'ArrowRight' && topic.children.length && !open) {
      toggleExpanded(topic.id);
    }
    if (event.key === 'ArrowLeft' && open) {
      toggleExpanded(topic.id);
    }
  }

  return (
    <div>
      <div
        role="treeitem"
        tabIndex={0}
        aria-expanded={topic.children.length ? open : undefined}
        onKeyDown={handleKeyDown}
        onClick={() => selectTopic(topic.id)}
        className={`group flex cursor-pointer items-center gap-2 rounded-[12px] px-2 py-2 text-xs transition hover:bg-violet-50 ${
          selectedTopic === topic.id ? 'bg-violet-50 text-primary' : 'text-slate-600'
        }`}
        style={{ marginLeft: depth * 14 }}
      >
        <button
          aria-label={open ? 'Collapse topic' : 'Expand topic'}
          onClick={(event) => {
            event.stopPropagation();
            if (topic.children.length) toggleExpanded(topic.id);
          }}
          className="text-slate-300"
        >
          {topic.children.length ? (
            open ? (
              <ChevronDown size={15} />
            ) : (
              <ChevronRight size={15} />
            )
          ) : (
            <span className="w-[15px]" />
          )}
        </button>
        <button
          type="button"
          aria-label={`Mark ${topic.title_en} ${status === 'completed' ? 'incomplete' : 'complete'}`}
          onClick={(event) => {
            event.stopPropagation();
            toggleCompletion(topic.id, !(status === 'completed' || status === 'mastered'));
          }}
          className="text-primary"
        >
          {status === 'completed' || status === 'mastered' ? (
            <Circle size={15} fill="currentColor" className="text-primary" />
          ) : (
            <Circle size={15} className="text-slate-300" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            {number && `${number} `}
            {topic.title_en}
          </p>
          <p className="truncate text-[10px] text-slate-400">{topic.title_hi}</p>
        </div>
        <span className="text-[10px] text-slate-400">
          {count.completed} / {count.total}
        </span>
        <Badge tone={statusTone(status)}>{statusLabel(status)}</Badge>
        {(note?.content || topic.notes) && <FileText size={13} className="text-slate-300" />}
        {topic.bookmarked && <Bookmark size={13} className="text-amber-400" />}
        {topic.revision && <Flame size={13} className="text-orange-400" />}
      </div>
      <AnimatePresence initial={false}>
        {open && topic.children.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            {topic.children.map((child, index) => (
              <TopicRow
                key={child.id}
                topic={child}
                depth={depth + 1}
                number={number ? `${number}.${index + 1}` : `${index + 1}`}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
