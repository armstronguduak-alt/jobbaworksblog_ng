import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

  // Unified Query Hook for Lean Backend Payloads and Isolated Caching
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['analytics', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];

      // Avoid Waterfall by combining requests using Promise.all
      // Only selecting necessary columns guarantees lean payloads
      const [postsRes, walletRes, counterRes, readsRes] = await Promise.all([
        supabase.from('posts').select('id, title, views, reads, earnings, reading_time_seconds').eq('author_user_id', user!.id).order('earnings', { ascending: false }).limit(10),
        supabase.from('wallet_balances').select('balance, total_earnings, referral_earnings, post_earnings').eq('user_id', user!.id).maybeSingle(),
        supabase.from('daily_user_counters').select('read_count, comment_count').eq('user_id', user!.id).eq('counter_date', today).maybeSingle(),
        supabase.from('post_reads').select('*', { count: 'exact', head: true }).eq('user_id', user!.id)
      ]);

      const fetchedPosts = postsRes.data || [];
      const totalViews = fetchedPosts.reduce((acc, curr) => acc + (curr.views || 0), 0);

      return {
        topPosts: fetchedPosts as PostData[],
        dailyCounters: {
          readCount: counterRes.data?.read_count || 0,
          commentCount: counterRes.data?.comment_count || 0,
        },
        stats: {
          views: totalViews,
          reads: readsRes.count || 0,
          earnings: walletRes.data?.balance || 0,
          totalEarnings: walletRes.data?.total_earnings || 0,
          referralEarnings: walletRes.data?.referral_earnings || 0,
          postEarnings: walletRes.data?.post_earnings || 0,
        }
      };
    }
  });

  // Background Cache Invalidation instead of destructive global refreshes
  useEffect(() => {
    if (!user?.id) return;

    const walletChannel = supabase
      .channel('analytics-wallet')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_balances', filter: `user_id=eq.${user.id}` }, 
        () => queryClient.invalidateQueries({ queryKey: ['analytics', user.id] })
      ).subscribe();

    const postsChannel = supabase
      .channel('analytics-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `author_user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['analytics', user.id] })
      ).subscribe();

    return () => {
      supabase.removeChannel(walletChannel);
      supabase.removeChannel(postsChannel);
    };
  }, [user, queryClient]);

  const formatNum = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M' : n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString();

  // Safely default UI parameters
  const stats = data?.stats || { views: 0, reads: 0, earnings: 0, totalEarnings: 0, referralEarnings: 0, postEarnings: 0 };
  const dailyCounters = data?.dailyCounters || { readCount: 0, commentCount: 0 };
  const topPosts = data?.topPosts || [];

  return (
    <div className="bg-surface font-body text-on-surface min-h-[calc(100vh-80px)]">
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8">

        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight leading-tight font-headline">Earnings Analytics</h1>
            <p className="text-on-surface-variant mt-1 text-sm">Monitor how your activity is performing and earning.</p>
          </div>
          {isFetching ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-outline uppercase tracking-widest bg-surface-container px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-outline animate-spin"></span> Syncing...
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-primary uppercase tracking-widest bg-primary/5 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span> Live Data
            </span>
          )}
        </div>

        {/* High-level KPIs */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Earnings', icon: 'payments', val: stats.totalEarnings, prefix: '₦' },
            { label: 'Balance', icon: 'account_balance_wallet', val: stats.earnings, prefix: '₦' },
            { label: 'Articles Read', icon: 'book', val: stats.reads, formatted: formatNum(stats.reads) },
            { label: 'Referral Earnings', icon: 'group_add', val: stats.referralEarnings, prefix: '₦' },
          ].map((kpi, idx) => (
            <div key={idx} className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-surface-container-highest/20">
              <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
                <span className="material-symbols-outlined text-sm">{kpi.icon}</span>
                <span className="text-xs font-bold uppercase tracking-widest">{kpi.label}</span>
              </div>
              {isLoading ? (
                <div className="h-8 w-24 bg-surface-container-high animate-pulse rounded-lg mt-1"></div>
              ) : (
                <p className="text-3xl font-headline font-black text-on-surface">
                  {kpi.prefix}{kpi.formatted || kpi.val.toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </section>

        {/* Today's Activity */}
        <section className="bg-surface-container-lowest p-6 md:p-8 rounded-[2rem] shadow-sm border border-surface-container-highest/20">
          <h3 className="font-headline font-bold text-lg mb-6">Today's Activity</h3>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-sm font-semibold text-on-surface-variant">Reads Completed</span>
                <span className="text-xl font-black text-primary">{isLoading ? '-' : dailyCounters.readCount}</span>
              </div>
              <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden relative">
                {isLoading ? <div className="absolute inset-0 bg-surface-container-high animate-pulse" /> : (
                  <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${Math.min((dailyCounters.readCount / 20) * 100, 100)}%` }}></div>
                )}
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <span className="text-sm font-semibold text-on-surface-variant">Comments Made</span>
                <span className="text-xl font-black text-tertiary">{isLoading ? '-' : dailyCounters.commentCount}</span>
              </div>
              <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden relative">
                {isLoading ? <div className="absolute inset-0 bg-surface-container-high animate-pulse" /> : (
                  <div className="h-full bg-tertiary-fixed-dim rounded-full transition-all duration-700" style={{ width: `${Math.min((dailyCounters.commentCount / 25) * 100, 100)}%` }}></div>
                )}
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
            {isLoading ? <div className="h-8 w-24 bg-white/20 animate-pulse rounded-lg"></div> : (
              <p className="text-2xl font-black font-headline">₦{stats.postEarnings.toLocaleString()}</p>
            )}
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-surface-container-highest/20">
            <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider mb-2">Referral Income</p>
            {isLoading ? <div className="h-8 w-24 bg-surface-container-high animate-pulse rounded-lg"></div> : (
              <p className="text-2xl font-black font-headline text-on-surface">₦{stats.referralEarnings.toLocaleString()}</p>
            )}
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-surface-container-highest/20">
            <p className="text-on-surface-variant text-xs font-bold uppercase tracking-wider mb-2">Available Balance</p>
            {isLoading ? <div className="h-8 w-24 bg-surface-container-high animate-pulse rounded-lg"></div> : (
              <p className="text-2xl font-black font-headline text-primary">₦{stats.earnings.toLocaleString()}</p>
            )}
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
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest whitespace-nowrap">Article Title</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right">Views</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right whitespace-nowrap">Read Rate</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right">Earnings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/50 text-sm">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td className="p-4"><div className="h-5 w-48 bg-surface-container-high animate-pulse rounded"></div></td>
                      <td className="p-4"><div className="h-5 w-12 bg-surface-container-high animate-pulse rounded ml-auto"></div></td>
                      <td className="p-4"><div className="h-5 w-12 bg-surface-container-high animate-pulse rounded ml-auto"></div></td>
                      <td className="p-4"><div className="h-5 w-16 bg-surface-container-high animate-pulse rounded ml-auto"></div></td>
                    </tr>
                  ))
                ) : topPosts.length > 0 ? (
                  topPosts.map(post => (
                    <tr key={post.id} className="hover:bg-surface-container-low/30 transition-colors group cursor-pointer">
                      <td className="p-4 font-semibold text-on-surface group-hover:text-primary transition-colors whitespace-nowrap">{post.title}</td>
                      <td className="p-4 text-right font-medium">{post.views.toLocaleString()}</td>
                      <td className="p-4 text-right font-medium">{post.views > 0 ? Math.round((post.reads / post.views) * 100) : 0}%</td>
                      <td className="p-4 text-right font-bold text-primary whitespace-nowrap">₦{post.earnings?.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="p-8 text-center text-on-surface-variant font-medium">No articles published yet. Start writing to see your earnings here!</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
