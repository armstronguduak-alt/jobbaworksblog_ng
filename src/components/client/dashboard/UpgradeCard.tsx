'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const planHierarchy = ['free', 'starter', 'bronze', 'silver', 'gold', 'platinum_master'];

const planDetails: Record<string, { name: string; color: string; gradient: string; earnings: string }> = {
  starter: {
    name: 'Starter',
    color: 'text-blue-600',
    gradient: 'from-blue-500 to-blue-700',
    earnings: '$2/week',
  },
  bronze: {
    name: 'Bronze',
    color: 'text-amber-700',
    gradient: 'from-amber-600 to-amber-800',
    earnings: '$5/week',
  },
  silver: {
    name: 'Silver',
    color: 'text-slate-500',
    gradient: 'from-slate-400 to-slate-600',
    earnings: '$12/week',
  },
  gold: {
    name: 'Gold',
    color: 'text-yellow-500',
    gradient: 'from-yellow-400 to-yellow-600',
    earnings: '$25/week',
  },
  platinum_master: {
    name: 'Platinum Master',
    color: 'text-emerald-400',
    gradient: 'from-emerald-400 to-teal-600',
    earnings: '$50/week',
  },
};

interface UpgradeCardProps {
  currentPlan: string;
}

export function UpgradeCard({ currentPlan }: UpgradeCardProps) {
  const currentIndex = planHierarchy.indexOf(currentPlan || 'free');

  // Don't show if already at max plan
  if (currentIndex >= planHierarchy.length - 1) return null;

  // Next plan up
  const nextPlanKey = planHierarchy[currentIndex + 1];
  const nextPlan = planDetails[nextPlanKey];
  if (!nextPlan) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="relative overflow-hidden rounded-2xl border border-surface-container-low"
    >
      {/* Gradient header */}
      <div className={`bg-gradient-to-r ${nextPlan.gradient} px-5 py-4 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-widest opacity-80 font-bold">Upgrade to</p>
            <h3 className="text-base font-black">{nextPlan.name}</h3>
          </div>
          <span className="material-symbols-outlined text-2xl opacity-90" style={{ fontVariationSettings: "'FILL' 1" }}>
            rocket_launch
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="bg-white px-5 py-4">
        <p className="text-xs text-slate-500 mb-3">
          Earn up to <span className="font-black text-slate-900">{nextPlan.earnings}</span> with the {nextPlan.name} plan
        </p>
        <Link
          href="/plans"
          className={`block w-full text-center py-2 rounded-xl bg-gradient-to-r ${nextPlan.gradient} text-white text-xs font-bold hover:opacity-90 transition-opacity`}
        >
          View Plans →
        </Link>
      </div>

      {/* Sparkle decoration */}
      <div className="absolute top-3 right-16 w-2 h-2 bg-white/30 rounded-full animate-ping" />
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   TASK COUNT BADGE — shows on nav items
   ═══════════════════════════════════════════════════════ */
export function TaskBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 shadow-sm"
    >
      {count > 99 ? '99+' : count}
    </motion.span>
  );
}
