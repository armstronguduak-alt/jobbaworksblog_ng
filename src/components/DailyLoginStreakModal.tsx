import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrency } from '../hooks/useCurrency';
import confetti from 'canvas-confetti';

import { useAppSettings } from '../hooks/useAppSettings';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DailyLoginStreakModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DailyLoginStreakModal({ isOpen, onClose }: DailyLoginStreakModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isGlobal, formatAmount } = useCurrency();
  const { streakSettings } = useAppSettings();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [claimedToday, setClaimedToday] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<{ reward: number; streak: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [planId, setPlanId] = useState('free');

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchStreakStatus();
    }
  }, [isOpen, user?.id]);

  async function fetchStreakStatus() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_login_streak_status');
      if (!error && data) {
        setCurrentStreak(data.current_streak || 0);
        setClaimedToday(data.claimed_today || false);
        setTotalEarnings(data.total_streak_earnings || 0);
        setPlanId(data.plan_id || 'free');
      }
    } catch (err) {
      console.error('Error fetching streak:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleClaim() {
    if (isClaiming || claimedToday) return;
    setIsClaiming(true);
    try {
      const { data, error } = await supabase.rpc('claim_daily_login_reward');
      if (!error && data?.success) {
        setClaimResult({ reward: data.reward, streak: data.current_streak });
        setCurrentStreak(data.current_streak);
        setClaimedToday(true);
        setTotalEarnings((prev) => prev + data.reward);

        // Celebrate!
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#008751', '#FFD700', '#ffffff', '#00e479', '#f59e0b'],
        });

        // Invalidate dashboard + wallet queries
        queryClient.invalidateQueries({ queryKey: ['dashboard', user?.id] });
        queryClient.invalidateQueries({ queryKey: ['earnData', user?.id] });
      } else if (data?.already_claimed) {
        setClaimedToday(true);
        setCurrentStreak(data.current_streak);
      }
    } catch (err) {
      console.error('Error claiming streak:', err);
    } finally {
      setIsClaiming(false);
    }
  }

  if (!isOpen) return null;

  const displayStreak = claimResult ? claimResult.streak : currentStreak;

  const planStreakSetting = streakSettings[planId] || streakSettings['free'];
  const totalReward = isGlobal ? (planStreakSetting.weeklyTotalUsd || 2) : (planStreakSetting.weeklyTotalNgn || 700);
  const symbol = isGlobal ? '$' : '₦';

  // Format reward for display in grid tiles
  const formatRewardDisplay = (amount: number) => {
    if (isGlobal) {
      return `$${amount.toFixed(amount < 1 ? 2 : 1)}`;
    }
    return `₦${amount >= 1000 ? (amount / 1000).toFixed(1) + 'k' : amount.toLocaleString()}`;
  };

  // Arithmetic Progression: 7 terms summing exactly to totalReward
  // Matches SQL: a = Total * 4/49, d = Total / 49
  // S = 7a + 21d = 7*(4T/49) + 21*(T/49) = 28T/49 + 21T/49 = 49T/49 = T ✓
  const a = totalReward * 4.0 / 49.0;
  const d = totalReward / 49.0;

  const dayRewards = Array.from({ length: 7 }, (_, i) => {
    const amount = a + i * d;
    return Math.round(amount * 100) / 100;
  });

  const minReward = dayRewards[0];
  const maxReward = dayRewards[6];

  // Format the claimed reward for display
  const formatClaimReward = (amount: number) => {
    return formatAmount(amount);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-[420px] bg-gradient-to-b from-[#0a2618] to-[#0d3320] rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
        {/* Decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-400/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-amber-400/10 rounded-full blur-[60px] pointer-events-none" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[100] w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>

        {/* Header */}
        <div className="relative z-10 pt-8 pb-4 px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/20 backdrop-blur-sm px-4 py-1.5 rounded-full mb-4">
            <span className="text-2xl">🔥</span>
            <span className="text-amber-300 text-xs font-black uppercase tracking-widest">
              Daily Login Streak
            </span>
          </div>
          <h2 className="text-white text-2xl font-black font-headline tracking-tight mb-1">
            {isLoading ? (
              'Loading...'
            ) : claimedToday && claimResult ? (
              <>You earned {formatClaimReward(claimResult.reward)}!</>
            ) : claimedToday ? (
              <>Come back tomorrow!</>
            ) : (
              <>Claim Today's Reward</>
            )}
          </h2>
          <p className="text-white/50 text-sm font-medium">
            {isLoading
              ? 'Checking your streak...'
              : claimedToday
              ? `Day ${displayStreak} complete • Keep the streak going!`
              : `Login every day to earn up to ${symbol}${maxReward.toLocaleString()}`}
          </p>
        </div>

        {/* 7-Day Streak Grid */}
        <div className="relative z-10 px-5 pb-4">
          <div className="grid grid-cols-7 gap-2">
            {dayRewards.map((reward, index) => {
              const dayNum = index + 1;
              const isCompleted = dayNum <= displayStreak && claimedToday;
              const isCurrent = dayNum === (claimedToday ? displayStreak : displayStreak + 1);
              const isPast = dayNum < (claimedToday ? displayStreak : displayStreak + 1) && dayNum <= displayStreak;
              const isFuture = !isCompleted && !isCurrent && !isPast;

              return (
                <div key={dayNum} className="flex flex-col items-center gap-1.5">
                  {/* Day circle */}
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center relative transition-all duration-500 ${
                      isCompleted
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30'
                        : isCurrent
                        ? 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/40 animate-pulse'
                        : isPast
                        ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/30'
                        : 'bg-white/5 border border-white/10'
                    }`}
                  >
                    {isCompleted || isPast ? (
                      <span className="material-symbols-outlined text-white text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check
                      </span>
                    ) : isCurrent ? (
                      <span className="text-white font-black text-sm">
                        🎁
                      </span>
                    ) : (
                      <span className="text-white/30 font-bold text-xs">
                        {dayNum}
                      </span>
                    )}
                    {/* Glow ring for current */}
                    {isCurrent && !claimedToday && (
                      <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/50 animate-ping" />
                    )}
                  </div>
                  {/* Day label */}
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${
                    isCompleted || isPast ? 'text-emerald-300' : isCurrent ? 'text-amber-300' : 'text-white/25'
                  }`}>
                    {DAY_LABELS[index]}
                  </span>
                  {/* Reward amount */}
                  <span className={`text-[10px] font-black ${
                    isCompleted || isPast ? 'text-emerald-400' : isCurrent ? 'text-amber-400' : 'text-white/20'
                  }`}>
                    {formatRewardDisplay(reward)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Connector line */}
          <div className="flex items-center justify-center px-6 mt-2 mb-1">
            <div className="h-0.5 w-full rounded-full bg-white/5 relative overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-amber-400 rounded-full transition-all duration-500"
                style={{ width: `${(displayStreak / 7) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Total Streak Earnings */}
        <div className="relative z-10 mx-5 mb-4 bg-white/5 backdrop-blur-sm rounded-2xl px-5 py-3 flex items-center justify-between border border-white/5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">savings</span>
            <span className="text-white/50 text-xs font-bold uppercase tracking-wider">
              Total Streak Earnings
            </span>
          </div>
          <span className="text-emerald-300 font-black font-headline text-lg">
            {formatAmount(totalEarnings)}
          </span>
        </div>

        {/* Claim / Status Button */}
        <div className="relative z-10 px-5 pb-6">
          {isLoading ? (
            <div className="w-full py-4 bg-white/5 rounded-2xl flex items-center justify-center">
              <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          ) : claimedToday ? (
            <button
              onClick={onClose}
              className="w-full py-4 bg-white/10 hover:bg-white/15 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 text-sm"
            >
              <span className="material-symbols-outlined text-[18px] text-emerald-400" style={{ fontVariationSettings: "'FILL' 1" }}>
                task_alt
              </span>
              Claimed! Come back tomorrow
            </button>
          ) : (
            <button
              onClick={handleClaim}
              disabled={isClaiming}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-emerald-950 font-black rounded-2xl active:scale-95 transition-all shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 text-base"
            >
              {isClaiming ? (
                <>
                  <div className="w-5 h-5 border-3 border-emerald-900/30 border-t-emerald-900 rounded-full animate-spin" />
                  Claiming...
                </>
              ) : (
                <>
                  <span className="text-xl">🎁</span>
                  Claim {symbol}{minReward.toLocaleString()} — {symbol}{maxReward.toLocaleString()} Reward
                </>
              )}
            </button>
          )}
        </div>

        {/* Footer tip */}
        <div className="relative z-10 bg-white/5 px-6 py-3 text-center border-t border-white/5">
          <p className="text-white/30 text-[10px] font-medium">
            ⚡ Miss a day and your streak resets to Day 1. Stay consistent!
          </p>
        </div>
      </div>
    </div>
  );
}
