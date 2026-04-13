import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function AdminManagement() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  
  const [totalUsers, setTotalUsers] = useState(0);
  const [pendingWithdrawalsSum, setPendingWithdrawalsSum] = useState(0);
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState(0);
  const [activePostsCount, setActivePostsCount] = useState(0);
  const [recentWithdrawals, setRecentWithdrawals] = useState<any[]>([]);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [recentDeposits, setRecentDeposits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminStats();
    }
  }, [isAdmin]);

  // Real-time channels
  useEffect(() => {
    if (!isAdmin) return;

    const txChannel = supabase
      .channel(`admin-tx-channel-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, () => {
        fetchAdminStats();
      })
      .subscribe();

    const usersChannel = supabase
      .channel(`admin-users-channel-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchAdminStats();
      })
      .subscribe();

    const postsChannel = supabase
      .channel(`admin-posts-channel-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchAdminStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(postsChannel);
    };
  }, [isAdmin]);

  async function fetchAdminStats() {
    setIsLoading(true);
    try {
      // Run all queries in parallel instead of sequentially
      const [usersRes, withdrawalsRes, postsRes, recentWithdrawalsRes, depositsRes, recentDepositsRes] = await Promise.all([
        // Total Users
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        // Pending Withdrawals sum & count
        supabase.from('wallet_transactions').select('amount').eq('type', 'withdrawal').eq('status', 'pending'),
        // Total Active Posts
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        // Recent Withdrawals with Profiles
        supabase.from('wallet_transactions')
          .select(`id, amount, status, created_at, profiles:user_id (name)`)
          .eq('type', 'withdrawal').eq('status', 'pending')
          .order('created_at', { ascending: false }).limit(5),
        // Total Deposits / Revenue
        supabase.from('wallet_transactions')
          .select('amount')
          .in('type', ['deposit', 'subscription_payment', 'plan_purchase'])
          .eq('status', 'completed'),
        // Recent Deposits/Purchases
        supabase.from('wallet_transactions')
          .select(`id, amount, status, type, metadata, created_at, profiles:user_id (name, username)`)
          .in('type', ['deposit', 'subscription_payment', 'plan_purchase'])
          .order('created_at', { ascending: false }).limit(5),
      ]);

      if (usersRes.count !== null) setTotalUsers(usersRes.count);
      
      if (withdrawalsRes.data) {
        setPendingWithdrawalsCount(withdrawalsRes.data.length);
        const sum = withdrawalsRes.data.reduce((acc, tx) => acc + Number(tx.amount), 0);
        setPendingWithdrawalsSum(sum);
      }

      if (postsRes.count !== null) setActivePostsCount(postsRes.count);
      if (recentWithdrawalsRes.data) setRecentWithdrawals(recentWithdrawalsRes.data);
      
      if (depositsRes.data) {
        const depSum = depositsRes.data.reduce((acc, tx) => acc + Number(tx.amount), 0);
        setTotalDeposits(depSum);
      }

      if (recentDepositsRes.data) setRecentDeposits(recentDepositsRes.data);

    } catch (err) {
      console.error("Error fetching admin stats:", err);
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const timeAgo = (dateStr: string) => {
    const s = Math.floor((Date.now() - new Date(dateStr).getTime())/1000);
    if (s < 60) return `${Math.max(1, s)}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-32">
      {/* Welcome Header */}
      <section className="mb-10">
        <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#dcfce7] text-[#006b3f] rounded-full mb-3">
          <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">System Overview</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-[#0f172a] tracking-tight mb-1 font-headline">Operations Overview</h1>
        <p className="text-outline text-sm md:text-base">Monitoring platform health and transaction velocity.</p>
      </section>

      {/* Bento Grid Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Total Users (Primary Accent) */}
        <div className="bg-primary-container p-6 rounded-[1.5rem] relative overflow-hidden group shadow-lg">
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white mb-4">
              <span className="material-symbols-outlined">group</span>
            </div>
            <p className="text-white/80 text-sm font-medium mb-1">Total Users</p>
            <h3 className="text-white text-3xl font-bold font-headline">{isLoading ? '...' : totalUsers.toLocaleString()}</h3>
            <div className="mt-4 flex items-center gap-2 text-primary-fixed text-xs font-bold">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>Live Database Count</span>
            </div>
          </div>
          {/* Abstract Pattern */}
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
            <span className="material-symbols-outlined text-[120px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          </div>
        </div>

        {/* Pending Withdrawals (Neon Highlight) */}
        <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-[0px_20px_40px_rgba(0,33,16,0.06)] border border-outline-variant/20">
          <div className="w-12 h-12 rounded-full bg-tertiary-fixed-dim/20 flex items-center justify-center text-tertiary mb-4">
            <span className="material-symbols-outlined">payments</span>
          </div>
          <p className="text-on-surface-variant text-sm font-medium mb-1">Pending Withdrawals</p>
          <h3 className="text-on-surface text-3xl font-bold font-headline">₦{isLoading ? '...' : pendingWithdrawalsSum.toLocaleString()}</h3>
          <div className="mt-4 flex items-center gap-2 text-error text-xs font-bold">
            <span className="material-symbols-outlined text-sm">priority_high</span>
            <span>{pendingWithdrawalsCount} requests requiring action</span>
          </div>
        </div>

        {/* Total Posts (Subtle Depth) */}
        <div className="bg-surface-container-low p-6 rounded-[1.5rem]">
          <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container mb-4">
            <span className="material-symbols-outlined">post_add</span>
          </div>
          <p className="text-on-surface-variant text-sm font-medium mb-1">Total Active Posts</p>
          <h3 className="text-on-surface text-3xl font-bold font-headline">{isLoading ? '...' : activePostsCount.toLocaleString()}</h3>
          <div className="mt-4 flex items-center gap-2 text-primary text-xs font-bold">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>Live Articles Count</span>
          </div>
        </div>

        {/* Total Revenue / Deposits */}
        <div className="bg-[#f0f9ff] p-6 rounded-[1.5rem] border border-[#bae6fd]">
          <div className="w-12 h-12 rounded-full bg-[#38bdf8]/20 flex items-center justify-center text-[#0284c7] mb-4">
            <span className="material-symbols-outlined">account_balance_wallet</span>
          </div>
          <p className="text-[#0c4a6e]/70 text-sm font-medium mb-1">Total System Revenue</p>
          <h3 className="text-[#0c4a6e] text-3xl font-bold font-headline">₦{isLoading ? '...' : totalDeposits.toLocaleString()}</h3>
          <div className="mt-4 flex items-center gap-2 text-[#0284c7] text-xs font-bold">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span>Deposits & Subscriptions</span>
          </div>
        </div>
      </div>

      {/* Asymmetric Section: Pending Approvals & Quick Insights */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Pending Approvals (Main Column) */}
        <div className="flex-grow space-y-6">
          <div className="flex justify-between items-end px-2">
            <h2 className="text-xl font-bold font-headline text-on-surface">Recent Withdrawal Requests</h2>
            <Link to="/admin/transactions" className="text-primary text-sm font-bold hover:underline">View All</Link>
          </div>
          <div className="space-y-4">
            {isLoading ? (
              <div className="p-6 text-center text-on-surface-variant">Loading requests...</div>
            ) : recentWithdrawals.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl">No pending withdrawals.</div>
            ) : (
              recentWithdrawals.map(tx => (
                <div key={tx.id} className="bg-surface-container-lowest p-5 rounded-[1.2rem] flex items-center justify-between shadow-sm border border-transparent hover:border-primary-fixed-dim/40 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-surface-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-on-surface-variant">person</span>
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-on-surface text-sm md:text-base truncate">{tx.profiles?.name || 'Unknown'}</p>
                      <p className="text-[10px] md:text-xs text-on-surface-variant truncate">Ref: {tx.id.slice(0, 8)}... • {timeAgo(tx.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-bold text-on-surface text-sm md:text-base">₦{Number(tx.amount).toLocaleString()}</p>
                    <span className="inline-block px-2 py-0.5 md:px-3 md:py-1 bg-tertiary-fixed-dim/10 text-tertiary text-[10px] font-black rounded-full uppercase tracking-widest mt-1">Pending</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-between items-end px-2 mt-8">
            <h2 className="text-xl font-bold font-headline text-on-surface">Recent Deposits & Plans</h2>
          </div>
          <div className="space-y-4 pt-2">
            {isLoading ? (
              <div className="p-6 text-center text-on-surface-variant">Loading deposits...</div>
            ) : recentDeposits.length === 0 ? (
              <div className="p-6 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl">No recent deposits.</div>
            ) : (
              recentDeposits.map(tx => (
                <div key={tx.id} className="bg-white p-5 rounded-[1.2rem] flex items-center justify-between shadow-[0px_4px_12px_rgba(0,0,0,0.02)] border border-surface-container-low hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <span className="material-symbols-outlined">
                         {tx.type === 'plan_purchase' || tx.type === 'subscription_payment' ? 'workspace_premium' : 'savings'}
                      </span>
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-bold text-on-surface text-sm md:text-base truncate">
                        {tx.profiles?.name || 'Unknown'} 
                        <span className="opacity-50 text-xs ml-1 font-normal">(@{tx.profiles?.username || 'user'})</span>
                      </p>
                      <p className="text-[10px] md:text-xs text-on-surface-variant truncate">
                         {tx.type === 'plan_purchase' ? `Bought ${tx.meta?.plan_id || 'Plan'}` : 'Wallet Deposit'} • {timeAgo(tx.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-black text-emerald-600 text-sm md:text-base">+₦{Number(tx.amount).toLocaleString()}</p>
                    <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-widest mt-1">
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Side Insights (Offset Grid) */}
        <div className="lg:w-80 space-y-8">
          <div className="bg-inverse-surface p-6 rounded-[1.5rem] text-white shadow-lg">
            <h4 className="font-bold mb-4 font-label">Admin Actions</h4>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/admin/users" className="flex flex-col items-center justify-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                <span className="material-symbols-outlined text-tertiary-fixed">group</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-center">Users</span>
              </Link>
              <Link to="/admin/transactions" className="flex flex-col items-center justify-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                <span className="material-symbols-outlined text-primary-fixed">payments</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-center">Finances</span>
              </Link>
              <Link to="/admin/content" className="flex flex-col items-center justify-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                <span className="material-symbols-outlined text-secondary-fixed">article</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-center">Content</span>
              </Link>
              <button disabled className="flex flex-col items-center justify-center gap-2 p-4 bg-white/5 rounded-xl opacity-50 cursor-not-allowed">
                <span className="material-symbols-outlined text-error-container">report</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-center">Logs</span>
              </button>
            </div>
          </div>

          <div className="bg-surface-container p-6 rounded-[1.5rem]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-on-surface text-sm">Platform Health</h4>
              <span className="w-3 h-3 rounded-full bg-tertiary-fixed-dim animate-pulse"></span>
            </div>
            <div className="space-y-4">
              <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[85%]"></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                <span>Database Sync</span>
                <span>Real-time Active</span>
              </div>
              <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-tertiary w-[100%]"></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                <span>Database Connection</span>
                <span>Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
