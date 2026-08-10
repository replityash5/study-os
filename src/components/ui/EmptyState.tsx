import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
      <div className="mb-4 rounded-[20px] bg-violet-50 p-4 text-primary">{icon}</div>
      <h3 className="text-lg font-bold text-slate-800">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">{description}</p>
    </div>
  );
}
