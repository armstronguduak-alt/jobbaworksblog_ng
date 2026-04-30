import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import confetti from 'canvas-confetti';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppSettings } from '../hooks/useAppSettings';
import { useCurrency } from '../hooks/useCurrency';

export function Wallet() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  // PIN verification state
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState(['', '', '', '']);
  const [pinError, setPinError] = useState('');
  const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
  // Success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successDetails, setSuccessDetails] = useState<any>(null);
  // Failure modal state
  const [showFailureModal, setShowFailureModal] = useState(false);
  const [failureMessage, setFailureMessage] = useState('');
  const { exchangeRates, pageToggles } = useAppSettings();
  const { isGlobal, symbol, exchangeRate } = useCurrency();
  
  const { data: walletData, isLoading, refetch } = useQuery({
    queryKey: ['wallet-data', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const [balanceRes, txRes, methodsRes, referralRes, userPlanRes] = await Promise.all([
        supabase.from('wallet_balances').select('balance, usdt_balance').eq('user_id', user.id).maybeSingle(),
        supabase.from('wallet_transactions').select('*').eq('user_id', user.id).eq('type', 'withdrawal').order('created_at', { ascending: false }).limit(5),
        supabase.from('payout_methods').select('*').eq('user_id', user.id),
        supabase.from('referrals').select('referred_user_id').eq('referrer_user_id', user.id),
        supabase.from('user_subscriptions').select('plan_id').eq('user_id', user.id).maybeSingle()
      ]);
        
      let activeReferralsCount = 0;
      if (referralRes.data && referralRes.data.length > 0) {
         const referredUserIds = referralRes.data.map((r: any) => r.referred_user_id);
         const { data: subData } = await supabase.from('user_subscriptions').select('plan_id').in('user_id', referredUserIds).neq('plan_id', 'free');
         if (subData) {
            activeReferralsCount = subData.length;
         }
      }

      const methods = methodsRes.data || [];
      if (!selectedMethodId && methods.length > 0) {
        const defaultMethod = methods.find((m: any) => m.is_default);
        setSelectedMethodId(defaultMethod ? defaultMethod.id : methods[0].id);
      }

      return {
        balance: balanceRes.data?.balance || 0,
        usdtBalance: balanceRes.data?.usdt_balance || 0,
        transactions: txRes.data || [],
        payoutMethods: methods,
        referralCount: activeReferralsCount,
        userPlanId: userPlanRes.data?.plan_id || 'free'
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const balance = walletData?.balance || 0;
  const usdtBalance = walletData?.usdtBalance || 0;
  const transactions = walletData?.transactions || [];
  const payoutMethods = walletData?.payoutMethods || [];
  const referralCount = walletData?.referralCount || 0;
  const userPlanId = walletData?.userPlanId || 'free';

  const PAYOUT_THRESHOLD = isGlobal ? 30.00 : 20.00; // $30 for global, $20 for Nigerian
  const displayBalance = isGlobal ? (balance / exchangeRate) : usdtBalance;
  const walletSymbol = '$';
  
  const widthdrawalFeePercent = exchangeRates.withdrawalFee / 100;
  const numAmount = Number(withdrawAmount) || 0;
  const fee = numAmount * widthdrawalFeePercent;
  const youGet = numAmount - fee;

  // Real-time subscriptions for balance and transactions
  useEffect(() => {
    if (!user?.id) return;

    const balanceChannel = supabase
      .channel(`wallet-balance-realtime-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_balances', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['wallet-data', user.id] });
        }
      )
      .subscribe();

    const txChannel = supabase
      .channel(`wallet-tx-realtime-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['wallet-data', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(balanceChannel);
      supabase.removeChannel(txChannel);
    };
  }, [user?.id, queryClient]);

  const handleMaxClick = () => {
    setWithdrawAmount(displayBalance.toString());
  };

  // Validates inputs and opens the PIN modal
  const handleWithdraw = async () => {
    if (!pageToggles.walletEnabled) {
      setMessage('Withdrawal feature is temporarily disabled for maintenance.');
      return;
    }
    // Re-fetch referral count live at withdrawal time to ensure accuracy
    const { data: freshReferralData } = await supabase
      .from('referrals')
      .select('referred_user_id')
      .eq('referrer_user_id', user!.id);
      
    let currentReferrals = 0;
    if (freshReferralData && freshReferralData.length > 0) {
         const referredUserIds = freshReferralData.map((r: any) => r.referred_user_id);
         const { data: subData } = await supabase.from('user_subscriptions').select('plan_id').in('user_id', referredUserIds).neq('plan_id', 'free');
         if (subData) {
            currentReferrals = subData.length;
         }
    }

    const requiredReferrals = userPlanId === 'free' ? 5 : 2;

    if (currentReferrals < requiredReferrals) {
      setFailureMessage(`You need at least ${requiredReferrals} active referrals who have subscribed to a paid plan before you can withdraw. You currently have ${currentReferrals}. Upgrade your plan or refer more users to unlock withdrawals.`);
      setShowFailureModal(true);
      return;
    }
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) < PAYOUT_THRESHOLD) {
      setFailureMessage(`Minimum withdrawal amount is ${walletSymbol}${PAYOUT_THRESHOLD.toLocaleString()}. Please enter a valid amount.`);
      setShowFailureModal(true);
      return;
    }
    if (Number(withdrawAmount) > displayBalance) {
      setFailureMessage(`Insufficient balance. Swapped/Available: $${displayBalance.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`);
      setShowFailureModal(true);
      return;
    }
    if (!selectedMethodId) {
      setFailureMessage('Please select a payment method before submitting your withdrawal request.');
      setShowFailureModal(true);
      return;
    }

    // Check if user has set a withdrawal PIN
    const { data: userData } = await supabase.auth.getUser();
    const savedPin = userData?.user?.user_metadata?.withdrawal_pin;
    if (!savedPin) {
      setMessage('You must set a withdrawal PIN in Settings before you can withdraw.');
      return;
    }

    // Open PIN verification modal
    setMessage('');
    setPinInput(['', '', '', '']);
    setPinError('');
    setShowPinModal(true);
    setTimeout(() => pinRefs.current[0]?.focus(), 100);
  };

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pinInput];
    newPin[index] = value.slice(-1);
    setPinInput(newPin);
    setPinError('');
    if (value && index < 3) {
      pinRefs.current[index + 1]?.focus();
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pinInput[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  };

  const handlePinSubmit = async () => {
    const enteredPin = pinInput.join('');
    if (enteredPin.length !== 4) {
      setPinError('Please enter all 4 digits.');
      return;
    }

    // Verify PIN against user metadata
    const { data: userData } = await supabase.auth.getUser();
    const savedPin = userData?.user?.user_metadata?.withdrawal_pin;

    if (enteredPin !== savedPin) {
      setPinError('Incorrect PIN. Please try again.');
      setPinInput(['', '', '', '']);
      setTimeout(() => pinRefs.current[0]?.focus(), 100);
      return;
    }

    // PIN is correct — proceed with the actual withdrawal
    setShowPinModal(false);
    setIsSubmitting(true);
    setMessage('');

    try {
      const selectedPm = payoutMethods.find((m: any) => m.id === selectedMethodId);
      const accountDetails = selectedPm ? {
        method: selectedPm.method,
        account_name: selectedPm.account_name || null,
        account_number: selectedPm.account_number || null,
        bank_name: selectedPm.bank_name || null,
        wallet_address: selectedPm.wallet_address || null,
        minipay_uid: selectedPm.minipay_uid || null,
        network: selectedPm.network || null,
      } : {};

      const { error } = await supabase.from('wallet_transactions').insert({
        user_id: user!.id,
        type: 'withdrawal',
        amount: Number(withdrawAmount),
        status: 'pending',
        description: `Withdrawal request via ${selectedPm?.method || 'payout method'}`,
        meta: { 
          withdrawalFeePercent: exchangeRates.withdrawalFee,
          feeDeducted: fee,
          expectedAmount: youGet,
          account_details: accountDetails,
          currency: 'USD',
          // Explicitly state how much to deduct from which column based on the user's region
          deduction_amount: isGlobal ? (Number(withdrawAmount) * exchangeRate) : Number(withdrawAmount),
          deduction_column: isGlobal ? 'balance' : 'usdt_balance'
        }
      });

      if (error) throw error;

      // Show success modal with details
      setSuccessDetails({
        amount: Number(withdrawAmount),
        fee: fee,
        youGet: youGet,
        method: selectedPm?.method,
        accountDetails
      });
      setShowSuccessModal(true);
      setWithdrawAmount('');
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      refetch();
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
      refetch();
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
                Paid weekly if the total is at least {walletSymbol}{PAYOUT_THRESHOLD.toLocaleString(undefined, {minimumFractionDigits: 2})} (your payout threshold)
              </p>
              <div className="text-[56px] font-body mt-4 text-[#202124] tracking-tight">
                {walletSymbol}{displayBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
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
                <span>Payment threshold: {walletSymbol}{PAYOUT_THRESHOLD.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="bg-white p-6 md:p-8 rounded-xl border border-surface-container-highest/40 shadow-sm relative overflow-hidden">
            <label className="block text-sm font-bold text-on-surface-variant mb-6 uppercase tracking-widest">Withdrawal Amount</label>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-black text-on-surface-variant/30">{walletSymbol}</span>
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
                MIN {walletSymbol}{PAYOUT_THRESHOLD.toLocaleString()}
              </button>
              <button className="px-4 py-2 rounded-full bg-surface-container-high/50 text-xs font-bold text-[#5f6368] hover:bg-surface-container-high transition-colors"
                onClick={handleMaxClick}
              >
                MAX {walletSymbol}{isLoading ? '...' : displayBalance.toLocaleString(undefined, {maximumFractionDigits: 2})}
              </button>
            </div>
            

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
                       <div className="flex items-center gap-3">
                         <span className="font-body text-[#3c4043]">
                           {new Date(tx.created_at).toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'})}
                         </span>
                         <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${
                           tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                           tx.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                           tx.status === 'rejected' ? 'bg-rose-100 text-rose-700' :
                           'bg-slate-100 text-slate-500'
                         }`}>
                           {tx.status === 'completed' ? 'Sent' : tx.status}
                         </span>
                       </div>
                       <div className="text-right flex flex-col items-end">
                         <span className="text-[#3c4043] font-body font-bold">{walletSymbol}{Number(tx.amount).toFixed(2)}</span>
                         {tx.meta?.paidAmount !== undefined && (
                           <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">Paid: {walletSymbol}{Number(tx.meta.paidAmount).toFixed(2)}</span>
                         )}
                         {tx.meta?.deductionReason && (
                           <span className="text-[10px] text-rose-500 max-w-[200px] truncate block mt-0.5" title={tx.meta.deductionReason}>
                             Note: {tx.meta.deductionReason}
                           </span>
                         )}
                       </div>
                     </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-[#dadce0] p-4 bg-[#f8f9fa]/50">
                <a href="/transactions" className="text-[#1a73e8] font-medium text-[14px] w-full text-center hover:underline cursor-pointer block">View all transactions</a>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* PIN Verification Modal */}
      {showPinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-slate-200 relative animate-[fadeInUp_0.3s_ease-out]">
            <button 
              onClick={() => setShowPinModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-emerald-600 text-3xl">lock</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-1">Confirm Withdrawal</h3>
              <p className="text-sm text-slate-500">Please review your withdrawal request below.</p>
            </div>

            {/* Checklist & Fee Breakdown in Modal */}
            <div className="bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 text-sm">
              <ul className="space-y-2 mb-4 pb-4 border-b border-slate-200 text-slate-600">
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-500">check_circle</span>
                  <span>Minimum amount reached ({walletSymbol}{PAYOUT_THRESHOLD.toLocaleString()})</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-emerald-500">check_circle</span>
                  <span>Referral requirement met (Need {userPlanId === 'free' ? '5' : '2'}, have {referralCount})</span>
                </li>
              </ul>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-slate-600">
                  <span>Withdrawal Amount</span>
                  <span className="font-bold text-slate-800">{walletSymbol}{Number(withdrawAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <span>Withdrawal Fee ({exchangeRates.withdrawalFee}%)</span>
                  <span className="font-semibold text-rose-500">-{walletSymbol}{(Number(withdrawAmount) * exchangeRates.withdrawalFee / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center font-bold pt-2 border-t border-slate-200 mt-2">
                  <span className="text-slate-800">You will receive</span>
                  <span className="text-emerald-600 text-base">{walletSymbol}{(Number(withdrawAmount) - (Number(withdrawAmount) * exchangeRates.withdrawalFee / 100)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest text-center mb-3">Enter 4-Digit PIN to Verify</p>
            
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map((i) => (
                <input
                  key={i}
                  ref={(el) => { pinRefs.current[i] = el; }}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={pinInput[i]}
                  onChange={(e) => handlePinChange(i, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(i, e)}
                  className="w-14 h-14 text-center text-2xl font-black bg-slate-100 border-2 border-slate-200 rounded-xl focus:border-[#006b3f] focus:ring-2 focus:ring-[#006b3f]/20 outline-none transition-all"
                />
              ))}
            </div>

            {pinError && (
              <p className="text-red-500 text-sm font-semibold text-center mb-4 animate-[shake_0.3s_ease-in-out]">{pinError}</p>
            )}
            
            <button
              onClick={handlePinSubmit}
              disabled={pinInput.join('').length < 4}
              className="w-full py-3.5 rounded-xl font-extrabold text-white bg-gradient-to-br from-[#006b3f] to-[#008751] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              Verify & Withdraw
            </button>

            <p className="text-xs text-slate-400 text-center mt-4">Forgot your PIN? Update it in <a href="/settings" className="text-[#1a73e8] font-semibold hover:underline">Settings</a></p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && successDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-slate-200 relative animate-[fadeInUp_0.3s_ease-out]">
            <button 
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-emerald-600 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              </div>
              <h3 className="text-2xl font-extrabold text-slate-900 mb-1">Withdrawal Submitted! 🎉</h3>
              <p className="text-sm text-slate-500">Your request is pending admin review and will be processed shortly.</p>
            </div>
            
            <div className="bg-slate-50 rounded-2xl p-5 space-y-3 mb-6 border border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Amount</span>
                <span className="font-bold text-slate-900">{walletSymbol}{successDetails.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">Fee ({exchangeRates.withdrawalFee}%)</span>
                <span className="font-semibold text-red-500">-{walletSymbol}{successDetails.fee.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="h-px bg-slate-200"></div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-700">You'll Receive</span>
                <span className="font-extrabold text-lg text-emerald-700">{walletSymbol}{successDetails.youGet.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-5 space-y-2 mb-6 border border-blue-100">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-700 mb-2">Payout Destination</p>
              {successDetails.accountDetails?.method && (
                <div className="flex justify-between">
                  <span className="text-sm text-blue-600">Method</span>
                  <span className="font-bold text-blue-900 uppercase">{successDetails.accountDetails.method}</span>
                </div>
              )}
              {successDetails.accountDetails?.account_name && (
                <div className="flex justify-between">
                  <span className="text-sm text-blue-600">Account Name</span>
                  <span className="font-bold text-blue-900">{successDetails.accountDetails.account_name}</span>
                </div>
              )}
              {successDetails.accountDetails?.account_number && (
                <div className="flex justify-between">
                  <span className="text-sm text-blue-600">Account Number</span>
                  <span className="font-bold text-blue-900">{successDetails.accountDetails.account_number}</span>
                </div>
              )}
              {successDetails.accountDetails?.bank_name && (
                <div className="flex justify-between">
                  <span className="text-sm text-blue-600">Bank</span>
                  <span className="font-bold text-blue-900">{successDetails.accountDetails.bank_name}</span>
                </div>
              )}
              {successDetails.accountDetails?.wallet_address && (
                <div className="flex justify-between">
                  <span className="text-sm text-blue-600">Wallet</span>
                  <span className="font-bold text-blue-900 truncate max-w-[160px]" title={successDetails.accountDetails.wallet_address}>{successDetails.accountDetails.wallet_address}</span>
                </div>
              )}
              {successDetails.accountDetails?.minipay_uid && (
                <div className="flex justify-between">
                  <span className="text-sm text-blue-600">MiniPay ID</span>
                  <span className="font-bold text-blue-900">{successDetails.accountDetails.minipay_uid}</span>
                </div>
              )}
              {successDetails.accountDetails?.network && (
                <div className="flex justify-between">
                  <span className="text-sm text-blue-600">Network</span>
                  <span className="font-bold text-blue-900">{successDetails.accountDetails.network}</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3.5 rounded-xl font-extrabold text-white bg-gradient-to-br from-[#006b3f] to-[#008751] hover:opacity-90 active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Failure Modal */}
      {showFailureModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-rose-200 relative animate-[fadeInUp_0.3s_ease-out]">
            <button 
              onClick={() => setShowFailureModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
            
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-rose-600 text-3xl">error</span>
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 mb-2">Withdrawal Failed</h3>
              <p className="text-sm text-slate-600">{failureMessage}</p>
            </div>
            
            <button
              onClick={() => setShowFailureModal(false)}
              className="w-full py-3.5 rounded-xl font-extrabold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all shadow-lg shadow-rose-500/20"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
