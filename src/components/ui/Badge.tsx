import type { ReactNode } from 'react';

type BadgeTone = 'neutral' | 'blue' | 'green' | 'amber';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-500',
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  amber: 'bg-amber-50 text-amber-600',
};

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
