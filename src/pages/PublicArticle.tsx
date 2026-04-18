import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import confetti from 'canvas-confetti';
import { SEO } from '../components/SEO';
import { ShareButton } from '../components/ShareButton';
import { DisplayAd, InArticleAd } from '../components/AdSense';

// FAST: Fetch only the core article data (title, content, image, author) — 1 network call
export const fetchArticleCore = async (slug: string) => {
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
  return pData;
};

// FULL: Fetch everything in parallel — all secondary queries run concurrently
export const fetchArticleData = async (slug: string, userId?: string) => {
  const pData = await fetchArticleCore(slug);
  if (!pData) return null;

  // Run ALL secondary queries in PARALLEL instead of sequentially
  const [subResult, commentsResult, relatedResult, trendResult, followResult, readResult] = await Promise.all([
    // 1. Author subscription check
    supabase.from('user_subscriptions').select('plan_id').eq('user_id', pData.author?.user_id).maybeSingle(),
    // 2. Comments
    supabase.from('post_comments').select('id, content, created_at, user_id').eq('post_id', pData.id).order('created_at', { ascending: false }).limit(50),
    // 3. Related posts
    pData.category_id
      ? supabase.from('posts').select('id, title, slug, featured_image, created_at, reading_time_seconds').eq('status', 'approved').eq('category_id', pData.category_id).neq('id', pData.id).order('created_at', { ascending: false }).limit(6)
      : Promise.resolve({ data: [] }),
    // 4. Trending "Read Also" posts
    supabase.from('posts').select('id, title, slug, featured_image, created_at, category:categories(slug)').eq('status', 'approved').neq('id', pData.id).order('views', { ascending: false }).limit(4),
    // 5. Follow status (only if logged in)
    userId && pData.author?.user_id
      ? supabase.from('followers').select('id').eq('follower_id', userId).eq('following_id', pData.author.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
    // 6. Read status (only if logged in)
    userId
      ? supabase.from('post_reads').select('id').eq('post_id', pData.id).eq('user_id', userId).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  // Apply author verification
  let isVerified = pData.author?.is_verified || false;
  if (subResult.data && subResult.data.plan_id !== 'free') isVerified = true;
  if (pData.author) pData.author.is_verified = isVerified;

  // Enrich comments with profiles (one extra call if comments exist)
  let cData: any[] = [];
  const rawComments = commentsResult.data;
  if (rawComments && rawComments.length > 0) {
    const userIds = [...new Set(rawComments.map((c: any) => c.user_id))];
    const { data: commentProfiles } = await supabase
      .from('profiles')
      .select('user_id, name, username, avatar_url')
      .in('user_id', userIds);
    
    const profileMap: Record<string, any> = {};
    (commentProfiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });
    cData = rawComments.map((c: any) => ({
      ...c,
      profiles: profileMap[c.user_id] || { name: 'Unknown', username: 'user' }
    }));
  }

  return {
    post: pData,
    comments: cData,
    relatedPosts: relatedResult.data || [],
    readAlsoPosts: trendResult.data || [],
    isFollowing: !!followResult.data,
    hasRead: !!readResult.data
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

  const getInitialArticleData = () => {
    if (typeof window !== 'undefined' && '__INITIAL_ARTICLE_DATA__' in window) {
      const initial = (window as any).__INITIAL_ARTICLE_DATA__;
      if (initial?.post?.slug === slug) {
        return initial;
      }
    }
    return undefined;
  };

  // Phase 1: Fetch article IMMEDIATELY — don't wait for auth
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['article', slug, user?.id],
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    initialData: getInitialArticleData(),
    placeholderData: (prev: any) => prev, // Keep old data visible during refetch
    queryFn: () => fetchArticleData(slug!, user?.id)
  });

  // Phase 2: Refetch with userId when auth resolves (to get follow/read status)
  useEffect(() => {
    if (!authLoading && user?.id && slug) {
      refetch();
    }
  }, [authLoading, user?.id]);

  const post = data?.post;
  const comments = data?.comments || [];
  const relatedPosts = data?.relatedPosts || [];
  const readAlsoPosts = data?.readAlsoPosts || [];

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
        setCommentSuccess('Error: ' + error.message);
      } else {
        const response = data as any;
        if (response.success) {
          setNewComment('');
          refetch();
          refetch();
          if (response.amount > 0) {
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
          }
          setCommentSuccess('Comment posted! ' + (response.message || ''));
          setTimeout(() => setCommentSuccess(''), 4000);
        }
      }
    } catch (err: any) {
      console.error('Comment error:', err.message);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  if (isLoading && !data) {
    return <div className="max-w-4xl mx-auto px-4 md:px-6 pt-12 pb-32 min-h-screen" />;
  }
  if (!post) return <div className="min-h-screen flex items-center justify-center text-error font-bold">Article not found.</div>;

  const totalTime = totalTimeValue;
  const progressPercentage = timeLeft !== null && totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 100;

  // Extract plain text excerpt for SEO description
  const seoExcerpt = post.content ? (() => { const tmp = document.createElement('div'); tmp.innerHTML = post.content; return tmp.textContent?.substring(0, 155) + '...' || ''; })() : post.title;
  const categorySlug = post.category?.slug || 'post';

  return (
    <>
    <SEO
      title={post.title}
      description={seoExcerpt}
      image={post.featured_image}
      url={`/${categorySlug}/${post.slug}`}
      type="article"
      author={post.author?.name}
      datePublished={post.created_at}
      dateModified={post.updated_at || post.created_at}
      articleBody={seoExcerpt}
      keywords={`${post.category?.name || ''}, blog, article, JobbaWorks`}
      breadcrumbs={[
        { name: 'Home', url: '/' },
        { name: post.category?.name || 'Article', url: `/${categorySlug}` },
        { name: post.title, url: `/${categorySlug}/${post.slug}` },
      ]}
    />
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
              loading="lazy"
              alt={post.author?.name}
            />
            <div>
              <p className="font-bold text-slate-900 flex items-center gap-1 group-hover:text-primary transition-colors">
                {post.author?.name || 'Unknown Author'}
                {post.author?.is_verified && <span className="material-symbols-outlined text-blue-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
              </p>
              <p className="text-xs text-slate-500 font-medium">@{post.author?.username || 'user'}</p>
            </div>
          </Link>
          
          <div className="flex items-center gap-2 md:gap-4 flex-wrap">
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
            <ShareButton url={`/${categorySlug}/${post.slug}`} title={post.title} description={seoExcerpt} image={post.featured_image} />
          </div>
        </div>
      </div>

      {/* Ad: Before Article Content */}
      <DisplayAd className="my-8" />

      {post.featured_image && (
        <div className="w-full mb-12 rounded-3xl overflow-hidden shadow-lg border border-surface-container-low">
          <img src={post.featured_image} alt={post.title} className="w-full h-auto object-cover" />
        </div>
      )}

      {post.summary && (
        <div className="text-xl font-medium text-slate-600 mb-10 leading-relaxed border-l-4 border-primary pl-6">
          {post.summary}
        </div>
      )}

      {/* Render Article Body With Inserted Read Also */}
      {(() => {
        const content = post.content || '';
        const parts = content.split('</p>');
        
        if (parts.length <= 2 || readAlsoPosts.length === 0) {
          return (
            <div 
              className="prose prose-sm md:prose-base article-content max-w-none prose-emerald prose-headings:font-headline mb-8 whitespace-pre-wrap text-slate-800 leading-relaxed break-words"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          );
        }

        const insertIndex = Math.min(2, parts.length - 1);
        const beforeContent = parts.slice(0, insertIndex).join('</p>') + (parts[0].includes('</p>') || insertIndex > 0 ? '</p>' : '');
        const afterContent = parts.slice(insertIndex).join('</p>');

        return (
          <>
            <div 
              className="prose prose-sm md:prose-base article-content max-w-none prose-emerald prose-headings:font-headline whitespace-pre-wrap text-slate-800 leading-relaxed break-words"
              dangerouslySetInnerHTML={{ __html: beforeContent }} 
            />
            
            <div className="read-also my-8 p-5 bg-[#f8faf9] border-l-4 border-emerald-600 rounded-r-2xl shadow-[0px_4px_16px_rgba(0,0,0,0.03)] clear-both overflow-hidden">
              <h4 className="text-xs font-black uppercase tracking-widest text-[#006b3f] mb-4 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">bolt</span> Read Also
              </h4>
              <div className="flex flex-col gap-3">
                {readAlsoPosts.map((item: any, idx: number) => (
                  <a key={idx} href={`/${item.category?.slug || 'post'}/${item.slug}`} className="flex items-center gap-4 group cursor-pointer no-underline block hover:bg-white p-2.5 rounded-xl transition-all border border-transparent hover:border-surface-container-low shadow-sm hover:shadow-md shrink-0">
                    {item.image || item.featured_image ? (
                      <img src={item.image || item.featured_image} loading="lazy" className="w-16 h-16 md:w-20 md:h-20 rounded-lg object-cover shrink-0 bg-surface-container" alt={item.title} />
                    ) : (
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-400 shrink-0"><span className="material-symbols-outlined text-3xl">article</span></div>
                    )}
                    <div className="flex-1">
                      <h5 className="text-sm md:text-base font-bold text-[#0f172a] group-hover:text-primary transition-colors line-clamp-2 m-0 leading-tight">{item.title}</h5>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            <div 
              className="prose prose-sm md:prose-base article-content max-w-none prose-emerald prose-headings:font-headline mb-8 whitespace-pre-wrap text-slate-800 leading-relaxed break-words"
              dangerouslySetInnerHTML={{ __html: afterContent }} 
            />

            {/* Ad: In-Article (after Read Also) */}
            <InArticleAd className="my-8" />
          </>
        );
      })()}
      
      {/* Share Strip */}
      <div className="flex items-center justify-between py-4 mt-4 border-t-2 border-b-2 border-surface-container-high mb-12">
        <div className="flex items-center gap-2 text-on-surface-variant text-sm">
          <span className="material-symbols-outlined text-[18px]">visibility</span>
          <span className="font-medium">{post.views?.toLocaleString() || 0} views</span>
        </div>
        <ShareButton url={`/${categorySlug}/${post.slug}`} title={post.title} description={seoExcerpt} image={post.featured_image} />
      </div>

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
                  loading="lazy"
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

      {/* Ad: After Comments */}
      <DisplayAd className="my-10" />

      {/* Related Articles Section */}
      {relatedPosts.length > 0 && (
        <section className="related-articles mt-16 pt-10 border-t border-surface-container">
          <h3 className="text-xl md:text-2xl font-black font-headline text-[#0f172a] mb-6">Related Articles</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {relatedPosts.map((rp: any) => (
              <Link key={rp.slug} to={`/${post.category?.slug || 'post'}/${rp.slug}`} className="group flex flex-row sm:flex-col gap-3 sm:gap-0 bg-surface-container-lowest sm:bg-transparent p-2 sm:p-0 rounded-2xl sm:rounded-none border border-surface-container-low sm:border-transparent h-[100px] sm:h-auto">
                <div className="w-[100px] sm:w-full h-full sm:h-auto sm:aspect-[4/3] shrink-0 rounded-xl overflow-hidden bg-surface-container-low sm:mb-3 shadow-sm relative border border-surface-container-low/50">
                  {rp.featured_image || rp.image ? (
                    <img src={rp.featured_image || rp.image} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={rp.title} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center material-symbols-outlined text-4xl text-outline opacity-20">article</div>
                  )}
                </div>
                <h4 className="font-bold text-sm md:text-base text-on-surface group-hover:text-primary transition-colors line-clamp-2 leading-tight flex-grow sm:mt-0 mt-1 pr-2">{rp.title}</h4>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
    </>
  );
}
