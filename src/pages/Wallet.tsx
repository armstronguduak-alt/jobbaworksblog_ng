import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
  
  const PAYOUT_THRESHOLD = 100.00;

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

      const [balanceRes, txRes, methodsRes] = await Promise.all([
        supabase.from('wallet_balances').select('balance, usdt_balance').eq('user_id', userId).maybeSingle(),
        supabase.from('wallet_transactions').select('*').eq('user_id', userId).eq('type', 'withdrawal').order('created_at', { ascending: false }).limit(5),
        supabase.from('payout_methods').select('*').eq('user_id', userId)
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
      
    } catch (err) {
      console.error("Error fetching wallet data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMaxClick = () => {
    setWithdrawAmount(balance.toString());
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) <= 0) {
      setMessage('Please enter a valid amount.');
      return;
    }
    if (Number(withdrawAmount) > usdtBalance) {
      setMessage('Insufficient USD balance.');
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
      });

      if (error) throw error;

      setMessage('Withdrawal request submitted! It is pending admin approval.');
      setWithdrawAmount('');
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
          {/* AdSense Style Earnings Card */}
          <div className="bg-white p-6 md:p-8 rounded-xl border border-surface-container-highest/40 shadow-sm">
            <div className="text-center mb-8">
              <h3 className="text-[22px] font-body text-[#3c4043] mb-2 font-medium">Your earnings</h3>
              <p className="text-[15px] font-body text-[#5f6368]">
                Paid monthly if the total is at least $100.00 (your payout threshold)
              </p>
              <div className="text-[56px] font-body mt-4 text-[#202124] tracking-tight">
                ${usdtBalance.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </div>
            </div>
            
            <div className="space-y-3 mt-10">
              <div className="h-6 bg-[#f1f3f4] w-full relative">
                <div 
                  className="h-full bg-[#1a73e8] transition-all duration-1000" 
                  style={{ width: `${Math.min((usdtBalance / PAYOUT_THRESHOLD) * 100, 100)}%` }}
                ></div>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between text-[13px] text-[#5f6368] gap-1">
                <span>You've reached {Math.min((usdtBalance / PAYOUT_THRESHOLD) * 100, 100).toFixed(0)}% of your payment threshold</span>
                <span>Payment threshold: $100.00</span>
              </div>
            </div>
          </div>

          {/* Amount Input */}
          <div className="bg-white p-6 md:p-8 rounded-xl border border-surface-container-highest/40 shadow-sm relative overflow-hidden">
            <label className="block text-sm font-bold text-on-surface-variant mb-6 uppercase tracking-widest">Withdrawal Amount</label>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-black text-on-surface-variant/30">$</span>
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
                onClick={() => setWithdrawAmount('10')}
              >
                MIN $10
              </button>
              <button className="px-4 py-2 rounded-full bg-surface-container-high/50 text-xs font-bold text-[#5f6368] hover:bg-surface-container-high transition-colors"
                onClick={handleMaxClick}
              >
                MAX ${isLoading ? '...' : usdtBalance.toLocaleString()}
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
                        <span className="font-medium text-[15px] uppercase text-center block w-full truncate px-1 text-[#202124]" title={pm.account_name || pm.wallet_address || pm.minipay_uid}>
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
              className={`w-full md:w-auto px-8 py-3 rounded-lg font-body font-medium text-[14px] shadow-sm active:scale-95 transition-all 
                ${isSubmitting ? 'bg-[#f1f3f4] text-[#bdc1c6]' : 'bg-[#1a73e8] hover:bg-[#1557b0] text-white'}
              `}
            >
              {isSubmitting ? 'Processing...' : 'Submit Request'}
            </button>
          </div>

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
                       <span className="text-[#3c4043] font-body">${Number(tx.amount).toFixed(2)}</span>
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
