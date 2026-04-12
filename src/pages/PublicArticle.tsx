import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

export const fetchArticleData = async (slug: string, userId?: string) => {
  // Join posts with authored profile
  const { data: pData } = await supabase
    .from('posts')
    .select(`
      *,
      category:categories(id, name, slug),
      author:profiles!posts_author_user_id_fkey(user_id, username, name, avatar_url, is_verified)
    `)
    .eq('slug', slug)
    .eq('status', 'approved')
    .single();

  if (!pData) return null;

  let isVerified = pData.author?.is_verified || false;
  const { data: subData } = await supabase.from('user_subscriptions').select('plan_id').eq('user_id', pData.author?.user_id).maybeSingle();
  if (subData && subData.plan_id !== 'free') {
    isVerified = true;
  }
  pData.author.is_verified = isVerified;
  
  // Fetch Comments
  const { data: cData } = await supabase
    .from('post_comments')
    .select(`
      id, content, created_at,
      profiles!post_comments_user_id_fkey(name, username, avatar_url)
    `)
    .eq('post_id', pData.id)
    .order('created_at', { ascending: false });

  // Fetch Related Posts
  let rData: any[] = [];
  if (pData.category_id) {
    const { data } = await supabase
      .from('posts')
      .select('id, title, slug, featured_image, created_at, reading_time_seconds')
      .eq('status', 'approved')
      .eq('category_id', pData.category_id)
      .neq('id', pData.id)
      .order('created_at', { ascending: false })
      .limit(3);
    if (data) rData = data;
  }

  // Check follow status if logged in
  let fData = false;
  let hasRead = false;
  if (userId && pData.author?.user_id) {
    const { data } = await supabase
      .from('followers')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', pData.author.user_id)
      .maybeSingle();
    fData = !!data;
    
    // Check if user has already read this post online
    const { data: readData } = await supabase
      .from('post_reads')
      .select('id')
      .eq('post_id', pData.id)
      .eq('user_id', userId)
      .maybeSingle();
    hasRead = !!readData;
  }

  return {
    post: pData,
    comments: cData || [],
    relatedPosts: rData,
    isFollowing: fData,
    hasRead: hasRead
  };
};

