import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function MyStories() {
  const { user } = useAuth();
  const { showAlert, showConfirm } = useDialog();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: stories = [], isLoading } = useQuery<any[]>({
    queryKey: ['my-stories', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const { data, error } = await supabase
        .from('stories')
        .select(`id, title, slug, cover_image_url, status, total_reads, total_comments, created_at, story_chapters (id, chapter_number, status)`)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  // Realtime — invalidate cache on any story change
  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel(`my-stories-rt-${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories', filter: `author_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['my-stories', user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user?.id, queryClient]);


  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'published': return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">Published</span>;
      case 'under_review': return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">In Review</span>;
      case 'needs_revision': return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-100 text-orange-800">Revision Needed</span>;
      case 'rejected': return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800">Rejected</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800">Draft</span>;
    }
  };

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await showConfirm(`Are you sure you want to delete "${title}"? This will delete all chapters and cannot be undone.`, 'Delete Story');
    if (!confirmed) return;
    const { error } = await supabase.from('stories').delete().eq('id', id);
    if (!error) {
      // Optimistic cache update
      queryClient.setQueryData(['my-stories', user?.id], (old: any[]) => (old || []).filter(s => s.id !== id));
      showAlert('Story deleted.');
    } else {
      showAlert('Error deleting story.', 'Error');
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-on-surface font-headline tracking-tight">Writer's Studio</h1>
          <p className="text-on-surface-variant font-medium mt-1 text-sm">Manage your serialized fiction and track reader engagement.</p>
        </div>
        <Link 
          to="/stories/create"
          className="bg-primary text-white px-6 py-3 rounded-full font-bold shadow-md hover:bg-emerald-700 hover:shadow-lg transition-all flex items-center gap-2 w-max"
        >
          <span className="material-symbols-outlined text-[20px]">edit_document</span>
          Create New Story
        </Link>
      </div>

      {isLoading ? (
        <div className="bg-surface-container py-12 rounded-3xl text-center text-on-surface-variant animate-pulse">Loading studio data...</div>
      ) : stories.length === 0 ? (
        <div className="bg-surface-container-lowest border border-dashed border-outline-variant/40 rounded-[2rem] p-12 text-center text-on-surface-variant">
          <span className="material-symbols-outlined text-5xl mb-4 opacity-50">auto_stories</span>
          <h3 className="text-xl font-bold font-headline text-on-surface mb-2">No stories written yet</h3>
          <p className="mb-6">Start writing your first serialized fiction to earn points per chapter read!</p>
          <Link to="/stories/create" className="inline-flex items-center gap-2 bg-on-surface text-surface px-6 py-3 rounded-full font-bold hover:bg-primary transition-colors">
            Start Writing
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {stories.map(story => (
            <div key={story.id} className="bg-white rounded-2xl p-5 border border-surface-container-low shadow-[0px_4px_16px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row gap-5 hover:shadow-md transition-shadow">
              
              <div className="w-full sm:w-28 h-40 sm:h-auto bg-surface-container rounded-xl overflow-hidden shadow-sm shrink-0">
                {story.cover_image_url ? (
                  <img src={story.cover_image_url} className="w-full h-full object-cover" alt="Cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-outline-variant">
                    <span className="material-symbols-outlined text-4xl">image</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex justify-between items-start gap-2 mb-1 border-b border-surface-container-lowest pb-2">
                  <h3 className="font-bold text-lg font-headline text-[#0f172a] truncate">{story.title}</h3>
                  {getStatusBadge(story.status)}
                </div>
                
                <div className="flex gap-4 mb-4 mt-2">
                  <div className="text-center">
                    <p className="text-[10px] text-outline-variant font-bold uppercase tracking-widest mb-0.5">Reads</p>
                    <p className="font-black text-primary text-sm">{story.total_reads.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-outline-variant font-bold uppercase tracking-widest mb-0.5">Chapters</p>
                    <p className="font-black text-on-surface text-sm">{story.story_chapters?.length || 0}</p>
                  </div>
                </div>
                
                <div className="mt-auto grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => navigate(`/stories/create?id=${story.id}`)}
                    className="flex justify-center items-center gap-1 bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-bold py-2 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span> Add Chapter
                  </button>
                  <button 
                    onClick={() => handleDelete(story.id, story.title)}
                    className="flex justify-center items-center gap-1 border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold py-2 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">delete</span> Delete
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}
