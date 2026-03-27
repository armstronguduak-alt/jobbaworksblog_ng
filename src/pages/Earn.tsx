import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function Earn() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ tasksCompleted: 0, totalEarned: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTasks, setActiveTasks] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchEarnStats(user.id);
    }
  }, [user]);

  const fetchEarnStats = async (userId: string) => {
    try {
      setIsLoading(true);
      // Fetch tasks count
      const { count } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('completed_by', userId);

      // Fetch wallet balance
      const { data: walletData } = await supabase
        .from('wallet_balances')
        .select('balance')
        .eq('user_id', userId)
        .single();
        
      // Fetch any real active tasks if seeded, otherwise fallback to standard system actions
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'active')
        .limit(3);

      if (tasksData) setActiveTasks(tasksData);

      setStats({
        tasksCompleted: count || 0,
        totalEarned: walletData?.balance || 0
      });
    } catch (err) {
      console.error("Error fetching earn stats:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaim = (taskId: string) => {
    alert(`Task claim initiated. (Simulated for ${taskId})`);
  };

  return (
    <div className="bg-surface font-body text-on-surface selection:bg-primary-fixed-dim min-h-[calc(100vh-80px)]">
      <main className="max-w-xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Daily Progress Card (The Value Shield) */}
        <section className="relative bg-gradient-to-br from-[#006b3f] to-[#008751] rounded-[2rem] p-8 overflow-hidden shadow-xl">
          {/* Decorative Pattern */}
          <div className="absolute top-[-20%] right-[-10%] opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[180px]">spa</span>
          </div>
          <div className="relative z-10 flex flex-col gap-6">
            <div>
              <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-1">Your Journey</p>
              <h2 className="text-white text-3xl font-extrabold tracking-tight font-headline">Daily Progress</h2>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-white font-semibold text-lg">{isLoading ? '...' : (stats.tasksCompleted > 0 ? 'Active' : 'Get Started!')}</span>
                <span className="text-white/80 text-sm">{stats.tasksCompleted} Tasks Done</span>
              </div>
              <div className="w-full h-3 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-tertiary-fixed-dim rounded-full transition-all duration-1000" style={{ width: `${Math.min((stats.tasksCompleted / 10) * 100, 100)}%` }}></div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/90 text-sm bg-black/10 self-start px-4 py-2 rounded-full backdrop-blur-sm">
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span>Keep going for daily bonus</span>
            </div>
          </div>
        </section>

        {/* Tasks Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xl font-bold font-headline text-on-surface">Available Tasks</h3>
            <span className="text-primary text-sm font-semibold">Refresh in 4h</span>
          </div>
          
          <div className="grid gap-5">
            {activeTasks.length > 0 ? (
               activeTasks.map((task) => (
                 <div key={task.id} className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-surface-container-highest/20 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-on-surface line-clamp-1">{task.task_name || 'System Task'}</h4>
                        <p className="text-on-surface-variant text-sm line-clamp-1">{task.platform || 'Complete to earn'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-primary font-bold">₦{task.reward_amount || '10'}</span>
                      <span className="text-[10px] text-outline uppercase font-bold tracking-tighter">Reward</span>
                    </div>
                  </div>
                  <button onClick={() => handleClaim(task.id)} className="w-full py-3 bg-primary text-white font-bold rounded-xl active:scale-95 transition-all">
                    Perform Task
                  </button>
                </div>
               ))
            ) : (
              <>
                {/* Fallback Task Card: Read Articles */}
                <div className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-surface-container-highest/20 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container">
                        <span className="material-symbols-outlined">description</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-on-surface">Read Articles</h4>
                        <p className="text-on-surface-variant text-sm">Stay updated with industry news</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-primary font-bold">₦~</span>
                      <span className="text-[10px] text-outline uppercase font-bold tracking-tighter">Varies</span>
                    </div>
                  </div>
                  <button onClick={() => window.location.href='/articles'} className="w-full py-3 bg-surface-container-highest text-primary font-bold rounded-xl active:scale-95 transition-all">
                    Read & Earn
                  </button>
                </div>

                {/* Fallback Task Card: Share Social */}
                <div className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-surface-container-highest/20 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-tertiary/10 flex items-center justify-center text-tertiary">
                        <span className="material-symbols-outlined">share</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-on-surface">Share on Social</h4>
                        <p className="text-on-surface-variant text-sm">Spread the word on Twitter</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-primary font-bold">₦150</span>
                      <span className="text-[10px] text-outline uppercase font-bold tracking-tighter">Bonus</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] font-bold text-outline">
                      <span>PROGRESS</span>
                      <span>0/1</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface-container rounded-full overflow-hidden">
                      <div className="h-full bg-tertiary-fixed-dim w-[0%] rounded-full"></div>
                    </div>
                  </div>
                  <button onClick={() => handleClaim('social')} className="w-full py-3 bg-gradient-to-br from-[#006b3f] to-[#008751] text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                    Claim ₦150
                  </button>
                </div>

                {/* Fallback Task Card: Refer Friend */}
                <div className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-surface-container-highest/20 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant">
                        <span className="material-symbols-outlined">group_add</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-on-surface">Refer a Friend</h4>
                        <p className="text-on-surface-variant text-sm">Grow the oasis community</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-primary font-bold">25%</span>
                      <span className="text-[10px] text-outline uppercase font-bold tracking-tighter">Commission</span>
                    </div>
                  </div>
                  <button onClick={() => window.location.href='/referral'} className="w-full py-3 bg-surface-container-low text-on-surface font-bold rounded-xl active:scale-95 transition-all">
                    Invite Contacts
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Bento Grid Insights */}
        <section className="grid grid-cols-2 gap-4">
          <div className="col-span-1 bg-secondary-container/30 p-5 rounded-[1.5rem] flex flex-col justify-between h-40 border border-secondary/10">
            <span className="material-symbols-outlined text-secondary">trending_up</span>
            <div>
              <p className="text-secondary font-bold text-2xl font-headline">
                {isLoading ? '...' : stats.tasksCompleted}
              </p>
              <p className="text-on-secondary-fixed-variant text-xs font-semibold">Tasks Completed</p>
            </div>
          </div>
          <div className="col-span-1 bg-tertiary-container/10 p-5 rounded-[1.5rem] flex flex-col justify-between h-40 border border-tertiary-fixed/30">
            <span className="material-symbols-outlined text-tertiary">payments</span>
            <div>
              <p className="text-tertiary font-bold text-2xl font-headline">
                {isLoading ? '...' : `₦${stats.totalEarned.toLocaleString()}`}
              </p>
              <p className="text-on-tertiary-fixed-variant text-xs font-semibold">Total Earned</p>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
