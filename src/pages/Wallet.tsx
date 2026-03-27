import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function Wallet() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('opay');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchWalletData(user.id);
    }
  }, [user]);

  // Real-time subscriptions for balance and transactions
  useEffect(() => {
    if (!user?.id) return;

    const balanceChannel = supabase
      .channel('wallet-balance-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_balances', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new) {
            setBalance((payload.new as any).balance || 0);
          }
        }
      )
      .subscribe();

    const txChannel = supabase
      .channel('wallet-tx-realtime')
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

      const [balanceRes, txRes] = await Promise.all([
        supabase.from('wallet_balances').select('balance').eq('user_id', userId).single(),
        supabase.from('wallet_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(5)
      ]);
        
      if (balanceRes.data) setBalance(balanceRes.data.balance);
      if (txRes.data) setTransactions(txRes.data);
      
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
    if (!withdrawAmount || isNaN(Number(withdrawAmount)) || Number(withdrawAmount) < 1000) {
      setMessage('Please enter a valid amount (Min: ₦1,000).');
      return;
    }
    if (Number(withdrawAmount) > balance) {
      setMessage('Insufficient balance.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      // Typically you'd call an RPC function here to safely record the withdrawal
      // For now, we simulate a successful request submission:
      setTimeout(() => {
        setMessage('Withdrawal request submitted successfully! It is pending approval.');
        setWithdrawAmount('');
        setIsSubmitting(false);
        // Refresh to show any changes
        if (user) fetchWalletData(user.id);
      }, 1500);
    } catch (error) {
       setIsSubmitting(false);
       setMessage('An error occurred during withdrawal.');
    }
  };

  const recentWithdrawal = transactions.find(tx => tx.type === 'withdrawal');

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

        <section className="space-y-8">
          {/* Amount Input */}
          <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[2rem] shadow-sm border border-surface-container-highest/30 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
            <label className="block text-sm font-bold text-on-surface-variant mb-6 uppercase tracking-widest">Enter Amount</label>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-4xl font-black text-on-surface-variant/30">₦</span>
              <input
                className="w-full bg-transparent border-none focus:ring-0 text-5xl font-black text-on-surface p-0 pl-10 placeholder:text-surface-container-highest outline-none"
                placeholder="0.00"
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <button className="px-4 py-2 rounded-full bg-surface-container text-xs font-bold text-on-surface-variant hover:bg-surface-variant transition-colors"
                onClick={() => setWithdrawAmount('1000')}
              >
                MIN ₦1,000
              </button>
              <button className="px-4 py-2 rounded-full bg-surface-container text-xs font-bold text-on-surface-variant hover:bg-surface-variant transition-colors"
                onClick={handleMaxClick}
              >
                MAX ₦{isLoading ? '...' : balance.toLocaleString()}
              </button>
            </div>
            {message && (
               <p className={`mt-4 text-sm font-bold ${message.includes('success') ? 'text-primary' : 'text-error'}`}>
                 {message}
               </p>
            )}
          </div>

          {/* Payment Methods */}
          <div>
            <h2 className="text-lg font-bold font-headline text-on-surface mb-4 px-2">Payment Method</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* OPay */}
              <label className="relative cursor-pointer group">
                <input 
                  checked={paymentMethod === 'opay'}
                  onChange={() => setPaymentMethod('opay')}
                  className="peer sr-only" 
                  name="payment" 
                  type="radio" 
                  value="opay" 
                />
                <div className="p-6 rounded-2xl bg-surface-container-lowest border-2 border-surface-container peer-checked:border-primary peer-checked:bg-primary/5 transition-all duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-blue-600">account_balance</span>
                    </div>
                    <span className="font-bold text-sm">OPay</span>
                  </div>
                </div>
              </label>

              {/* MiniPay */}
              <label className="relative cursor-pointer group">
                <input 
                  checked={paymentMethod === 'minipay'}
                  onChange={() => setPaymentMethod('minipay')}
                  className="peer sr-only" 
                  name="payment" 
                  type="radio" 
                  value="minipay" 
                />
                <div className="p-6 rounded-2xl bg-surface-container-lowest border-2 border-surface-container peer-checked:border-primary peer-checked:bg-primary/5 transition-all duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-amber-600">bolt</span>
                    </div>
                    <span className="font-bold text-sm">MiniPay</span>
                  </div>
                </div>
              </label>

              {/* USDT */}
              <label className="relative cursor-pointer group">
                <input 
                  checked={paymentMethod === 'usdt'}
                  onChange={() => setPaymentMethod('usdt')}
                  className="peer sr-only" 
                  name="payment" 
                  type="radio" 
                  value="usdt" 
                />
                <div className="p-6 rounded-2xl bg-surface-container-lowest border-2 border-surface-container peer-checked:border-primary peer-checked:bg-primary/5 transition-all duration-300">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <span className="material-symbols-outlined text-emerald-600" style={{ fontVariationSettings: "'FILL' 1" }}>
                        currency_bitcoin
                      </span>
                    </div>
                    <span className="font-bold text-sm">USDT (TRC20)</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Info Boxes */}
          <div className="space-y-4">
            <div className="flex gap-4 p-5 rounded-2xl bg-surface-container-low border border-outline-variant/10">
              <span className="material-symbols-outlined text-primary-container shrink-0">info</span>
              <div>
                <p className="text-sm font-bold text-on-surface">Withdrawal Limits</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Daily limit of ₦250,000 applies to standard accounts. Increase your limit by completing Level 2 KYC.
                </p>
              </div>
            </div>
            <div className="flex gap-4 p-5 rounded-2xl bg-surface-container-low border border-outline-variant/10">
              <span className="material-symbols-outlined text-on-tertiary-fixed-variant shrink-0">payments</span>
              <div>
                <p className="text-sm font-bold text-on-surface">Service Fees</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  OPay/MiniPay transfers attract a ₦50 flat fee. USDT withdrawals have a 1% network fee.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button & Recent Status */}
          <div className="pt-4 flex flex-col gap-6">
            <button 
              onClick={handleWithdraw}
              disabled={isSubmitting}
              className={`w-full py-5 rounded-2xl font-headline font-extrabold text-lg shadow-xl active:scale-95 transition-all 
                ${isSubmitting ? 'bg-surface-variant text-on-surface-variant' : 'bg-gradient-to-br from-[#006b3f] to-[#008751] text-white shadow-primary/20'}
              `}
            >
              {isSubmitting ? 'Processing...' : 'Submit Withdrawal Request'}
            </button>

            {/* Status Indicator Section */}
            {recentWithdrawal && (
              <div className="bg-surface-container-highest/30 rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                    ${recentWithdrawal.status === 'completed' ? 'bg-primary/20 text-primary' : 
                      recentWithdrawal.status === 'failed' ? 'bg-error/20 text-error' : 'bg-amber-500/10 text-amber-600'}`}>
                    <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      {recentWithdrawal.status === 'completed' ? 'check_circle' : 
                       recentWithdrawal.status === 'failed' ? 'error' : 'pending_actions'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface-variant uppercase tracking-tighter">Last Request</p>
                    <p className="font-bold text-on-surface text-sm md:text-base">
                      ₦{Number(recentWithdrawal.amount).toLocaleString()} {recentWithdrawal.status === 'pending' ? 'Pending Approval' : recentWithdrawal.status}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap 
                  ${recentWithdrawal.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 
                    recentWithdrawal.status === 'failed' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                  {recentWithdrawal.status}
                </span>
              </div>
            )}
            
            {/* Recent Earnings List */}
            {transactions.length > 0 && (
              <div className="mt-8 border-t border-surface-container pt-8">
                <h3 className="font-bold font-headline mb-4">Recent Transactions</h3>
                <div className="space-y-3">
                  {transactions.map(tx => (
                    <div key={tx.id} className="bg-surface-container-lowest p-4 rounded-xl flex items-center justify-between border border-surface-container-highest/20 cursor-pointer hover:border-emerald-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 
                          ${tx.type === 'withdrawal' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          <span className="material-symbols-outlined text-sm">
                            {tx.type === 'withdrawal' ? 'arrow_upward' : 'arrow_downward'}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-sm text-on-surface capitalize">{tx.type.replace(/_/g, ' ')}</p>
                          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{new Date(tx.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-black text-sm ${tx.type === 'withdrawal' ? 'text-rose-600' : 'text-emerald-600'}`}>
                          {tx.type === 'withdrawal' ? '-' : '+'}₦{Number(tx.amount).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
