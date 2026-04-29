import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCurrency } from '../hooks/useCurrency';
import { ArticleAnalyticsGraph } from '../components/ArticleAnalyticsGraph';

interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string | null;
  status: string;
  word_count: number;
  reading_time_seconds: number;
  views?: number;
  reads?: number;
  earnings?: number;
  created_at: string;
  published_at: string | null;
}

export function Articles() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const { showConfirm, showAlert } = useDialog();
  const { formatAmount } = useCurrency();

  const tabs = ['All Articles', 'Published', 'Drafts'];

  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ['my-articles', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('posts')
        .select('id, title, slug, excerpt, featured_image, status, word_count, reading_time_seconds, views, reads, earnings, created_at, published_at')
        .eq('author_user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Article[]) || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const { data: analyticsDaily = [] } = useQuery({
    queryKey: ['my-article-analytics', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('post_analytics_daily')
        .select('date, user_views, anonymous_views, post_id, posts!inner(author_user_id)')
        .eq('posts.author_user_id', user.id);
        
      if (error) {
        console.error('Analytics query error:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Real-time subscription — invalidates cache when posts change
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`articles-rt-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'posts', filter: `author_user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['my-articles', user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const handleDeleteArticle = async (id: string) => {
    const confirmed = await showConfirm('Are you sure you want to delete this article? This action cannot be undone.', 'Delete Article');
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      // Optimistically remove from cache
      queryClient.setQueryData(['my-articles', user?.id], (old: Article[]) => (old || []).filter(a => a.id !== id));
      showAlert('Article successfully deleted.', 'Success');
    } catch (err: any) {
      console.error(err);
      showAlert('Failed to delete article: ' + err.message, 'Error');
    }
  };

  // Filter by tab + search
  const filteredArticles = articles.filter((a) => {
    const matchesTab =
      activeTab === 'All' || activeTab === 'All Articles'
        ? true
        : activeTab === 'Published'
        ? a.status === 'approved'
        : (a.status === 'draft' || a.status === 'pending');

    const matchesSearch = searchQuery
      ? a.title.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return matchesTab && matchesSearch;
  });

  const totalViews = articles.reduce((sum, a) => sum + (a.views || 0), 0);
  const totalEarnings = articles.reduce((sum, a) => sum + (a.earnings || 0), 0);
  const publishedCount = articles.filter((a) => a.status === 'approved').length;

  const formatNumber = (n: number) =>
    n >= 1_000_000
      ? (n / 1_000_000).toFixed(1) + 'M'
      : n >= 1_000
      ? (n / 1_000).toFixed(1) + 'k'
      : n.toString();

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'Published', bg: 'bg-emerald-100 text-emerald-800' };
      case 'pending':
        return { label: 'Pending', bg: 'bg-amber-100 text-amber-800' };
      case 'rejected':
        return { label: 'Rejected', bg: 'bg-rose-100 text-rose-800' };
      default:
        return { label: 'Draft', bg: 'bg-surface-container-highest text-on-surface-variant' };
    }
  };

  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-32 space-y-8 w-full">
      {/* Summary Analytics Header */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-primary p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-lg group">
          <div className="absolute -right-4 -bottom-4 opacity-10 transition-transform group-hover:scale-110 duration-500">
            <span className="material-symbols-outlined text-[80px] md:text-[120px]">description</span>
          </div>
          <p className="text-primary-fixed text-xs md:text-sm font-semibold tracking-wider uppercase mb-2">My Articles</p>
          <h2 className="text-white text-3xl md:text-4xl font-black font-headline">{articles.length}</h2>
          <div className="mt-4 flex items-center gap-2 text-tertiary-fixed text-xs md:text-sm">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>{publishedCount} Published</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 md:p-8 rounded-3xl shadow-[0px_20px_40px_rgba(0,33,16,0.04)] border-b-4 border-emerald-100">
          <p className="text-outline text-xs md:text-sm font-semibold tracking-wider uppercase mb-2">Total Views</p>
          <h2 className="text-on-surface text-3xl md:text-4xl font-black font-headline">{formatNumber(totalViews)}</h2>
          <div className="mt-4 flex items-center gap-2 text-primary font-medium text-xs md:text-sm">
            <span className="material-symbols-outlined text-sm">visibility</span>
            <span>Across all articles</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-6 md:p-8 rounded-3xl shadow-[0px_20px_40px_rgba(0,33,16,0.04)] border-b-4 border-emerald-100">
          <p className="text-outline text-xs md:text-sm font-semibold tracking-wider uppercase mb-2">Total Earned</p>
          <h2 className="text-on-surface text-3xl md:text-4xl font-black font-headline">{formatAmount(totalEarnings)}</h2>
          <div className="mt-4 flex items-center gap-2 text-tertiary font-medium text-xs md:text-sm">
            <span className="material-symbols-outlined text-sm">payments</span>
            <span>From article reads</span>
        </div>
      </section>

      {/* Advanced Analytics Graph */}
      <ArticleAnalyticsGraph 
        data={analyticsDaily} 
        articles={articles.map(a => ({ id: a.id, title: a.title }))} 
      />

      {/* Filters and Search */}
      <section className="flex flex-col lg:flex-row gap-4 mb-6 items-start lg:items-center justify-between bg-surface-container-lowest p-4 rounded-3xl shadow-sm border border-emerald-50">
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-4 items-center">
          <Link
            to="/create-article"
            className="w-full sm:w-auto flex justify-center items-center gap-2 bg-gradient-to-br from-[#006b3f] to-[#008751] text-white px-6 py-3 md:py-4 rounded-xl shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all text-sm font-bold whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            Create New Article
          </Link>
          <div className="w-full sm:w-80 relative">
          <input
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 md:py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary-container/40 transition-all text-on-surface placeholder:text-outline text-sm md:text-base"
            placeholder="Search by title..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
        </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2 w-full lg:w-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === tab || (activeTab === 'All' && tab === 'All Articles')
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container-highest text-on-surface-variant hover:bg-emerald-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {/* Articles List/Table */}
      <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-[0px_20px_40px_rgba(0,33,16,0.04)]">
        {isLoading ? (
          <div className="py-20 min-h-[400px]"></div>
        ) : filteredArticles.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">article</span>
            <p className="text-on-surface-variant font-medium">
              {searchQuery ? 'No articles match your search.' : "You haven't written any articles yet."}
            </p>
            <Link
              to="/create-article"
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold text-sm mt-2 hover:bg-emerald-800 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Create Your First Article
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-surface-container-low/50">
                    <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-outline">Title</th>
                    <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-outline">Views</th>
                    <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-outline">Earnings</th>
                    <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-outline">Status</th>
                    <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-outline text-right">Date</th>
                    <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-outline text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container">
                  {filteredArticles.map((article) => {
                    const status = getStatusLabel(article.status);
                    return (
                      <tr key={article.id} className="group hover:bg-surface-container-low transition-colors">
                        <td className="px-6 md:px-8 py-4 md:py-6">
                          <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-secondary-container overflow-hidden shrink-0 flex items-center justify-center">
                              {article.featured_image ? (
                                <img alt="Thumbnail" className="w-full h-full object-cover" src={article.featured_image} />
                              ) : (
                                <span className="material-symbols-outlined text-outline">image</span>
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-on-surface text-sm md:text-base line-clamp-1">{article.title}</p>
                              <p className="text-xs md:text-sm text-outline">
                                {article.word_count} words • {Math.ceil(article.reading_time_seconds / 60)}m read
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-6">
                          <span className="text-on-surface font-semibold text-sm md:text-base">
                            {article.status === 'draft' ? '—' : formatNumber(article.views || 0)}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-6">
                          <span className={`font-bold text-sm md:text-base ${(article.earnings || 0) > 0 ? 'text-tertiary' : 'text-outline'}`}>
                            {formatAmount(article.earnings || 0)}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-6">
                          <span className={`${status.bg} text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2 md:px-3 py-1 rounded-full`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-6 md:px-8 py-4 md:py-6 text-right">
                          <span className="text-xs md:text-sm text-outline font-medium">{timeAgo(article.created_at)}</span>
                        </td>
                        <td className="px-4 md:px-6 py-4 md:py-6 text-right flex justify-end gap-2">
                          <Link 
                            to={`/edit-article/${article.id}`}
                            className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors flex items-center justify-center"
                            title="Edit Article"
                          >
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                          </Link>
                          <button 
                            onClick={() => handleDeleteArticle(article.id)}
                            className="text-error hover:bg-error/10 p-2 rounded-full transition-colors flex items-center justify-center"
                            title="Delete Article"
                          >
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row items-center justify-between bg-surface-container-low/30 gap-4">
              <p className="text-xs md:text-sm text-outline">
                Showing {filteredArticles.length} of {articles.length} articles
              </p>
            </div>
          </>
        )}
      </div>


    </main>
  );
}
