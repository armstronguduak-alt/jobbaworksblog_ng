import { useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrency } from '../hooks/useCurrency';

export function AdminTransactions() {
  const { isAdmin, isModerator, permissions, isLoading: authLoading } = useAuth();
  const hasAccess = isAdmin || (isModerator && permissions.includes('transactions'));
  const { showAlert } = useDialog();
  const queryClient = useQueryClient();
  const { formatAmount } = useCurrency();

  const { data: transactions = [], isLoading, isFetching } = useQuery({
    queryKey: ['admin_transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('wallet_transactions')
        .select(`*, profiles:user_id (name, email)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!hasAccess,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!hasAccess) return;

    const txListener = supabase.channel(`admin-tx-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_transactions' },
        () => queryClient.invalidateQueries({ queryKey: ['admin_transactions'] })
      )
      .subscribe();
    
    return () => { supabase.removeChannel(txListener); };
  }, [hasAccess, queryClient]);



  const handleUpdateStatus = async (id: string, newStatus: string, userId: string, txType: string, txAmount: number) => {
    try {
      const { error } = await supabase
        .from('wallet_transactions')
        .update({ status: newStatus })
        .eq('id', id);

      if (!error) {
        queryClient.setQueryData(['admin_transactions'], (old: any[]) => old?.map(tx => tx.id === id ? { ...tx, status: newStatus } : tx));
        showAlert('Transaction updated successfully.');
        
        if (newStatus === 'completed' && txType === 'withdrawal') {
           await supabase.from('notifications').insert({
             user_id: userId,
             title: 'Withdrawal Approved & Sent',
             message: `Your withdrawal request for ${formatAmount(txAmount)} has been successfully processed. The funds are on their way to your account!`,
             type: 'system',
             is_read: false
           });
        }
        if (newStatus === 'failed' && txType === 'withdrawal') {
             await supabase.from('notifications').insert({
             user_id: userId,
             title: 'Withdrawal Failed',
             message: `Your withdrawal request for ${formatAmount(txAmount)} was rejected due to incorrect details or violations. Please contact support.`,
             type: 'alert',
             is_read: false
           });
        }
        if (newStatus === 'completed' && txType === 'deposit') {
           await supabase.from('notifications').insert({
             user_id: userId,
             title: 'Deposit Confirmed',
             message: `Your manual deposit of ${formatAmount(txAmount)} has been verified and credited to your account.`,
             type: 'system',
             is_read: false
           });
        }
        if (newStatus === 'failed' && txType === 'deposit') {
           await supabase.from('notifications').insert({
             user_id: userId,
             title: 'Deposit Rejected',
             message: `Your manual deposit of ${formatAmount(txAmount)} could not be verified. Please contact support if you believe this is an error.`,
             type: 'alert',
             is_read: false
           });
        }
      } else {
        showAlert('Failed to update transaction status.', 'Error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error updating transaction.', 'Error');
    }
  };

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!hasAccess) return <Navigate to="/dashboard" replace />;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-100 text-emerald-800';
      case 'failed': return 'bg-rose-100 text-rose-800';
      case 'pending': return 'bg-amber-100 text-amber-800';
      default: return 'bg-surface-variant text-on-surface-variant';
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-32">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">Finance & Transactions</h1>
          <p className="text-on-surface-variant font-medium">Manage pending withdrawals, deposits, and platform treasury.</p>
        </div>
        <Link to="/admin" className="text-primary font-bold hover:underline">Back to Overview</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-surface-container/50">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Volume</p>
          <h3 className="text-2xl font-black text-on-surface">
            {formatAmount(transactions.reduce((acc, tx) => acc + Number(tx.amount || 0), 0))}
          </h3>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-emerald-500/20">
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Total Earnings</p>
          <h3 className="text-2xl font-black text-emerald-800">
            {formatAmount(transactions.filter(t => t.type.includes('reward')).reduce((acc, tx) => acc + Number(tx.amount || 0), 0))}
          </h3>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-blue-500/20">
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">Total Deposits</p>
          <h3 className="text-2xl font-black text-blue-800">
            {formatAmount(transactions.filter(t => t.type === 'plan_purchase' || t.type === 'deposit').reduce((acc, tx) => acc + Number(tx.amount || 0), 0))}
          </h3>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-rose-500/20">
          <p className="text-xs font-bold text-rose-600 uppercase tracking-widest mb-1">Total Withdrawals</p>
          <h3 className="text-2xl font-black text-rose-800">
            {formatAmount(transactions.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((acc, tx) => acc + Number(tx.amount || 0), 0))}
          </h3>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-amber-500/20">
          <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">Referral Comm.</p>
          <h3 className="text-2xl font-black text-amber-800">
            {formatAmount(transactions.filter(t => t.type === 'referral_bonus').reduce((acc, tx) => acc + Number(tx.amount || 0), 0))}
          </h3>
        </div>
      </div>

      <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm overflow-hidden">
        <h2 className="text-lg font-bold font-headline mb-4 border-b border-surface-container pb-4 flex justify-between items-center">
          Recent Transactions
          <button onClick={() => queryClient.invalidateQueries({ queryKey: ['admin_transactions'] })} className="text-xs text-primary font-bold uppercase tracking-widest hover:underline px-2 py-1 flex items-center gap-1">
            {isFetching && <span className="w-3 h-3 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></span>}
            Refresh
          </button>
        </h2>
        
        {isLoading ? (
          <div className="text-center py-10 text-on-surface-variant">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">account_balance</span>
            <p>No transactions found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest rounded-tl-xl break-words min-w-[200px]">User / Email</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Type</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Amount</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Date</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-center">Status</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right rounded-tr-xl">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/50 text-sm">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="p-4 break-words">
                      <p className="font-semibold text-on-surface truncate max-w-[150px]">{tx.profiles?.name || 'Unknown'}</p>
                      <p className="text-[10px] text-on-surface-variant truncate max-w-[150px]">{tx.profiles?.email}</p>
                    </td>
                    <td className="p-4">
                      <span className="capitalize font-bold text-on-surface">{tx.type.replace(/_/g, ' ')}</span>
                      {tx.meta && Object.keys(tx.meta).length > 0 && (
                        <div className="mt-1 text-[10px] text-on-surface-variant max-w-[150px]">
                          {tx.meta.plan_id ? <span className="block truncate bg-surface-container px-1 rounded">Plan: {tx.meta.plan_id}</span> : null}
                          {tx.meta.referred_username ? <span className="block truncate bg-surface-container px-1 rounded mt-0.5">Ref: @{tx.meta.referred_username}</span> : null}
                          {tx.meta.transaction_details ? <span className="block truncate bg-surface-container px-1 rounded mt-0.5">{tx.meta.transaction_details}</span> : null}
                          {tx.meta.account_details && Object.keys(tx.meta.account_details).length > 0 ? (
                            <div className="mt-2 bg-surface p-2 rounded border border-outline-variant/30 w-max max-w-[200px]">
                              <span className="block text-primary font-bold text-[10px]">PAYOUT DETAILS</span>
                              {Object.entries(tx.meta.account_details).map(([k, v]) => (
                                <span key={k} className="block text-[10px] text-on-surface truncate">
                                  <span className="font-semibold text-on-surface-variant mr-1">{k}:</span>
                                  {v as string}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-black flex flex-col justify-center h-full">
                       <span className={tx.type === 'withdrawal' && tx.status === 'completed' ? 'text-rose-600' : tx.type === 'deposit' || tx.type === 'referral_bonus' ? 'text-emerald-600' : 'text-on-surface'}>
                         {tx.type === 'withdrawal' && tx.status === 'completed' ? '-' : '+'}{formatAmount(Number(tx.amount))}
                       </span>
                    </td>
                    <td className="p-4 text-on-surface-variant text-[11px]">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusColor(tx.status)}`}>
                        {tx.status}
                      </span>
                    </td>
                    <td className="p-4 flex gap-2 justify-end">
                      {(tx.type === 'withdrawal' || tx.type === 'deposit') && tx.status === 'pending' ? (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(tx.id, 'completed', tx.user_id, tx.type, tx.amount)}
                            className="bg-emerald-600 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-700 uppercase tracking-wider shadow-sm transition-transform active:scale-95">
                            Approve
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(tx.id, 'failed', tx.user_id, tx.type, tx.amount)}
                            className="bg-rose-50 border border-rose-200 text-rose-700 text-[10px] px-3 py-1.5 rounded-lg font-bold hover:bg-rose-100 uppercase tracking-wider shadow-sm transition-transform active:scale-95">
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-[10px] text-on-surface-variant font-medium uppercase tracking-widest">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
