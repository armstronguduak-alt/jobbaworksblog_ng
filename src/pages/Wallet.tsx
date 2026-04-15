import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import confetti from 'canvas-confetti';
import { useAppSettings } from '../hooks/useAppSettings';
import { useCurrency } from '../hooks/useCurrency';

export function Wallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [payoutMethods, setPayoutMethods] = useState<any[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const { exchangeRates, pageToggles } = useAppSettings();
  const { isGlobal, symbol } = useCurrency();
  
  const PAYOUT_THRESHOLD = isGlobal ? 10.00 : 15000;
  const displayBalance = isGlobal ? usdtBalance : balance;
  
  const widthdrawalFeePercent = exchangeRates.withdrawalFee / 100;
  const numAmount = Number(withdrawAmount) || 0;
  const fee = numAmount * widthdrawalFeePercent;
  const youGet = numAmount - fee;

  useEffect(() => {
    if (user?.id) {
      fetchWalletData(user.id);
    }
  }, [user]);

  // Real-time subscriptions for balance and transactions
  useEffect(() => {
    if (!user?.id) return;

    const balanceChannel = supabase
      .channel(`wallet-balance-realtime-${Math.random().toString(36).substring(7)}`)
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

    const txChannel = supabase
      .channel(`wallet-tx-realtime-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${user.id}` },
        () => {
          fetchWalletData(user.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(balanceChannel);
      supabase.removeChannel(txChannel);
    };
  }, [user]);

  const fetchWalletData = async (userId: string) => {
    try {
      if (transactions.length === 0) setIsLoading(true);

      const [balanceRes, txRes, methodsRes, referralRes] = await Promise.all([
        supabase.from('wallet_balances').select('balance, usdt_balance').eq('user_id', userId).maybeSingle(),
        supabase.from('wallet_transactions').select('*').eq('user_id', userId).eq('type', 'withdrawal').order('created_at', { ascending: false }).limit(5),
        supabase.from('payout_methods').select('*').eq('user_id', userId),
        supabase.from('referrals').select('id', { count: 'exact' }).eq('referrer_id', userId)
      ]);
        
      if (balanceRes.data) {
        setBalance(balanceRes.data.balance || 0);
        setUsdtBalance(balanceRes.data.usdt_balance || 0);
      }
      if (txRes.data) setTransactions(txRes.data);
      if (methodsRes.data) {
        setPayoutMethods(methodsRes.data);
        const defaultMethod = methodsRes.data.find((m: any) => m.is_default);
        if (defaultMethod && !selectedMethodId) {
          setSelectedMethodId(defaultMethod.id);
        } else if (methodsRes.data.length > 0 && !selectedMethodId) {
          setSelectedMethodId(methodsRes.data[0].id);
        }
      }
      
      if (referralRes.count !== null && referralRes.count !== undefined) {
        setReferralCount(referralRes.count);
      }
      
    } catch (err) {
      console.error("Error fetching wallet data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxClick = () => {
    setWithdrawAmount(displayBalance.toString());
  };

  const handleWithdraw = async () => {
    if (!pageToggles.walletEnabled) {
      setMessage('Withdrawal feature is temporarily disabled for maintenance.');
      return;
    }
    if (referralCount < 2) {
      setMessage('You need at least 2 referrers to perform a withdrawal.');
      return;
    }
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) < PAYOUT_THRESHOLD) {
      setMessage(`Please enter a valid amount (Minimum ${symbol}${PAYOUT_THRESHOLD.toLocaleString()}).`);
      return;
    }
    if (Number(withdrawAmount) > displayBalance) {
      setMessage(`Insufficient ${isGlobal ? 'USD' : 'Naira'} balance.`);
      return;
    }
    if (!selectedMethodId) {
      setMessage('Please select a payment method.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const { error } = await supabase.from('wallet_transactions').insert({
        user_id: user!.id,
        type: 'withdrawal',
        amount: Number(withdrawAmount),
        status: 'pending',
        description: `Withdrawal request via ${payoutMethods.find((m: any) => m.id === selectedMethodId)?.method || 'payout method'}`,
        meta: { 
          withdrawalFeePercent: exchangeRates.withdrawalFee,
          feeDeducted: fee,
          expectedAmount: youGet,
          account_details: payoutMethods.find((m: any) => m.id === selectedMethodId)?.details || {}
        }
      });

      if (error) throw error;

      setMessage('Withdrawal request submitted! It is pending admin approval.');
      setWithdrawAmount('');
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      if (user) fetchWalletData(user.id);
    } catch (error: any) {
      setMessage(`Error: ${error.message || 'An error occurred during withdrawal.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMethod = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this payment method?")) return;
    try {
      await supabase.from('payout_methods').delete().eq('id', id);
      if (selectedMethodId === id) setSelectedMethodId(null);
      if (user) fetchWalletData(user.id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="bg-surface text-on-surface min-h-[calc(100vh-80px)] font-body">
      <main className="max-w-2xl mx-auto px-4 md:px-6 py-8 md:py-12 pb-32">
        {/* Status Indicator / Page Context */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight leading-tight font-headline">Withdraw Funds</h1>
            <p className="text-on-surface-variant mt-1 text-sm">Move your earnings to your bank or crypto wallet.</p>
          </div>
          <div className="flex items-center gap-2 bg-secondary-container/30 px-3 py-1.5 rounded-full border border-outline-variant/20 w-fit">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="text-xs font-semibold text-on-secondary-fixed-variant uppercase tracking-wider">Verified Account</span>
          </div>
        </div>

        <section className="space-y-6">
          {!pageToggles.walletEnabled ? (
            <div className="bg-amber-50 p-8 rounded-xl border border-amber-200 shadow-sm text-center">
              <span className="material-symbols-outlined text-amber-500 text-5xl mb-4">construction</span>
              <h2 className="text-2xl font-extrabold text-amber-900 mb-2">Withdrawals are Currently Under Maintenance</h2>
              <p className="text-amber-800 text-sm">We are performing scheduled maintenance on the wallet integration system. Withdrawals will be enabled shortly.</p>
            </div>
          ) : (
            <>
              {/* AdSense Style Earnings Card */}
          <div className="bg-white p-6 md:p-8 rounded-xl border border-surface-container-highest/40 shadow-sm">
            <div className="text-center mb-8">
              <h3 className="text-[22px] font-body text-[#3c4043] mb-2 font-medium">Your earnings</h3>
              <p className="text-[15px] font-body text-[#5f6368]">
                Paid weekly if the total is at least {symbol}{PAYOUT_THRESHOLD.toLocaleString(undefined, {minimumFractionDigits: 2})} (your payout threshold)
              </p>
              <div className="text-[56px] font-body mt-4 text-[#202124] tracking-tight">
                {symbol}{displayBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </div>
            </div>
            
            <div className="space-y-3 mt-10">
              <div className="h-6 bg-[#f1f3f4] w-full relative">
                <div 
                  className="h-full bg-gradient-to-r from-[#006b3f] to-[#008751] transition-all duration-1000" 
                  style={{ width: `${Math.min((displayBalance / PAYOUT_THRESHOLD) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between text-[13px] text-[#5f6368] gap-1">
                <span>You've reached {Math.min((displayBalance / PAYOUT_THRESHOLD) * 100, 100).toFixed(0)}% of your payment threshold</span>
                <span>Payment threshold: {symbol}{PAYOUT_THRESHOLD.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="bg-white p-6 md:p-8 rounded-xl border border-surface-container-highest/40 shadow-sm relative overflow-hidden">
            <label className="block text-sm font-bold text-on-surface-variant mb-6 uppercase tracking-widest">Withdrawal Amount</label>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-black text-on-surface-variant/30">{symbol}</span>
              <input
                className="w-full bg-transparent border-none focus:ring-0 text-5xl font-black text-on-surface p-0 pl-10 placeholder:text-surface-container-highest outline-none"
                placeholder="0.00"
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="px-4 py-2 rounded-full bg-surface-container-high/50 text-xs font-bold text-[#5f6368] hover:bg-surface-container-high transition-colors"
                onClick={() => setWithdrawAmount(PAYOUT_THRESHOLD.toString())}
              >
                MIN {symbol}{PAYOUT_THRESHOLD.toLocaleString()}
              </button>
              <button className="px-4 py-2 rounded-full bg-surface-container-high/50 text-xs font-bold text-[#5f6368] hover:bg-surface-container-high transition-colors"
                onClick={handleMaxClick}
              >
                MAX {symbol}{isLoading ? '...' : displayBalance.toLocaleString(undefined, {maximumFractionDigits: 2})}
              </button>
            </div>
            
            {numAmount > 0 && numAmount >= PAYOUT_THRESHOLD && (
              <div className="mt-6 space-y-3 pt-4 border-t border-surface-container-highest">
                <div className="flex justify-between text-sm">
                  <span className="text-on-surface-variant">Withdrawal Fee ({exchangeRates.withdrawalFee}%)</span>
                  <span className="font-semibold text-error">-{symbol}{(fee).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm font-bold">
                  <span className="text-on-surface">You will receive:</span>
                  <span className="text-primary">{symbol}{(youGet).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            {message && (
               <p className={`mt-4 text-sm font-bold ${message.includes('pending') || message.includes('success') ? 'text-primary' : 'text-error'}`}>
                 {message}
               </p>
            )}
          </div>

          {/* Payment Methods */}
          <div className="bg-white p-6 md:p-8 rounded-xl border border-surface-container-highest/40 shadow-sm">
            <h2 className="text-xl font-medium font-body text-[#3c4043] mb-6">Payment Method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {payoutMethods.length === 0 ? (
                <div className="col-span-full text-center p-6 bg-[#f8f9fa] rounded-xl border border-dashed border-[#dadce0]">
                  <p className="text-[14px] text-[#5f6368] mb-3">No payment methods found.</p>
                  <a href="/settings" className="text-[#1a73e8] font-medium text-[14px] hover:underline">Add Payment Details</a>
                </div>
              ) : (
                payoutMethods.map((pm: any) => (
                  <label key={pm.id} className="relative cursor-pointer group flex-1">
                    <input 
                      checked={selectedMethodId === pm.id}
                      onChange={() => setSelectedMethodId(pm.id)}
                      className="peer sr-only" 
                      name="payment_method" 
                      type="radio" 
                      value={pm.id} 
                    />
                    <div className="p-4 rounded-xl bg-white border-2 border-[#dadce0] peer-checked:border-[#1a73e8] peer-checked:bg-[#e8f0fe] transition-all duration-300 h-full flex flex-col justify-center relative">
                      <button 
                        onClick={(e) => handleDeleteMethod(e, pm.id)}
                        className="absolute top-2 right-2 w-6 h-6 text-[#5f6368] rounded-full flex items-center justify-center hover:bg-black/5 transition-colors z-10"
                        title="Delete Method"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                      </button>
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 flex items-center justify-center">
                          {pm.method === 'opay' ? (
                            <img src="/opay_logo.png" alt="OPay" className="w-10 h-10 object-contain drop-shadow-sm" />
                          ) : pm.method === 'minipay' ? (
                            <img src="/minipay_logo.webp" alt="Minipay" className="w-10 h-10 object-contain drop-shadow-sm" />
                          ) : (
                            <img src="/usdt_logo.png" alt="USDT" className="w-10 h-10 object-contain drop-shadow-sm" />
                          )}
                        </div>
                        <span className="font-bold text-[15px] uppercase text-center block w-full truncate px-1 text-[#202124]" title={pm.account_name || pm.wallet_address || pm.minipay_uid}>
                          {pm.method === 'opay' ? 'OPay' : pm.method === 'minipay' ? 'MiniPay' : 'USDT'}
                        </span>
                        <span className="text-[13px] text-[#5f6368] truncate w-full flex justify-center">{pm.account_number || 'Wallet Address'}</span>
                      </div>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
          
          {referralCount < 2 && (
            <div className="bg-rose-50 text-rose-800 p-4 rounded-xl border border-rose-200">
              <div className="flex items-center gap-2 font-bold mb-1">
                <span className="material-symbols-outlined">warning</span> Referral Requirement
              </div>
              <p className="text-sm">You need at least 2 active downlines (referrals) to process your withdrawal. You currently have {referralCount}.</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-2">
            <button 
              onClick={handleWithdraw}
              disabled={isSubmitting}
              className={`w-full md:w-auto px-10 py-4 rounded-xl font-headline font-extrabold text-[15px] shadow-sm shadow-primary/20 hover:shadow-lg active:scale-95 transition-all 
                ${isSubmitting ? 'bg-surface-variant text-on-surface-variant' : 'bg-gradient-to-br from-[#006b3f] to-[#008751] text-white hover:opacity-90'}
              `}
            >
              {isSubmitting ? 'Processing...' : 'Submit Request'}
            </button>
          </div>
          </>
          )}

          {/* AdSense Style Transactions Card */}
          {transactions.length > 0 && (
            <div className="bg-white rounded-xl border border-surface-container-highest/40 shadow-sm overflow-hidden mt-8">
              <div className="p-6 md:p-8">
                <h3 className="text-[22px] font-body text-[#202124] mb-6">Transactions</h3>
                <div className="space-y-5">
                  {transactions.map(tx => (
                     <div key={tx.id} className="flex justify-between items-center text-[15px] group">
                       <a href="#" className="font-body text-[#1a73e8] hover:underline cursor-pointer">
                         {new Date(tx.created_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric'})} – {new Date(tx.created_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                       </a>
                       <span className="text-[#3c4043] font-body">{symbol}{Number(tx.amount).toFixed(2)}</span>
                     </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-[#dadce0] p-4 bg-[#f8f9fa]/50">
                <button className="text-[#1a73e8] font-medium text-[14px] w-full text-center hover:underline cursor-pointer">View transactions</button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
