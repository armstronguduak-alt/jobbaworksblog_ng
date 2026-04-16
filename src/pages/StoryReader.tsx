import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import confetti from 'canvas-confetti';
import { SEO } from '../components/SEO';

export function StoryReader() {
  const { slug, chapterNum } = useParams();
  const { user } = useAuth();
  const { showAlert } = useDialog();
  const navigate = useNavigate();

  const [story, setStory] = useState<any>(null);
  const [chapter, setChapter] = useState<any>(null);
  const [allChapters, setAllChapters] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Progress & Earn Tracking
  const contentRef = useRef<HTMLDivElement>(null);
  const [hasScrolled80, setHasScrolled80] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);

  // Comments
  const [comments, setComments] = useState<any[]>([]);
  const [commentBody, setCommentBody] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    fetchChapterData();
    // Reset trackers on chapter change
    setHasScrolled80(false);
    setRewardClaimed(false);
    setComments([]);
  }, [slug, chapterNum]);

  const fetchChapterData = async () => {
    setIsLoading(true);
    try {
      const { data: s } = await supabase.from('stories').select('id, title, slug').eq('slug', slug).single();
      if (!s) return;
      setStory(s);

      const { data: chaptersMap } = await supabase.from('story_chapters').select('id, chapter_number, title').eq('story_id', s.id).order('chapter_number', { ascending: true });
      if (chaptersMap) setAllChapters(chaptersMap);

      const target = chaptersMap?.find(c => c.chapter_number.toString() === chapterNum);
      if (target) {
        const { data: ch } = await supabase.from('story_chapters').select('*').eq('id', target.id).single();
        if (ch) setChapter(ch);
        
        fetchComments(target.id);
      }
    } catch (err) {} finally { setIsLoading(false); }
  };

  const fetchComments = async (chapterId: string) => {
    const { data } = await supabase.from('story_comments').select('*, profiles:user_id(name, avatar_url)').eq('chapter_id', chapterId).order('created_at', { ascending: false });
    if (data) setComments(data);
  };

  const triggerReward = useCallback(async () => {
    if (!user || rewardClaimed || !chapter || !story) return;
    try {
      const res = await supabase.rpc('log_chapter_read', {
        _user_id: user.id,
        _chapter_id: chapter.id,
        _story_id: story.id,
        _reward_amount: 5 // 5 points for reading
      });
      if (res.data?.success) {
        setRewardClaimed(true);
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 }, colors: ['#6c5ce7', '#00b894'] });
        showAlert(`You earned 5 points for reading Chapter ${chapter.chapter_number}!`, 'Reward Claimed');
      }
    } catch (e) { console.error('Earning failed', e); }
  }, [user, rewardClaimed, chapter, story]);

  // Scroll Progress Hook
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current || hasScrolled80 || !user) return;
      
      // Calculate scroll completion percentage
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = (winScroll / height) * 100;
      
      if (scrolled > 80) {
        setHasScrolled80(true);
        triggerReward();
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasScrolled80, triggerReward, user]);


  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { showAlert('Please log in to comment and earn rewards.'); return; }
    if (!commentBody.trim() || !chapter) return;
    
    setIsSubmittingComment(true);
    try {
       // Insert comment
       await supabase.from('story_comments').insert({ user_id: user.id, chapter_id: chapter.id, content: commentBody });
       
       // Re-fetch
       fetchComments(chapter.id);
       setCommentBody('');

       // Simple manual logic to award 10pts - ideally a DB trigger but we do it manually safely
       const { data: pastTx } = await supabase.from('wallet_transactions').select('id').eq('user_id', user.id).eq('meta->>chapter_id', chapter.id).eq('type', 'comment_bonus');
       
       if (!pastTx || pastTx.length === 0) {
         // Fetch user's plan and comment reward
         const { data: userSub } = await supabase.from('user_subscriptions').select('plan_id').eq('user_id', user.id).maybeSingle();
         const planId = userSub?.plan_id || 'free';
         const { data: planData } = await supabase.from('subscription_plans').select('comment_reward').eq('id', planId).maybeSingle();
         const rewardAmt = Number(planData?.comment_reward || 0);

         if (rewardAmt > 0) {
           await supabase.from('wallet_transactions').insert({ user_id: user.id, amount: rewardAmt, type: 'comment_bonus', status: 'completed', description: 'Story comment reward', meta: { chapter_id: chapter.id }});
           await supabase.rpc('increment_wallet_balance', { amount: rewardAmt, target_user: user.id });
           confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
           showAlert(`You earned ₦${rewardAmt} for your comment!`, 'Comment Reward');
         } else {
           showAlert('Comment posted successfully.');
         }
       } else {
         showAlert('Comment posted successfully.');
       }

    } catch (err) { } finally { setIsSubmittingComment(false); }
  };

  const currentIndex = allChapters.findIndex(c => c.id === chapter?.id);
  const prevChapter = currentIndex > 0 ? allChapters[currentIndex - 1] : null;
  const nextChapter = currentIndex < allChapters.length - 1 ? allChapters[currentIndex + 1] : null;

  if (isLoading) return <div className="py-32 min-h-[60vh]" />;
  if (!chapter) return <div className="py-32 text-center font-headline">Chapter could not be loaded.</div>;

  return (
    <>
    <SEO
      title={`${chapter.title} — ${story.title}`}
      description={`Read Chapter ${chapter.chapter_number} of ${story.title} on JobbaWorks. Serialized fiction you'll love.`}
      url={`/stories/read/${story.slug}/${chapter.chapter_number}`}
      type="article"
      keywords={`${story.title}, chapter ${chapter.chapter_number}, webnovel, fiction, reading`}
      breadcrumbs={[
        { name: 'Home', url: '/' },
        { name: 'Stories', url: '/stories' },
        { name: story.title, url: `/stories/${story.slug}` },
        { name: `Chapter ${chapter.chapter_number}`, url: `/stories/read/${story.slug}/${chapter.chapter_number}` },
      ]}
    />
    <div className="bg-[#fcfdfc] min-h-screen font-serif pb-32">
       {/* Reader top bar */}
       <div className="sticky top-0 bg-[#fcfdfc]/95 backdrop-blur-md border-b border-slate-100 p-4 z-40 flex items-center justify-between shadow-[0px_4px_20px_rgba(0,0,0,0.02)]">
          <button onClick={() => navigate(`/stories/${story.slug}`)} className="text-slate-400 hover:text-slate-800 transition-colors">
            <span className="material-symbols-outlined text-[28px]">arrow_back</span>
          </button>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1 font-body">{story.title}</p>
            <h1 className="text-sm font-black text-slate-800 font-headline">Chap {chapter.chapter_number}</h1>
          </div>
          <div className="w-7"></div>
       </div>

       {/* Content */}
       <div className="max-w-2xl mx-auto px-6 py-12" ref={contentRef}>
         <h2 className="text-3xl md:text-4xl font-black font-headline text-slate-900 mb-10 leading-tight">
           {chapter.title}
         </h2>
         
         <div 
            className="prose prose-lg md:prose-xl max-w-none prose-slate prose-p:leading-loose prose-p:mb-6 prose-headings:font-headline prose-headings:text-slate-900 prose-blockquote:border-l-[#6c5ce7] prose-blockquote:text-slate-600 prose-a:text-[#6c5ce7] text-slate-800"
            style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
            dangerouslySetInnerHTML={{ __html: chapter.content }}
          />
       </div>

       {/* Chapter Navigation */}
       <div className="max-w-2xl mx-auto px-6 py-10 border-t border-slate-100 flex items-center justify-between font-body">
         {prevChapter ? (
           <Link to={`/stories/read/${story.slug}/${prevChapter.chapter_number}`} className="flex flex-col items-start min-w-[30%] group">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">keyboard_double_arrow_left</span> Previous</span>
              <span className="font-bold text-sm text-slate-700 group-hover:text-[#6c5ce7] truncate w-full text-left">{prevChapter.title}</span>
           </Link>
         ) : <div></div>}

         {nextChapter ? (
           <Link to={`/stories/read/${story.slug}/${nextChapter.chapter_number}`} className="flex flex-col items-end min-w-[30%] group text-right">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 flex items-center gap-1">Next <span className="material-symbols-outlined text-[12px]">keyboard_double_arrow_right</span></span>
              <span className="font-bold text-sm text-slate-700 group-hover:text-[#6c5ce7] truncate w-full text-right">{nextChapter.title}</span>
           </Link>
         ) : (
           <div className="text-center text-sm font-bold text-slate-400 uppercase tracking-widest">End of Available Chapters</div>
         )}
       </div>

       {/* Comments Section */}
       <div className="max-w-2xl mx-auto border-t-[8px] border-slate-50 pt-10 px-6 font-body">
         <h3 className="text-xl font-black font-headline text-slate-900 mb-6 flex items-center gap-2">
           <span className="material-symbols-outlined text-[#6c5ce7]">forum</span>
           Reader Thoughts <span className="text-sm font-bold text-slate-400 ml-1">({comments.length})</span>
         </h3>
         
         <form onSubmit={handleCommentSubmit} className="mb-10 relative">
           <textarea 
             value={commentBody}
             onChange={e => setCommentBody(e.target.value)}
             placeholder="Leave a comment to support the author and earn 10 points..."
             className="w-full bg-slate-50 border border-slate-200 focus:border-[#6c5ce7] focus:bg-white transition-colors rounded-2xl p-4 pr-16 resize-none outline-none min-h-[100px] text-sm font-medium"
             required
           />
           <button type="submit" disabled={isSubmittingComment} className="absolute bottom-4 right-4 bg-[#6c5ce7] text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#5b4bcc] disabled:opacity-50 shadow-md">
             <span className="material-symbols-outlined text-[18px]">send</span>
           </button>
         </form>

         <div className="space-y-6">
           {comments.length === 0 ? (
             <p className="text-slate-400 italic text-sm">Be the first to comment on this chapter!</p>
           ) : (
             comments.map(c => (
               <div key={c.id} className="flex gap-4">
                 <img src={c.profiles?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${c.profiles?.name || 'A'}`} className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-100" />
                 <div className="bg-slate-50 px-4 py-3 rounded-2xl rounded-tl-sm flex-1">
                   <div className="flex items-center justify-between mb-1">
                     <span className="font-bold text-xs text-slate-800">{c.profiles?.name || 'User'}</span>
                     <span className="text-[10px] text-slate-400 font-bold">{new Date(c.created_at).toLocaleDateString()}</span>
                   </div>
                   <p className="text-sm text-slate-600 leading-relaxed">{c.content}</p>
                 </div>
               </div>
             ))
           )}
         </div>
       </div>
    </div>
    </>
  );
}
