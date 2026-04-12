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
      <main className="max-w-4xl mx-auto px-4 md:px-6 flex flex-col items-center">
        
        {/* Toggle Pills */}
        <div className="bg-surface-container-low p-1.5 rounded-full flex gap-1 w-full max-w-[400px] shadow-sm mb-12">
          {(['daily', 'weekly', 'all-time'] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => setTimeRange(tab)}
              className={`flex-1 py-2 font-bold rounded-full shadow-sm text-[13px] md:text-sm transition-all capitalize ${
                timeRange === tab 
                  ? 'bg-white text-primary' 
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="p-12 text-center w-full">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-on-surface-variant font-medium">Fetching Rankings...</p>
          </div>
        ) : topEarners.length > 0 ? (
          <>
            {/* Podium Design */}
            {topEarners.length >= 3 && (
              <div className="flex items-end justify-center gap-2 md:gap-4 mb-16 w-full px-2">
                
                {/* 2nd Place */}
                <div className="flex flex-col items-center w-[30%]">
                  <div className="relative mb-3">
                    <img 
                      src={topEarners[1].avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${topEarners[1].name || 'R2'}`} 
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-surface shadow-sm" alt="Rank 2"
                    />
                    <div className="absolute -bottom-2 right-0 w-6 h-6 md:w-7 md:h-7 bg-surface-container-high rounded-full border-2 border-surface flex items-center justify-center font-black text-xs md:text-sm text-on-surface">
                      2
                    </div>
                  </div>
                  <p className="font-bold text-[13px] md:text-[15px] text-center line-clamp-1 truncate w-full px-1">{topEarners[1].name?.split(' ')[0]}</p>
                  <p className="font-extrabold text-[13px] md:text-[15px] text-primary">{formatMoney(topEarners[1].total_earnings)}</p>
                  <div className="w-full h-24 md:h-32 bg-surface-container-highest/20 rounded-t-[1.5rem] mt-3"></div>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center w-[35%] relative">
                  <div className="absolute -top-6 md:-top-8 z-10">
                    <span className="material-symbols-outlined text-[32px] md:text-[40px] text-amber-400 drop-shadow-md" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                  </div>
                  <div className="relative mb-3 z-0">
                    <img 
                      src={topEarners[0].avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${topEarners[0].name || 'R1'}`} 
                      className="w-20 h-20 md:w-28 md:h-28 rounded-full object-cover border-4 border-[#008751] shadow-lg" alt="Rank 1"
                    />
                    <div className="absolute -bottom-2 -right-1 md:right-1 w-7 h-7 md:w-9 md:h-9 bg-[#008751] rounded-full border-2 border-surface flex items-center justify-center font-black text-[13px] md:text-base text-white">
                      1
                    </div>
                  </div>
                  <p className="font-extrabold text-[15px] md:text-[18px] text-center line-clamp-1 truncate w-full">{topEarners[0].name?.split(' ')[0]}</p>
                  <p className="font-black text-[15px] md:text-[18px] text-primary">{formatMoney(topEarners[0].total_earnings)}</p>
                  <div className="w-full h-36 md:h-44 bg-gradient-to-t from-[#006b3f] to-[#008751] rounded-t-[1.5rem] mt-3 shadow-sm"></div>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center w-[30%]">
                  <div className="relative mb-3">
                    <img 
                      src={topEarners[2].avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${topEarners[2].name || 'R3'}`} 
                      className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-4 border-surface shadow-sm" alt="Rank 3"
                    />
                    <div className="absolute -bottom-2 right-0 w-6 h-6 md:w-7 md:h-7 bg-surface-container-high rounded-full border-2 border-surface flex items-center justify-center font-black text-xs md:text-sm text-on-surface">
                      3
                    </div>
                  </div>
                  <p className="font-bold text-[13px] md:text-[15px] text-center line-clamp-1 truncate w-full px-1">{topEarners[2].name?.split(' ')[0]}</p>
                  <p className="font-extrabold text-[13px] md:text-[15px] text-primary">{formatMoney(topEarners[2].total_earnings)}</p>
                  <div className="w-full h-20 md:h-28 bg-surface-container-highest/20 rounded-t-[1.5rem] mt-3"></div>
                </div>

              </div>
            )}

            {/* List and Personal Ranking Grid */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mt-4">
              
              {/* Main List Box */}
              <div className="lg:col-span-7 space-y-4">
                {/* Users 4 to 10 */}
                {topEarners.slice(topEarners.length >= 3 ? 3 : 0, 10).map((earner, idx) => {
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
