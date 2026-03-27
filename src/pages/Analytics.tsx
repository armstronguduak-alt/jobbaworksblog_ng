import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PostData {
  id: string;
  title: string;
  views: number;
  reads: number;
  read_time: string;
  earnings: number;
}

export function Analytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ views: 0, reads: 0, earnings: 0 });
  const [topPosts, setTopPosts] = useState<PostData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchAnalytics(user.id);
    }
  }, [user]);

  const fetchAnalytics = async (userId: string) => {
    try {
      setIsLoading(true);
      // Fetch posts specific to logged in user
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, title, views, reads, earnings')
        .eq('author_user_id', userId)
        .limit(5);

      // Fetch wallet balance
      const { data: walletData } = await supabase
        .from('wallet_balances')
        .select('balance')
        .eq('user_id', userId)
        .single();

      let totalViews = 0;
      let totalReads = 0;
      let fetchedPosts: PostData[] = [];

      if (postsData) {
        fetchedPosts = postsData.map(p => ({
          id: p.id,
          title: p.title || 'Untitled Post',
          views: p.views || 0,
          reads: p.reads || 0,
          read_time: '2m', // mock
          earnings: p.earnings || 0,
        }));
        
        totalViews = fetchedPosts.reduce((acc, curr) => acc + curr.views, 0);
        totalReads = fetchedPosts.reduce((acc, curr) => acc + curr.reads, 0);
      }

      setTopPosts(fetchedPosts.sort((a,b) => b.earnings - a.earnings));
      
      setStats({
        views: totalViews,
        reads: totalReads,
        earnings: walletData?.balance || 0
      });

    } catch (err) {
      console.error("Error fetching analytics", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface font-body text-on-surface min-h-[calc(100vh-80px)]">
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-8 md:py-12 space-y-8">
        
        {/* Header section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-on-surface tracking-tight leading-tight font-headline">Article Analytics</h1>
            <p className="text-on-surface-variant mt-1 text-sm">Monitor how your writing is performing and earning.</p>
          </div>
          <div className="flex gap-2">
            <select className="bg-surface-container-low border-none rounded-xl px-4 py-2 text-sm font-bold text-on-surface focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer pr-10 relative bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M7%2010L12%2015L17%2010%22%20stroke%3D%22%23191c1d%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[length:24px_24px] bg-[right_8px_center] bg-no-repeat">
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>This Year</option>
              <option>All Time</option>
            </select>
            <button className="bg-primary-container/10 text-primary p-2 rounded-xl hover:bg-primary-container/20 transition-colors">
              <span className="material-symbols-outlined">download</span>
            </button>
          </div>
        </div>

        {/* High-level KPIs */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-surface-container-highest/20">
            <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">visibility</span>
              <span className="text-xs font-bold uppercase tracking-widest">Total Views</span>
            </div>
            <p className="text-3xl font-headline font-black text-on-surface">
              {isLoading ? '...' : (stats.views >= 1000 ? (stats.views/1000).toFixed(1)+'k' : stats.views)}
            </p>
            <p className="text-xs font-bold text-primary mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              24% vs last week
            </p>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-surface-container-highest/20">
            <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">book</span>
              <span className="text-xs font-bold uppercase tracking-widest">Reads</span>
            </div>
            <p className="text-3xl font-headline font-black text-on-surface">
              {isLoading ? '...' : (stats.reads >= 1000 ? (stats.reads/1000).toFixed(1)+'k' : stats.reads)}
            </p>
            <p className="text-xs font-bold text-primary mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              12% vs last week
            </p>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-surface-container-highest/20">
            <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-sm">timer</span>
              <span className="text-xs font-bold uppercase tracking-widest">Avg Read Time</span>
            </div>
            <p className="text-3xl font-headline font-black text-on-surface">4m 12s</p>
            <p className="text-xs font-bold text-error mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
              2% vs last week
            </p>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-surface-container-highest/20">
            <div className="flex items-center gap-2 mb-2 text-on-surface-variant">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
              <span className="text-xs font-bold uppercase tracking-widest">Earnings</span>
            </div>
            <p className="text-3xl font-headline font-black text-primary">
              ₦{isLoading ? '...' : stats.earnings.toLocaleString()}
            </p>
            <p className="text-xs font-bold text-primary mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              38% vs last week
            </p>
          </div>
        </section>

        {/* Chart Section */}
        <section className="bg-surface-container-lowest p-6 md:p-8 rounded-[2rem] shadow-sm border border-surface-container-highest/20 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-headline font-bold text-lg">Performance Over Time</h3>
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary inline-block"></span>
                <span className="text-xs font-semibold text-on-surface-variant">Views</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-tertiary-fixed-dim inline-block"></span>
                <span className="text-xs font-semibold text-on-surface-variant">Reads</span>
              </div>
            </div>
          </div>
          
          {/* Simulated Bar Chart */}
          <div className="h-64 flex items-end justify-between gap-2 md:gap-4 relative pt-10 border-b border-surface-container-highest pb-2 px-2">
            {/* Guide lines */}
            <div className="absolute top-0 w-full border-t border-dashed border-surface-container-highest"></div>
            <div className="absolute top-1/2 w-full border-t border-dashed border-surface-container-highest"></div>
            
            {/* Bars */}
            <div className="w-full flex justify-around items-end h-full z-10">
              {[40, 60, 45, 80, 65, 95, 75].map((val, i) => (
                <div key={i} className="flex flex-col-reverse items-center justify-start w-8 md:w-12 h-full gap-1 group cursor-pointer">
                  <span className="text-[10px] font-bold text-on-surface-variant mt-2 absolute -bottom-6">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
                  </span>
                  
                  {/* Views */}
                  <div className="w-full bg-primary rounded-t-sm transition-all group-hover:bg-primary-container relative" style={{ height: `${val}%` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                      {val * 12} Views
                    </div>
                  </div>
                  {/* Reads */}
                  <div className="w-full bg-tertiary-fixed-dim rounded-t-sm transition-all absolute bottom-2 mix-blend-multiply opacity-80" style={{ height: `${val * 0.7}%` }}></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Top Performing Articles */}
        <section className="bg-surface-container-lowest rounded-[2rem] shadow-sm border border-surface-container-highest/20 overflow-hidden">
          <div className="p-6 md:p-8 border-b border-surface-container-highest flex justify-between items-center">
            <h3 className="font-headline font-bold text-lg">Top Performing Articles</h3>
            <button className="text-primary font-bold text-sm hover:underline">See All</button>
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
                  <tr><td colSpan={4} className="p-4 text-center">Loading Data...</td></tr>
                ) : topPosts.length > 0 ? (
                  topPosts.map(post => (
                    <tr key={post.id} className="hover:bg-surface-container-low/30 transition-colors group cursor-pointer">
                      <td className="p-4 font-semibold text-on-surface group-hover:text-primary transition-colors">{post.title}</td>
                      <td className="p-4 text-right font-medium">{post.views.toLocaleString()}</td>
                      <td className="p-4 text-right font-medium">{post.reads > 0 ? Math.round((post.reads/post.views)*100) : 0}%</td>
                      <td className="p-4 text-right font-bold text-primary">₦{post.earnings?.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="p-4 text-center">No articles found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
