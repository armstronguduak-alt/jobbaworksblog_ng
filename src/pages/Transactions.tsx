import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

type TxFilter = 'all' | 'swap' | 'withdrawal' | 'earning' | 'comment_bonus' | 'referral';

export function Transactions() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<TxFilter>('all');

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', user?.id, filter],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      let q = supabase
        .from('wallet_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(100);
      if (filter !== 'all') q = q.eq('type', filter);
      const { data: rows, error } = await q;
      if (error) throw error;
      const txs = rows || [];
      const earned = txs.filter(t => t.amount > 0 && !['swap','subscription_fee','withdrawal'].includes(t.type)).reduce((s,t) => s + t.amount, 0);
      const swapped = txs.filter(t => t.type === 'swap').reduce((s,t) => s + Math.abs(t.amount), 0);
      const withdrawn = txs.filter(t => t.type === 'withdrawal').reduce((s,t) => s + Math.abs(t.amount), 0);
      return { transactions: txs, stats: { totalEarned: earned, totalSwapped: swapped, totalWithdrawn: withdrawn, totalTx: txs.length } };
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000,
  });

  const transactions = data?.transactions || [];
  const stats = data?.stats || { totalEarned: 0, totalSwapped: 0, totalWithdrawn: 0, totalTx: 0 };


  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'swap': return { icon: 'swap_horiz', color: 'text-blue-600', bg: 'bg-blue-50' };
      case 'withdrawal': return { icon: 'account_balance', color: 'text-rose-600', bg: 'bg-rose-50' };
      case 'comment_bonus': return { icon: 'chat', color: 'text-purple-600', bg: 'bg-purple-50' };
      case 'comment_reward': return { icon: 'chat', color: 'text-purple-600', bg: 'bg-purple-50' };
      case 'referral': return { icon: 'group_add', color: 'text-amber-600', bg: 'bg-amber-50' };
      case 'referral_bonus': return { icon: 'group_add', color: 'text-amber-600', bg: 'bg-amber-50' };
      case 'reading_reward': return { icon: 'menu_book', color: 'text-emerald-600', bg: 'bg-emerald-50' };
      case 'reading_bonus': return { icon: 'auto_stories', color: 'text-indigo-600', bg: 'bg-indigo-50' };
      case 'post_approval_reward': return { icon: 'article', color: 'text-teal-600', bg: 'bg-teal-50' };
      case 'login_reward': return { icon: 'local_fire_department', color: 'text-orange-600', bg: 'bg-orange-50' };
      case 'task_reward': return { icon: 'task_alt', color: 'text-cyan-600', bg: 'bg-cyan-50' };
      case 'subscription_fee': return { icon: 'rocket_launch', color: 'text-violet-600', bg: 'bg-violet-50' };
      default: return { icon: 'payments', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'swap': return 'Currency Swap';
      case 'withdrawal': return 'Withdrawal';
      case 'comment_bonus': return 'Comment Reward';
      case 'comment_reward': return 'Comment Reward';
      case 'referral': return 'Referral Bonus';
      case 'referral_bonus': return 'Referral Bonus';
      case 'reading_reward': return 'Reading Reward';
      case 'reading_bonus': return 'Story Reading Bonus';
      case 'post_approval_reward': return 'Article Author Reward';
      case 'login_reward': return 'Daily Login Streak';
      case 'task_reward': return 'Task Reward';
      case 'subscription_fee': return 'Plan Subscription';
      case 'earning': return 'Earning';
      default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const filters: { key: TxFilter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'earning', label: 'Earnings' },
    { key: 'swap', label: 'Swaps' },
    { key: 'withdrawal', label: 'Withdrawals' },
    { key: 'comment_bonus', label: 'Comments' },
    { key: 'referral', label: 'Referrals' },
  ];

  return (
    <div className="pt-8 pb-32 px-4 md:px-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-primary-fixed-variant">Transaction History</h2>
        <p className="text-on-surface-variant mt-1">Complete breakdown of all your account activity.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Earned', value: `₦${stats.totalEarned.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: 'trending_up', color: 'text-emerald-600', bg: 'from-emerald-50 to-green-50' },
          { label: 'Total Swapped', value: `₦${stats.totalSwapped.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: 'swap_horiz', color: 'text-blue-600', bg: 'from-blue-50 to-indigo-50' },
          { label: 'Total Withdrawn', value: `₦${stats.totalWithdrawn.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: 'account_balance', color: 'text-rose-600', bg: 'from-rose-50 to-pink-50' },
          { label: 'Transactions', value: stats.totalTx.toString(), icon: 'receipt_long', color: 'text-slate-600', bg: 'from-slate-50 to-gray-50' },
        ].map(card => (
          <div key={card.label} className={`bg-gradient-to-br ${card.bg} rounded-2xl p-4 border border-white shadow-sm`}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`material-symbols-outlined text-[18px] ${card.color}`}>{card.icon}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{card.label}</span>
            </div>
            <p className={`text-xl font-black font-headline ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 disabled-scrollbar">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              filter === f.key
                ? 'bg-on-surface text-surface shadow-md'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Transaction List */}
      <div className="bg-surface-container-lowest rounded-[2rem] border border-surface-container-highest/20 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-on-surface-variant animate-pulse">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">receipt_long</span>
            <p className="text-on-surface-variant font-bold">No transactions found for this filter.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-container">
            {transactions.map(tx => {
              const typeStyle = getTypeIcon(tx.type);
              const meta = tx.meta || {};
              const isPositive = tx.amount > 0;
              
              return (
                <div key={tx.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface-container-low/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl ${typeStyle.bg} flex items-center justify-center shrink-0`}>
                      <span className={`material-symbols-outlined text-[18px] ${typeStyle.color}`}>{typeStyle.icon}</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-on-surface">{getTypeLabel(tx.type)}</p>
                      <p className="text-[10px] text-on-surface-variant font-medium mt-0.5">
                        {tx.description || tx.type} · {new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {tx.type === 'swap' && meta.usd_amount && (
                        <p className="text-[10px] text-blue-500 font-bold mt-0.5">Received ${Number(meta.usd_amount).toFixed(2)} USD at ₦{meta.rate}/$ rate</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`font-black text-sm ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {isPositive ? '+' : ''}₦{Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${
                      tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                      tx.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
