import type { InputHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`rounded-[16px] border-0 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none ring-1 ring-slate-100 transition placeholder:text-slate-400 focus:ring-2 focus:ring-primary/40 ${className}`}
      {...props}
    />
  );
}
