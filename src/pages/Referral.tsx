import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrency } from '../hooks/useCurrency';

export function Referral() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const { formatAmount } = useCurrency();
  const [copied, setCopied] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [activeTier, setActiveTier] = useState<1 | 2 | 3>(1);

  // ─── TanStack Query — cached, retried, never infinite ──────────────
  const { data: referralData, isLoading } = useQuery({
    queryKey: ['referrals', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');

      const [walletRes, bonusTxRes] = await Promise.all([
        supabase.from('wallet_balances').select('referral_earnings').eq('user_id', user.id).maybeSingle(),
        supabase.from('wallet_transactions').select('amount, meta').eq('user_id', user.id).eq('type', 'referral_bonus'),
      ]);

      const earnings = walletRes.data?.referral_earnings || 0;

      // Per-user earnings map
      const perUserEarnings: Record<string, number> = {};
      (bonusTxRes.data || []).forEach((tx: any) => {
        const refId = tx.meta?.referred_user_id;
        if (refId) perUserEarnings[refId] = (perUserEarnings[refId] || 0) + Number(tx.amount || 0);
      });

      // Tier 1 Fetch
      const { data: t1Data } = await supabase.from('referrals')
          .select(`created_at, referred_user_id, profiles:profiles!referrals_referred_user_id_fkey(name, avatar_url, status)`)
          .eq('referrer_user_id', user.id).order('created_at', { ascending: false });
          
      let t1 = t1Data || [];
      let t2: any[] = [];
      let t3: any[] = [];

      if (t1.length > 0) {
         const t1Ids = t1.map(r => r.referred_user_id).filter(Boolean);
         if (t1Ids.length > 0) {
            const { data: t2Data } = await supabase.from('referrals')
              .select(`created_at, referred_user_id, referrer_user_id, profiles:profiles!referrals_referred_user_id_fkey(name, avatar_url, status)`)
              .in('referrer_user_id', t1Ids).order('created_at', { ascending: false });
            t2 = t2Data || [];
            
            if (t2.length > 0) {
               const t2Ids = t2.map(r => r.referred_user_id).filter(Boolean);
               if (t2Ids.length > 0) {
                  const { data: t3Data } = await supabase.from('referrals')
                    .select(`created_at, referred_user_id, referrer_user_id, profiles:profiles!referrals_referred_user_id_fkey(name, avatar_url, status)`)
                    .in('referrer_user_id', t2Ids).order('created_at', { ascending: false });
                  t3 = t3Data || [];
               }
            }
         }
      }

      // Enrich referrals with subscription data
      const allIds = [...t1.map(r=>r.referred_user_id), ...t2.map(r=>r.referred_user_id), ...t3.map(r=>r.referred_user_id)].filter(Boolean);
      
      const subsMap: Record<string, string> = {};
      if (allIds.length > 0) {
        const { data: subsData } = await supabase.from('user_subscriptions').select('user_id, plan_id').in('user_id', allIds);
        (subsData || []).forEach((s: any) => { subsMap[s.user_id] = s.plan_id; });
      }

      const enrich = (refs: any[]) => refs.map((r: any) => ({ ...r, plan_id: subsMap[r.referred_user_id] || 'free' }));

      return { 
        earnings, 
        perUserEarnings, 
        tier1: enrich(t1), 
        tier2: enrich(t2), 
        tier3: enrich(t3),
        totalReferrals: t1.length + t2.length + t3.length
      };
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const earnings = referralData?.earnings || 0;
  const perUserEarnings = referralData?.perUserEarnings || {};
  const t1List = referralData?.tier1 || [];
  const t2List = referralData?.tier2 || [];
  const t3List = referralData?.tier3 || [];
  const totalCount = referralData?.totalReferrals || 0;

  // ─── Real-time: invalidate cache for new referrals & wallet changes ──
  useEffect(() => {
    if (!user?.id) return;

    const refCh = supabase.channel(`ref-rt-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'referrals', filter: `referrer_user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['referrals', user.id] }))
      .subscribe();

    const walletCh = supabase.channel(`ref-wallet-rt-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_balances', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['referrals', user.id] }))
      .subscribe();

    const txCh = supabase.channel(`ref-tx-rt-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_transactions', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['referrals', user.id] }))
      .subscribe();

    return () => {
      supabase.removeChannel(refCh);
      supabase.removeChannel(walletCh);
      supabase.removeChannel(txCh);
    };
  }, [user?.id, queryClient]);


  const referralCode = profile?.referral_code || 'Loading...';
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  const copyToClipboard = () => {
    if (!referralCode || referralCode === 'Loading...') return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=Join%20JobbaWorks%20and%20start%20earning!%20Sign%20up%20here:%20${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=Join%20me%20on%20JobbaWorks%20and%20earn%20for%20reading!&url=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const genericShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'JobbaWorks',
          text: 'Join me on JobbaWorks and start earning!',
          url: referralLink,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      copyToClipboard();
    }
  };

  const activeList = activeTier === 1 ? t1List : activeTier === 2 ? t2List : t3List;
  const displayedReferrals = activeList.slice(0, visibleCount);

  if (isLoading && !referralData) {
    return <div className="min-h-screen bg-surface" />;
  }

  return (
    <div className="bg-surface font-body text-on-surface selection:bg-primary-fixed-dim min-h-screen">
      <main className="pt-8 pb-32 px-4 max-w-2xl mx-auto space-y-6">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-container p-6 text-on-primary-container shadow-xl">
          <div className="relative z-10 space-y-2">
            <h2 className="font-headline text-3xl font-extrabold leading-tight">Share the Wealth, Get Paid Forever.</h2>
            <p className="text-emerald-50/80 text-sm font-medium leading-relaxed">
              Refer your friends to JobbaWorks and earn a massive{' '}
              <span className="text-tertiary-fixed-dim font-bold">25% commission</span> every time they upgrade.
            </p>
            <div className="pt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wider">
                Unlimited Earnings
              </span>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/15 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                Live Data
              </span>
            </div>
          </div>
          {/* Decorative Pattern */}
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[12rem]" style={{ fontVariationSettings: "'FILL' 1" }}>
              celebration
            </span>
          </div>
        </section>

        {/* Referral Code Card */}
        <section className="bg-surface-container-lowest p-6 rounded-3xl shadow-[0px_20px_40px_rgba(0,33,16,0.06)] space-y-4 border border-surface-container-highest/20">
          <div className="flex flex-col items-center text-center space-y-2">
            <p className="text-on-surface-variant font-semibold text-xs uppercase tracking-widest">Your Unique Invite Link</p>
            <div className="bg-surface-container w-full py-4 rounded-2xl flex items-center justify-between px-6 border-2 border-dashed border-outline-variant/30 flex-wrap gap-2">
              <span className="text-sm md:text-base font-black text-emerald-900 font-headline tracking-tighter truncate max-w-[200px] md:max-w-[400px]">
                {referralLink}
              </span>
              <button 
                onClick={copyToClipboard}
                className={`flex items-center gap-2 font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 ${
                  copied ? 'text-emerald-600 bg-emerald-50' : 'text-primary hover:bg-primary-fixed-dim/10'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <p className="text-center text-xs text-on-surface-variant font-medium">Share via social media</p>
            <div className="flex justify-center gap-4">
              <button onClick={shareOnWhatsApp} className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all shadow-sm hover:shadow-md hover:scale-105">
                <span className="material-symbols-outlined">chat</span>
              </button>
              <button onClick={shareOnTwitter} className="w-12 h-12 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white transition-all shadow-sm hover:shadow-md hover:scale-105">
                <span className="material-symbols-outlined">share</span>
              </button>
              <button onClick={genericShare} className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-on-surface hover:text-white transition-all shadow-sm hover:shadow-md hover:scale-105">
                <span className="material-symbols-outlined">more_horiz</span>
              </button>
            </div>
          </div>
        </section>

        {/* Statistics Bento Grid — LIVE */}
        <section className="grid grid-cols-2 gap-4">
          <div className="col-span-2 bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-transparent relative overflow-hidden">
            <div className="absolute top-2 right-3">
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-primary uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                Live
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  payments
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total Referral Earnings</p>
                <h3 className="text-xl font-black text-emerald-900 font-headline">
                  {formatAmount(earnings)}
                </h3>
              </div>
            </div>
          </div>
          <div className="col-span-2 bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-surface-container-highest/20">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Referrers</p>
            <div className="flex items-baseline gap-1 pt-1">
              <span className="text-2xl font-black text-emerald-900 font-headline">{totalCount}</span>
              <span className="text-xs text-on-surface-variant font-medium">people referred</span>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm space-y-6 border border-surface-container-highest/20">
          <h3 className="font-headline font-bold text-lg text-emerald-900">How to Earn</h3>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm">Invite Friends</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Share your link with friends, family, or your social media followers.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm">They Purchase A Plan</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Your referrals upgrade their account subscriptions in the platform.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm">You Get 25%</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Get 25% of their plan price credited instantly to your wallet. Every single time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Referral List — with tabs */}
        <section className="space-y-4 pb-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-headline font-bold text-lg text-emerald-900">Your Referrals</h3>
            <span className="text-xs text-on-surface-variant font-bold">{totalCount} total</span>
          </div>
          
          {/* TIER TABS */}
          <div className="flex gap-2 border-b border-surface-container-highest/30 pb-2 overflow-x-auto disabled-scrollbar">
             <button 
               onClick={() => { setActiveTier(1); setVisibleCount(10); }}
               className={`shrink-0 px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTier === 1 ? 'bg-primary text-white shadow-md' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'}`}
             >
               Tier 1 <span className="opacity-75 text-xs ml-1">({t1List.length})</span>
             </button>
             <button 
               onClick={() => { setActiveTier(2); setVisibleCount(10); }}
               className={`shrink-0 px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTier === 2 ? 'bg-primary text-white shadow-md' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'}`}
             >
               Tier 2 <span className="opacity-75 text-xs ml-1">({t2List.length})</span>
             </button>
             <button 
               onClick={() => { setActiveTier(3); setVisibleCount(10); }}
               className={`shrink-0 px-5 py-2 rounded-xl text-sm font-bold transition-all ${activeTier === 3 ? 'bg-primary text-white shadow-md' : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'}`}
             >
               Tier 3 <span className="opacity-75 text-xs ml-1">({t3List.length})</span>
             </button>
          </div>

          <div className="space-y-3 pt-2">
            {displayedReferrals.length === 0 ? (
               <div className="text-center bg-surface-container-lowest p-8 border border-dashed border-outline-variant/30 rounded-2xl">
                 <span className="material-symbols-outlined text-4xl text-on-surface-variant/30 mb-2 block">group_off</span>
                 <p className="text-on-surface-variant font-medium mb-1">
                   No referrals found in Tier {activeTier}.
                 </p>
                 {activeTier === 1 && <p className="text-xs text-on-surface-variant">Share your link above to start!</p>}
               </div>
            ) : (
              displayedReferrals.map((ref: any, index: number) => {
                const profileData = ref.profiles?.[0] || ref.profiles || {};
                const planId = ref.plan_id && ref.plan_id !== 'free' ? ref.plan_id.toUpperCase() : 'FREE PLAN';
                const isActive = ref.plan_id && ref.plan_id !== 'free';
                const rewardVal = perUserEarnings[ref.referred_user_id] || 0;
                
                return (
                  <div
                    key={ref.referred_user_id || index}
                    className="bg-white p-4 rounded-2xl flex items-center justify-between border border-surface-container-highest/30 shadow-[0px_4px_12px_rgba(0,0,0,0.02)]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full overflow-hidden border border-surface-container-highest shadow-sm">
                          <img
                            alt={profileData.name}
                            className="w-full h-full object-cover"
                            src={profileData.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${profileData.name || 'user'}`}
                          />
                        </div>
                      </div>
                      <div>
                        <p className="font-bold text-base md:text-lg text-on-surface leading-tight mb-1">{profileData.name || 'Unknown User'}</p>
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                          <span className="text-[11px] md:text-xs font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                             {planId} <span className="opacity-50">•</span> DOWNLINE
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-1 leading-tight">REWARD</p>
                      <p className="font-black text-emerald-800 text-lg md:text-xl font-headline leading-tight">{formatAmount(rewardVal)}</p>
                    </div>
                  </div>
                );
              })
            )}

            {activeList.length > visibleCount && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={() => setVisibleCount((prev) => prev + 10)}
                  className="bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant font-bold text-sm px-6 py-2.5 rounded-full transition-colors flex items-center justify-center gap-2"
                >
                  View More
                  <span className="material-symbols-outlined text-[16px]">expand_more</span>
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
