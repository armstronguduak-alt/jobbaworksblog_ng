import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function Leaderboard() {
  const { user } = useAuth();
  const [topEarners, setTopEarners] = useState<any[]>([]);
  const [referralKings, setReferralKings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'weekly' | 'monthly' | 'all-time'>('all-time');
  const [userRank, setUserRank] = useState<number | null>(null);

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
      // In a fully developed backend, you would pass `timeRange` to an RPC.
      // Here, we load the comprehensive data dynamically for all time.
      const { data, error } = await supabase
        .from('wallet_balances')
        .select(`
          user_id,
          total_earnings,
          referral_earnings,
          profiles:user_id (name, username, avatar_url, status, is_verified)
        `)
        .order('total_earnings', { ascending: false });

      if (!error && data) {
        setTopEarners(data);
        
        // Compute user's specific rank
        if (user) {
          const rankIndex = data.findIndex(d => d.user_id === user.id);
          if (rankIndex !== -1) setUserRank(rankIndex + 1);
        }

        // Sort by referral earnings for sidebar
        const refSorted = [...data].sort((a, b) => (b.referral_earnings || 0) - (a.referral_earnings || 0)).slice(0, 5);
        setReferralKings(refSorted);
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-background text-on-surface font-body min-h-[calc(100vh-80px)] selection:bg-tertiary-fixed-dim selection:text-on-tertiary-fixed">
      <main className="pt-8 pb-32 px-4 md:px-6 max-w-5xl mx-auto">
        
        {/* Editorial Header */}
        <section className="mb-12">
          <span className="text-primary font-bold tracking-widest text-xs uppercase mb-2 block">Rankings</span>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <h2 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tight text-on-surface leading-none">
              Wall of <span className="text-primary">Wealth.</span>
            </h2>
            
            {/* Tabs */}
            <div className="bg-surface-container p-1.5 rounded-xl flex gap-1 w-fit self-start">
              <button 
                onClick={() => setTimeRange('weekly')}
                className={`px-6 py-2 font-bold rounded-lg shadow-sm text-sm transition-all ${timeRange === 'weekly' ? 'bg-surface-container-lowest text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                Weekly
              </button>
              <button 
                onClick={() => setTimeRange('monthly')}
                className={`px-6 py-2 font-bold rounded-lg shadow-sm text-sm transition-all ${timeRange === 'monthly' ? 'bg-surface-container-lowest text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setTimeRange('all-time')}
                className={`px-6 py-2 font-bold rounded-lg shadow-sm text-sm transition-all ${timeRange === 'all-time' ? 'bg-surface-container-lowest text-primary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                All-time
              </button>
            </div>
          </div>
        </section>

        {isLoading ? (
          <div className="p-12 text-center bg-surface-container-low rounded-[2rem]">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-on-surface-variant font-medium">Fetching Rankings...</p>
          </div>
        ) : topEarners.length > 0 ? (
          <>
            {/* Top 3 Asymmetric Podium */}
            {topEarners.length >= 3 && (
              <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 items-end">
                {/* Rank 2 */}
                <div className="order-2 md:order-1 bg-surface-container-lowest p-8 rounded-[2rem] shadow-[0px_20px_40px_rgba(0,33,16,0.04)] border-b-4 border-secondary/20 relative overflow-hidden h-fit">
                  <div className="absolute top-4 right-4 text-4xl font-black text-secondary/10">2</div>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full border-4 border-secondary-container mb-4 overflow-hidden">
                      <img 
                        alt="Rank 2" 
                        className="w-full h-full object-cover" 
                        src={topEarners[1].profiles?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${topEarners[1].profiles?.name || 'R2'}`} 
                      />
                    </div>
                    <h3 className="font-headline font-bold text-lg text-on-surface">{topEarners[1].profiles?.name || 'Anonymous'}</h3>
                    <p className="text-secondary font-medium text-sm mb-4">@{topEarners[1].profiles?.username || 'user'}</p>
                    <div className="bg-secondary-container text-on-secondary-container px-4 py-1 rounded-full font-bold text-sm">
                      ₦{(topEarners[1].total_earnings || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Rank 1 - Hero Moment */}
                <div className="order-1 md:order-2 bg-gradient-to-br from-[#006b3f] to-[#008751] p-10 rounded-[2.5rem] shadow-[0px_30px_60px_rgba(0,107,63,0.15)] relative overflow-hidden md:-translate-y-8">
                  <div className="absolute top-6 right-6 text-6xl font-black text-white/10">1</div>
                  <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
                  <div className="flex flex-col items-center text-center relative z-10">
                    <div className="relative mb-6">
                      <div className="w-28 h-28 rounded-full border-4 border-tertiary-fixed mb-1 overflow-hidden">
                        <img 
                          alt="Rank 1" 
                          className="w-full h-full object-cover" 
                          src={topEarners[0].profiles?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${topEarners[0].profiles?.name || 'R1'}`} 
                        />
                      </div>
                      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-tertiary-fixed text-on-tertiary-fixed px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-widest shadow-lg">
                        King
                      </div>
                    </div>
                    <h3 className="font-headline font-extrabold text-2xl text-white flex items-center gap-1">
                      {topEarners[0].profiles?.name || 'Anonymous'}
                      {topEarners[0].profiles?.is_verified && <span className="material-symbols-outlined text-blue-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
                    </h3>
                    <p className="text-primary-fixed/80 font-medium text-base mb-6">@{topEarners[0].profiles?.username || 'user'}</p>
                    <div className="bg-white/20 backdrop-blur-md text-white px-6 py-2 rounded-2xl font-black text-xl border border-white/10">
                      ₦{(topEarners[0].total_earnings || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Rank 3 */}
                <div className="order-3 bg-surface-container-lowest p-8 rounded-[2rem] shadow-[0px_20px_40px_rgba(0,33,16,0.04)] border-b-4 border-outline-variant/20 relative overflow-hidden h-fit">
                  <div className="absolute top-4 right-4 text-4xl font-black text-outline-variant/20">3</div>
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 rounded-full border-4 border-surface-container-high mb-4 overflow-hidden">
                      <img 
                        alt="Rank 3" 
                        className="w-full h-full object-cover" 
                        src={topEarners[2].profiles?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${topEarners[2].profiles?.name || 'R3'}`} 
                      />
                    </div>
                    <h3 className="font-headline font-bold text-lg text-on-surface">{topEarners[2].profiles?.name || 'Anonymous'}</h3>
                    <p className="text-on-surface-variant font-medium text-sm mb-4">@{topEarners[2].profiles?.username || 'user'}</p>
                    <div className="bg-surface-container-high text-on-surface-variant px-4 py-1 rounded-full font-bold text-sm">
                      ₦{(topEarners[2].total_earnings || 0).toLocaleString()}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Main Leaderboard List & Referrals Bento */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Top Earners List */}
              <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center justify-between mb-6 px-2">
                  <h4 className="font-headline font-bold text-xl text-on-surface">Global Rankings</h4>
                  <span className="text-sm text-outline font-medium">Top 50 shown</span>
                </div>

                {topEarners.slice(topEarners.length >= 3 ? 3 : 0).map((earner, index) => (
                  <div key={earner.user_id} className="group bg-surface-container-lowest p-5 rounded-2xl flex items-center gap-4 transition-all hover:translate-x-1 duration-300 shadow-[0px_4px_20px_rgba(0,33,16,0.02)]">
                    <span className="w-8 font-black text-outline/30 text-xl italic">{topEarners.length >= 3 ? String(index + 4).padStart(2, '0') : String(index + 1).padStart(2, '0')}</span>
                    <div className="w-12 h-12 rounded-xl bg-surface-container overflow-hidden">
                      <img 
                        alt="Rank item" 
                        className="w-full h-full object-cover shadow-sm" 
                        src={earner.profiles?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${earner.profiles?.name || 'user'}`} 
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-on-surface truncate flex items-center gap-1">
                        {earner.profiles?.name || 'Anonymous'}
                        {earner.profiles?.is_verified && <span className="material-symbols-outlined text-blue-500 text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
                      </p>
                      <p className="text-xs text-outline font-medium tracking-wide">@{earner.profiles?.username || 'member'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-primary text-base">₦{(earner.total_earnings || 0).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Referrals Sidebar Bento */}
              <div className="lg:col-span-4 space-y-6">
                
                <div className="bg-primary/5 p-8 rounded-[2rem] border border-primary/10">
                  <h4 className="font-headline font-bold text-xl text-primary mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined">group</span>
                    Referral Kings
                  </h4>
                  <div className="space-y-6">
                    {referralKings.filter(rk => rk.referral_earnings > 0).map((rk, i) => (
                      <div key={rk.user_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold 
                            ${i === 0 ? 'bg-primary/20 text-primary' : i === 1 ? 'bg-primary/10 text-primary/60' : 'bg-primary/5 text-primary/40'}
                          `}>
                            {i + 1}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-on-surface leading-none">{rk.profiles?.name || 'User'}</p>
                            <p className="text-[11px] text-outline mt-1 truncate">@{rk.profiles?.username}</p>
                          </div>
                        </div>
                        <span className="text-xs font-black text-primary bg-primary/10 px-2 py-1 rounded-full">+₦{(rk.referral_earnings || 0).toLocaleString()}</span>
                      </div>
                    ))}
                    {referralKings.filter(rk => rk.referral_earnings > 0).length === 0 && (
                      <p className="text-on-surface-variant text-sm font-medium">No top referrers yet.</p>
                    )}
                  </div>
                </div>

                {/* Personal Stats Card */}
                {user && userRank && (
                  <div className="bg-surface-container-lowest p-8 rounded-[2rem] shadow-[0px_10px_30px_rgba(0,0,0,0.02)]">
                    <p className="text-xs font-bold text-outline uppercase tracking-widest mb-1">Your Position</p>
                    <div className="flex items-end justify-between">
                      <p className="text-4xl font-headline font-black text-on-surface">#{userRank.toLocaleString()}</p>
                    </div>
                    <div className="mt-4 h-2 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-primary-container w-[100%] transition-all"></div>
                    </div>
                    <p className="mt-2 text-xs text-outline-variant font-medium">Keep completing tasks to rise up!</p>
                  </div>
                )}
                
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center bg-surface-container-lowest rounded-[2rem] border border-surface-container-highest/30">
            <p className="text-on-surface-variant font-medium">No earners found yet. Start completing tasks!</p>
          </div>
        )}
      </main>
    </div>
  );
}
