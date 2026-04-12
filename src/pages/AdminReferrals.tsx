import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function AdminReferrals() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [referralsList, setReferralsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalCommissionsPaid: 0
  });

  useEffect(() => {
    if (isAdmin) {
      fetchReferrals();
    }
  }, [isAdmin, search]);

  async function fetchReferrals() {
    setIsLoading(true);
    try {
      // Get all referrals
      let query = supabase
        .from('referrals')
        .select(`
          created_at,
          referral_code_used,
          referrer:referrer_user_id(name, email, avatar_url),
          referred:referred_user_id(name, email, avatar_url, user_subscriptions(plan_id))
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      const { data } = await query;
      
      // Since inner joins across relationships with .or() search is complex in PostgREST without a view,
      // we do simple client sie filtering if there's a search term
      let filtered = data || [];
      if (search && data) {
        const s = search.toLowerCase();
        filtered = data.filter((r: any) => 
          r.referrer?.name?.toLowerCase().includes(s) || 
          r.referrer?.email?.toLowerCase().includes(s) ||
          r.referred?.name?.toLowerCase().includes(s) ||
          r.referred?.email?.toLowerCase().includes(s) ||
          r.referral_code_used?.toLowerCase().includes(s)
        );
      }
      
      setReferralsList(filtered);

      // Fetch absolute counts
      const counts = await supabase.from('referrals').select('id', { count: 'exact', head: true });
      
      // Fetch total commissions paid
      const commissions = await supabase.from('wallet_transactions')
        .select('amount')
        .eq('type', 'referral_bonus')
        .eq('status', 'completed');
        
      const totalPaid = commissions.data ? commissions.data.reduce((sum, tx) => sum + Number(tx.amount || 0), 0) : 0;

      setStats({
        totalReferrals: counts.count || 0,
        totalCommissionsPaid: totalPaid
      });

    } catch (err) {
      console.error('Error fetching referrals:', err);
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#dcfce7] text-[#006b3f] rounded-full mb-3">
            <span className="material-symbols-outlined text-sm">hub</span>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Growth Network</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0f172a] tracking-tight mb-1 font-headline">Referrals</h1>
          <p className="text-outline text-sm md:text-base">Monitor platform growth through user invites.</p>
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
         <div className="bg-white p-6 rounded-[2rem] border border-surface-container-low shadow-[0px_4px_20px_rgba(0,0,0,0.02)]">
            <span className="material-symbols-outlined text-[#0f172a] mb-2 block text-2xl">group_add</span>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Referrals Generated</p>
            <h3 className="text-3xl font-black font-headline text-on-surface">{stats.totalReferrals.toLocaleString()}</h3>
         </div>
         <div className="bg-white p-6 rounded-[2rem] border border-surface-container-low shadow-[0px_4px_20px_rgba(0,0,0,0.02)]">
            <span className="material-symbols-outlined text-emerald-600 mb-2 block text-2xl">payments</span>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Commissions Paid</p>
            <h3 className="text-3xl font-black font-headline text-emerald-700">₦{stats.totalCommissionsPaid.toLocaleString()}</h3>
         </div>
      </div>

      <div className="bg-transparent overflow-hidden">
        {isLoading ? (
          <div className="text-center py-10 text-on-surface-variant">Loading referrals...</div>
        ) : referralsList.length === 0 ? (
          <div className="text-center py-10 text-on-surface-variant bg-white rounded-3xl border border-surface-container-low">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">group_off</span>
            <p>No referrals found matching "{search}".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white rounded-full shadow-sm border border-surface-container-low text-[#49454f]">
                  <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em] rounded-l-full">REFERRER</th>
                  <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">REFERRED USER</th>
                  <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">CODE USED</th>
                  <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">SUBSCRIPTION</th>
                  <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em] text-right rounded-r-full">DATE</th>
                </tr>
              </thead>
              <tbody className="before:content-[''] before:block before:h-4 text-sm divide-y divide-surface-container/50">
                {referralsList.map((r, i) => {
                  const subData = r.referred?.user_subscriptions?.[0] || r.referred?.user_subscriptions || {};
                  const planId = subData.plan_id && subData.plan_id !== 'free' ? subData.plan_id.toUpperCase() : 'FREE PLAN';
                  const isActive = subData.plan_id && subData.plan_id !== 'free';

                  return (
                    <tr key={i} className="hover:bg-black/5 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="font-semibold text-on-surface">{r.referrer?.name || 'Unknown'}</span>
                          <span className="text-xs text-outline">{r.referrer?.email || 'No email'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <img 
                            className="w-8 h-8 rounded-full bg-surface-container" 
                            src={r.referred?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${r.referred?.name || 'User'}`} 
                            alt="avatar" 
                          />
                          <div className="flex flex-col">
                            <span className="font-semibold text-on-surface">{r.referred?.name || 'Unknown'}</span>
                            <span className="text-xs text-outline">{r.referred?.email || 'No email'}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex px-2 py-1 bg-surface-container text-on-surface-variant font-mono text-xs rounded uppercase font-bold">
                          {r.referral_code_used}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-variant text-on-surface-variant'}`}>
                          {planId}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right text-on-surface-variant">
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
    </main>
  );
}
