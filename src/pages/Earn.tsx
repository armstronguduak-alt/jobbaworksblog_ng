import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CommunityTaskCard } from '../components/CommunityTaskCard';
import confetti from 'canvas-confetti';
import { useCurrency } from '../hooks/useCurrency';

export function Earn() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { formatAmount, isGlobal } = useCurrency();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['earnData', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      const [readCountRes, taskCountRes, walletDataRes, counterDataRes, subDataRes, readPostIdsRes, activeTasksRes, userTasksDoneDataRes, totalReferralsRes, referralCommissionsRes] = await Promise.all([
        supabase.from('post_reads').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('user_tasks').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('completed', true),
        supabase.from('wallet_balances').select('balance, total_earnings').eq('user_id', user!.id).maybeSingle(),
        supabase.from('daily_user_counters').select('read_count, comment_count').eq('user_id', user!.id).eq('counter_date', today).maybeSingle(),
        supabase.from('user_subscriptions').select('plan_id, plan_earnings, is_completed').eq('user_id', user!.id).maybeSingle(),
        supabase.from('post_reads').select('post_id').eq('user_id', user!.id),
        supabase.from('tasks').select('*').eq('status', 'active'),
        supabase.from('user_tasks').select('task_id, completed').eq('user_id', user!.id),
        supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_user_id', user!.id),
        supabase.from('referral_commissions').select('plan_id').eq('referrer_user_id', user!.id)
      ]);

      let planDetails = { daily_read_limit: 5, daily_comment_limit: 4, read_reward: 10, comment_reward: 10 };
      if (subDataRes.data?.plan_id) {
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('daily_read_limit, daily_comment_limit, read_reward, comment_reward')
          .eq('id', subDataRes.data.plan_id)
          .maybeSingle();
        if (planData) planDetails = planData;
      }

      const readsDone = counterDataRes.data?.read_count || 0;
      const commentsDone = counterDataRes.data?.comment_count || 0;

      const stats = {
        tasksCompleted: (readCountRes.count || 0) + (taskCountRes.count || 0),
        totalEarned: walletDataRes.data?.total_earnings || 0,
        dailyReadsLeft: Math.max(0, planDetails.daily_read_limit - readsDone),
        dailyCommentsLeft: Math.max(0, planDetails.daily_comment_limit - commentsDone),
      };

      const alreadyRead = (readPostIdsRes.data || []).map((r: any) => r.post_id);

      let postsQuery = supabase
        .from('posts')
        .select('id, slug, title, excerpt, featured_image, reading_time_seconds')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(10);

      if (alreadyRead.length > 0) {
        postsQuery = postsQuery.not('id', 'in', `(${alreadyRead.join(',')})`);
      }
      const { data: availablePosts } = await postsQuery;

      const allActiveTasks = activeTasksRes.data || [];
      const userTasksDoneData = userTasksDoneDataRes.data || [];
      const completedTaskIds = userTasksDoneData.filter((t: any) => t.completed).map((t: any) => t.task_id);
      
      const availableTasks = allActiveTasks.filter((task: any) => !completedTaskIds.includes(task.id));

      const planReferralCounts: Record<string, number> = { all: totalReferralsRes.count || 0 };
      if (referralCommissionsRes.data) {
        referralCommissionsRes.data.forEach((rc: any) => {
          planReferralCounts[rc.plan_id] = (planReferralCounts[rc.plan_id] || 0) + 1;
        });
      }

      return { 
        stats, 
        availablePosts: availablePosts || [], 
        availableTasks: availableTasks || [],
        walletData: walletDataRes.data,
        planReferralCounts,
        planDetails
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // Real-time subscriptions updating the React Query Cache
  useEffect(() => {
    if (!user?.id) return;

    const walletChannel = supabase
      .channel(`earn-wallet-realtime-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_balances', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['earnData', user.id] })
      )
      .subscribe();

    const tasksChannel = supabase
      .channel(`earn-tasks-realtime-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_reads', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['earnData', user.id] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [user, queryClient]);

  const handleClaimRead = async (postId: string) => {
    if (claimingId) return;
    setClaimingId(postId);
    setMessage('');

    try {
      const { data: claimData, error } = await supabase.rpc('claim_post_read', { _post_id: postId });

      if (error) {
        setMessage(error.message);
      } else if (claimData) {
        setMessage(claimData.message);
        if (claimData.success && user?.id) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          queryClient.invalidateQueries({ queryKey: ['earnData', user.id] });
        }
      }
    } catch (err) {
      setMessage('An error occurred while claiming.');
    } finally {
      setClaimingId(null);
    }
  };

  const handleExecuteExternalTask = async (task: any) => {
    // 1. Mark 'started' state or simply claim it instantly as per simple flow
    if (task.affiliate_url) window.open(task.affiliate_url, '_blank');
    
    setClaimingId(task.id);
    setMessage('');
    try {
      const { error } = await supabase.rpc('claim_task_reward', { p_task_id: task.id });
      if (error) {
        setMessage(error.message);
      } else {
        setMessage('Task submission received for verification!');
        queryClient.invalidateQueries({ queryKey: ['earnData', user?.id] });
      }
    } catch (err: any) {
      setMessage('Error verifying task.');
    } finally {
      setClaimingId(null);
    }
  };

  const stats = data?.stats || { tasksCompleted: 0, totalEarned: 0, dailyReadsLeft: 0, dailyCommentsLeft: 0 };
  const availablePosts = data?.availablePosts || [];
  const availableTasks = data?.availableTasks || [];

  return (
    <div className="bg-surface font-body text-on-surface selection:bg-primary-fixed-dim min-h-[calc(100vh-80px)]">
      <main className="max-w-xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Daily Progress Card */}
        <Link to="/analytics" className="block relative bg-gradient-to-br from-[#006b3f] to-[#008751] rounded-[2rem] p-8 overflow-hidden shadow-xl transition-transform hover:scale-[1.02] active:scale-[0.98]">
          <div className="absolute top-[-20%] right-[-10%] opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[180px]">spa</span>
          </div>
          <div className="relative z-10 flex flex-col gap-6">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-1">Your Journey</p>
                <div className="flex gap-2 items-center">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white/60 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                    Live
                  </span>
                  <span className="material-symbols-outlined text-white/70 text-sm">open_in_new</span>
                </div>
              </div>
              <h2 className="text-white text-3xl font-extrabold tracking-tight font-headline hover:underline">Daily Progress</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Reads Left Today</p>
                <p className="text-white text-2xl font-black font-headline mt-1">{isLoading ? '...' : stats.dailyReadsLeft}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Comments Left</p>
                <p className="text-white text-2xl font-black font-headline mt-1">{isLoading ? '...' : stats.dailyCommentsLeft}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/90 text-sm bg-black/10 self-start px-4 py-2 rounded-full backdrop-blur-sm">
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span>Complete reads to maximize daily earnings</span>
            </div>
            {/* Total Reads & Total Earned inside Daily Progress */}
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Total Reads</p>
                <p className="text-white text-2xl font-black font-headline mt-1">{isLoading ? '...' : stats.tasksCompleted}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Total Earned</p>
                <p className="text-white text-2xl font-black font-headline mt-1">{isLoading ? '...' : formatAmount(stats.totalEarned)}</p>
              </div>
            </div>
          </div>
        </Link>

        {/* Message Banner */}
        {message && (
          <div className={`p-4 rounded-2xl text-sm font-bold text-center ${
            message.includes('earned') || message.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {message}
          </div>
        )}

        {/* Action Bounties / Platform Tasks */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xl font-bold font-headline text-on-surface">Platform Bounties</h3>
            <span className="text-[#008751] text-sm font-semibold">{availableTasks.length + 1} bounties</span>
          </div>
          
          <div className="grid gap-5">
            {/* Community Task Module */}
            <CommunityTaskCard />

            {/* Dynamic DB Bounties */}
            {availableTasks.map((task: any) => {
              const isReferral = task.task_type === 'referrals';
              const target = task.target_count || 1;
              const current = isReferral ? (data?.planReferralCounts?.[task.required_plan] || 0) : 0;
              const completed = current >= target;

              return (
                <div key={task.id} className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-surface-container-highest/20 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined">
                          {task.task_type === 'social' ? 'thumb_up' : task.task_type === 'referrals' ? 'group_add' : 'task_alt'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-on-surface line-clamp-1">
                          {task.title}
                          {isReferral && <span className="ml-2 text-xs font-bold text-primary">({current}/{target})</span>}
                        </h4>
                        <p className="text-on-surface-variant text-[13px] line-clamp-2 mt-1">
                          {task.description}
                          {isReferral && task.required_plan !== 'all' && ` (Requires ${task.required_plan.toUpperCase()} plan)`}
                        </p>
                        {isReferral && !completed && (
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min((current/target)*100, 100)}%` }}></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-primary font-black">{formatAmount(task.reward_amount || 0)}</span>
                      <span className="text-[10px] text-outline uppercase font-bold tracking-tighter">Reward</span>
                    </div>
                  </div>
                  {isReferral && !completed ? (
                    <Link
                      to="/referral"
                      className="w-full py-3 font-bold rounded-xl active:scale-95 transition-all border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex justify-center items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">group_add</span> Invite ({target - current} left)
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleExecuteExternalTask(task)}
                      disabled={claimingId === task.id}
                      className={`w-full py-3 font-bold rounded-xl active:scale-95 transition-all flex justify-center items-center gap-2 ${
                        isReferral && completed ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                      }`}
                    >
                      {claimingId === task.id ? 'Working...' : isReferral && completed ? 'Claim Reward' : 'Complete Task'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Available Articles to Read & Earn */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xl font-bold font-headline text-on-surface">Available to Read</h3>
            <span className="text-primary text-sm font-semibold">{availablePosts.length} available</span>
          </div>

          <div className="grid gap-5">
            {isLoading && !data ? (
              <div className="py-10" />
            ) : stats.dailyReadsLeft === 0 && availablePosts.length > 0 ? (
              /* ── Daily limit exhausted — show "Continue Tomorrow" ── */
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-2">
                  <span className="material-symbols-outlined text-3xl text-amber-500">schedule</span>
                  <p className="text-amber-800 font-bold text-sm">Daily reading limit reached!</p>
                  <p className="text-amber-600 text-xs">You've completed all your reads for today. Come back tomorrow to continue earning.</p>
                </div>
                {availablePosts.slice(0, 3).map((post) => (
                  <div key={post.id} className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-surface-container-highest/20 flex flex-col gap-4 opacity-70">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-secondary-container overflow-hidden flex items-center justify-center shrink-0">
                          {post.featured_image ? (
                            <img src={post.featured_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-on-secondary-container">description</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-on-surface line-clamp-1">{post.title}</h4>
                          <p className="text-on-surface-variant text-sm line-clamp-1">
                            {Math.ceil(post.reading_time_seconds / 60)} min read
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      disabled
                      className="w-full py-3 font-bold rounded-xl bg-amber-100 text-amber-700 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">schedule</span>
                      Continue Tomorrow
                    </button>
                  </div>
                ))}
              </>
            ) : availablePosts.length > 0 ? (
              availablePosts.map((post) => (
                <div key={post.id} className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-surface-container-highest/20 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-secondary-container overflow-hidden flex items-center justify-center shrink-0">
                        {post.featured_image ? (
                          <img src={post.featured_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-on-secondary-container">description</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-on-surface line-clamp-1">{post.title}</h4>
                        <p className="text-on-surface-variant text-sm line-clamp-1">
                          {Math.ceil(post.reading_time_seconds / 60)} min read
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-primary font-bold">Earn {formatAmount(data?.planDetails?.read_reward || 10)}</span>
                      <span className="text-[10px] text-outline uppercase font-bold tracking-tighter">Per Article</span>
                    </div>
                  </div>
                  {localStorage.getItem(`jobbaworks_read_${post.id}`) === 'true' ? (
                    <button
                      onClick={() => handleClaimRead(post.id)}
                      disabled={claimingId === post.id}
                      className={`w-full py-3 font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${
                        claimingId === post.id
                          ? 'bg-surface-variant text-on-surface-variant'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                      }`}
                    >
                      {claimingId === post.id ? 'Claiming...' : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">payments</span> Claim Reward
                        </>
                      )}
                    </button>
                  ) : (
                    <Link
                      to={`/article/${post.slug}`}
                      className="w-full py-3 font-bold rounded-xl active:scale-95 transition-all text-center bg-primary text-white hover:bg-emerald-800 shadow-sm block"
                    >
                      Read Content First
                    </Link>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center bg-surface-container-lowest p-8 border border-dashed border-outline-variant/30 rounded-2xl space-y-2">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">check_circle</span>
                <p className="text-on-surface-variant font-medium">All caught up! No new articles to read.</p>
                <p className="text-xs text-on-surface-variant">Check back later for new content.</p>
              </div>
            )}

            {/* Referral Task */}
            <div className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-surface-container-highest/20 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant">
                    <span className="material-symbols-outlined">group_add</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">Refer a Friend</h4>
                    <p className="text-on-surface-variant text-sm">Earn 25% of their plan purchase</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-primary font-bold">25%</span>
                  <span className="text-[10px] text-outline uppercase font-bold tracking-tighter">Commission</span>
                </div>
              </div>
              <Link to="/referral" className="w-full py-3 bg-surface-container-low text-on-surface font-bold rounded-xl active:scale-95 transition-all text-center">
                Invite Contacts
              </Link>
            </div>
          </div>
        </section>


      </main>
    </div>
  );
}
