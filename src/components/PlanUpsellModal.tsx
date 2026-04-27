import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../hooks/useCurrency';
import { useAppSettings } from '../hooks/useAppSettings';
import confetti from 'canvas-confetti';

export function PlanUpsellModal({ isOpen, onClose, currentPlanId }: { isOpen: boolean, onClose: () => void, currentPlanId: string }) {
  const navigate = useNavigate();
  const { symbol, formatAmount } = useCurrency();
  const { exchangeRates } = useAppSettings();

  if (!isOpen) return null;

  // Determine the next plan based on the current plan
  const planOrder = ['free', 'starter', 'pro', 'elite', 'vip', 'executive', 'platinum'];
  const currentIndex = planOrder.indexOf(currentPlanId);
  const isHighestPlan = currentIndex === planOrder.length - 1;

  if (isHighestPlan) return null;

  const nextPlanId = currentIndex === -1 ? 'starter' : planOrder[currentIndex + 1];

  // Provide details for the next plan
  const planDetails: Record<string, any> = {
    starter: { name: 'Starter Plan', priceNgn: 3000, priceUsd: 10, weeklyNgn: 1500, weeklyUsd: 5 },
    pro: { name: 'Pro Active', priceNgn: 6000, priceUsd: 20, weeklyNgn: 3000, weeklyUsd: 10 },
    elite: { name: 'Elite Growth', priceNgn: 9000, priceUsd: 30, weeklyNgn: 4500, weeklyUsd: 15 },
    vip: { name: 'VIP Power', priceNgn: 15000, priceUsd: 50, weeklyNgn: 7500, weeklyUsd: 25 },
    executive: { name: 'Executive Master', priceNgn: 30000, priceUsd: 100, weeklyNgn: 15000, weeklyUsd: 50 },
    platinum: { name: 'Platinum Master', priceNgn: 75000, priceUsd: 250, weeklyNgn: 37500, weeklyUsd: 125 }
  };

  const nextPlan = planDetails[nextPlanId];
  if (!nextPlan) return null;

  // Since useCurrency isGlobal controls formatAmount, we can dynamically get price and weekly earnings.
  const isGlobal = symbol === '$';
  const displayPrice = isGlobal ? nextPlan.priceUsd : nextPlan.priceNgn;
  const displayWeekly = isGlobal ? nextPlan.weeklyUsd : nextPlan.weeklyNgn;
  const displayTotal = isGlobal ? nextPlan.priceUsd * 0.5 : nextPlan.priceNgn * 0.5;

  const handleUpgradeClick = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    onClose();
    navigate('/plans');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-body animate-[fadeIn_0.3s_ease-out]">
      <div className="bg-white rounded-[2rem] p-8 md:p-10 w-full max-w-md shadow-2xl relative animate-[fadeInUp_0.4s_ease-out]">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>

        <div className="text-center mb-6 mt-4">
          <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-emerald-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5 rotate-3 shadow-inner">
            <span className="material-symbols-outlined text-emerald-600 text-[40px] -rotate-3" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 mb-2 tracking-tight font-headline">Maximize Your Earnings!</h2>
          <p className="text-slate-500 text-sm md:text-base leading-relaxed">
            Upgrade to the <strong className="text-emerald-700">{nextPlan.name}</strong> to unlock higher daily login streaks and exclusive tasks.
          </p>
        </div>

        <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-4 text-center">What You'll Earn</p>
          <div className="space-y-3">
             <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-emerald-50">
               <span className="text-slate-600 font-medium text-sm">Weekly Streak Pay</span>
               <span className="font-black text-emerald-700">{symbol}{displayWeekly.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
             </div>
             <div className="flex justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-emerald-50">
               <span className="text-slate-600 font-medium text-sm">21-Day Cycle Total</span>
               <span className="font-black text-emerald-700">{symbol}{(displayWeekly * 3).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
             </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleUpgradeClick}
            className="w-full py-4 rounded-xl font-black text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
          >
            Upgrade for {symbol}{displayPrice.toLocaleString()} Now
          </button>
          <button 
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
