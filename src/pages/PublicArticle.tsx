import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function PublicArticle() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  
  const [post, setPost] = useState<any>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  useEffect(() => {
    if (slug) fetchArticle();
  }, [slug, user]);

  const fetchArticle = async () => {
    setIsLoading(true);
    // Join posts with authored profile
    const { data: pData } = await supabase
      .from('posts')
      .select(`
        *,
        category:categories(name, slug),
        author:profiles!posts_author_user_id_fkey(user_id, username, name, avatar_url, is_verified)
      `)
      .eq('slug', slug)
      .eq('status', 'approved')
      .single();

    if (pData) {
      setPost(pData);
      
      // Check follow status if logged in
      if (user?.id && pData.author?.user_id) {
        const { data: fData } = await supabase
          .from('followers')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', pData.author.user_id)
          .maybeSingle();
        
        setIsFollowing(!!fData);
      }
    }
    setIsLoading(false);
  };

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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!post) return <div className="min-h-screen flex items-center justify-center text-error font-bold">Article not found.</div>;

  return (
    <article className="max-w-4xl mx-auto px-4 md:px-6 pt-12 pb-32">
      <div className="mb-8">
        {post.category && (
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs uppercase tracking-widest mb-4">
            {post.category.name}
          </span>
        )}
        <h1 className="text-4xl md:text-5xl font-black font-headline text-slate-900 leading-tight mb-6">
          {post.title}
        </h1>
        
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
        className="prose prose-lg md:prose-xl max-w-none prose-emerald prose-headings:font-headline"
        dangerouslySetInnerHTML={{ __html: post.content }}
      />
    </article>
  );
}
