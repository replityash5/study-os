import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, BookOpenCheck, CalendarDays, Clock3, Flame, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useActivityStore } from '../store/activityStore';
import { useProgressStore } from '../store/progressStore';
import { syllabi } from '../store/syllabusStore';
import { calculateProgress } from '../lib/progress';
import {
  aggregateActivity,
  calculateStreaks,
  completedTopicsInRange,
  dayKey,
  deriveWeakTopics,
  rollupTimeBySubject,
} from '../lib/activity';
import { daysBetween, emptyActivityDay } from '../services/activityAdapter';
import type { ActivityDay } from '../types/activity';
import { Badge, Card, ProgressBar, SegmentedToggle } from '../components/ui';

const ranges = [7, 30, 90];

function minutes(milliseconds: number) {
  return Math.round(milliseconds / 60_000);
}

function duration(milliseconds: number) {
  const totalMinutes = minutes(milliseconds);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

function formatDay(day: string, long = false) {
  return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, {
    month: long ? 'short' : 'numeric',
    day: 'numeric',
  });
}

function Kpi({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: string; detail?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <span className="rounded-lg bg-violet-50 p-2 text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-4 text-2xl font-bold text-slate-800">{value}</p>
      {detail && <p className="mt-1 text-[11px] text-slate-400">{detail}</p>}
    </Card>
  );
}

