import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronRight, Globe2, Landmark, Sigma, Sparkles, Trophy } from 'lucide-react';
import { memo } from 'react';
import { Card } from '../ui';
import { calculateProgress } from '../../lib/progress';
import { useSyllabusStore } from '../../store/syllabusStore';
import { useProgressStore } from '../../store/progressStore';
import type { Subject } from '../../types';
import { TopicRow } from './TopicRow';
import { topicMatches } from './topicSearch';

const iconTints = [
  { className: 'bg-violet-50 text-primary', icon: Landmark },
  { className: 'bg-blue-50 text-blue-500', icon: Globe2 },
  { className: 'bg-emerald-50 text-emerald-500', icon: Trophy },
  { className: 'bg-amber-50 text-amber-500', icon: Sigma },
  { className: 'bg-rose-50 text-rose-500', icon: Sparkles },
];

export const SubjectRow = memo(function SubjectRow({
  subject,
  index,
}: {
  subject: Subject;
  index: number;
}) {
  const { expanded, toggleExpanded, searchQuery } = useSyllabusStore();
  const statusMap = useProgressStore((state) => state.statusMap);
  const progress = calculateProgress(subject.topics, statusMap);
  const open =
    expanded[subject.id] ||
    Boolean(searchQuery && subject.topics.some((topic) => topicMatches(topic, searchQuery)));

  return (
    <Card
      className={`overflow-hidden rounded-[17px] shadow-none ring-1 ring-slate-100 ${open ? 'border-l-2 border-primary' : ''}`}
    >
      <button
        onClick={() => toggleExpanded(subject.id)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-3 text-left text-xs font-bold text-slate-700 hover:bg-slate-50"
      >
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
            iconTints[index % iconTints.length].className
          }`}
        >
          {(() => {
            const Icon = iconTints[index % iconTints.length].icon;
            return <Icon size={14} />;
          })()}
        </span>
        <span className="min-w-0 flex-1 truncate">
          {index + 1}. {subject.title_en}
        </span>
        <span className="whitespace-nowrap text-[10px] text-slate-400">
          {progress.completedLeaves} / {progress.totalLeaves}
        </span>
        {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden px-2 pb-2"
          >
            {subject.topics.map((topic) => (
              <TopicRow key={topic.id} topic={topic} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
});
