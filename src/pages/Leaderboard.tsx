import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function Leaderboard() {
  const { user } = useAuth();
  const [topEarners, setTopEarners] = useState<any[]>([]);
  const [referralKings, setReferralKings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly' | 'all-time'>('weekly');
  const [userRankData, setUserRankData] = useState<any>(null);
  const [showFullList, setShowFullList] = useState(false);

  useEffect(() => {
    fetchLeaderboard();
  }, [timeRange]);

  // Real-time subscription for leaderboard changes
  useEffect(() => {
    const channel = supabase
      .channel(`leaderboard-realtime-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_balances' },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchLeaderboard() {
    try {
      setIsLoading(true);
      // We use the RPC to securely bypass RLS and fetch the un-obscured global leaderboard!
      const { data, error } = await supabase.rpc('get_leaderboard', { _limit: 100 });

      if (!error && data) {
        setTopEarners(data);
        
        // Find current user's rank block
        if (user) {
          const rankMatch = data.find((d: any) => d.user_id === user.id);
          if (rankMatch) setUserRankData(rankMatch);
        }
        
        // Sort by referral earnings for sidebar (ignoring 0)
        const refSorted = [...data].sort((a, b) => (b.referral_earnings || 0) - (a.referral_earnings || 0)).filter(d => (d.referral_earnings || 0) > 0).slice(0, 5);
        setReferralKings(refSorted);
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setIsLoading(false);
    }
  }

  // Helper formatting
  const formatMoney = (val: number) => {
    if (val >= 1000000) return `₦${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `₦${Math.floor(val / 1000)}k`;
    return `₦${val.toLocaleString()}`;
  };

  return (
    <div className="bg-surface text-on-surface font-body min-h-[calc(100vh-80px)] selection:bg-primary-fixed-dim selection:text-on-primary-fixed pt-6 pb-32">
      <main className="max-w-5xl mx-auto px-4 md:px-6 flex flex-col items-center">
        
        {/* Editorial Header */}
        <section className="mb-10 w-full">
          <span className="text-primary font-bold tracking-widest text-xs uppercase mb-2 block">Rankings</span>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-on-surface leading-none">
              Wall of <span className="text-primary">Wealth.</span>
            </h2>
            {/* Toggle Pills */}
            <div className="bg-surface-container p-1.5 rounded-xl flex gap-1 w-fit self-start">
              {(['daily', 'weekly', 'all-time'] as const).map((tab) => (
                <button 
                  key={tab}
                  onClick={() => setTimeRange(tab)}
                  className={`px-6 py-2 font-bold rounded-lg text-sm transition-all capitalize ${
                    timeRange === tab 
                      ? 'bg-surface-container-lowest text-primary shadow-sm' 
                      : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {tab.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="p-12 text-center w-full">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-on-surface-variant font-medium">Fetching Rankings...</p>
          </div>
        ) : topEarners.length > 0 ? (
          <>
            {/* Top 3 Asymmetric Card Podium */}
            {topEarners.length >= 3 && (
              <>
                {/* ── DESKTOP PODIUM (unchanged) ── */}
                <div className="hidden md:grid md:grid-cols-3 gap-6 mb-16 items-end w-full">
                
                  {/* Rank 2 */}
                  <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-[0px_20px_40px_rgba(0,33,16,0.04)] border-b-4 border-secondary/20 relative overflow-hidden h-fit">
                    <div className="absolute top-4 right-4 text-4xl font-black text-secondary/10">2</div>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-20 h-20 rounded-full border-4 border-secondary-container mb-4 overflow-hidden">
                        <img 
                          src={topEarners[1].avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${topEarners[1].name || 'R2'}`} 
                          className="w-full h-full object-cover" alt="Rank 2"
                        />
                      </div>
                      <h3 className="font-headline font-bold text-lg text-on-surface">{topEarners[1].name}</h3>
                      <p className="text-secondary font-medium text-sm mb-4">@{topEarners[1].username || 'user'}</p>
                      <div className="bg-secondary-container text-on-secondary-container px-4 py-1 rounded-full font-bold text-sm">
                        {formatMoney(topEarners[1].total_earnings)}
                      </div>
                    </div>
                  </div>

                  {/* Rank 1 - Hero Card */}
                  <div className="primary-gradient p-10 rounded-[2.5rem] shadow-[0px_30px_60px_rgba(0,107,63,0.15)] relative overflow-hidden -translate-y-8" style={{background: 'linear-gradient(135deg, #006b3f 0%, #008751 100%)'}}>
                    <div className="absolute top-6 right-6 text-6xl font-black text-white/10">1</div>
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                    <div className="flex flex-col items-center text-center relative z-10">
                      <div className="relative mb-6">
                        <div className="w-28 h-28 rounded-full border-4 border-tertiary-fixed mb-1 overflow-hidden">
                          <img 
                            src={topEarners[0].avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${topEarners[0].name || 'R1'}`} 
                            className="w-full h-full object-cover" alt="Rank 1"
                          />
                        </div>
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-tertiary-fixed text-on-tertiary-fixed px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                          King
                        </div>
                      </div>
                      <h3 className="font-headline font-extrabold text-2xl text-white">{topEarners[0].name}</h3>
                      <p className="text-primary-fixed/80 font-medium text-base mb-6">@{topEarners[0].username || 'user'}</p>
                      <div className="bg-white/20 backdrop-blur-md text-white px-6 py-2 rounded-2xl font-black text-xl border border-white/10">
                        {formatMoney(topEarners[0].total_earnings)}
                      </div>
                    </div>
                  </div>

                  {/* Rank 3 */}
                  <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-[0px_20px_40px_rgba(0,33,16,0.04)] border-b-4 border-outline-variant/20 relative overflow-hidden h-fit">
                    <div className="absolute top-4 right-4 text-4xl font-black text-outline-variant/20">3</div>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-20 h-20 rounded-full border-4 border-surface-container-high mb-4 overflow-hidden">
                        <img 
                          src={topEarners[2].avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${topEarners[2].name || 'R3'}`} 
                          className="w-full h-full object-cover" alt="Rank 3"
                        />
                      </div>
                      <h3 className="font-headline font-bold text-lg text-on-surface">{topEarners[2].name}</h3>
                      <p className="text-on-surface-variant font-medium text-sm mb-4">@{topEarners[2].username || 'user'}</p>
                      <div className="bg-surface-container-high text-on-surface-variant px-4 py-1 rounded-full font-bold text-sm">
                        {formatMoney(topEarners[2].total_earnings)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── MOBILE PODIUM (rectangular stacked cards) ── */}
                <div className="md:hidden flex flex-col gap-3 mb-10 w-full px-1">
                  
                  {/* Rank 1 — tallest card */}
                  <div className="relative rounded-[1.5rem] overflow-hidden shadow-[0px_16px_32px_rgba(0,107,63,0.15)]" style={{background: 'linear-gradient(135deg, #006b3f 0%, #008751 100%)'}}>
                    <div className="absolute top-3 right-4 text-5xl font-black text-white/10">1</div>
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-3xl"></div>
                    <div className="flex items-center gap-4 px-5 py-5 relative z-10">
                      <div className="relative shrink-0">
                        <div className="w-16 h-16 rounded-full border-[3px] border-tertiary-fixed overflow-hidden">
                          <img 
                            src={topEarners[0].avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${topEarners[0].name || 'R1'}`} 
                            className="w-full h-full object-cover" alt="Rank 1"
                          />
                        </div>
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-tertiary-fixed text-on-tertiary-fixed px-2 py-px rounded-full text-[8px] font-black uppercase tracking-widest shadow-md whitespace-nowrap">
                          King
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-headline font-extrabold text-lg text-white leading-tight truncate">{topEarners[0].name}</h3>
                        <p className="text-primary-fixed/70 text-xs font-medium">@{topEarners[0].username || 'user'}</p>
                      </div>
                      <div className="bg-white/20 backdrop-blur-sm text-white px-4 py-1.5 rounded-xl font-black text-base border border-white/10 shrink-0">
                        {formatMoney(topEarners[0].total_earnings)}
                      </div>
                    </div>
                  </div>

                  {/* Rank 2 & 3 side by side — shorter cards */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Rank 2 */}
                    <div className="bg-surface-container-lowest rounded-[1.25rem] p-4 shadow-[0px_8px_20px_rgba(0,33,16,0.04)] border-b-[3px] border-secondary/20 relative overflow-hidden">
                      <div className="absolute top-2 right-3 text-3xl font-black text-secondary/10">2</div>
                      <div className="flex flex-col items-center text-center gap-2">
                        <div className="w-12 h-12 rounded-full border-[3px] border-secondary-container overflow-hidden">
                          <img 
                            src={topEarners[1].avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${topEarners[1].name || 'R2'}`} 
                            className="w-full h-full object-cover" alt="Rank 2"
                          />
                        </div>
                        <div>
                          <h3 className="font-headline font-bold text-sm text-on-surface leading-tight truncate max-w-[120px]">{topEarners[1].name}</h3>
                          <p className="text-secondary text-[10px] font-medium">@{topEarners[1].username || 'user'}</p>
                        </div>
                        <div className="bg-secondary-container text-on-secondary-container px-3 py-0.5 rounded-full font-bold text-xs">
                          {formatMoney(topEarners[1].total_earnings)}
                        </div>
                      </div>
                    </div>

                    {/* Rank 3 */}
                    <div className="bg-surface-container-lowest rounded-[1.25rem] p-4 shadow-[0px_8px_20px_rgba(0,33,16,0.04)] border-b-[3px] border-outline-variant/20 relative overflow-hidden">
                      <div className="absolute top-2 right-3 text-3xl font-black text-outline-variant/15">3</div>
                      <div className="flex flex-col items-center text-center gap-2">
                        <div className="w-12 h-12 rounded-full border-[3px] border-surface-container-high overflow-hidden">
                          <img 
                            src={topEarners[2].avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${topEarners[2].name || 'R3'}`} 
                            className="w-full h-full object-cover" alt="Rank 3"
                          />
                        </div>
                        <div>
                          <h3 className="font-headline font-bold text-sm text-on-surface leading-tight truncate max-w-[120px]">{topEarners[2].name}</h3>
                          <p className="text-on-surface-variant text-[10px] font-medium">@{topEarners[2].username || 'user'}</p>
                        </div>
                        <div className="bg-surface-container-high text-on-surface-variant px-3 py-0.5 rounded-full font-bold text-xs">
                          {formatMoney(topEarners[2].total_earnings)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* List and Personal Ranking Grid */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-4">
              
              {/* Main List Box */}
              <div className="lg:col-span-7 space-y-4">
                {/* Users 4+ */}
                {topEarners.slice(topEarners.length >= 3 ? 3 : 0, showFullList ? 100 : 10).map((earner, idx) => {
                  const rankNum = topEarners.length >= 3 ? idx + 4 : idx + 1;
                  return (
                   <div key={earner.user_id} className="bg-white px-5 py-4 rounded-[1.25rem] flex items-center gap-4 shadow-[0px_4px_12px_rgba(0,0,0,0.02)]">
                     <span className="font-headline font-black text-outline/60 text-lg w-5 text-right">{rankNum}</span>
                     <img 
                        src={earner.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${earner.name}`} 
                        className="w-12 h-12 rounded-full object-cover shadow-sm bg-surface-container shrink-0" 
                        alt="avatar" 
                      />
                     <div className="flex-1 min-w-0">
                       <p className="font-bold text-on-surface text-[15px] leading-tight mb-0.5 truncate">{earner.name}</p>
                       <p className="text-outline text-[11px] font-medium leading-tight truncate">@{earner.username || 'user'}</p>
                     </div>
                     <div className="font-extrabold text-on-surface text-base shrink-0">
                       {formatMoney(earner.total_earnings || 0)}
                     </div>
                   </div>
                  );
                })}

                {/* View More / Show Less button */}
                {topEarners.length > 10 && (
                  <button
                    onClick={() => setShowFullList(!showFullList)}
                    className="w-full py-3 bg-surface-container-lowest hover:bg-surface-container-low rounded-[1.25rem] font-bold text-primary text-sm flex items-center justify-center gap-2 transition-colors shadow-sm border border-surface-container-highest/20"
                  >
                    <span className="material-symbols-outlined text-[18px]">{showFullList ? 'expand_less' : 'expand_more'}</span>
                    {showFullList ? 'Show Less' : `View Full Top ${Math.min(topEarners.length, 100)} Rankings`}
                  </button>
                )}
              </div>

              {/* Sidebars */}
              <div className="lg:col-span-5 space-y-6">
                
                {/* Personal Rank Block */}
                {user && userRankData && (
                  <div className="bg-gradient-to-r from-[#006b3f] to-[#008751] px-6 py-6 rounded-[1.5rem] flex items-center gap-4 shadow-[0px_10px_20px_rgba(0,107,63,0.15)] text-white relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full -translate-y-8 translate-x-8 blur-2xl"></div>
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center font-black font-headline text-2xl backdrop-blur-sm z-10 shrink-0 border border-white/10">
                      #{userRankData.rank}
                    </div>
                    <div className="flex-1 z-10">
                      <p className="font-extrabold text-white text-[15px] mb-0.5 leading-tight">Your Position</p>
                      <p className="text-white/80 text-[11px] leading-tight">Keep earning to climb the ladder!</p>
                    </div>
                    <div className="text-right z-10 shrink-0">
                      <p className="font-black text-white text-lg leading-tight mb-0.5">{formatMoney(userRankData.total_earnings || 0)}</p>
                      <p className="text-white/90 text-[10px] font-bold uppercase tracking-widest flex items-center justify-end gap-0.5">
                        <span className="material-symbols-outlined text-[12px]">trending_up</span> TOP {Math.max(1, Math.ceil((userRankData.rank / Math.max(1, topEarners.length)) * 100))}%
                      </p>
                    </div>
                  </div>
                )}

                {/* Referral Kings Bento */}
                <div className="bg-[#f0fdf4] p-6 rounded-[1.5rem] border border-[#bbf7d0]">
                  <h4 className="font-headline font-bold text-lg text-[#166534] mb-5 flex items-center gap-2">
                    <span className="material-symbols-outlined">group_add</span>
                    Referral Kings
                  </h4>
                  <div className="space-y-4">
                    {referralKings.map((rk, i) => (
                      <div key={rk.user_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[13px]
                            ${i === 0 ? 'bg-[#22c55e] text-white shadow-sm' : i === 1 ? 'bg-[#86efac] text-[#166534]' : 'bg-[#dcfce7] text-[#15803d]'}
                          `}>
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#166534] leading-none mb-0.5">{rk.name?.split(' ')[0]}</p>
                            <p className="text-[10px] text-[#15803d]/70 leading-tight">@{rk.username}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-[#166534] bg-[#dcfce7] px-2 py-1 rounded-md">+{formatMoney(rk.referral_earnings || 0)}</span>
                      </div>
                    ))}
                    {referralKings.length === 0 && (
                      <p className="text-[#166534]/60 text-[13px] font-medium text-center py-2">No top referrers yet.</p>
                    )}
                  </div>
                </div>

              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center bg-white rounded-[2rem] w-full max-w-lg shadow-sm border border-surface-container-highest/30">
            <p className="text-on-surface-variant font-medium">No earners found for this period.</p>
          </div>
        )}
      </main>
    </div>
  );
}
