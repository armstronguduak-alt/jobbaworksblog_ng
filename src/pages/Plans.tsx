import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { useCurrency } from '../hooks/useCurrency';
import { useAppSettings } from '../hooks/useAppSettings';
// @ts-ignore
import confetti from 'canvas-confetti';

declare global {
  interface Window {
    Korapay: any;
  }
}

export function Plans() {
  const { user, profile } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const { isGlobal, formatAmount } = useCurrency();
  const { nonNigerianPlans, usdtAddresses } = useAppSettings();

  const [plans, setPlans] = useState<any[]>([]);
  const [currentPlan, setCurrentPlan] = useState<string>('free');
  const [isLoading, setIsLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  // Manual payment state
  const [manualPaymentPlan, setManualPaymentPlan] = useState<any | null>(null);
  const [rotationIndex, setRotationIndex] = useState(0);

  useEffect(() => {
    fetchPlans();
    if (user?.id) fetchCurrentPlan(user.id);
  }, [user]);

  useEffect(() => {
    if (user?.id && usdtAddresses?.length) {
      // Create a deterministic pseudo-random index per user attempt
      const charSum = user.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      setRotationIndex((charSum + Date.now()) % usdtAddresses.length);
    }
  }, [user?.id, usdtAddresses]);

  async function fetchPlans() {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (!error && data) {
        setPlans(data);
      }
    } catch (err) {
      console.error('Error fetching plans:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchCurrentPlan(userId: string) {
    const { data } = await supabase
      .from('user_subscriptions')
      .select('plan_id')
      .eq('user_id', userId)
      .maybeSingle();

    if (data) {
      setCurrentPlan(data.plan_id);
    }
  }

  const handleUpgrade = async (plan: any, actualPrice: number) => {
    if (plan.price === 0) return;
    if (plan.id === currentPlan) return;

    if (isGlobal) {
      setManualPaymentPlan({ ...plan, actualPrice });
      return;
    }

    // Show custom dialog before Korapay payload
    const isConfirmed = await showConfirm(
      `You are about to subscribe to the ${plan.name} plan for ₦${Number(plan.price).toLocaleString()}. Please confirm to proceed to secure payment with Korapay.`,
      'Confirm Subscription'
    );
    if (!isConfirmed) return;

    setProcessingPlan(plan.id);

    // Load Korapay checkout
    if (typeof window.Korapay === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://korablobstorage.blob.core.windows.net/modal-bucket/korapay-collections.min.js';
      script.onload = () => initKorapayCheckout(plan);
      document.head.appendChild(script);
    } else {
      initKorapayCheckout(plan);
    }
  };

  const initKorapayCheckout = (plan: any) => {
    const email = user?.email || profile?.email || 'user@jobbaworks.com';
    const name = profile?.name || 'User';
    const KORAPAY_PUBLIC_KEY = 'pk_live_SrX8jJfmtdHtbf4HUueSQjMi8Hm7qUGZ5o9LQWP4';

    const processBackendUpgrade = async (reference: string) => {
      try {
        await supabase.rpc('process_plan_upgrade', {
          _user_id: user?.id,
          _new_plan_id: plan.id,
        });

        await supabase.from('wallet_transactions').insert({
          user_id: user?.id,
          amount: plan.price,
          type: 'subscription_fee',
          status: 'completed',
          description: `Upgraded to ${plan.name} plan`,
          meta: { plan_id: plan.id, reference },
        });

        // Trigger beautiful success flowers / confetti
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#008751', '#FFD700', '#ffffff', '#00e479']
        });

        setCurrentPlan(plan.id);
        showAlert(`Successfully upgraded to ${plan.name}!`, 'Success');
      } catch (err) {
        console.error('Error updating subscription:', err);
        showAlert('Payment received but there was an error updating your plan. Please contact support.', 'Error');
      } finally {
        setProcessingPlan(null);
      }
    };

    window.Korapay.initialize({
      key: KORAPAY_PUBLIC_KEY,
      reference: `jw_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      amount: Number(plan.price),
      currency: 'NGN',
      customer: {
        name: name,
        email: email,
      },
      notification_url: '',
      onClose: () => {
        setProcessingPlan(null);
      },
      onSuccess: async (data: any) => {
        console.log('Payment successful:', data);
        await processBackendUpgrade(data.reference);
      },
      onFailed: (data: any) => {
        console.error('Payment failed:', data);
        setProcessingPlan(null);
        showAlert('Payment failed. Please try again.', 'Payment Failed');
      },
    });
  };

  const handleManualConfirmation = async () => {
    if (!manualPaymentPlan || !user) return;
    
    setProcessingPlan(manualPaymentPlan.id);
    
    try {
      const { error } = await supabase.from('wallet_transactions').insert({
        user_id: user.id,
        amount: manualPaymentPlan.actualPrice * 1500, // Converting back to standard system NGN equivalent
        type: 'deposit',
        status: 'pending',
        description: `Manual Plan Purchase: ${manualPaymentPlan.name}`,
        meta: { 
          plan_id: manualPaymentPlan.id, 
          currency: 'USD',
          deposit_address: usdtAddresses[rotationIndex]
        },
      });

      if (error) throw error;
      showAlert(`Your payment has been logged. Admin will review and upgrade your account shortly.`, 'Pending Review');
    } catch (err) {
      console.error(err);
      showAlert('Error logging payment. Please contact support.', 'Error');
    } finally {
      setProcessingPlan(null);
      setManualPaymentPlan(null);
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-32 w-full">
      {/* Hero Section */}
      <section className="mb-16 text-center md:text-left max-w-3xl">
        <span className="bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant px-4 py-1.5 rounded-full text-xs md:text-sm font-bold tracking-wider mb-6 inline-block">
          ONE-TIME PAYMENT • LIFETIME ACCESS
        </span>
        <h2 className="text-4xl md:text-6xl font-headline font-extrabold text-on-surface leading-[1.1] tracking-tight mb-6">
          Scale your earnings with <span className="text-primary italic">Kinetic Plans.</span>
        </h2>
        <p className="text-base md:text-lg text-on-surface-variant leading-relaxed opacity-80">
          Choose the growth path that matches your ambition. Unlock higher article rates, exclusive bonuses, and lifetime potential with no monthly fees.
        </p>
      </section>

      {/* Plans Comparison Grid */}
      {isLoading ? (
        <div className="py-20 min-h-[400px]"></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            
            const nAiraPrice = plan.price;
            const globalPrice = nonNigerianPlans[plan.id]?.price || Number((nAiraPrice / 1500).toFixed(2));
            const actualPrice = isGlobal ? globalPrice : nAiraPrice;
            const displayPrice = isGlobal ? `$${actualPrice}` : `₦${Number(actualPrice).toLocaleString()}`;
            
            const currentPlanData = plans.find(p => p.id === currentPlan);
            const currentPlanPrice = currentPlanData ? (isGlobal ? (nonNigerianPlans[currentPlan]?.price || 0) : currentPlanData.price) : 0;
            const isLowerPlan = actualPrice < currentPlanPrice;
            const isFree = actualPrice === 0;
            const isPopular = plan.id === 'pro' || plan.id === 'elite' || plan.id === 'executive';
            const canUpgrade = !isFree && !isCurrent && !isLowerPlan;
            const isProcessing = processingPlan === plan.id;
            
            // New Plan Logic
            const isVerified = plan.id !== 'free';
            let contentBoost = '';
            if (plan.id === 'starter') contentBoost = '10% Content Boost';
            else if (plan.id === 'pro') contentBoost = '25% Content Boost';
            else if (plan.id === 'elite') contentBoost = '50% Content Boost';
            else if (plan.id === 'vip') contentBoost = '75% Content Boost';
            else if (plan.id === 'executive' || plan.id === 'platinum') contentBoost = '100% Boost + Priority Rank';

            return (
              <div 
                key={plan.id}
                className={`relative flex flex-col p-6 rounded-3xl shadow-sm transition-all duration-300 hover:-translate-y-2
                  ${isPopular 
                    ? 'bg-gradient-to-br from-[#006b3f] to-[#008751] text-white shadow-xl ring-4 ring-tertiary-fixed-dim/20 md:scale-105 z-10' 
                    : 'bg-surface-container-lowest text-on-surface border border-surface-container-highest/30 hover:shadow-lg'
                  }
                  ${isCurrent ? 'ring-2 ring-primary border-primary' : ''}
                `}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-tertiary-fixed-dim text-on-tertiary-fixed px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-md whitespace-nowrap">
                    RECOMMENDED
                  </div>
                )}
                
                <div className={`mb-6 ${isPopular ? 'pt-2' : ''}`}>
                  <h3 className={`text-2xl font-headline font-extrabold mb-1 ${isPopular ? 'text-white' : 'text-emerald-950'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm ${isPopular ? 'text-white/80' : 'text-on-surface-variant'}`}>
                    {isFree ? 'Get started for free' : 'Maximize your capacity'}
                  </p>
                </div>
                
                <div className="mb-8 flex items-baseline gap-1">
                  <span className="text-4xl font-black">
                    {displayPrice}
                  </span>
                  <span className={`text-sm font-medium ${isPopular ? 'text-white/70' : 'text-on-surface-variant'}`}>
                    one-time
                  </span>
                </div>
                
                <ul className="space-y-4 mb-auto pb-8">
                  <li className="flex items-center gap-3 text-sm">
                    <span className={`material-symbols-outlined ${isPopular ? 'text-tertiary-fixed' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                    <span><strong className="font-bold">{plan.daily_read_limit}</strong> daily reads</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <span className={`material-symbols-outlined ${isPopular ? 'text-tertiary-fixed' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                    <span><strong className="font-bold">{plan.daily_comment_limit}</strong> daily comments</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <span className={`material-symbols-outlined ${isPopular ? 'text-tertiary-fixed' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                    <span><strong className="font-bold">{formatAmount(plan.read_reward)}</strong> per article read</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <span className={`material-symbols-outlined ${isPopular ? 'text-tertiary-fixed' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>forum</span>
                    <span><strong className="font-bold">{formatAmount(plan.comment_reward)}</strong> per comment</span>
                  </li>
                  {!isFree && (
                    <li className="flex items-center gap-3 text-sm font-bold">
                      <span className={`material-symbols-outlined ${isPopular ? 'text-tertiary-fixed' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                      <span>25% Referral Commission</span>
                    </li>
                  )}
                  {isVerified && (
                    <li className="flex items-center gap-3 text-sm font-bold">
                      <span className={`material-symbols-outlined ${isPopular ? 'text-blue-300' : 'text-blue-500'}`} style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                      <span>Verified Profile Badge</span>
                    </li>
                  )}
                  {contentBoost && (
                    <li className="flex items-center gap-3 text-sm font-bold">
                      <span className={`material-symbols-outlined ${isPopular ? 'text-orange-300' : 'text-orange-500'}`} style={{ fontVariationSettings: "'FILL' 1" }}>rocket_launch</span>
                      <span>{contentBoost}</span>
                    </li>
                  )}
                </ul>
                
                <button 
                  onClick={() => canUpgrade && handleUpgrade(plan, actualPrice)}
                  disabled={isCurrent || isProcessing || isLowerPlan}
                  className={`w-full py-4 rounded-xl font-bold transition-all mt-auto active:scale-95
                    ${isProcessing ? 'opacity-70 cursor-wait' : ''}
                    ${isCurrent ? 'bg-surface-container text-on-surface-variant cursor-default' : 
                      isLowerPlan ? 'bg-surface-container-highest/20 text-on-surface-variant/50 cursor-not-allowed opacity-50' :
                      isPopular 
                      ? 'bg-white text-emerald-800 shadow-md hover:bg-emerald-50' 
                      : 'bg-primary text-white shadow-md hover:bg-emerald-800'
                    }
                  `}
                >
                  {isProcessing
                    ? 'Processing...'
                    : isCurrent
                    ? 'Current Plan'
                    : isLowerPlan
                    ? 'Unavailable'
                    : isFree
                    ? 'Basic Access'
                    : currentPlan !== 'free'
                    ? 'Upgrade'
                    : 'Subscribe Now'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Asymmetric Value Section */}
      <section className="mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
        <div className="md:col-span-7 bg-surface-container-low rounded-3xl p-6 md:p-12 overflow-hidden relative">
          <div className="bg-white/40 absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-3xl hidden md:block"></div>
          <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-headline font-bold mb-8 text-on-primary-fixed-variant">Why upgrade?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-container rounded-2xl flex items-center justify-center text-on-primary-container">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                </div>
                <h4 className="font-bold text-base md:text-lg">Pay Once, Earn Forever</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  No recurring charges. Your one-time payment unlocks lifetime access to higher earning rates and exclusive features.
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-secondary-container rounded-2xl flex items-center justify-center text-on-secondary-container">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>speed</span>
                </div>
                <h4 className="font-bold text-base md:text-lg">Unlimited Velocity</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Higher plans unlock more daily reads and comments, meaning you can earn significantly more every day.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="md:col-span-5 hidden md:block">
          <div className="rounded-2xl overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
            <img 
              alt="Premium Access" 
              className="w-full aspect-square object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAE8kqNLHrgYs_wuhNxAksUEaSFuK6qRaXpBUG0Ixel61-AmVKGUBZY_mKFli3Ml-UMRExyMl-AamMJz6ebZ6NHaHrw_-BpMEHXRQT_zMikQRLsot742DXE5ci945ahx1SaZco9A8Sj8sDz39Ny8f0NGuhY8ho8QplsxOi3z5DqORazMiwY60TmikSQT3XpBmQUe4GuMSIc9Kme6_Tbl0nA5fuZcS7zH4QY0xAmCgwMCoyehnmO4h390ZW7Nz95UMdBIue_2Jodwk" 
            />
          </div>
        </div>
      </section>

      {/* Manual Payment Modal */}
      {manualPaymentPlan && isGlobal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest max-w-md w-full rounded-[2rem] shadow-2xl p-6 md:p-8 relative">
            <button 
              onClick={() => setManualPaymentPlan(null)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-surface hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
            <h2 className="text-2xl font-black font-headline text-on-surface mb-2">Secure Crypto Payment</h2>
            <p className="text-on-surface-variant text-sm mb-6">You are upgrading to the <strong className="text-primary">{manualPaymentPlan.name}</strong> plan for <strong className="text-[#111928]">${manualPaymentPlan.actualPrice} USD</strong>.</p>
            
            <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 mb-6">
              <p className="text-xs font-bold text-amber-800 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">account_balance_wallet</span>
                Send USDT To This Address
              </p>
              <p className="text-sm font-mono font-bold text-[#111928] break-all select-all">
                {usdtAddresses && usdtAddresses.length > 0 ? usdtAddresses[rotationIndex] : 'Loading address...'}
              </p>
            </div>

            <ul className="text-sm text-on-surface-variant space-y-2 mb-8 list-disc pl-4">
              <li>Ensure you send exactly <strong>${manualPaymentPlan.actualPrice}</strong> in USDT (TRC20).</li>
              <li>Network fees are not included. Please cover any transfer fees.</li>
              <li>Once you have completed the transfer, click the confirmation button below. Avoid false confirmations.</li>
            </ul>

            <button 
              onClick={handleManualConfirmation}
              disabled={processingPlan === manualPaymentPlan.id}
              className="w-full bg-primary hover:bg-emerald-800 text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait"
            >
              {processingPlan === manualPaymentPlan.id ? 'Processing...' : 'I Have Transferred The Funds'}
              {processingPlan !== manualPaymentPlan.id && <span className="material-symbols-outlined text-[20px]">check_circle</span>}
            </button>
            <button 
              onClick={() => setManualPaymentPlan(null)}
              className="w-full mt-3 text-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors py-2"
            >
              Cancel Transaction
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
