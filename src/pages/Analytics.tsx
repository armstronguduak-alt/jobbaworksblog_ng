import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PostData {
  id: string;
  title: string;
  views: number;
  reads: number;
  reading_time_seconds: number;
  earnings: number;
}

export function Analytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ views: 0, reads: 0, earnings: 0, totalEarnings: 0, referralEarnings: 0, postEarnings: 0 });
  const [topPosts, setTopPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyCounters, setDailyCounters] = useState({ readCount: 0, commentCount: 0 });

  useEffect(() => {
    if (user?.id) {
      fetchAnalytics(user.id);
    }
  }, [user]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    const walletChannel = supabase
      .channel('analytics-wallet')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_balances', filter: `user_id=eq.${user.id}` },
        () => fetchAnalytics(user.id)
      )
      .subscribe();

    const postsChannel = supabase
      .channel('analytics-posts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: `author_user_id=eq.${user.id}` },
        () => fetchAnalytics(user.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(postsChannel);
    };
  }, [user]);

  const fetchAnalytics = async (userId: string) => {
    try {
      setIsLoading(true);

      // Fetch posts by user
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, title, views, reads, earnings, reading_time_seconds')
        .eq('author_user_id', userId)
        .order('earnings', { ascending: false })
        .limit(10);

      // Fetch wallet balances
      const { data: walletData } = await supabase
        .from('wallet_balances')
        .select('balance, total_earnings, referral_earnings, post_earnings')
        .eq('user_id', userId)
        .single();

      // Fetch today's daily counters
      const today = new Date().toISOString().split('T')[0];
      const { data: counterData } = await supabase
        .from('daily_user_counters')
        .select('read_count, comment_count')
        .eq('user_id', userId)
        .eq('counter_date', today)
        .single();

      // Fetch total post reads by user (as a reader)
      const { count: totalReads } = await supabase
        .from('post_reads')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      let fetchedPosts: PostData[] = [];
      let totalViews = 0;

      if (postsData) {
        fetchedPosts = postsData.map(p => ({
          id: p.id,
          title: p.title || 'Untitled Post',
          views: p.views || 0,
          reads: p.reads || 0,
          reading_time_seconds: p.reading_time_seconds || 60,
          earnings: p.earnings || 0,
        }));

        totalViews = fetchedPosts.reduce((acc, curr) => acc + curr.views, 0);
      }

      setTopPosts(fetchedPosts);
      setDailyCounters({
        readCount: counterData?.read_count || 0,
        commentCount: counterData?.comment_count || 0,
      });

      setStats({
        views: totalViews,
        reads: totalReads || 0,
        earnings: walletData?.balance || 0,
        totalEarnings: walletData?.total_earnings || 0,
        referralEarnings: walletData?.referral_earnings || 0,
        postEarnings: walletData?.post_earnings || 0,
      });

    } catch (err) {
      console.error("Error fetching analytics", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatNum = (n: number) =>
    n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString();

  return (
    <div className="bg-surface font-body text-on-surface min-h-[calc(100vh-80px)]">
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8">

        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight leading-tight font-headline">Earnings Analytics</h1>
            <p className="text-on-surface-variant mt-1 text-sm">Monitor how your activity is performing and earning.</p>
          </div>
          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1.5 rounded-full self-start md:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            Live Data
          </span>
        </div>

        {/* High-level KPIs */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-surface-container-highest/20">
            <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">payments</span>
              <span className="text-xs font-bold uppercase tracking-widest">Total Earnings</span>
            </div>
            <p className="text-3xl font-headline font-black text-primary">
              ₦{isLoading ? '...' : stats.totalEarnings.toLocaleString()}
            </p>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-surface-container-highest/20">
            <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">account_balance_wallet</span>
              <span className="text-xs font-bold uppercase tracking-widest">Balance</span>
            </div>
            <p className="text-3xl font-headline font-black text-on-surface">
              ₦{isLoading ? '...' : stats.earnings.toLocaleString()}
            </p>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-surface-container-highest/20">
            <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">book</span>
              <span className="text-xs font-bold uppercase tracking-widest">Articles Read</span>
            </div>
            <p className="text-3xl font-headline font-black text-on-surface">
              {isLoading ? '...' : formatNum(stats.reads)}
            </p>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-surface-container-highest/20">
            <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">group_add</span>
              <span className="text-xs font-bold uppercase tracking-widest">Referral Earnings</span>
            </div>
            <p className="text-3xl font-headline font-black text-on-surface">
              ₦{isLoading ? '...' : stats.referralEarnings.toLocaleString()}
            </p>
          </div>
        </section>

        {/* Today's Activity */}
        <section className="bg-surface-container-lowest p-6 md:p-8 rounded-[2rem] shadow-sm border border-surface-container-highest/20">
          <h3 className="font-headline font-bold text-lg mb-6">Today's Activity</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-sm font-semibold text-on-surface-variant">Reads Completed</span>
                <span className="text-xl font-black text-primary">{dailyCounters.readCount}</span>
              </div>
              <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${Math.min((dailyCounters.readCount / 20) * 100, 100)}%` }}></div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-sm font-semibold text-on-surface-variant">Comments Made</span>
                <span className="text-xl font-black text-tertiary">{dailyCounters.commentCount}</span>
              </div>
              <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                <div className="h-full bg-tertiary-fixed-dim rounded-full transition-all duration-700" style={{ width: `${Math.min((dailyCounters.commentCount / 25) * 100, 100)}%` }}></div>
              </div>
            </div>
          </div>
        </section>

        {/* Earnings Breakdown */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-primary to-primary-container p-6 rounded-3xl text-white relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <span className="material-symbols-outlined text-[80px]">payments</span>
            </div>
            <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-2">Post Earnings</p>
            <p className="text-2xl font-black font-headline">₦{stats.postEarnings.toLocaleString()}</p>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-surface-container-highest/20">
            <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider mb-2">Referral Income</p>
            <p className="text-2xl font-black font-headline text-on-surface">₦{stats.referralEarnings.toLocaleString()}</p>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-surface-container-highest/20">
            <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider mb-2">Available Balance</p>
            <p className="text-2xl font-black font-headline text-primary">₦{stats.earnings.toLocaleString()}</p>
          </div>
        </section>

        {/* Top Performing Articles */}
        <section className="bg-surface-container-lowest rounded-[2rem] shadow-sm border border-surface-container-highest/20 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-surface-container-highest flex justify-between items-center">
            <h3 className="font-headline font-bold text-lg">Your Published Articles</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Article Title</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right">Views</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right">Read Rate</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/50 text-sm">
                {isLoading ? (
                  <tr><td colSpan={4} className="p-8 text-center">
                    <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-on-surface-variant">Loading Data...</p>
                  </td></tr>
                ) : topPosts.length > 0 ? (
                  topPosts.map(post => (
                    <tr key={post.id} className="hover:bg-surface-container-low/30 transition-colors group cursor-pointer">
                      <td className="p-4 font-semibold text-on-surface group-hover:text-primary transition-colors">{post.title}</td>
                      <td className="p-4 text-right font-medium">{post.views.toLocaleString()}</td>
                      <td className="p-4 text-right font-medium">{post.views > 0 ? Math.round((post.reads / post.views) * 100) : 0}%</td>
                      <td className="p-4 text-right font-bold text-primary">₦{post.earnings?.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="p-8 text-center text-on-surface-variant">No articles published yet. Start writing to see your earnings here!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
