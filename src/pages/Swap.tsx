import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAppSettings } from '../hooks/useAppSettings';

export function Swap() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [swapAmount, setSwapAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const { exchangeRates, pageToggles } = useAppSettings();

  const EXCHANGE_RATE = exchangeRates.dollarPrice;
  const FEE_PERCENT = exchangeRates.swapFee / 100;

  useEffect(() => {
    if (user?.id) {
      fetchBalance(user.id);
    }
  }, [user]);

  // Real-time subscription for balance
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`swap-wallet-realtime-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_balances', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new) {
            setBalance((payload.new as any).balance || 0);
            setUsdtBalance((payload.new as any).usdt_balance || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchBalance = async (userId: string) => {
    try {
      if (balance === 0 && usdtBalance === 0) setIsLoading(true);
      const { data } = await supabase
        .from('wallet_balances')
        .select('balance, usdt_balance')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        setBalance(data.balance);
        setUsdtBalance(data.usdt_balance || 0);
      }
    } catch (err) {
      console.error("Error fetching balance:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const numAmount = Number(swapAmount) || 0;
  const fee = numAmount * FEE_PERCENT;
  const actualUsd = (numAmount - fee) / EXCHANGE_RATE;

  const handleMaxClick = () => {
    setSwapAmount(balance.toString());
  };

  const handleSwap = async () => {
    if (!pageToggles.swapEnabled) {
      setMessage('Swap feature is temporarily disabled for maintenance.');
      return;
    }
    if (numAmount < 1000) {
      setMessage('Minimum swap amount is ₦1,000.');
      return;
    }
    if (numAmount > balance) {
      setMessage('Insufficient balance to swap.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    const { data, error } = await supabase.rpc('execute_swap', {
      _amount: numAmount,
      _rate: EXCHANGE_RATE,
      _fee_pct: FEE_PERCENT
    });

    if (error) {
      setMessage('Error: ' + error.message);
    } else if (data?.success === false) {
      setMessage(data.message || 'Swap failed.');
    } else {
      setMessage('Swap successful!');
      setSwapAmount('');
    }

    setIsSubmitting(false);
  };

  return (
    <div className="bg-background font-body text-on-background min-h-[calc(100vh-80px)]">
      <main className="pt-8 pb-32 px-4 md:px-6 max-w-2xl mx-auto space-y-8">
        {/* Page Title */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-primary-fixed-variant">
              Currency Swap
            </h2>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-primary uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Live
            </span>
          </div>
          <p className="text-on-surface-variant leading-relaxed">
            Instantly convert your earnings between local and international currencies with the best market rates.
          </p>
        </div>

        {/* Value Shield: Balance Display */}
        <section className="relative overflow-hidden bg-primary p-8 rounded-3xl shadow-[0px_20px_40px_rgba(0,33,16,0.06)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10 space-y-4">
            <div>
              <span className="text-primary-fixed text-sm font-medium tracking-wide uppercase">Naira Balance</span>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-headline font-black text-on-primary">
                  ₦{isLoading ? '...' : balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-white/60 text-xs font-medium">USDT Balance</span>
                <p className="text-white font-bold">${usdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <span className="material-symbols-outlined text-tertiary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified_user
              </span>
            </div>
          </div>
        </section>

        {/* Swap Interface */}
        <div className="bg-surface-container-lowest p-6 rounded-[2rem] space-y-6 shadow-sm border border-surface-container-highest/30">
          {/* From Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-sm font-semibold text-on-surface-variant">From</label>
              <button onClick={handleMaxClick} className="text-xs text-primary font-bold cursor-pointer hover:underline hover:text-emerald-700">
                Max: ₦{balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </button>
            </div>
            <div className="bg-surface-container-low rounded-2xl p-4 flex items-center justify-between group focus-within:bg-surface-container-lowest transition-all duration-300 border border-transparent focus-within:border-primary-fixed-dim/40">
              <div className="flex flex-col flex-1">
                <input
                  className="bg-transparent border-none p-0 text-2xl font-headline font-bold text-on-surface focus:ring-0 w-full placeholder:text-outline-variant outline-none"
                  placeholder="0.00"
                  type="number"
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                />
                <span className="text-xs text-outline font-medium">Nigerian Naira</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm shrink-0">
                <span className="w-6 h-6 bg-emerald-700 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                  NGN
                </span>
                <span className="font-bold text-sm">₦</span>
              </div>
            </div>
          </div>

          {/* Swap Trigger */}
          <div className="relative flex justify-center -my-3 z-10 pointer-events-none">
            <button className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg pointer-events-auto active:scale-90 transition-transform hover:bg-emerald-800">
              <span className="material-symbols-outlined">swap_vert</span>
            </button>
          </div>

          {/* To Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-sm font-semibold text-on-surface-variant">To (Estimated)</label>
            </div>
            <div className="bg-surface-container-low rounded-2xl p-4 flex items-center justify-between">
              <div className="flex flex-col">
                <p className="text-2xl font-headline font-bold text-on-surface">
                  {actualUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className="text-xs text-outline font-medium">United States Dollar</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm">
                <span className="w-6 h-6 bg-blue-700 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                  USD
                </span>
                <span className="font-bold text-sm">$</span>
              </div>
            </div>
          </div>

          {/* Live Rate Display */}
          <div className="bg-surface-container rounded-2xl p-4 flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-tertiary-fixed-dim/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary text-sm">trending_up</span>
              </div>
              <div>
                <p className="text-xs font-medium text-outline">Current Rate</p>
                <p className="text-sm font-bold text-on-surface">1 USD = ₦{EXCHANGE_RATE.toLocaleString()}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider flex items-center gap-1 justify-end">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                Live Market
              </p>
              <p className="text-xs text-outline">Updated recently</p>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-3 pt-4 border-t border-surface-container-highest">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Service Fee ({exchangeRates.swapFee}%)</span>
              <span className="font-semibold text-on-surface">₦{fee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Estimated Arrival</span>
              <span className="font-semibold text-primary">Instant</span>
            </div>
          </div>

          {message && (
             <p className={`mt-2 text-sm font-bold text-center ${message.includes('success') ? 'text-primary' : 'text-error'}`}>
               {message}
             </p>
          )}

          {/* Confirm Button */}
          <button 
            onClick={handleSwap}
            disabled={isSubmitting}
            className={`w-full text-white py-5 rounded-2xl font-headline font-bold text-lg shadow-xl active:scale-95 transition-all mt-6
             ${isSubmitting ? 'bg-surface-variant text-on-surface-variant' : 'bg-gradient-to-br from-[#006b3f] to-[#008751] shadow-primary/10'}
            `}
          >
            {isSubmitting ? 'Processing...' : 'Confirm Swap'}
          </button>
        </div>

        {/* Info Card */}
        <div className="bg-secondary-container/30 p-5 rounded-2xl flex gap-4 items-start">
          <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
            info
          </span>
          <p className="text-sm text-on-secondary-container leading-relaxed">
            Conversion rates are subject to market volatility. The rate shown will be locked for 60 seconds once you
            proceed to the next step.
          </p>
        </div>
      </main>
    </div>
  );
}
