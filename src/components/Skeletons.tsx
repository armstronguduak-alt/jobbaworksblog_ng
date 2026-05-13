import { motion } from 'framer-motion';

/** Reusable shimmer skeleton primitives */
const shimmer = 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent';

export function SkeletonLine({ className = '' }: { className?: string }) {
  return <div className={`bg-surface-container-low rounded-lg ${shimmer} ${className}`} />;
}

export function SkeletonCircle({ className = '' }: { className?: string }) {
  return <div className={`bg-surface-container-low rounded-full ${shimmer} ${className}`} />;
}

/** Dashboard skeleton — matches the dual wallet + stats layout */
export function DashboardSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-12 space-y-6 w-full animate-pulse">
      {/* Wallet cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-[1.5rem] bg-emerald-800/30 p-6 h-[180px]">
          <SkeletonLine className="w-24 h-3 mb-3 !bg-white/10" />
          <SkeletonLine className="w-40 h-8 mb-4 !bg-white/15" />
          <SkeletonLine className="w-full h-3 !bg-white/10" />
          <div className="grid grid-cols-2 gap-2 mt-6">
            <SkeletonLine className="h-9 rounded-xl !bg-white/10" />
            <SkeletonLine className="h-9 rounded-xl !bg-white/10" />
          </div>
        </div>
        <div className="rounded-[1.5rem] bg-purple-800/20 p-6 h-[180px]">
          <SkeletonLine className="w-24 h-3 mb-3 !bg-white/10" />
          <SkeletonLine className="w-40 h-8 mb-4 !bg-white/15" />
          <SkeletonLine className="w-full h-3 !bg-white/10" />
          <div className="grid grid-cols-2 gap-2 mt-6">
            <SkeletonLine className="h-9 rounded-xl !bg-white/10" />
            <SkeletonLine className="h-9 rounded-xl !bg-white/10" />
          </div>
        </div>
      </div>
      {/* Quick actions */}
      <div className="grid grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <SkeletonCircle className="w-12 h-12 !rounded-2xl" />
            <SkeletonLine className="w-10 h-2" />
          </div>
        ))}
      </div>
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-2 bg-surface-container-lowest p-6 rounded-[1.5rem]">
          <SkeletonLine className="w-28 h-4 mb-4" />
          <SkeletonLine className="w-48 h-8" />
        </div>
        <div className="space-y-4">
          <div className="bg-surface-container-lowest p-5 rounded-[1.5rem]">
            <SkeletonLine className="w-20 h-3 mb-2" />
            <SkeletonLine className="w-28 h-6" />
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-[1.5rem]">
            <SkeletonLine className="w-20 h-3 mb-2" />
            <SkeletonLine className="w-28 h-6" />
          </div>
        </div>
      </div>
      {/* Promo */}
      <SkeletonLine className="w-full aspect-[16/7] rounded-[1.5rem]" />
    </div>
  );
}

/** Article feed skeleton */
export function ArticleFeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {[...Array(count)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-surface-container-low overflow-hidden animate-pulse">
          <div className="w-full aspect-[4/3] bg-surface-container-low" />
          <div className="p-4 space-y-3">
            <SkeletonLine className="w-full h-4" />
            <SkeletonLine className="w-3/4 h-4" />
            <div className="flex items-center gap-2 pt-2 border-t border-surface-container">
              <SkeletonLine className="w-16 h-3" />
              <SkeletonLine className="w-12 h-3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** Earn page skeleton */
export function EarnPageSkeleton() {
  return (
    <div className="max-w-xl mx-auto px-4 md:px-6 py-8 space-y-8 animate-pulse">
      {/* Progress card */}
      <div className="bg-emerald-800/30 rounded-[2rem] p-8 h-[200px]">
        <SkeletonLine className="w-32 h-4 mb-4 !bg-white/10" />
        <SkeletonLine className="w-48 h-8 mb-6 !bg-white/15" />
        <SkeletonLine className="w-full h-2 rounded-full !bg-white/10" />
      </div>
      {/* Bounties */}
      <div className="space-y-4">
        <SkeletonLine className="w-36 h-5" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-surface-container-lowest p-5 rounded-[1.5rem] border border-surface-container-highest/20 h-24" />
        ))}
      </div>
      {/* Articles */}
      <div className="space-y-4">
        <SkeletonLine className="w-32 h-5" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-surface-container-lowest p-5 rounded-[1.5rem] border border-surface-container-highest/20 h-32" />
        ))}
      </div>
    </div>
  );
}

/** Profile page skeleton */
export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="flex items-center gap-4">
        <SkeletonCircle className="w-20 h-20" />
        <div className="space-y-2 flex-1">
          <SkeletonLine className="w-40 h-6" />
          <SkeletonLine className="w-28 h-4" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-surface-container-lowest p-4 rounded-2xl">
            <SkeletonLine className="w-16 h-3 mb-2" />
            <SkeletonLine className="w-24 h-6" />
          </div>
        ))}
      </div>
    </div>
  );
}
