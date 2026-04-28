import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../hooks/useCurrency';
import confetti from 'canvas-confetti';

/**
 * PlanUpsellModal — Smart 3-case logic:
 * Case 1: No plan / free → show modal encouraging first subscription
 * Case 2: Active plan (starter–executive) → show only the NEXT higher plan
 * Case 3: Platinum → never show modal (handled by parent gating + isHighestPlan)
 */

const PLAN_ORDER = ['free', 'starter', 'pro', 'elite', 'vip', 'executive', 'platinum'] as const;

const PLAN_DETAILS: Record<string, { name: string; priceNgn: number; priceUsd: number; weeklyNgn: number; weeklyUsd: number; tagline: string }> = {
  starter:   { name: 'Starter Plan',      priceNgn: 3000,  priceUsd: 10,  weeklyNgn: 1500,  weeklyUsd: 5,   tagline: 'Start earning with daily streaks' },
  pro:       { name: 'Pro Active',        priceNgn: 6000,  priceUsd: 20,  weeklyNgn: 3000,  weeklyUsd: 10,  tagline: 'Double your daily earning power' },
  elite:     { name: 'Elite Growth',      priceNgn: 9000,  priceUsd: 30,  weeklyNgn: 4500,  weeklyUsd: 15,  tagline: 'Unlock elite-tier tasks & rewards' },
  vip:       { name: 'VIP Power',         priceNgn: 15000, priceUsd: 50,  weeklyNgn: 7500,  weeklyUsd: 25,  tagline: 'Priority access to premium tasks' },
  executive: { name: 'Executive Master',  priceNgn: 30000, priceUsd: 100, weeklyNgn: 15000, weeklyUsd: 50,  tagline: 'Maximize earnings with executive perks' },
  platinum:  { name: 'Platinum Master',   priceNgn: 75000, priceUsd: 250, weeklyNgn: 37500, weeklyUsd: 125, tagline: 'Unlimited earning potential — the pinnacle' },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentPlanId: string;
}

export function PlanUpsellModal({ isOpen, onClose, currentPlanId }: Props) {
  const navigate = useNavigate();
  const { symbol, formatAmount } = useCurrency();

  if (!isOpen) return null;

  const normalizedPlan = (currentPlanId || 'free').toLowerCase().trim();
  const currentIndex = PLAN_ORDER.indexOf(normalizedPlan as typeof PLAN_ORDER[number]);

  // Case 3: Platinum users — never show
  if (currentIndex === PLAN_ORDER.length - 1) return null;

  const isFreeTier = currentIndex <= 0; // free or unrecognized plan
  const nextPlanId = isFreeTier ? 'starter' : PLAN_ORDER[Math.min(currentIndex + 1, PLAN_ORDER.length - 1)];
  const nextPlan = PLAN_DETAILS[nextPlanId];

  if (!nextPlan) return null;

  const isGlobal = symbol === '$';
  const displayPrice = isGlobal ? nextPlan.priceUsd : nextPlan.priceNgn;
  const displayWeekly = isGlobal ? nextPlan.weeklyUsd : nextPlan.weeklyNgn;

  const handleUpgradeClick = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    onClose();
    navigate('/plans');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-body animate-[fadeIn_0.3s_ease-out]">
      <div className="bg-surface-container-lowest rounded-[2rem] p-8 md:p-10 w-full max-w-md shadow-2xl relative animate-[fadeInUp_0.4s_ease-out] border border-surface-container">
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 text-on-surface-variant/50 hover:text-on-surface bg-surface-container hover:bg-surface-container-high w-8 h-8 rounded-full flex items-center justify-center transition-colors"
        >
          <span className="material-symbols-outlined text-sm">close</span>
        </button>

        <div className="text-center mb-6 mt-4">
          <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-[1.5rem] flex items-center justify-center mx-auto mb-5 rotate-3 shadow-inner">
            <span className="material-symbols-outlined text-primary text-[40px] -rotate-3" style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
          </div>

          {isFreeTier ? (
            /* Case 1: No plan — encourage first subscription */
            <>
              <h2 className="text-2xl md:text-3xl font-black text-on-surface mb-2 tracking-tight font-headline">
                Start Earning Today!
              </h2>
              <p className="text-on-surface-variant text-sm md:text-base leading-relaxed">
                You're on the <strong className="text-on-surface">Free plan</strong>. Subscribe to the <strong className="text-primary">{nextPlan.name}</strong> to unlock daily streak rewards, higher task payouts, and exclusive earning opportunities.
              </p>
            </>
          ) : (
            /* Case 2: Has active plan — show next tier */
            <>
              <h2 className="text-2xl md:text-3xl font-black text-on-surface mb-2 tracking-tight font-headline">
                Maximize Your Earnings!
              </h2>
              <p className="text-on-surface-variant text-sm md:text-base leading-relaxed">
                Upgrade to the <strong className="text-primary">{nextPlan.name}</strong> to {nextPlan.tagline.toLowerCase()}.
              </p>
            </>
          )}
        </div>

        <div className="bg-primary/5 border border-primary/10 p-5 rounded-2xl mb-8">
          <p className="text-xs font-black uppercase tracking-widest text-primary mb-4 text-center">
            {isFreeTier ? "What You'll Unlock" : "What You'll Earn"}
          </p>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-surface-container-lowest p-3 rounded-xl shadow-sm border border-surface-container/50">
              <span className="text-on-surface-variant font-medium text-sm">Weekly Streak Pay</span>
              <span className="font-black text-primary">{formatAmount(displayWeekly)}</span>
            </div>
            <div className="flex justify-between items-center bg-surface-container-lowest p-3 rounded-xl shadow-sm border border-surface-container/50">
              <span className="text-on-surface-variant font-medium text-sm">21-Day Cycle Total</span>
              <span className="font-black text-primary">{formatAmount(displayWeekly * 3)}</span>
            </div>
            {isFreeTier && (
              <div className="flex justify-between items-center bg-surface-container-lowest p-3 rounded-xl shadow-sm border border-surface-container/50">
                <span className="text-on-surface-variant font-medium text-sm">Higher Referral Bonus</span>
                <span className="font-black text-primary">✓ Unlocked</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <button 
            onClick={handleUpgradeClick}
            className="w-full py-4 rounded-xl font-black text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:opacity-90 transition-opacity shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
          >
            {isFreeTier ? `Get Started for ${formatAmount(displayPrice)}` : `Upgrade for ${formatAmount(displayPrice)} Now`}
          </button>
          <button 
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
