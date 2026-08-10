import { useEffect, useMemo, useState } from 'react';
import { Ellipsis, Filter, Search, X } from 'lucide-react';
import { Badge, Button, Card, IconButton, Input, ProgressBar, SegmentedToggle } from '../ui';
import { SyncStatus } from '../SyncStatus';
import { calculateProgress } from '../../lib/progress';
import { useSyllabusStore } from '../../store/syllabusStore';
import { useProgressStore } from '../../store/progressStore';
import { SubjectRow } from './SubjectRow';

export function SyllabusExplorer({ onClose }: { onClose?: () => void }) {
  const { exams, selectedExam, setExam, searchQuery, setSearchQuery } = useSyllabusStore();
  const [searchInput, setSearchInput] = useState(searchQuery);
  const [showOptions, setShowOptions] = useState(false);
  const syllabus = exams[selectedExam];
  const statusMap = useProgressStore((state) => state.statusMap);
  const progress = useMemo(
    () =>
      calculateProgress(
        syllabus.subjects.flatMap((subject) => subject.topics),
        statusMap,
      ),
    [statusMap, syllabus],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchQuery(searchInput), 200);
    return () => window.clearTimeout(timeout);
  }, [searchInput, setSearchQuery]);

  useEffect(() => {
    setSearchInput('');
  }, [selectedExam]);

  return (
    <Card className="relative flex h-full min-h-0 flex-col rounded-[24px] p-5">
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Syllabus Explorer</h2>
          <p className="mt-1 text-xs text-slate-400">Your customized study path</p>
        </div>
        <div className="flex items-center gap-1">
          <SyncStatus />
          <IconButton label="Syllabus options" onClick={() => setShowOptions((value) => !value)}>
            <Ellipsis size={18} />
          </IconButton>
          {onClose && (
            <IconButton label="Close syllabus explorer" onClick={onClose}>
              <X size={18} />
            </IconButton>
          )}
        </div>
        {showOptions && (
          <button
            type="button"
            onClick={() => {
              setExam(2);
              setShowOptions(false);
            }}
            className="absolute right-5 top-14 z-10 rounded-xl bg-white px-3 py-2 text-[10px] font-semibold text-slate-600 shadow-soft"
          >
            Switch to 2nd Grade GK
          </button>
        )}
      </div>
      <SegmentedToggle
        options={['RPSC 1st Grade', 'RPSC 2nd Grade']}
        value={selectedExam}
        onChange={(index) => setExam(index)}
      />
      <div className="mt-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3.5 text-slate-400" />
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search topics, chapters..."
            className="w-full pl-9"
          />
        </div>
        <IconButton label="Filter topics">
          <Filter size={18} />
        </IconButton>
      </div>
      <div className="mt-4 rounded-[18px] bg-violet-50 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-600">Overall Progress</span>
          <span className="text-xl font-bold text-primary">{progress.percentage}%</span>
        </div>
        <ProgressBar value={progress.percentage} />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[10px] text-slate-400">
            {progress.completedLeaves} / {progress.totalLeaves} Topics Completed
          </p>
          <Button className="rounded-lg bg-white px-2 py-1 text-[10px] !text-primary shadow-none hover:bg-violet-100">
            View Analytics
          </Button>
        </div>
      </div>
      <div
        role="tree"
        aria-label="Syllabus topics"
        className="syllabus-scrollbar mt-5 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1"
      >
        {syllabus.subjects.map((subject, index) => (
          <SubjectRow key={subject.id} subject={subject} index={index} />
        ))}
      </div>
      {searchQuery && <Badge tone="blue">Searching for “{searchQuery}”</Badge>}
    </Card>
  );
}
