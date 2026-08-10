import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  label: string;
  className?: string;
}

export function IconButton({ children, label, className = '', ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`rounded-[14px] p-2 text-slate-500 transition hover:bg-violet-50 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
