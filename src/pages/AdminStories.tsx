import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export function AdminStories() {
  const { isAdmin, isModerator, permissions, isLoading: authLoading } = useAuth();
  const hasAccess = isAdmin || (isModerator && permissions.includes('content'));
  const { showAlert } = useDialog();
  const [stories, setStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'published' | 'rejected'>('pending');

  const [selectedStory, setSelectedStory] = useState<any>(null);
  const [selectedStoryChapters, setSelectedStoryChapters] = useState<any[]>([]);
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    if (hasAccess) fetchStories();
  }, [activeTab, hasAccess]);

  const fetchStories = async () => {
    setIsLoading(true);
    try {
      const q = supabase.from('stories').select('*, profiles:author_id(name, email), story_chapters(id, status)');
      if (activeTab === 'pending') {
         q.in('status', ['draft', 'under_review']); // for MVP we preview drafts too
      } else {
         q.eq('status', activeTab);
      }
      const { data } = await q.order('updated_at', { ascending: false });
      if (data) setStories(data);
    } catch {} finally { setIsLoading(false); }
  };

  const loadStoryForReview = async (story: any) => {
    setSelectedStory(story);
    setIsReviewing(true);
    const { data } = await supabase.from('story_chapters').select('*').eq('story_id', story.id).order('chapter_number', { ascending: true });
    if (data) setSelectedStoryChapters(data);
  };

  const handleUpdateStatus = async (item: any, newStatus: string, type: 'story' | 'chapter', extraPayload?: any) => {
    try {
      const table = type === 'story' ? 'stories' : 'story_chapters';
      const { error } = await supabase.from(table).update({ status: newStatus, ...extraPayload }).eq('id', item.id);
      if (error) throw error;
      
      // Award 200 per chapter approval
      if (type === 'chapter' && newStatus === 'published') {
        const amount = 200;
        await supabase.from('wallet_transactions').insert({ 
          user_id: selectedStory.author_id, 
          amount: amount, 
          type: 'earning', 
          status: 'completed', 
          description: `Chapter ${item.chapter_number} publishing reward`, 
          meta: { chapter_id: item.id }
        });
        await supabase.rpc('increment_wallet_balance', { amount: amount, target_user: selectedStory.author_id });
      }

      showAlert(`Updated successfully to ${newStatus}`);
      if (type === 'story') {
        fetchStories();
        setIsReviewing(false);
      } else {
        // reload chapters inline
        const { data } = await supabase.from('story_chapters').select('*').eq('story_id', selectedStory.id).order('chapter_number', { ascending: true });
        if (data) setSelectedStoryChapters(data);
      }
    } catch (e: any) {
      showAlert(e.message, 'Error');
    }
  };

  const handleRejectStory = async () => {
     const reason = window.prompt("Rejection Reason:");
     if (reason === null) return;
     await handleUpdateStatus(selectedStory, 'rejected', 'story', { admin_feedback: reason });
  };

  const handleApproveStory = async () => {
     await handleUpdateStatus(selectedStory, 'published', 'story');
  };

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!hasAccess) return <Navigate to="/dashboard" replace />;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
       <h1 className="text-3xl font-black font-headline text-slate-900 mb-6 flex items-center gap-2">
         <span className="material-symbols-outlined text-primary text-4xl">local_library</span>
         Story Moderation
       </h1>

       {isReviewing && selectedStory ? (
         <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200 mb-8 animate-in slide-in-from-right-8">
            <button onClick={() => setIsReviewing(false)} className="mb-4 flex items-center gap-1 text-sm font-bold text-slate-400 hover:text-slate-800"><span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to List</button>
            
            <div className="flex gap-6 border-b border-slate-100 pb-6 mb-6">
              <img src={selectedStory.cover_image_url || 'https://via.placeholder.com/150'} className="w-32 h-48 object-cover rounded-xl shadow-sm bg-slate-100" />
              <div>
                <h2 className="text-2xl font-black text-slate-800">{selectedStory.title}</h2>
                <p className="font-bold text-slate-500 mb-2">By {selectedStory.profiles?.name}</p>
                <div className="flex gap-2 mb-4">
                  <span className="px-2 py-1 bg-slate-100 text-[10px] font-bold uppercase rounded">{selectedStory.age_rating}</span>
                  <span className="px-2 py-1 bg-amber-100 text-[10px] font-bold uppercase rounded">{selectedStory.status}</span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-3">{selectedStory.description}</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              <h3 className="font-bold text-lg text-slate-800">Submitted Chapters</h3>
              {selectedStoryChapters.map(ch => (
                <details key={ch.id} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                   <summary className="p-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors list-none flex items-center justify-between">
                     <span className="flex items-center gap-3">
                       <span className="material-symbols-outlined text-slate-400 group-open:rotate-90 transition-transform">chevron_right</span>
                       Chapter {ch.chapter_number}: {ch.title}
                     </span>
                     <span className="text-[10px] uppercase font-black px-2 py-1 bg-white border border-slate-200 rounded">{ch.status}</span>
                   </summary>
                   <div className="p-6 bg-white border-t border-slate-100">
                     <div dangerouslySetInnerHTML={{ __html: ch.content }} className="prose prose-sm max-w-none text-slate-600 mb-6" />
                     <div className="flex gap-2 pt-4 border-t border-slate-100">
                        {ch.status !== 'published' && <button onClick={() => handleUpdateStatus(ch, 'published', 'chapter')} className="bg-emerald-100 text-emerald-700 px-4 py-2 flex items-center gap-1 font-bold text-xs rounded hover:bg-emerald-200"><span className="material-symbols-outlined text-[16px]">check</span> Approve (₦200 to author)</button>}
                        {ch.status !== 'rejected' && <button onClick={() => handleUpdateStatus(ch, 'rejected', 'chapter')} className="bg-rose-100 text-rose-700 px-4 py-2 flex items-center gap-1 font-bold text-xs rounded hover:bg-rose-200"><span className="material-symbols-outlined text-[16px]">close</span> Reject</button>}
                     </div>
                   </div>
                </details>
              ))}
            </div>

            <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl justify-end">
              <button onClick={handleRejectStory} className="px-6 py-3 font-bold text-rose-600 hover:bg-rose-100 rounded-xl transition-colors">Reject Story</button>
              <button onClick={handleApproveStory} className="px-8 py-3 font-black text-white bg-primary hover:bg-emerald-700 rounded-xl transition-colors shadow-lg shadow-emerald-500/20">Approve & Publish Story</button>
            </div>
         </div>
       ) : (
         <>
           <div className="flex gap-2 mb-6 border-b border-slate-200 max-w-max">
             {(['pending', 'published', 'rejected'] as const).map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 font-bold text-sm uppercase tracking-wider relative ${activeTab === tab ? 'text-primary' : 'text-slate-400 hover:text-slate-700'}`}>
                 {tab}
                 {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-1bg-primary rounded-t-full bg-primary" />}
               </button>
             ))}
           </div>

           <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
             <table className="w-full text-left text-sm">
               <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200">
                 <tr>
                   <th className="p-4">Story</th>
                   <th className="p-4">Author</th>
                   <th className="p-4">Chapters</th>
                   <th className="p-4 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                 {isLoading ? <tr><td colSpan={4} className="p-8"></td></tr> : 
                  stories.length === 0 ? <tr><td colSpan={4} className="p-8 text-center text-slate-400">No stories found.</td></tr> :
                  stories.map(s => (
                   <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                     <td className="p-4">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-slate-200 rounded object-cover overflow-hidden"><img src={s.cover_image_url} className="w-full h-full object-cover"/></div>
                         <div className="font-bold text-slate-800">{s.title}</div>
                       </div>
                     </td>
                     <td className="p-4 text-slate-500">{s.profiles?.name}</td>
                     <td className="p-4 font-bold text-slate-600">{s.story_chapters?.length || 0}</td>
                     <td className="p-4 text-right">
                       <button onClick={() => loadStoryForReview(s)} className="text-primary font-bold bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-lg text-xs">Review Content</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
         </>
       )}
    </div>
  );
}
