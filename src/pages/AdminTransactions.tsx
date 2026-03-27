import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function AdminTransactions() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchTransactions();
    }
  }, [isAdmin]);

  async function fetchTransactions() {
    setIsLoading(true);
    try {
      const { data } = await supabase
        .from('wallet_transactions')
        .select(`
          *,
          profiles:user_id (name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (data) setTransactions(data);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      // In a real production scenario, updating withdrawal to 'completed'
      // might require decrementing total balance, but for this MVP,
      // it just updates the status in the table since balance might be deducted at request.
      const { error } = await supabase
        .from('wallet_transactions')
        .update({ status: newStatus })
        .eq('id', id);

      if (!error) {
        setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, status: newStatus } : tx));
        alert('Transaction updated successfully.');
      } else {
        alert('Failed to update transaction status.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating transaction.');
    }
  };

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

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

      <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm overflow-hidden">
        <h2 className="text-lg font-bold font-headline mb-4 border-b border-surface-container pb-4 flex justify-between items-center">
          Recent Transactions
          <button onClick={fetchTransactions} className="text-xs text-primary font-bold uppercase tracking-widest hover:underline px-2 py-1">Refresh</button>
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
                      <span className="capitalize font-medium">{tx.type.replace(/_/g, ' ')}</span>
                    </td>
                    <td className="p-4 font-bold text-emerald-800">
                      ₦{Number(tx.amount).toLocaleString()}
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
                      {tx.type === 'withdrawal' && tx.status === 'pending' ? (
                        <>
                          <button 
                            onClick={() => handleUpdateStatus(tx.id, 'completed')}
                            className="bg-emerald-600 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold hover:bg-emerald-700 uppercase tracking-wider shadow-sm transition-transform active:scale-95">
                            Approve
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(tx.id, 'failed')}
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
