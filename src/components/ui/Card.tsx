import type { ReactNode } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`rounded-card bg-surface shadow-soft transition-transform duration-200 hover:-translate-y-0.5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
