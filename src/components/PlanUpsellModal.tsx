import { useNavigate } from 'react-router-dom';
import { useCurrency } from '../hooks/useCurrency';
import { useAppSettings } from '../hooks/useAppSettings';
import confetti from 'canvas-confetti';

/**
 * PlanUpsellModal — Smart 3-case logic:
 * Case 1: No plan / free → show modal encouraging first subscription
 * Case 2: Active plan (starter–executive) → show only the NEXT higher plan
 * Case 3: Platinum → never show modal (handled by parent gating + isHighestPlan)
 *
 * All earning data is pulled from global settings — NOT hardcoded.
 */

const PLAN_ORDER = ['free', 'starter', 'pro', 'elite', 'vip', 'executive', 'platinum'] as const;

const PLAN_NAMES: Record<string, { name: string; tagline: string }> = {
  starter:   { name: 'Starter Plan',      tagline: 'Start earning with daily streaks' },
  pro:       { name: 'Pro Active',        tagline: 'Double your daily earning power' },
  elite:     { name: 'Elite Growth',      tagline: 'Unlock elite-tier tasks & rewards' },
  vip:       { name: 'VIP Power',         tagline: 'Priority access to premium tasks' },
  executive: { name: 'Executive Master',  tagline: 'Maximize earnings with executive perks' },
  platinum:  { name: 'Platinum Master',   tagline: 'Unlimited earning potential — the pinnacle' },
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentPlanId: string;
}

export function PlanUpsellModal({ isOpen, onClose, currentPlanId }: Props) {
  const navigate = useNavigate();
  const { symbol, formatAmount } = useCurrency();
  const { streakSettings, nonNigerianPlans } = useAppSettings();

  if (!isOpen) return null;

  const normalizedPlan = (currentPlanId || 'free').toLowerCase().trim();
  const currentIndex = PLAN_ORDER.indexOf(normalizedPlan as typeof PLAN_ORDER[number]);

  // Case 3: Platinum users — never show
  if (currentIndex === PLAN_ORDER.length - 1) return null;

  const isFreeTier = currentIndex <= 0; // free or unrecognized plan
  const nextPlanId = isFreeTier ? 'starter' : PLAN_ORDER[Math.min(currentIndex + 1, PLAN_ORDER.length - 1)];
  const nextPlanMeta = PLAN_NAMES[nextPlanId];

  if (!nextPlanMeta) return null;

  const isGlobal = symbol === '$';

  // Pull weekly earning from global settings (dynamic, admin-controlled)
  const planStreak = streakSettings[nextPlanId] || streakSettings['free'];
  const displayWeekly = isGlobal ? (planStreak.weeklyTotalUsd || 2) : (planStreak.weeklyTotalNgn || 700);

  // Pull plan price from global settings
  const globalPlan = nonNigerianPlans[nextPlanId];
  const displayPrice = isGlobal ? (globalPlan?.price || 10) : 0; // Nigerian price comes from subscription_plans table

  // Calculate day 1 and day 7 using same AP formula as modal/SQL
  const a = displayWeekly * 4.0 / 49.0;
  const d = displayWeekly / 49.0;
  const day1 = Math.round(a * 100) / 100;
  const day7 = Math.round((a + 6 * d) * 100) / 100;

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
                You're on the <strong className="text-on-surface">Free plan</strong>. Subscribe to the <strong className="text-primary">{nextPlanMeta.name}</strong> to unlock daily streak rewards, higher task payouts, and exclusive earning opportunities.
              </p>
            </>
          ) : (
            /* Case 2: Has active plan — show next tier */
            <>
              <h2 className="text-2xl md:text-3xl font-black text-on-surface mb-2 tracking-tight font-headline">
                Maximize Your Earnings!
              </h2>
              <p className="text-on-surface-variant text-sm md:text-base leading-relaxed">
                Upgrade to the <strong className="text-primary">{nextPlanMeta.name}</strong> to {nextPlanMeta.tagline.toLowerCase()}.
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
              <span className="text-on-surface-variant font-medium text-sm">Daily Range</span>
              <span className="font-black text-primary text-sm">{symbol}{day1.toLocaleString()} → {symbol}{day7.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center bg-surface-container-lowest p-3 rounded-xl shadow-sm border border-surface-container/50">
              <span className="text-on-surface-variant font-medium text-sm">Monthly Potential</span>
              <span className="font-black text-primary">{formatAmount(displayWeekly * 4)}</span>
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
            {isFreeTier ? `Get Started — View Plans` : `Upgrade to ${nextPlanMeta.name}`}
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