function DailyBars({ days, valueFor, color }: { days: ActivityDay[]; valueFor: (day: ActivityDay) => number; color: string }) {
  const values = days.map(valueFor);
  const maximum = Math.max(...values, 1);
  return (
    <div className="flex h-44 items-end gap-1.5 border-b border-slate-100 px-1 pb-0">
      {days.map((day, index) => (
        <div key={day.day} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
          <div className="relative flex flex-1 items-end">
            <div
              className={`w-full rounded-t-md ${color} transition-all group-hover:opacity-80`}
              style={{ height: `${Math.max(values[index] ? 6 : 2, (values[index] / maximum) * 100)}%` }}
              title={`${formatDay(day.day, true)}: ${valueFor(day)}`}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[10px] text-white group-hover:block">
              {formatDay(day.day, true)} · {valueFor(day)}
            </span>
          </div>
          {(index === 0 || index === days.length - 1 || days.length <= 14 || index % Math.ceil(days.length / 7) === 0) && (
            <span className="mt-2 truncate text-center text-[9px] text-slate-400">{formatDay(day.day)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

export function AnalyticsPage() {
  const [range, setRange] = useState(7);
  const days = useMemo(() => daysBetween(new Date(), range), [range]);
  const activityDays = useActivityStore((state) => state.days);
  const hydrateRange = useActivityStore((state) => state.hydrateRange);
  const statusMaps = useProgressStore((state) => state.examStatusMaps);
  const rangeDays = days.map((day) => activityDays[day] ?? emptyActivityDay(day));

  useEffect(() => {
    void hydrateRange(days);
  }, [days, hydrateRange]);

  const aggregate = useMemo(() => aggregateActivity(rangeDays), [rangeDays]);
  const today = activityDays[dayKey(new Date())] ?? emptyActivityDay(dayKey(new Date()));
  const streaks = useMemo(() => calculateStreaks(rangeDays, dayKey(new Date())), [rangeDays]);
  const subjectTime = useMemo(() => rollupTimeBySubject(rangeDays, syllabi), [rangeDays]);
  const weakTopics = useMemo(
    () => deriveWeakTopics(rangeDays, syllabi, Object.fromEntries(Object.entries(statusMaps).map(([exam, document]) => [exam, document.statusMap]))),
    [rangeDays, statusMaps],
  );
  const completedByDay = (day: ActivityDay) =>
    new Set(day.statusChanges.filter((event) => event.to === 'completed' || event.to === 'mastered').map((event) => `${event.examId}:${event.topicId}`)).size;
  const hasActivity = aggregate.studyMs > 0 || aggregate.statusChanges.length > 0;
  const maxSubjectTime = Math.max(...subjectTime.map((item) => item.milliseconds), 1);

  return (
    <div className="min-h-screen bg-canvas pl-[114px] pr-8 pt-5 max-md:pb-24 max-md:pl-4 max-md:pr-4">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Study insights</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-800">Analytics</h1>
          <p className="mt-2 text-sm text-slate-400">See where your consistency is taking you.</p>
        </div>
        <div className="w-full max-w-xs sm:w-64">
          <SegmentedToggle options={ranges.map((item) => `${item} days`)} value={ranges.indexOf(range)} onChange={(index) => setRange(ranges[index])} />
        </div>
      </header>

      {!hasActivity ? (
        <Card className="mt-8 flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
          <div className="rounded-2xl bg-violet-50 p-4 text-primary"><Target size={30} /></div>
          <h2 className="mt-5 text-xl font-bold text-slate-800">Start studying to see your analytics</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">Select a topic in your workspace and spend a little time with it. Your study time, streaks, progress, and weak-topic insights will appear here.</p>
          <Link to="/workspace" className="mt-6 rounded-[16px] bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-soft-purple hover:bg-violet-600">Go to workspace</Link>
        </Card>
      ) : (
        <>
          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Kpi icon={<Clock3 size={16} />} label="Today" value={duration(today.studyMs)} detail="active study time" />
            <Kpi icon={<CalendarDays size={16} />} label={`${range}-day total`} value={duration(aggregate.studyMs)} detail="across all topics" />
            <Kpi icon={<Flame size={16} />} label="Current streak" value={`${streaks.current} day${streaks.current === 1 ? '' : 's'}`} detail={`Longest: ${streaks.longest} days`} />
            <Kpi icon={<BookOpenCheck size={16} />} label="Completed" value={String(completedTopicsInRange(rangeDays))} detail="topics completed in range" />
            <Kpi icon={<ArrowUpRight size={16} />} label="Active days" value={String(rangeDays.filter((day) => day.studyMs > 0 || day.statusChanges.length > 0).length)} detail={`of ${range} days`} />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <Card className="p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold text-slate-700">Study time</h2><p className="mt-1 text-xs text-slate-400">Minutes studied each day</p></div><Badge tone="blue">{minutes(aggregate.studyMs)} min</Badge></div><DailyBars days={rangeDays} valueFor={(day) => minutes(day.studyMs)} color="bg-primary" /></Card>
            <Card className="p-5"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-bold text-slate-700">Progress activity</h2><p className="mt-1 text-xs text-slate-400">Topics completed each day</p></div><Badge tone="green">{completedTopicsInRange(rangeDays)} completed</Badge></div><DailyBars days={rangeDays} valueFor={completedByDay} color="bg-emerald-400" /></Card>
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
            <Card className="p-5"><h2 className="font-bold text-slate-700">Time by subject</h2><p className="mt-1 text-xs text-slate-400">Where your focused minutes are going</p><div className="mt-5 space-y-4">{subjectTime.length ? [...subjectTime].sort((a, b) => b.milliseconds - a.milliseconds).map((item) => <div key={`${item.examId}:${item.subjectId}`}><div className="mb-1 flex justify-between gap-3 text-xs"><span className="truncate font-semibold text-slate-600">{item.title}</span><span className="shrink-0 text-slate-400">{duration(item.milliseconds)}</span></div><div className="h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-violet-400" style={{ width: `${(item.milliseconds / maxSubjectTime) * 100}%` }} /></div><p className="mt-1 truncate text-[10px] text-slate-400">{item.examId}</p></div>) : <p className="py-10 text-center text-sm text-slate-400">Subject breakdown appears after your first study session.</p>}</div></Card>
            <Card className="p-5"><h2 className="font-bold text-slate-700">Exam progress</h2><p className="mt-1 text-xs text-slate-400">Current completion across each syllabus</p><div className="mt-5 space-y-5">{syllabi.map((syllabus) => { const progress = calculateProgress(syllabus.subjects.flatMap((subject) => subject.topics), statusMaps[syllabus.exam]?.statusMap); return <div key={syllabus.exam}><div className="mb-2 flex justify-between gap-3 text-xs"><span className="truncate font-semibold text-slate-600">{syllabus.exam}</span><span className="font-bold text-primary">{progress.percentage}%</span></div><ProgressBar value={progress.percentage} /><p className="mt-1 text-[10px] text-slate-400">{progress.completedLeaves} / {progress.totalLeaves} leaf topics</p></div> })}</div></Card>
          </div>
          <Card className="mt-4 p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="font-bold text-slate-700">Topics to revisit</h2><p className="mt-1 text-xs text-slate-400">Revision flags and topics that need more reinforcement</p></div><BookOpenCheck className="text-rose-300" size={20} /></div>{weakTopics.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{weakTopics.slice(0, 12).map((topic) => <Link key={`${topic.examId}:${topic.topicId}`} to={`/workspace?exam=${encodeURIComponent(topic.examId)}&topic=${encodeURIComponent(topic.topicId)}`} className="flex items-center justify-between gap-3 rounded-xl bg-rose-50/70 p-3 transition hover:bg-rose-100"><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-700">{topic.title}</span><span className="mt-1 block text-[10px] text-slate-400">{topic.examId}</span></span><span className="shrink-0 text-right"><span className="block text-[10px] font-bold text-rose-500">{topic.reason}</span>{topic.milliseconds > 0 && <span className="text-[10px] text-slate-400">{duration(topic.milliseconds)}</span>}</span></Link>)}</div> : <p className="mt-5 rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-400">No weak topics detected in this range. Keep going.</p>}</Card>
        </>
      )}
    </div>
  );
}
