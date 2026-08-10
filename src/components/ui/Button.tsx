import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  className?: string;
}

export function Button({ children, className = '', ...props }: ButtonProps) {
  return (
    <button
      className={`rounded-[16px] bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-soft-purple transition hover:bg-violet-600 focus:outline-none focus:ring-2 focus:ring-primary/40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
