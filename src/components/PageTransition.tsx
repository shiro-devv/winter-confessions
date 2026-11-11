import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

/** Wraps a page so it fades and slides in on entry and out on exit. */
export function PageTransition({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.main
      id="main"
      className={`page ${className ?? ''}`.trim()}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {children}
    </motion.main>
  );
}
