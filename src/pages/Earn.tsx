import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function Earn() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ tasksCompleted: 0, totalEarned: 0, dailyReadsLeft: 0, dailyCommentsLeft: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [availablePosts, setAvailablePosts] = useState<any[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user?.id) {
      fetchEarnData(user.id);
    }
  }, [user]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    const walletChannel = supabase
      .channel('earn-wallet-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_balances', filter: `user_id=eq.${user.id}` },
        () => fetchEarnData(user.id)
      )
      .subscribe();

    const tasksChannel = supabase
      .channel('earn-tasks-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_reads', filter: `user_id=eq.${user.id}` },
        () => fetchEarnData(user.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [user]);

  const fetchEarnData = async (userId: string) => {
    try {
      setIsLoading(true);

      // Fetch completed reads count
      const { count: readCount } = await supabase
        .from('post_reads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Also count completed tasks
      const { count: taskCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('completed_by', userId);

      // Fetch wallet balance
      const { data: walletData } = await supabase
        .from('wallet_balances')
        .select('balance, total_earnings')
        .eq('user_id', userId)
        .single();

      // Fetch daily counters
      const today = new Date().toISOString().split('T')[0];
      const { data: counterData } = await supabase
        .from('daily_user_counters')
        .select('read_count, comment_count')
        .eq('user_id', userId)
        .eq('counter_date', today)
        .single();

      // Fetch user's plan limits
      const { data: subData } = await supabase
        .from('user_subscriptions')
        .select('plan_id, plan_earnings, is_completed')
        .eq('user_id', userId)
        .single();

      let planDetails = { daily_read_limit: 5, daily_comment_limit: 4, read_reward: 10, comment_reward: 10 };
      if (subData?.plan_id) {
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('daily_read_limit, daily_comment_limit, read_reward, comment_reward')
          .eq('id', subData.plan_id)
          .single();
        if (planData) planDetails = planData;
      }

      const readsDone = counterData?.read_count || 0;
      const commentsDone = counterData?.comment_count || 0;

      setStats({
        tasksCompleted: (readCount || 0) + (taskCount || 0),
        totalEarned: walletData?.total_earnings || 0,
        dailyReadsLeft: Math.max(0, planDetails.daily_read_limit - readsDone),
        dailyCommentsLeft: Math.max(0, planDetails.daily_comment_limit - commentsDone),
      });

      // Fetch available approved posts the user hasn't read yet
      // First get IDs user has already read
      const { data: readPostIds } = await supabase
        .from('post_reads')
        .select('post_id')
        .eq('user_id', userId);

      const alreadyRead = (readPostIds || []).map((r: any) => r.post_id);

      let postsQuery = supabase
        .from('posts')
        .select('id, title, excerpt, featured_image, reading_time_seconds')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(10);

      if (alreadyRead.length > 0) {
        postsQuery = postsQuery.not('id', 'in', `(${alreadyRead.join(',')})`);
      }

      const { data: postsData } = await postsQuery;
      setAvailablePosts(postsData || []);

    } catch (err) {
      console.error("Error fetching earn data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimRead = async (postId: string) => {
    if (claimingId) return;
    setClaimingId(postId);
    setMessage('');

    try {
      const { data, error } = await supabase.rpc('claim_post_read', { _post_id: postId });

      if (error) {
        setMessage(error.message);
      } else if (data) {
        setMessage(data.message);
        if (data.success && user?.id) {
          fetchEarnData(user.id);
        }
      }
    } catch (err) {
      setMessage('An error occurred while claiming.');
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="bg-surface font-body text-on-surface selection:bg-primary-fixed-dim min-h-[calc(100vh-80px)]">
      <main className="max-w-xl mx-auto px-4 md:px-6 py-8 space-y-8">
        {/* Daily Progress Card */}
        <section className="relative bg-gradient-to-br from-[#006b3f] to-[#008751] rounded-[2rem] p-8 overflow-hidden shadow-xl">
          <div className="absolute top-[-20%] right-[-10%] opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[180px]">spa</span>
          </div>
          <div className="relative z-10 flex flex-col gap-6">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-1">Your Journey</p>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white/60 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                  Live
                </span>
              </div>
              <h2 className="text-white text-3xl font-extrabold tracking-tight font-headline">Daily Progress</h2>
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
          </div>
        </section>

        {/* Message Banner */}
        {message && (
          <div className={`p-4 rounded-2xl text-sm font-bold text-center ${
            message.includes('earned') || message.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {message}
          </div>
        )}

        {/* Available Articles to Read & Earn */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xl font-bold font-headline text-on-surface">Available to Read</h3>
            <span className="text-primary text-sm font-semibold">{availablePosts.length} available</span>
          </div>

          <div className="grid gap-5">
            {isLoading ? (
              <div className="py-10 text-center">
                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-on-surface-variant font-medium text-sm">Loading tasks...</p>
              </div>
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
                      <span className="block text-primary font-bold">Earn</span>
                      <span className="text-[10px] text-outline uppercase font-bold tracking-tighter">Per Plan</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleClaimRead(post.id)}
                    disabled={claimingId === post.id || stats.dailyReadsLeft === 0}
                    className={`w-full py-3 font-bold rounded-xl active:scale-95 transition-all ${
                      stats.dailyReadsLeft === 0
                        ? 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed'
                        : claimingId === post.id
                        ? 'bg-surface-variant text-on-surface-variant'
                        : 'bg-primary text-white'
                    }`}
                  >
                    {claimingId === post.id ? 'Claiming...' : stats.dailyReadsLeft === 0 ? 'Daily Limit Reached' : 'Read & Earn'}
                  </button>
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

        {/* Bento Grid Insights */}
        <section className="grid grid-cols-2 gap-4">
          <div className="col-span-1 bg-secondary-container/30 p-5 rounded-[1.5rem] flex flex-col justify-between h-40 border border-secondary/10">
            <span className="material-symbols-outlined text-secondary">trending_up</span>
            <div>
              <p className="text-secondary font-bold text-2xl font-headline">
                {isLoading ? '...' : stats.tasksCompleted}
              </p>
              <p className="text-on-secondary-fixed-variant text-xs font-semibold">Total Reads</p>
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
