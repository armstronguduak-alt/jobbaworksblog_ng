import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDialog } from '../contexts/DialogContext';

export function AdminWithdrawals() {
  const { showAlert, showConfirm } = useDialog();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'rejected'>('pending');

  useEffect(() => {
    fetchWithdrawals();
  }, [activeTab]);

  const fetchWithdrawals = async () => {
    setIsLoading(true);
    try {
      let q = supabase
        .from('wallet_transactions')
        .select('*, profiles:user_id(name, email, username)')
        .eq('type', 'withdrawal')
        .order('created_at', { ascending: false });

      if (activeTab === 'pending') {
        q = q.eq('status', 'pending');
      } else if (activeTab === 'completed') {
        q = q.eq('status', 'completed');
      } else {
        q = q.eq('status', 'rejected');
      }

      const { data, error } = await q;
      if (error) throw error;
      if (data) setWithdrawals(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (txId: string, userId: string, newStatus: 'completed' | 'rejected', amount: number) => {
    const action = newStatus === 'completed' ? 'approve' : 'reject';
    const confirmed = await showConfirm(
      `Are you sure you want to ${action} this withdrawal of ₦${Math.abs(amount).toLocaleString()}?`,
      `${action.charAt(0).toUpperCase() + action.slice(1)} Withdrawal`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('wallet_transactions')
        .update({ status: newStatus })
        .eq('id', txId);

      if (error) throw error;

      // If rejected, refund the balance back
      if (newStatus === 'rejected') {
        await supabase.rpc('increment_wallet_balance', {
          amount: Math.abs(amount),
          target_user: userId
        });
      }

      // Send notification to the user
      await supabase.from('notifications').insert({
        user_id: userId,
        title: newStatus === 'completed' ? 'Withdrawal Approved ✅' : 'Withdrawal Rejected ❌',
        message: newStatus === 'completed'
          ? `Your withdrawal of ₦${Math.abs(amount).toLocaleString()} has been approved and processed.`
          : `Your withdrawal of ₦${Math.abs(amount).toLocaleString()} was rejected. The amount has been refunded to your wallet.`,
        type: 'system'
      });

      showAlert(`Withdrawal ${action}d successfully.`, 'Success');
      fetchWithdrawals();
    } catch (err: any) {
      showAlert(err.message, 'Error');
    }
  };

  const parseAccountDetails = (meta: any) => {
    if (!meta) return null;
    const details = meta.account_details || meta;
    if (typeof details === 'string') {
      try { return JSON.parse(details); } catch { return null; }
    }
    return details;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black font-headline text-slate-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-4xl">account_balance</span>
          Withdrawal Management
        </h1>
        <p className="text-slate-500 mt-1">Review and process user withdrawal requests from the wallet.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 max-w-max">
        {(['pending', 'completed', 'rejected'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg font-bold text-sm capitalize transition-all ${
              activeTab === tab
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Bank Details</th>
                <th className="p-4">Date</th>
                {activeTab === 'pending' && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400 animate-pulse">Loading withdrawals...</td></tr>
              ) : withdrawals.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No {activeTab} withdrawal requests.</td></tr>
              ) : (
                withdrawals.map(tx => {
                  const acct = parseAccountDetails(tx.meta);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-slate-800">{tx.profiles?.name || 'Unknown'}</p>
                          <p className="text-[11px] text-slate-400">@{tx.profiles?.username} · {tx.profiles?.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-black text-lg text-rose-600">₦{Math.abs(tx.amount).toLocaleString()}</span>
                      </td>
                      <td className="p-4">
                        {acct ? (
                          <div className="text-xs space-y-0.5">
                            <p className="font-bold text-slate-700">{acct.bank_name || acct.bankName || 'N/A'}</p>
                            <p className="text-slate-500">{acct.account_number || acct.accountNumber || 'N/A'}</p>
                            <p className="text-slate-500">{acct.account_name || acct.accountName || 'N/A'}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">No details</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500 text-xs font-bold">
                        {new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      {activeTab === 'pending' && (
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleAction(tx.id, tx.user_id, 'completed', tx.amount)}
                              className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-200 flex items-center gap-1 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[14px]">check</span> Approve
                            </button>
                            <button
                              onClick={() => handleAction(tx.id, tx.user_id, 'rejected', tx.amount)}
                              className="bg-rose-100 text-rose-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-rose-200 flex items-center gap-1 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span> Reject
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