export function PublicArticle() {
  const { slug } = useParams<{ slug: string }>();
  const { user, isLoading: authLoading } = useAuth();
  
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState('');
  const navigate = useNavigate();
  
  // Reading Timer State
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [readCompleted, setReadCompleted] = useState(false);
  const [totalTimeValue, setTotalTime] = useState<number>(0);

  // Fire view increment separately so it doesn't inflate on prefetches
  useEffect(() => {
    if (slug) {
      supabase.rpc('increment_view_count', { post_slug: slug }).then(({error}) => {
         if (error) console.error("View tracking error:", error);
      });
    }
  }, [slug]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['article', slug, user?.id],
    enabled: !!slug && !authLoading,
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchArticleData(slug!, user?.id)
  });

  const post = data?.post;
  const comments = data?.comments || [];
  const relatedPosts = data?.relatedPosts || [];

  useEffect(() => {
    if (data?.isFollowing !== undefined) {
      setIsFollowing(data.isFollowing);
    }
    if (data?.post && timeLeft === null && !readCompleted) {
      if (data.hasRead) {
        setReadCompleted(true);
      } else {
        const readSeconds = data.post.reading_time_seconds || 60;
        const readFlag = localStorage.getItem(`jobbaworks_read_${data.post.id}`);
        if (readFlag === 'true') {
          setReadCompleted(true);
        } else {
          setTimeLeft(readSeconds);
          setTotalTime(readSeconds);
        }
      }
    }
  }, [data]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    } else if (timeLeft === 0 && post) {
      setReadCompleted(true);
      localStorage.setItem(`jobbaworks_read_${post.id}`, 'true');
    }
  }, [timeLeft, post]);

  const toggleFollow = async () => {
    if (!user?.id || !post?.author) return;
    setIsFollowLoading(true);
    
    if (isFollowing) {
      await supabase.rpc('unfollow_user', { target_user_id: post.author.user_id });
    } else {
      await supabase.rpc('follow_user', { target_user_id: post.author.user_id });
    }
    
    setIsFollowing(!isFollowing);
    setIsFollowLoading(false);
  };

  const handlePostComment = async () => {
    if (!user?.id) return;
    if (!newComment.trim()) return;
    
    setIsSubmittingComment(true);
    setCommentSuccess('');
    
    try {
      const { data, error } = await supabase.rpc('submit_comment_with_reward', {
        _post_id: post.id,
        _content: newComment.trim()
      });

      if (error) {
        console.error('Comment error:', error.message);
      } else {
        const response = data as any;
        if (response.success) {
          setNewComment('');
          refetch();
          // If earned, redirect to earn page; otherwise show inline msg
          if (response.amount > 0) {
            navigate('/earn');
          } else {
            setCommentSuccess('Comment posted!');
            setTimeout(() => setCommentSuccess(''), 3000);
          }
        }
      }
    } catch (err: any) {
      console.error('Comment error:', err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-12 pb-32 animate-pulse space-y-6">
        <div className="h-6 w-24 bg-surface-container-high rounded-full mb-4"></div>
        <div className="h-10 md:h-14 w-3/4 bg-surface-container-high rounded-2xl mb-6"></div>
        <div className="h-14 w-full bg-surface-container-high rounded-2xl mb-8"></div>
        <div className="w-full h-[400px] bg-surface-container-high rounded-3xl mb-12"></div>
        <div className="space-y-4">
          <div className="h-5 w-full bg-surface-container-high rounded"></div>
          <div className="h-5 w-full bg-surface-container-high rounded"></div>
          <div className="h-5 w-5/6 bg-surface-container-high rounded"></div>
          <div className="h-5 w-full bg-surface-container-high rounded"></div>
        </div>
      </div>
    );
  }
  if (!post) return <div className="min-h-screen flex items-center justify-center text-error font-bold">Article not found.</div>;

  const totalTime = totalTimeValue;
  const progressPercentage = timeLeft !== null && totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 100;

  return (
    <article className="max-w-4xl mx-auto px-4 md:px-6 pt-12 pb-32 relative">
      
      {/* Floating Pie Countdown */}
      {timeLeft !== null && !readCompleted && (
        <div className="fixed bottom-6 right-6 md:bottom-12 md:right-12 z-50 bg-white p-3 rounded-full shadow-2xl border border-emerald-100 flex items-center justify-center">
          <div className="relative w-14 h-14 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-emerald-100"
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-emerald-500 transition-all duration-1000 ease-linear"
                strokeDasharray={`${progressPercentage}, 100`}
                strokeWidth="3"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
              <span className="text-xs font-black text-emerald-800">{timeLeft}s</span>
            </div>
          </div>
          <div className="absolute -top-10 right-0 whitespace-nowrap bg-emerald-900 text-white text-[10px] uppercase font-bold py-1 px-3 rounded-full shadow-md animate-pulse">
            Reading Task Active
          </div>
        </div>
      )}

      {/* Task Completed Alert */}
      {readCompleted && user && (
        <div className="fixed bottom-6 right-6 md:bottom-12 md:right-12 z-50 bg-emerald-500 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <span className="material-symbols-outlined text-3xl">check_circle</span>
          <div>
            <p className="font-bold text-sm leading-tight">{data?.hasRead ? "Reward Claimed ✓" : "Reading Verified!"}</p>
            {!data?.hasRead && <Link to="/earn" className="text-[10px] font-black uppercase underline hover:text-emerald-100">Claim Reward Now</Link>}
          </div>
        </div>
      )}

      <div className="mb-8">
        {post.category && (
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs uppercase tracking-widest mb-4">
            {post.category.name}
          </span>
        )}
        <h1 className="text-2xl md:text-3xl font-black font-headline text-slate-900 leading-tight mb-4">
          {post.title}
        </h1>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="px-3 py-1 bg-surface-container-highest rounded-full text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            {post.category?.name || 'Topic'}
          </span>
          <span className="px-3 py-1 bg-surface-container-highest rounded-full text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            JobbaWorks
          </span>
          <span className="px-3 py-1 bg-surface-container-highest rounded-full text-[10px] font-bold text-slate-600 uppercase tracking-wider">
            Growth
          </span>
        </div>
        
        {/* Author Card row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-4 border-y border-slate-100">
          <Link to={`/author/${post.author?.username || post.author?.user_id}`} className="flex items-center gap-4 group">
            <img 
              src={post.author?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${post.author?.name}`}
              className="w-12 h-12 rounded-full object-cover shadow-sm group-hover:ring-2 ring-primary transition-all"
            />
            <div>
              <p className="font-bold text-slate-900 flex items-center gap-1 group-hover:text-primary transition-colors">
                {post.author?.name || 'Unknown Author'}
                {post.author?.is_verified && <span className="material-symbols-outlined text-blue-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
              </p>
              <p className="text-xs text-slate-500 font-medium">@{post.author?.username || 'user'}</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold text-slate-400">{new Date(post.created_at).toLocaleDateString()}</span>
            <span className="text-sm font-bold text-slate-400">• {Math.ceil(post.reading_time_seconds / 60)} min read</span>
            
            {user?.id && user.id !== post.author?.user_id && (
              <button 
                onClick={toggleFollow}
                disabled={isFollowLoading}
                className={`ml-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${isFollowing ? 'bg-slate-100 text-slate-600' : 'bg-primary text-white hover:bg-emerald-800'}`}
              >
                {isFollowLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
          </div>
        </div>
      </div>

      {post.featured_image && (
        <div className="w-full h-[400px] md:h-[500px] mb-12 rounded-3xl overflow-hidden shadow-lg">
          <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      {post.summary && (
        <div className="text-xl font-medium text-slate-600 mb-10 leading-relaxed border-l-4 border-primary pl-6">
          {post.summary}
        </div>
      )}

      <div 
        className="prose prose-sm md:prose-base article-content max-w-none prose-emerald prose-headings:font-headline mb-8 whitespace-pre-wrap text-slate-800 leading-relaxed break-words"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
      
      {/* Read Also Section */}
      {relatedPosts.length > 0 && (
        <div className="my-10 p-5 md:p-6 bg-surface-container-lowest border-l-4 border-primary rounded-r-2xl shadow-[0px_4px_16px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 group cursor-pointer hover:border-emerald-600 transition-colors" onClick={() => window.location.href = `/article/${relatedPosts[0].slug}`}>
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-primary mb-1 block">Read Also</span>
            <span className="text-lg md:text-xl font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2">
              {relatedPosts[0].title}
            </span>
          </div>
          <div className="shrink-0 bg-primary/10 text-primary p-3 rounded-full group-hover:bg-primary group-hover:text-white transition-all self-start sm:self-center">
            <span className="material-symbols-outlined">arrow_forward</span>
          </div>
        </div>
      )}
      
      <hr className="border-t-2 border-surface-container-high mb-12 mt-10" />

      {/* Comment Section */}
      <section className="mb-12">
        <h3 className="text-lg font-black font-headline text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">chat_bubble</span>
          Comments <span className="text-sm font-semibold text-outline">({comments.length})</span>
        </h3>

        {/* Comment Input */}
        {user ? (
          <div className="mb-5 bg-surface-container-lowest border border-surface-container-low rounded-2xl p-4">
            <textarea 
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts..."
              rows={3}
              className="w-full bg-transparent text-sm outline-none resize-none placeholder:text-outline text-on-surface"
            />
            <div className="flex items-center justify-between pt-2 border-t border-surface-container">
              {commentSuccess && <span className="text-xs text-emerald-600 font-bold">{commentSuccess}</span>}
              {!commentSuccess && <span className="text-xs text-outline">Earning available per comment</span>}
              <button 
                onClick={handlePostComment}
                disabled={isSubmittingComment || !newComment.trim()}
                className="bg-primary text-white font-bold py-1.5 px-5 rounded-full text-sm hover:bg-emerald-800 disabled:opacity-40 transition-all"
              >
                {isSubmittingComment ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-5 bg-surface-container-lowest border border-surface-container-low rounded-2xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-bold text-sm text-on-surface">Join the conversation</p>
              <p className="text-xs text-outline">Sign in to comment and earn rewards</p>
            </div>
            <div className="flex gap-2 shrink-0">
              <Link to="/login" className="text-xs font-bold text-primary border border-primary/30 px-4 py-1.5 rounded-full hover:bg-primary/10 transition-colors">
                Log In
              </Link>
              <Link to="/signup" className="text-xs font-bold text-white bg-primary px-4 py-1.5 rounded-full hover:bg-emerald-800 transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-3">
          {comments.length === 0 ? (
            <p className="text-sm text-outline text-center py-6">No comments yet. Be the first!</p>
          ) : (
            comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-3">
                <img 
                  src={comment.profiles?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${comment.profiles?.name}`} 
                  alt={comment.profiles?.name}
                  className="w-8 h-8 rounded-full object-cover shrink-0 bg-surface-container"
                />
                <div className="flex-1 bg-surface-container-lowest rounded-2xl px-4 py-3 border border-surface-container-low">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="font-bold text-on-surface text-xs">{comment.profiles?.name}</span>
                    <span className="text-[10px] text-outline">@{comment.profiles?.username}</span>
                    <span className="text-[10px] text-outline ml-auto">{new Date(comment.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className="text-on-surface-variant text-sm">{comment.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Related Posts Section */}
      {relatedPosts.length > 0 && (
        <section>
          <h3 className="text-2xl font-black font-headline text-on-surface mb-8">Related Articles</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {relatedPosts.map(rp => (
              <Link key={rp.id} to={`/article/${rp.slug}`} className="group block">
                <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-surface-container-low mb-4">
                  {rp.featured_image ? (
                    <img src={rp.featured_image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center material-symbols-outlined text-4xl text-outline opacity-20">article</div>
                  )}
                </div>
                <h4 className="font-bold text-on-surface group-hover:text-primary transition-colors line-clamp-2">{rp.title}</h4>
                <div className="text-xs text-outline font-medium mt-2 flex items-center gap-2">
                  <span>{new Date(rp.created_at).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>{Math.ceil(rp.reading_time_seconds / 60)} min read</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
