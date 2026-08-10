import { motion } from 'framer-motion';

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-violet-100">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.7 }}
        className="h-full rounded-full bg-primary"
      />
    </div>
  );
}
