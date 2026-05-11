'use client';

import { motion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════
   PULSING 3-DOT LOADER — green shaded
   ═══════════════════════════════════════════════════════ */
export function DotLoader({ size = 'md', className = '' }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : size === 'lg' ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5';

  return (
    <div className={`flex items-center justify-center gap-1.5 ${className}`}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className={`${dotSize} rounded-full`}
          style={{ background: `hsl(${145 + i * 8}, 65%, ${42 + i * 6}%)` }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 0.9,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   BUTTON LOADER — replaces text in buttons
   ═══════════════════════════════════════════════════════ */
export function ButtonLoader({ text = 'Processing' }: { text?: string }) {
  return (
    <span className="flex items-center justify-center gap-2">
      <DotLoader size="sm" />
      <span className="text-sm font-medium">{text}</span>
    </span>
  );
}

/* ═══════════════════════════════════════════════════════
   FULLSCREEN LOADER — for auth / page loads
   ═══════════════════════════════════════════════════════ */
export function FullScreenLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm"
    >
      <DotLoader size="lg" />
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-4 text-sm font-medium text-slate-500"
      >
        {message}
      </motion.p>
    </motion.div>
  );
}
