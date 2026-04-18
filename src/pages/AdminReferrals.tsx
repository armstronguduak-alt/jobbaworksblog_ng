import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function AdminReferrals() {
  const { isAdmin, isModerator, permissions, isLoading: authLoading } = useAuth();
  const hasAccess = isAdmin || (isModerator && permissions.includes('referrals'));
  const [referralsList, setReferralsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalCommissionsPaid: 0,
    pendingCommissions: 0,
    activeReferrals: 0,
    freeReferrals: 0,
    topReferrers: [] as { name: string; count: number; avatar_url: string }[],
    thisMonthReferrals: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    if (hasAccess) {
      fetchReferrals();
    }
  }, [hasAccess, search]);

  async function fetchReferrals() {
    setIsLoading(true);
    try {
      // Step 1: Get all referrals without FK joins
      const { data: rawReferrals } = await supabase
        .from('referrals')
        .select('created_at, referral_code_used, referred_user_id, referrer_user_id')
        .order('created_at', { ascending: false })
        .limit(200);

      const allRefs = rawReferrals || [];

      // Step 2: Get all unique user IDs (referrers + referred)
      const allUserIds = [...new Set([
        ...allRefs.map(r => r.referrer_user_id),
        ...allRefs.map(r => r.referred_user_id),
      ].filter(Boolean))];

      // Step 3: Fetch profiles separately
      let profileMap: Record<string, any> = {};
      if (allUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, email, avatar_url')
          .in('user_id', allUserIds);
        (profilesData || []).forEach((p: any) => { profileMap[p.user_id] = p; });
      }

      // Step 4: Fetch subscriptions for referred users
      const referredUserIds = allRefs.map(r => r.referred_user_id).filter(Boolean);
      let subsMap: Record<string, string> = {};
      if (referredUserIds.length > 0) {
        const { data: subsData } = await supabase
          .from('user_subscriptions')
          .select('user_id, plan_id')
          .in('user_id', referredUserIds);
        (subsData || []).forEach((s: any) => { subsMap[s.user_id] = s.plan_id; });
      }

      // Enrich data
      let enriched = allRefs.map(r => ({
        ...r,
        referrer: profileMap[r.referrer_user_id] || null,
        referred: profileMap[r.referred_user_id] || null,
        plan_id: subsMap[r.referred_user_id] || 'free',
      }));

      // Client-side search filtering
      if (search) {
        const s = search.toLowerCase();
        enriched = enriched.filter(r => 
          r.referrer?.name?.toLowerCase().includes(s) || 
          r.referrer?.email?.toLowerCase().includes(s) ||
          r.referred?.name?.toLowerCase().includes(s) ||
          r.referred?.email?.toLowerCase().includes(s) ||
          r.referral_code_used?.toLowerCase().includes(s)
        );
      }
      
      setReferralsList(enriched);

      // --- Analytics ---
      // Total referrals count
      const { count: totalCount } = await supabase.from('referrals').select('id', { count: 'exact', head: true });

      // Commissions
      const [completedComm, pendingComm] = await Promise.all([
        supabase.from('wallet_transactions').select('amount').eq('type', 'referral_bonus').eq('status', 'completed'),
        supabase.from('wallet_transactions').select('amount').eq('type', 'referral_bonus').eq('status', 'pending'),
      ]);
      const totalPaid = (completedComm.data || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
      const totalPending = (pendingComm.data || []).reduce((sum, tx) => sum + Number(tx.amount || 0), 0);

      // Active vs Free referrals
      const activeCount = enriched.filter(r => r.plan_id && r.plan_id !== 'free').length;
      const freeCount = enriched.filter(r => !r.plan_id || r.plan_id === 'free').length;

      // This month referrals
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const thisMonthCount = allRefs.filter(r => r.created_at >= monthStart).length;

      // Conversion rate (referred users who upgraded)
      const convRate = allRefs.length > 0 ? Math.round((activeCount / allRefs.length) * 100) : 0;

      // Top referrers
      const referrerCountMap: Record<string, number> = {};
      allRefs.forEach(r => {
        referrerCountMap[r.referrer_user_id] = (referrerCountMap[r.referrer_user_id] || 0) + 1;
      });
      const topReferrers = Object.entries(referrerCountMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([userId, count]) => ({
          name: profileMap[userId]?.name || 'Unknown',
          avatar_url: profileMap[userId]?.avatar_url || '',
          count,
        }));

      setStats({
        totalReferrals: totalCount || 0,
        totalCommissionsPaid: totalPaid,
        pendingCommissions: totalPending,
        activeReferrals: activeCount,
        freeReferrals: freeCount,
        topReferrers,
        thisMonthReferrals: thisMonthCount,
        conversionRate: convRate,
      });

    } catch (err) {
      console.error('Error fetching referrals:', err);
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!hasAccess) return <Navigate to="/dashboard" replace />;

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#dcfce7] text-[#006b3f] rounded-full mb-3">
            <span className="material-symbols-outlined text-sm">hub</span>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Growth Network</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0f172a] tracking-tight mb-1 font-headline">Referrals Management</h1>
          <p className="text-outline text-sm md:text-base">Monitor platform growth through user invites and commissions.</p>
        </div>
        <div className="relative w-full md:w-[320px]">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Search users or codes..." 
            className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm border border-surface-container-low shadow-sm focus:ring-2 focus:ring-primary outline-none transition-shadow"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-surface-container-low shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[20px] text-blue-600">group_add</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Referrals</span>
          </div>
          <p className="text-2xl font-black text-slate-900 font-headline">{stats.totalReferrals.toLocaleString()}</p>
          <p className="text-xs text-blue-600 font-medium mt-1">+{stats.thisMonthReferrals} this month</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-surface-container-low shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[20px] text-emerald-600">payments</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Commissions Paid</span>
          </div>
          <p className="text-2xl font-black text-emerald-700 font-headline">${stats.totalCommissionsPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          {stats.pendingCommissions > 0 && (
            <p className="text-xs text-amber-600 font-medium mt-1">${stats.pendingCommissions.toFixed(2)} pending</p>
          )}
        </div>
        <div className="bg-white p-5 rounded-2xl border border-surface-container-low shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[20px] text-violet-600">trending_up</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Conversion Rate</span>
          </div>
          <p className="text-2xl font-black text-violet-700 font-headline">{stats.conversionRate}%</p>
          <p className="text-xs text-slate-500 font-medium mt-1">{stats.activeReferrals} upgraded · {stats.freeReferrals} free</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-surface-container-low shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-[20px] text-amber-600">workspace_premium</span>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Paid Referrals</span>
          </div>
          <p className="text-2xl font-black text-amber-700 font-headline">{stats.activeReferrals}</p>
          <p className="text-xs text-slate-500 font-medium mt-1">out of {stats.totalReferrals} total</p>
        </div>
      </div>

      {/* Top Referrers + Table */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Top Referrers Sidebar */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-xl">
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-[18px]">emoji_events</span>
              Top Referrers
            </h3>
            <div className="space-y-3">
              {stats.topReferrers.length === 0 ? (
                <p className="text-xs text-white/50">No data yet</p>
              ) : (
                stats.topReferrers.map((tr, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                      i === 0 ? 'bg-amber-400 text-amber-900' :
                      i === 1 ? 'bg-slate-300 text-slate-700' :
                      i === 2 ? 'bg-amber-700 text-amber-100' :
                      'bg-white/10 text-white/60'
                    }`}>{i + 1}</span>
                    <img 
                      src={tr.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${tr.name}`}
                      className="w-7 h-7 rounded-full bg-white/10 object-cover"
                      alt={tr.name}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{tr.name}</p>
                    </div>
                    <span className="text-xs font-black text-emerald-400">{tr.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main Table */}
        <div className="flex-1 min-w-0">
          <div className="bg-transparent overflow-hidden">
            {isLoading ? (
              <div className="text-center py-10 text-on-surface-variant">Loading referrals...</div>
            ) : referralsList.length === 0 ? (
              <div className="text-center py-10 text-on-surface-variant bg-white rounded-3xl border border-surface-container-low">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">group_off</span>
                <p>No referrals found{search ? ` matching "${search}"` : ''}.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-white rounded-full shadow-sm border border-surface-container-low text-[#49454f]">
                      <th className="py-4 px-5 font-black text-[10px] md:text-xs uppercase tracking-[0.15em] rounded-l-full">REFERRER</th>
                      <th className="py-4 px-5 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">REFERRED USER</th>
                      <th className="py-4 px-5 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">CODE</th>
                      <th className="py-4 px-5 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">PLAN</th>
                      <th className="py-4 px-5 font-black text-[10px] md:text-xs uppercase tracking-[0.15em] text-right rounded-r-full">DATE</th>
                    </tr>
                  </thead>
                  <tbody className="before:content-[''] before:block before:h-3 text-sm divide-y divide-surface-container/50">
                    {referralsList.map((r, i) => {
                      const planId = r.plan_id && r.plan_id !== 'free' ? r.plan_id.toUpperCase() : 'FREE';
                      const isActive = r.plan_id && r.plan_id !== 'free';

                      return (
                        <tr key={i} className="hover:bg-black/5 transition-colors">
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-2.5">
                              <img 
                                className="w-7 h-7 rounded-full bg-surface-container object-cover" 
                                src={r.referrer?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${r.referrer?.name || 'User'}`} 
                                alt="" 
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-on-surface text-xs truncate">{r.referrer?.name || 'Unknown'}</span>
                                <span className="text-[10px] text-outline truncate">{r.referrer?.email || ''}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-5">
                            <div className="flex items-center gap-2.5">
                              <img 
                                className="w-7 h-7 rounded-full bg-surface-container object-cover" 
                                src={r.referred?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${r.referred?.name || 'User'}`} 
                                alt="" 
                              />
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-on-surface text-xs truncate">{r.referred?.name || 'Unknown'}</span>
                                <span className="text-[10px] text-outline truncate">{r.referred?.email || ''}</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-5">
                            <span className="inline-flex px-2 py-0.5 bg-surface-container text-on-surface-variant font-mono text-[10px] rounded uppercase font-bold">
                              {r.referral_code_used || '—'}
                            </span>
                          </td>
                          <td className="py-3 px-5">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-variant text-on-surface-variant'}`}>
                              {planId}
                            </span>
                          </td>
                          <td className="py-3 px-5 text-right text-on-surface-variant text-xs">
                            {new Date(r.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
