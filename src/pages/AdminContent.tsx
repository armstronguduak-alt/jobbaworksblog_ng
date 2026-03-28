import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';

export function AdminContent() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { showAlert } = useDialog();
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
      const { data } = await supabase
        .from('posts')
        .select(`
          id, title, excerpt, status, created_at,
          profiles:author_user_id (name, email),
          categories:category_id (name)
        `)
        .in('status', ['pending', 'draft'])
        .order('created_at', { ascending: false });

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

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-32">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">Content Moderation</h1>
          <p className="text-on-surface-variant font-medium">Review, approve, and delete articles drafted by users.</p>
        </div>
        <Link to="/admin" className="text-primary font-bold hover:underline">Back to Overview</Link>
      </div>

      <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm overflow-hidden">
        <h2 className="text-lg font-bold font-headline mb-4 border-b border-surface-container pb-4 flex justify-between items-center">
          Pending Articles
          <button onClick={fetchPendingPosts} className="text-xs text-primary font-bold uppercase tracking-widest hover:underline px-2 py-1">Refresh</button>
        </h2>

        {isLoading ? (
          <div className="text-center py-10 text-on-surface-variant">Loading articles...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10 text-on-surface-variant bg-surface-container-low rounded-xl border-dashed border-2 border-surface-container">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">article</span>
            <p>No unpublished/pending articles found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="bg-surface-container-low p-5 rounded-[1.2rem] flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-surface-container hover:border-primary-fixed-dim/40 transition-all">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-highest px-2 py-0.5 rounded-full uppercase tracking-wider">{post.categories?.name || 'Uncategorized'}</span>
                    <span className="text-[10px] text-on-surface-variant">• {new Date(post.created_at).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-bold text-lg text-on-surface mb-1">{post.title}</h3>
                  <p className="text-sm text-on-surface-variant line-clamp-2 mb-2">{post.excerpt || 'No excerpt provided.'}</p>
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm text-on-surface-variant">person</span>
                    <span className="text-xs font-semibold text-on-surface">{post.profiles?.name || 'Unknown Author'} ({post.profiles?.email})</span>
                  </div>
                </div>
                
                <div className="flex flex-row md:flex-col gap-2 shrink-0 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-surface-container-highest">
                  <button 
                    onClick={() => handleUpdateStatus(post.id, 'approved')}
                    className="flex-1 md:flex-none justify-center bg-emerald-600 text-white text-sm px-4 py-2 rounded-xl font-bold hover:bg-emerald-700 shadow-sm transition-transform active:scale-95"
                  >
                    Approve
                  </button>
                  <button 
                    onClick={() => handleUpdateStatus(post.id, 'rejected')}
                    className="flex-1 md:flex-none justify-center bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-2 rounded-xl font-bold hover:bg-rose-100 shadow-sm transition-transform active:scale-95"
                  >
                    Reject
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
