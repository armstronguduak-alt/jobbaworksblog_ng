import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, Navigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAppSettings } from '../hooks/useAppSettings';

export function AdminManagement() {
  const { isAdmin, isModerator, isLoading: authLoading } = useAuth();
  const hasAccess = isAdmin || isModerator;
  const { regionView } = useOutletContext<{ regionView: 'all' | 'nigeria' | 'global' }>();
  const { exchangeRates } = useAppSettings();
  
  const symbol = regionView === 'global' ? '$' : '₦';
  const formatAdminAmount = (amount: number) => {
    if (regionView === 'global') {
      return (amount / (exchangeRates?.dollarPrice || 1500)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };
  
  // ── Analytics State ──
  const [totalUsersCount, setTotalUsers] = useState(0);
  const [nigerianUsersCount, setNigerianUsers] = useState(0);
  const [globalUsersCount, setGlobalUsers] = useState(0);
  const [pendingWithdrawalsSum, setPendingWithdrawalsSum] = useState(0);
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState(0);
  const [activePostsCount, setActivePostsCount] = useState(0);
  const [recentWithdrawals, setRecentWithdrawals] = useState<any[]>([]);
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalEarningsPaid, setTotalEarningsPaid] = useState(0);
  const [totalReferralEarnings, setTotalReferralEarnings] = useState(0);
  const [recentDeposits, setRecentDeposits] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Debounced real-time refetch ──
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchAdminStats();
    }, 2000); // 2s debounce — prevents spamming on burst events
  }, [regionView]);

  useEffect(() => {
    if (hasAccess) {
      fetchAdminStats();
    }
  }, [hasAccess, regionView]);

  // Real-time channels with debounced refetch
  useEffect(() => {
    if (!hasAccess) return;

    const channelId = Math.random().toString(36).substring(7);

    const txChannel = supabase
      .channel(`admin-tx-${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions' }, debouncedFetch)
      .subscribe();

    const usersChannel = supabase
      .channel(`admin-users-${channelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, debouncedFetch)
      .subscribe();

    const postsChannel = supabase
      .channel(`admin-posts-${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, debouncedFetch)
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(txChannel);
      supabase.removeChannel(usersChannel);
      supabase.removeChannel(postsChannel);
    };
  }, [hasAccess, regionView, debouncedFetch]);

  async function fetchAdminStats() {
    setIsLoading(true);
    try {
      let matchedUserIds: string[] | null = null;
      if (regionView !== 'all') {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('is_global', regionView === 'global');
        matchedUserIds = (profiles || []).map(p => p.user_id);
      }

      // ── User counts (always fetch both for the breakdown cards) ──
      const [usersAllRes, usersNgnRes, usersGlobalRes] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true })
          .then(r => r),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_global', false),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_global', true),
      ]);

      // ── Financial queries ──
      let qWithdrawals = supabase.from('wallet_transactions').select('amount').eq('type', 'withdrawal').eq('status', 'pending');
      if (matchedUserIds) qWithdrawals = qWithdrawals.in('user_id', matchedUserIds);

      let qPosts = supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'approved');
      if (matchedUserIds) qPosts = qPosts.in('author_id', matchedUserIds);

      let qRecentWithdrawals = supabase.from('wallet_transactions').select('id, amount, status, created_at, user_id').eq('type', 'withdrawal').eq('status', 'pending').order('created_at', { ascending: false });
      if (matchedUserIds) qRecentWithdrawals = qRecentWithdrawals.in('user_id', matchedUserIds);
      qRecentWithdrawals = qRecentWithdrawals.limit(5);

      let qDeposits = supabase.from('wallet_transactions').select('amount').in('type', ['deposit', 'subscription_payment', 'plan_purchase']).eq('status', 'completed');
      if (matchedUserIds) qDeposits = qDeposits.in('user_id', matchedUserIds);

      let qEarningsPaid = supabase.from('wallet_transactions').select('amount').in('type', ['earning', 'streak_reward', 'referral_bonus', 'task_reward', 'read_reward', 'comment_reward']).eq('status', 'completed');
      if (matchedUserIds) qEarningsPaid = qEarningsPaid.in('user_id', matchedUserIds);

      let qReferralEarnings = supabase.from('wallet_transactions').select('amount').eq('type', 'referral_bonus').eq('status', 'completed');
      if (matchedUserIds) qReferralEarnings = qReferralEarnings.in('user_id', matchedUserIds);

      let qRecentDeposits = supabase.from('wallet_transactions').select('id, amount, status, type, meta, created_at, user_id').in('type', ['deposit', 'subscription_payment', 'plan_purchase']).order('created_at', { ascending: false });
      if (matchedUserIds) qRecentDeposits = qRecentDeposits.in('user_id', matchedUserIds);
      qRecentDeposits = qRecentDeposits.limit(5);

      const [withdrawalsRes, postsRes, recentWithdrawalsRes, depositsRes, earningsPaidRes, referralEarningsRes, recentDepositsRes] = await Promise.all([
        qWithdrawals,
        qPosts,
        qRecentWithdrawals,
        qDeposits,
        qEarningsPaid,
        qReferralEarnings,
        qRecentDeposits,
      ]);

      // ── Set user counts ──
      if (regionView === 'all') {
        setTotalUsers(usersAllRes.count ?? 0);
      } else if (regionView === 'nigeria') {
        setTotalUsers(usersNgnRes.count ?? 0);
      } else {
        setTotalUsers(usersGlobalRes.count ?? 0);
      }
      setNigerianUsers(usersNgnRes.count ?? 0);
      setGlobalUsers(usersGlobalRes.count ?? 0);

      if (withdrawalsRes.data) {
        setPendingWithdrawalsCount(withdrawalsRes.data.length);
        const sum = withdrawalsRes.data.reduce((acc, tx) => acc + Number(tx.amount), 0);
        setPendingWithdrawalsSum(sum);
      }

      if (postsRes.count !== null) setActivePostsCount(postsRes.count);
      
      if (depositsRes.data) {
        const depSum = depositsRes.data.reduce((acc, tx) => acc + Number(tx.amount), 0);
        setTotalDeposits(depSum);
      }

      if (earningsPaidRes.data) {
        const earningsSum = earningsPaidRes.data.reduce((acc, tx) => acc + Number(tx.amount), 0);
        setTotalEarningsPaid(earningsSum);
      }

      if (referralEarningsRes.data) {
        const refSum = referralEarningsRes.data.reduce((acc, tx) => acc + Number(tx.amount), 0);
        setTotalReferralEarnings(refSum);
      }

      // Fetch profiles separately for recent lists
      const allUserIds = [
        ...(recentWithdrawalsRes.data || []).map(t => t.user_id),
        ...(recentDepositsRes.data || []).map(t => t.user_id),
      ].filter(Boolean);
      const uniqueUserIds = [...new Set(allUserIds)];
      let profileMap: Record<string, any> = {};
      if (uniqueUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, username, email')
          .in('user_id', uniqueUserIds);
        (profilesData || []).forEach((p: any) => { profileMap[p.user_id] = p; });
      }

      if (recentWithdrawalsRes.data) {
        setRecentWithdrawals(recentWithdrawalsRes.data.map(tx => ({ ...tx, profiles: profileMap[tx.user_id] || null })));
      }
      if (recentDepositsRes.data) {
        setRecentDeposits(recentDepositsRes.data.map(tx => ({ ...tx, profiles: profileMap[tx.user_id] || null })));
      }

    } catch (err) {
      console.error("Error fetching admin stats:", err);
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading) return <div className="p-10 text-center text-on-surface-variant">Loading admin check...</div>;
  if (!hasAccess) return <Navigate to="/dashboard" replace />;

  const timeAgo = (dateStr: string) => {
    const s = Math.floor((Date.now() - new Date(dateStr).getTime())/1000);
    if (s < 60) return `${Math.max(1, s)}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  const StatCard = ({ icon, label, value, subtitle, colorClass = 'text-primary', bgClass = 'bg-surface-container-lowest' }: { icon: string; label: string; value: string; subtitle: string; colorClass?: string; bgClass?: string }) => (
    <div className={`${bgClass} p-5 rounded-[1.25rem] border border-surface-container/30 shadow-sm`}>
      <div className={`w-10 h-10 rounded-xl ${colorClass}/10 flex items-center justify-center mb-3`}>
        <span className={`material-symbols-outlined text-[20px] ${colorClass}`}>{icon}</span>
      </div>
      <p className="text-on-surface-variant text-xs font-semibold mb-1">{label}</p>
      <h3 className="text-on-surface text-2xl font-black font-headline">{isLoading ? '...' : value}</h3>
      <p className={`text-[10px] font-bold mt-2 ${colorClass} uppercase tracking-wider`}>{subtitle}</p>
    </div>
  );

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-32">
      {/* Welcome Header */}
      <section className="mb-10">
        <div className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full mb-3">
          <span className="material-symbols-outlined text-sm">admin_panel_settings</span>
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">System Overview</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-on-surface tracking-tight mb-1 font-headline">Operations Overview</h1>
        <p className="text-on-surface-variant text-sm md:text-base">Monitoring platform health and transaction velocity.</p>
      </section>

      {/* ── Primary Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Users — Large accent card */}
        <div className="col-span-2 md:col-span-1 bg-primary-container p-6 rounded-[1.5rem] relative overflow-hidden group shadow-lg">
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white mb-4">
              <span className="material-symbols-outlined">group</span>
            </div>
            <p className="text-white/80 text-sm font-medium mb-1">Total Users</p>
            <h3 className="text-white text-3xl font-bold font-headline">{isLoading ? '...' : totalUsersCount.toLocaleString()}</h3>
            <div className="mt-4 flex items-center gap-2 text-primary-fixed text-xs font-bold">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>Live Database Count</span>
            </div>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
            <span className="material-symbols-outlined text-[120px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          </div>
        </div>

        <StatCard icon="flag" label="Nigerian Users" value={nigerianUsersCount.toLocaleString()} subtitle="🇳🇬 NGN Users" colorClass="text-emerald-600" />
        <StatCard icon="public" label="Non-Nigerian Users" value={globalUsersCount.toLocaleString()} subtitle="🌍 USD Users" colorClass="text-blue-600" />
        
        {/* Pending Withdrawals */}
        <div className="bg-surface-container-lowest p-5 rounded-[1.25rem] shadow-sm border border-error/10">
          <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-[20px] text-error">payments</span>
          </div>
          <p className="text-on-surface-variant text-xs font-semibold mb-1">Pending Withdrawals</p>
          <h3 className="text-on-surface text-2xl font-black font-headline">{symbol}{isLoading ? '...' : formatAdminAmount(pendingWithdrawalsSum)}</h3>
          <p className="text-[10px] font-bold mt-2 text-error uppercase tracking-wider">{pendingWithdrawalsCount} requests awaiting</p>
        </div>
      </div>

      {/* ── Financial Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <StatCard icon="account_balance_wallet" label="Total Revenue" value={`${symbol}${formatAdminAmount(totalDeposits)}`} subtitle="Deposits & Plans" colorClass="text-blue-600" />
        <StatCard icon="savings" label="Total Earnings Paid" value={`${symbol}${formatAdminAmount(totalEarningsPaid)}`} subtitle="All reward types" colorClass="text-amber-600" />
        <StatCard icon="hub" label="Referral Earnings" value={`${symbol}${formatAdminAmount(totalReferralEarnings)}`} subtitle="Referral bonuses" colorClass="text-violet-600" />
        <StatCard icon="post_add" label="Active Posts" value={activePostsCount.toLocaleString()} subtitle="Live articles" colorClass="text-primary" />
      </div>

      {/* ── Asymmetric Section: Pending Approvals & Quick Insights ── */}
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
              <div className="p-6 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-surface-container/30">No pending withdrawals.</div>
            ) : (
              recentWithdrawals.map(tx => (
                <div key={tx.id} className="bg-surface-container-lowest p-5 rounded-[1.2rem] flex items-center justify-between shadow-sm border border-surface-container/30 hover:border-primary/30 transition-all">
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
                    <p className="font-bold text-on-surface text-sm md:text-base">{symbol}{formatAdminAmount(Number(tx.amount))}</p>
                    <span className="inline-block px-2 py-0.5 md:px-3 md:py-1 bg-amber-500/10 text-amber-600 text-[10px] font-black rounded-full uppercase tracking-widest mt-1">Pending</span>
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
              <div className="p-6 text-center text-on-surface-variant bg-surface-container-lowest rounded-2xl border border-surface-container/30">No recent deposits.</div>
            ) : (
              recentDeposits.map(tx => (
                <div key={tx.id} className="bg-surface-container-lowest p-5 rounded-[1.2rem] flex items-center justify-between shadow-sm border border-surface-container/30 hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
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
                    <p className="font-black text-primary text-sm md:text-base">+{symbol}{formatAdminAmount(Number(tx.amount))}</p>
                    <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest mt-1">
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
          <div className="bg-inverse-surface p-6 rounded-[1.5rem] text-inverse-on-surface shadow-lg">
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
              <Link to="/admin/settings" className="flex flex-col items-center justify-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                <span className="material-symbols-outlined text-amber-400">tune</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-center">Settings</span>
              </Link>
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

          {/* User Distribution Card */}
          <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] border border-surface-container/30">
            <h4 className="font-bold text-on-surface text-sm mb-4">User Distribution</h4>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-on-surface-variant font-semibold">🇳🇬 Nigerian</span>
                  <span className="font-black text-on-surface">{nigerianUsersCount.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${totalUsersCount > 0 ? (nigerianUsersCount / (nigerianUsersCount + globalUsersCount)) * 100 : 0}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-on-surface-variant font-semibold">🌍 Non-Nigerian</span>
                  <span className="font-black text-on-surface">{globalUsersCount.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-surface-container-high rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${totalUsersCount > 0 ? (globalUsersCount / (nigerianUsersCount + globalUsersCount)) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
