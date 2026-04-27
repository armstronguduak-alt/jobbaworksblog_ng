import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export function AdminWithdrawals() {
  const { isAdmin, isModerator, permissions, isLoading: authLoading } = useAuth();
  const hasAccess = isAdmin || (isModerator && permissions.includes('transactions'));
  const { showAlert, showConfirm } = useDialog();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'rejected'>('pending');

  // Approval Modal State
  const [approvalModalOpen, setApprovalModalOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [deductionReason, setDeductionReason] = useState<string>('');
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  useEffect(() => {
    if (hasAccess) fetchWithdrawals();
  }, [activeTab, hasAccess]);

  // Fetch all withdrawals once for analytics
  useEffect(() => {
    if (hasAccess) fetchAllStats();
  }, [hasAccess]);

  const fetchAllStats = async () => {
    const { data } = await supabase
      .from('wallet_transactions')
      .select('amount, status')
      .eq('type', 'withdrawal');
    setAllWithdrawals(data || []);
  };

  const fetchWithdrawals = async () => {
    setIsLoading(true);
    try {
      let q = supabase
        .from('wallet_transactions')
        .select('*')
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
      
      const txs = data || [];
      // Fetch profiles separately since FK join may not exist
      const userIds = [...new Set(txs.map(t => t.user_id).filter(Boolean))];
      let profileMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, email, username')
          .in('user_id', userIds);
        (profilesData || []).forEach((p: any) => { profileMap[p.user_id] = p; });
      }
      setWithdrawals(txs.map(tx => ({ ...tx, profiles: profileMap[tx.user_id] || null })));
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const openApprovalModal = (tx: any) => {
    setSelectedTx(tx);
    const meta = tx.meta || {};
    const expectedAmount = meta.expectedAmount || (Math.abs(tx.amount) - (meta.feeDeducted || 0));
    setPaidAmount(expectedAmount.toString());
    setDeductionReason('');
    setApprovalModalOpen(true);
  };

  const submitApproval = async () => {
    if (!selectedTx) return;
    setIsSubmittingApproval(true);
    
    const amountToPay = Number(paidAmount) || 0;
    const finalMeta = {
      ...(selectedTx.meta || {}),
      paidAmount: amountToPay,
      deductionReason: deductionReason
    };

    try {
      const { error } = await supabase
        .from('wallet_transactions')
        .update({ status: 'completed', meta: finalMeta })
        .eq('id', selectedTx.id);

      if (error) throw error;

      await supabase.from('notifications').insert({
        user_id: selectedTx.user_id,
        title: 'Withdrawal Sent ✅',
        message: `Your withdrawal has been processed. Amount paid: $${amountToPay.toLocaleString()}.${deductionReason ? ' Note: ' + deductionReason : ''}`,
        type: 'system'
      });

      showAlert(`Withdrawal approved successfully.`, 'Success');
      setApprovalModalOpen(false);
      fetchWithdrawals();
      fetchAllStats();
    } catch (err: any) {
      showAlert(err.message, 'Error');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleAction = async (txId: string, userId: string, newStatus: 'rejected', amount: number) => {
    const action = 'reject';
    const confirmed = await showConfirm(
      `Are you sure you want to ${action} this withdrawal of $${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}?`,
      `${action.charAt(0).toUpperCase() + action.slice(1)} Withdrawal`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('wallet_transactions')
        .update({ status: 'rejected' })
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
        title: 'Withdrawal Rejected ❌',
        message: `Your withdrawal of $${Math.abs(amount).toLocaleString()} was rejected. The amount has been refunded to your wallet.`,
        type: 'system'
      });

      showAlert(`Withdrawal ${action}d successfully.`, 'Success');
      fetchWithdrawals();
      fetchAllStats();
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

  // Analytics
  const pendingTotal = allWithdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + Math.abs(w.amount), 0);
  const approvedTotal = allWithdrawals.filter(w => w.status === 'completed').reduce((s, w) => s + Math.abs(w.amount), 0);
  const rejectedTotal = allWithdrawals.filter(w => w.status === 'rejected').reduce((s, w) => s + Math.abs(w.amount), 0);
  const pendingCount = allWithdrawals.filter(w => w.status === 'pending').length;
  const approvedCount = allWithdrawals.filter(w => w.status === 'completed').length;
  const rejectedCount = allWithdrawals.filter(w => w.status === 'rejected').length;

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!hasAccess) return <Navigate to="/dashboard" replace />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black font-headline text-slate-900 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-4xl">account_balance</span>
          Withdrawal Management
        </h1>
        <p className="text-slate-500 mt-1">Review and process user withdrawal requests from the wallet.</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-amber-600 text-[20px]">hourglass_top</span>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-700">Pending</span>
          </div>
          <p className="text-2xl font-black text-amber-800 font-headline">${pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-amber-600 font-medium mt-1">{pendingCount} request{pendingCount !== 1 ? 's' : ''} waiting</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">check_circle</span>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">Approved & Sent</span>
          </div>
          <p className="text-2xl font-black text-emerald-800 font-headline">${approvedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-emerald-600 font-medium mt-1">{approvedCount} processed</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-rose-600 text-[20px]">cancel</span>
            <span className="text-xs font-bold uppercase tracking-widest text-rose-700">Rejected</span>
          </div>
          <p className="text-2xl font-black text-rose-800 font-headline">${rejectedTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          <p className="text-xs text-rose-600 font-medium mt-1">{rejectedCount} refunded</p>
        </div>
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
            {tab === 'completed' ? 'Sent' : tab}
            {tab === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pendingCount}</span>
            )}
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
                <th className="p-4">Fee & Net</th>
                <th className="p-4">Payout Details</th>
                <th className="p-4">Date</th>
                <th className="p-4">Status</th>
                {activeTab === 'pending' && <th className="p-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">Loading withdrawals...</td></tr>
              ) : withdrawals.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400">No {activeTab} withdrawal requests.</td></tr>
              ) : (
                withdrawals.map(tx => {
                  const acct = parseAccountDetails(tx.meta);
                  const meta = tx.meta || {};
                  const feePercent = meta.withdrawalFeePercent || 0;
                  const feeAmount = meta.feeDeducted || 0;
                  const expectedAmount = meta.expectedAmount || (Math.abs(tx.amount) - feeAmount);
                  
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-bold text-slate-800">{tx.profiles?.name || 'Unknown'}</p>
                          <p className="text-[11px] text-slate-400">@{tx.profiles?.username} · {tx.profiles?.email}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-black text-lg text-slate-900">${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </td>
                      <td className="p-4">
                        <div className="text-xs space-y-0.5">
                          {feePercent > 0 && <p className="text-rose-500 font-bold">Fee: {feePercent}% (-${Number(feeAmount).toFixed(2)})</p>}
                          <p className="text-emerald-700 font-black">Net: ${Number(expectedAmount).toFixed(2)}</p>
                        </div>
                      </td>
                      <td className="p-4">
                        {acct ? (
                          <div className="text-xs space-y-0.5">
                            {acct.method && <p className="font-black text-slate-700 uppercase">{acct.method}</p>}
                            {(acct.bank_name || acct.bankName) && <p className="font-bold text-slate-600">{acct.bank_name || acct.bankName}</p>}
                            {(acct.account_number || acct.accountNumber) && <p className="text-slate-500">{acct.account_number || acct.accountNumber}</p>}
                            {(acct.account_name || acct.accountName) && <p className="text-slate-500">{acct.account_name || acct.accountName}</p>}
                            {acct.wallet_address && <p className="text-slate-500 truncate max-w-[180px]" title={acct.wallet_address}>{acct.wallet_address}</p>}
                            {acct.minipay_uid && <p className="text-slate-500">MiniPay: {acct.minipay_uid}</p>}
                            {acct.network && <p className="text-blue-500 font-bold">{acct.network}</p>}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">No payout details</span>
                        )}
                      </td>
                      <td className="p-4 text-slate-500 text-xs font-bold">
                        {new Date(tx.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        <br />
                        <span className="text-[10px] text-slate-400">{new Date(tx.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                          tx.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          tx.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {tx.status === 'completed' ? 'Sent' : tx.status}
                        </span>
                      </td>
                      {activeTab === 'pending' && (
                        <td className="p-4 text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => openApprovalModal(tx)}
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

      {/* Approval Modal */}
      {approvalModalOpen && selectedTx && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black font-headline text-slate-900">Approve Withdrawal</h3>
                <button onClick={() => setApprovalModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                  <p className="text-sm text-slate-500 font-medium">Requested Amount</p>
                  <p className="text-xl font-black text-slate-800">${Math.abs(selectedTx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Actual Amount Paid ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-100 border-transparent focus:bg-slate-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all font-bold text-slate-800"
                    placeholder="Enter amount actually sent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Breakdown / Deduction Reason (Optional)</label>
                  <textarea
                    value={deductionReason}
                    onChange={(e) => setDeductionReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-100 border-transparent focus:bg-slate-50 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm text-slate-700 min-h-[100px]"
                    placeholder="e.g., Deducted $5 for invalid ad-clicking activities."
                  />
                  <p className="text-[10px] text-slate-400 mt-1">This will be shown on the user's transaction history.</p>
                </div>
              </div>

              <div className="mt-8 flex justify-end gap-3">
                <button
                  onClick={() => setApprovalModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitApproval}
                  disabled={isSubmittingApproval || !paidAmount}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingApproval ? 'Processing...' : 'Confirm Approval'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
