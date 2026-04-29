import { useState, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface DailyAnalytics {
  date: string;
  user_views: number;
  anonymous_views: number;
  post_id?: string;
}

interface ArticleAnalyticsGraphProps {
  data: DailyAnalytics[];
  articles?: { id: string; title: string }[];
  isAdmin?: boolean;
}

export function ArticleAnalyticsGraph({ data, articles = [], isAdmin = false }: ArticleAnalyticsGraphProps) {
  const [selectedArticle, setSelectedArticle] = useState<string>('all');
  const [dateRange, setDateRange] = useState<'7' | '30' | '90' | 'all'>('30');

  const filteredData = useMemo(() => {
    let filtered = data;
    if (selectedArticle !== 'all') {
      filtered = filtered.filter(d => d.post_id === selectedArticle);
    }

    // Group by date
    const aggregated = filtered.reduce((acc, curr) => {
      if (!acc[curr.date]) {
        acc[curr.date] = { date: curr.date, user_views: 0, anonymous_views: 0 };
      }
      acc[curr.date].user_views += curr.user_views;
      acc[curr.date].anonymous_views += curr.anonymous_views;
      return acc;
    }, {} as Record<string, { date: string, user_views: number, anonymous_views: number }>);

    let result = Object.values(aggregated).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (dateRange !== 'all') {
      const days = parseInt(dateRange, 10);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      result = result.filter(d => new Date(d.date) >= cutoff);
    }

    // Format date for display
    return result.map(d => ({
      ...d,
      displayDate: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));
  }, [data, selectedArticle, dateRange]);

  const totalUserViews = filteredData.reduce((sum, d) => sum + d.user_views, 0);
  const totalAnonViews = filteredData.reduce((sum, d) => sum + d.anonymous_views, 0);
  const totalViews = totalUserViews + totalAnonViews;
  
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayData = filteredData.find(d => d.date === todayDateStr);
  const todayViews = todayData ? todayData.user_views + todayData.anonymous_views : 0;

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border border-surface-container-low mb-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
        <div>
          <h2 className="text-xl font-bold font-headline text-on-surface">View Analytics</h2>
          <p className="text-sm text-on-surface-variant">Track registered vs anonymous user traffic</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {articles.length > 0 && (
            <select
              value={selectedArticle}
              onChange={e => setSelectedArticle(e.target.value)}
              className="bg-surface-container-lowest border border-surface-container-low rounded-xl px-4 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary w-full lg:w-48"
            >
              <option value="all">All Articles</option>
              {articles.map(a => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
          )}
          
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value as any)}
            className="bg-surface-container-lowest border border-surface-container-low rounded-xl px-4 py-2 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary w-full lg:w-auto"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-low border-b-4 border-b-blue-400">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Views</p>
          <p className="text-2xl font-black text-on-surface">{totalViews.toLocaleString()}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-low border-b-4 border-b-emerald-400">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">User Views</p>
          <p className="text-2xl font-black text-on-surface">{totalUserViews.toLocaleString()}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-low border-b-4 border-b-slate-400">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Anon Views</p>
          <p className="text-2xl font-black text-on-surface">{totalAnonViews.toLocaleString()}</p>
        </div>
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-surface-container-low border-b-4 border-b-amber-400">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Today's Views</p>
          <p className="text-2xl font-black text-on-surface">{todayViews.toLocaleString()}</p>
        </div>
      </div>

      <div className="h-[300px] w-full">
        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorUser" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#34d399" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorAnon" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
              />
              <Area type="monotone" name="Registered Users" dataKey="user_views" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorUser)" stackId="1" />
              <Area type="monotone" name="Anonymous Users" dataKey="anonymous_views" stroke="#64748b" strokeWidth={3} fillOpacity={1} fill="url(#colorAnon)" stackId="2" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container-lowest rounded-2xl border border-dashed border-surface-container">
            <span className="material-symbols-outlined text-4xl text-outline-variant mb-2">monitoring</span>
            <p className="text-on-surface-variant font-medium text-sm">No analytics data for selected period</p>
          </div>
        )}
      </div>
    </div>
  );
}
