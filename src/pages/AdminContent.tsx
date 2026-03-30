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
          id, title, excerpt, status, created_at,
          profiles:author_user_id (name, email),
          categories:category_id (name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching posts from Supabase:', error);
      }

      if (data) setPosts(data);
    } catch (err) {
      console.error('Error fetching posts:', err);
    } finally {
      setIsLoading(false);
    }
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status: newStatus })
        .eq('id', id);

      if (!error) {
        setPosts(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p).filter(p => newStatus !== 'approved' && newStatus !== 'rejected' || p.id !== id));
        showAlert(`Article ${newStatus} successfully.`);
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

      <div className="bg-transparent overflow-hidden">
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
            {posts.map(post => (
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
                  {post.status !== 'approved' && (
                    <button 
                      onClick={() => handleUpdateStatus(post.id, 'approved')}
                      className="flex-1 md:flex-none flex items-center justify-center gap-1 bg-[#008751] hover:bg-[#006b3f] text-white text-sm px-4 py-2.5 rounded-xl font-bold transition-colors w-full"
                    >
                      <span className="material-symbols-outlined text-[18px]">check_circle</span>
                      Approve
                    </button>
                  )}
                  {post.status !== 'rejected' && (
                    <button 
                      onClick={() => handleUpdateStatus(post.id, 'rejected')}
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
    </main>
  );
}
