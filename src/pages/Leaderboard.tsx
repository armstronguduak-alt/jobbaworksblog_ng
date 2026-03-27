import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export function Leaderboard() {
  const [topEarners, setTopEarners] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  // Real-time subscription for leaderboard changes
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-realtime')
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
      const { data, error } = await supabase
        .from('wallet_balances')
        .select(`
          user_id,
          total_earnings,
          profiles:user_id (name, avatar_url, status)
        `)
        .order('total_earnings', { ascending: false })
        .limit(20);

      if (!error && data) {
        setTopEarners(data);
      }
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="bg-surface font-body text-on-surface min-h-[calc(100vh-80px)]">
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12 pb-32 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-10">
          <div className="flex items-center justify-center gap-2">
            <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase">
              Top Earners
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-2 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
              Live
            </span>
          </div>
          <h2 className="font-headline text-3xl md:text-5xl font-black text-on-surface leading-tight">
            Hall of <span className="text-primary italic">Wealth.</span>
          </h2>
          <p className="text-on-surface-variant max-w-xl mx-auto leading-relaxed">
            Discover the highest achieving members of the JobbaWorks ecosystem. Increase your earnings to climb the ranks.
          </p>
        </div>

        {/* Top 3 Podium */}
        {topEarners.length >= 3 && !isLoading && (
          <div className="flex justify-center items-end gap-2 sm:gap-4 mb-20 px-2">
            {/* Rank 2 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-[#C0C0C0] overflow-hidden bg-surface-container relative z-10 mb-[-1rem]">
                <img 
                  src={topEarners[1].profiles?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${topEarners[1].profiles?.name || 'R2'}`} 
                  alt="Rank 2"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="bg-surface-container-lowest border border-surface-container-highest/20 w-24 sm:w-32 h-32 sm:h-40 rounded-t-3xl rounded-b-xl flex flex-col justify-end pb-6 items-center shadow-lg relative">
                <span className="material-symbols-outlined text-[#C0C0C0] text-3xl mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>Workspace_Premium</span>
                <span className="font-black text-2xl text-on-surface">2</span>
                <p className="font-bold text-xs text-on-surface-variant truncate w-full text-center px-1 mt-1">{topEarners[1].profiles?.name || 'Anonymous'}</p>
                <p className="font-black text-primary text-[10px]">₦{topEarners[1].total_earnings.toLocaleString()}</p>
              </div>
            </div>

            {/* Rank 1 */}
            <div className="flex flex-col items-center z-20">
              <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full border-4 border-[#FFD700] overflow-hidden bg-surface-container relative z-10 mb-[-1rem] shadow-xl">
                <img 
                  src={topEarners[0].profiles?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${topEarners[0].profiles?.name || 'R1'}`} 
                  alt="Rank 1"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="bg-gradient-to-t from-[#FFD700]/20 to-surface-container-lowest border-x border-t border-[#FFD700]/30 w-28 sm:w-36 h-40 sm:h-48 rounded-t-3xl rounded-b-xl flex flex-col justify-end pb-8 items-center shadow-2xl relative">
                <span className="material-symbols-outlined text-[#FFD700] text-4xl mb-1 shadow-sm" style={{ fontVariationSettings: "'FILL' 1" }}>social_leaderboard</span>
                <span className="font-black text-4xl text-on-surface">1</span>
                <p className="font-bold text-sm text-on-surface-variant truncate w-full text-center px-2 mt-2">{topEarners[0].profiles?.name || 'Anonymous'}</p>
                <p className="font-black text-primary text-xs">₦{topEarners[0].total_earnings.toLocaleString()}</p>
              </div>
            </div>

            {/* Rank 3 */}
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-[#CD7F32] overflow-hidden bg-surface-container relative z-10 mb-[-1rem]">
                <img 
                  src={topEarners[2].profiles?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${topEarners[2].profiles?.name || 'R3'}`} 
                  alt="Rank 3"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="bg-surface-container-lowest border border-surface-container-highest/20 w-24 sm:w-32 h-28 sm:h-36 rounded-t-3xl rounded-b-xl flex flex-col justify-end pb-4 items-center shadow-md relative">
                <span className="material-symbols-outlined text-[#CD7F32] text-3xl mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>Workspace_Premium</span>
                <span className="font-black text-2xl text-on-surface">3</span>
                <p className="font-bold text-xs text-on-surface-variant truncate w-full text-center px-1 mt-1">{topEarners[2].profiles?.name || 'Anonymous'}</p>
                <p className="font-black text-primary text-[10px]">₦{topEarners[2].total_earnings.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}

        {/* Full Leaderboard List */}
        <div className="bg-surface-container-lowest rounded-3xl shadow-sm border border-surface-container-highest/30 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-on-surface-variant font-medium">Fetching Leaderboard Data...</p>
            </div>
          ) : topEarners.length > 3 ? (
            <div className="divide-y divide-surface-container-highest/20">
              {topEarners.slice(3).map((earner, index) => (
                <div key={earner.user_id} className="flex items-center gap-4 p-4 sm:p-5 hover:bg-surface-container/30 transition-colors">
                  <span className="font-black text-lg text-outline w-6 text-center">{index + 4}</span>
                  <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-surface-container">
                    <img 
                      className="w-full h-full object-cover" 
                      src={earner.profiles?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${earner.profiles?.name || 'user'}`} 
                      alt="avatar" 
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-on-surface truncate">{earner.profiles?.name || 'Anonymous Member'}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">{earner.profiles?.status || 'Active'}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-emerald-800 tracking-tight">
                      ₦{earner.total_earnings.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="p-8 text-center text-on-surface-variant">Not enough data to display full leaderboard yet.</div>
          )}
        </div>

        <div className="flex justify-center pt-8">
          <Link to="/earn" className="bg-surface-variant hover:bg-surface-container-high text-on-surface-variant px-6 py-3 rounded-xl font-bold transition-colors active:scale-95 text-sm">
            Complete Tasks to Rank Up
          </Link>
        </div>
      </main>
    </div>
  );
}
