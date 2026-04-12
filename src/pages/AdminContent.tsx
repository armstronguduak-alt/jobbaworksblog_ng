import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';

export function AdminContent() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'drafts' | 'pending'>('all');
  
  const [stats, setStats] = useState({
    totalArticles: 0,
    totalViews: 0,
    totalPaidOut: 0
  });

  useEffect(() => {
    if (isAdmin) {
      fetchPendingPosts();
    }
  }, [isAdmin]);

  async function fetchPendingPosts() {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id, title, excerpt, content, status, created_at, author_user_id, featured_image,
          profiles:author_user_id (name, email),
          categories:category_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts from Supabase:', error);
      }

      if (data) setPosts(data);

      // Fetch Stats
      const [articlesRes, walletRes] = await Promise.all([
        supabase.from('posts').select('status, views'),
        supabase.from('wallet_transactions').select('amount').eq('type', 'withdrawal').eq('status', 'completed')
      ]);

      if (articlesRes.data) {
        const approved = articlesRes.data.filter(p => p.status === 'approved');
        const views = approved.reduce((sum, p) => sum + (p.views || 0), 0);
        
        let paidOut = 0;
        if (walletRes.data) {
          paidOut = walletRes.data.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        }

        setStats({
          totalArticles: approved.length,
          totalViews: views,
          totalPaidOut: paidOut
        });
      }
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredPosts = posts.filter(post => {
    if (filter === 'all') return true;
    if (filter === 'published') return post.status === 'approved';
    if (filter === 'drafts') return post.status === 'draft';
    if (filter === 'pending') return post.status === 'pending';
    return true;
  });

  const handleUpdateStatus = async (post: any, newStatus: string) => {
    let rejectionReason = '';
    if (newStatus === 'rejected') {
      const reason = window.prompt('Please provide a reason for rejecting this article (the author will be notified):');
      if (reason === null) return; // Admin cancelled the prompt
      rejectionReason = reason || 'Does not meet our content guidelines.';
    }

    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: newStatus })
        .eq('id', post.id);

      if (!error) {
        if (newStatus === 'approved') {
          // Trigger Follower Notifications
          await supabase.rpc('create_article_notifications', {
            p_article_id: post.id,
            p_author_id: post.author_user_id,
            p_title: post.title
          });
        } else if (newStatus === 'rejected') {
          await supabase.rpc('send_notification', {
            _user_id: post.author_user_id,
            _message: `Your article "${post.title}" was rejected. Reason: ${rejectionReason}`,
            _type: 'warning'
          });
        }
        
        setPosts(prev => prev.map(p => p.id === post.id ? { ...p, status: newStatus } : p).filter(p => newStatus !== 'approved' && newStatus !== 'rejected' || p.id !== post.id));
        showAlert(`Article ${newStatus} successfully.`);
        if (selectedPost && selectedPost.id === post.id) setSelectedPost(null);
      } else {
        showAlert('Failed to update article status.', 'Error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Error updating article.', 'Error');
    }
  };

  const handleDeleteArticle = async (id: string, title: string) => {
    const confirmed = await showConfirm(
      `Are you sure you want to permanently delete the article "${title}"?`,
      'Delete Article'
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', id);
      if (error) throw error;
      setPosts(prev => prev.filter(p => p.id !== id));
      showAlert('Article deleted successfully.', 'Success');
    } catch (err: any) {
      console.error(err);
      showAlert(`Error deleting article: ${err.message}`, 'Error');
    }
  };

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-10 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#dcfce7] text-[#006b3f] rounded-full mb-3">
            <span className="material-symbols-outlined text-sm">fact_check</span>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Moderation</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0f172a] tracking-tight mb-1 font-headline">Content Moderation</h1>
          <p className="text-outline text-sm md:text-base">Review, approve, and manage user-submitted articles.</p>
        </div>
      </div>
      
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white p-6 rounded-[2rem] border border-surface-container-highest/30 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-[100px] opacity-50 pointer-events-none"></div>
          <span className="material-symbols-outlined text-blue-500 mb-4 block text-3xl">article</span>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Articles</p>
          <h3 className="text-3xl font-black font-headline text-on-surface">{stats.totalArticles}</h3>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-surface-container-highest/30 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-[100px] opacity-50 pointer-events-none"></div>
          <span className="material-symbols-outlined text-purple-500 mb-4 block text-3xl">visibility</span>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Views</p>
          <h3 className="text-3xl font-black font-headline text-on-surface">{stats.totalViews.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-surface-container-highest/30 shadow-[0px_4px_20px_rgba(0,0,0,0.03)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-[100px] opacity-50 pointer-events-none"></div>
          <span className="material-symbols-outlined text-emerald-500 mb-4 block text-3xl">payments</span>
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Total Paid Out</p>
          <h3 className="text-3xl font-black font-headline text-on-surface">₦{stats.totalPaidOut.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
        </div>
      </div>

      <div className="bg-transparent overflow-hidden">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {[
            { id: 'all', label: 'All Articles' },
            { id: 'published', label: 'Published' },
            { id: 'drafts', label: 'Drafts' },
            { id: 'pending', label: 'Pending Review' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
                filter === f.id
                  ? 'bg-[#0f172a] text-white shadow-md'
                  : 'bg-white text-on-surface-variant border border-surface-container-high hover:bg-surface-container-lowest hover:border-[#0f172a]/30'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-black font-headline text-[#191c1d]">
            All Articles
          </h2>
          <button onClick={fetchPendingPosts} className="text-xs text-[#006b3f] bg-[#dcfce7] hover:bg-[#bbf7d0] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            Refresh
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-10 text-on-surface-variant">Loading articles...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-outline bg-white rounded-2xl border border-surface-container-low shadow-sm">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">article</span>
            <p className="font-bold">No articles found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPosts.map(post => (
              <div key={post.id} className="bg-white p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-surface-container-low shadow-[0px_4px_16px_-4px_rgba(0,0,0,0.02)] hover:shadow-md transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black text-[#191c1d] bg-surface-container-low px-2 py-1 rounded-md uppercase tracking-[0.1em]">{post.categories?.name || 'Uncategorized'}</span>
                    <span className="text-[10px] font-bold text-white bg-slate-800 px-2 py-1 rounded-md uppercase tracking-[0.1em]">{post.status}</span>
                    <span className="text-xs text-outline font-medium">{new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-black text-xl text-[#0f172a] mb-2 font-headline">{post.title}</h3>
                  <p className="text-sm text-outline line-clamp-2 mb-4 leading-relaxed">{post.excerpt || 'No excerpt provided.'}</p>
                  <div className="flex items-center gap-2 bg-[#f8f9fa] inline-flex px-3 py-1.5 rounded-lg">
                    <span className="material-symbols-outlined text-[16px] text-outline">account_circle</span>
                    <span className="text-xs font-bold text-[#191c1d]">{post.profiles?.name || 'Unknown Author'} <span className="text-outline font-medium">({post.profiles?.email})</span></span>
                  </div>
                </div>
                
                <div className="flex flex-row md:flex-col gap-3 shrink-0 w-full md:w-40 mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-surface-container-low md:pl-6 md:border-l">
                  <button 
                    onClick={() => setSelectedPost(post)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant text-sm px-4 py-2.5 rounded-xl font-bold transition-colors w-full mb-1"
                  >
                    <span className="material-symbols-outlined text-[18px]">visibility</span>
                    Review
                  </button>

                  {post.status !== 'approved' && (
                    <button 
                      onClick={() => handleUpdateStatus(post, 'approved')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-[#008751] hover:bg-[#006b3f] text-white text-sm px-4 py-2.5 rounded-xl font-bold transition-colors w-full"
                    >
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      Approve
                    </button>
                  )}
                  {post.status !== 'rejected' && (
                    <button 
                      onClick={() => handleUpdateStatus(post, 'rejected')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-sm px-4 py-2.5 rounded-xl font-bold transition-colors w-full"
                    >
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                      Reject
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteArticle(post.id, post.title)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-rose-600 hover:bg-rose-700 text-white text-sm px-4 py-2.5 rounded-xl font-bold transition-colors w-full mt-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-surface-container-low bg-surface-container-lowest">
              <h2 className="text-xl font-black font-headline text-on-surface">Reviewing: {selectedPost.title}</h2>
              <div className="flex items-center gap-4 border border-surface-container rounded-lg px-2 py-1 bg-white">
                <label className="text-[10px] font-bold text-outline">Reading time (s):</label>
                <input 
                  type="number"
                  min="0"
                  className="w-16 text-right outline-none text-sm font-bold text-on-surface"
                  value={selectedPost.reading_time_seconds || 0}
                  onChange={(e) => setSelectedPost({...selectedPost, reading_time_seconds: parseInt(e.target.value) || 0})}
                />
              </div>
              <button 
                onClick={() => setSelectedPost(null)}
                className="w-10 h-10 rounded-full hover:bg-surface-container flex items-center justify-center transition-colors shrink-0"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
              {selectedPost.featured_image && (
                <div className="w-full h-48 md:h-[300px] object-cover mb-6 rounded-2xl overflow-hidden shadow-sm">
                  <img src={selectedPost.featured_image} alt="Featured" className="w-full h-full object-cover" />
                </div>
              )}
              <h1 className="text-3xl md:text-5xl font-black mb-6 font-headline">{selectedPost.title}</h1>
              <div 
                className="prose prose-emerald article-content max-w-none text-on-surface-variant space-y-4 marker:text-primary prose-img:rounded-2xl prose-headings:font-headline break-words"
                dangerouslySetInnerHTML={{ __html: selectedPost.content || '<p>No content available.</p>' }}
              />
            </div>
            <div className="p-6 border-t border-surface-container-low bg-surface-container-lowest flex justify-end gap-4 shadow-[0px_-10px_20px_rgba(0,0,0,0.02)]">
              <button 
                onClick={() => handleUpdateStatus(selectedPost, 'rejected')}
                className="px-6 py-3 rounded-xl font-bold bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
              >
                Reject Article
              </button>
              <button 
                onClick={async () => {
                  try {
                    await supabase.from('posts').update({ reading_time_seconds: selectedPost.reading_time_seconds }).eq('id', selectedPost.id);
                    await handleUpdateStatus(selectedPost, 'approved');
                  } catch (e) {
                    console.error('Error saving reading time', e);
                  }
                }}
                className="px-8 py-3 rounded-xl font-bold bg-primary text-white hover:bg-emerald-700 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5"
              >
                Approve & Publish (Save changes)
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
