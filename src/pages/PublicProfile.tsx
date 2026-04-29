import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

export function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const { user } = useAuth();
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const { data, isLoading, isPending } = useQuery({
    queryKey: ['public-profile', username, user?.id],
    queryFn: async () => {
      // 1. Fetch profile
      const { data: pData } = await supabase
        .from('profiles')
        .select('user_id, username, name, avatar_url, bio, followers_count, following_count, gender')
        .eq('username', username!)
        .maybeSingle();
      if (!pData) return null;

      // 2. Parallel: articles + subscription + follow status
      const [aRes, subRes, fRes] = await Promise.all([
        supabase.from('posts').select('id, title, slug, excerpt, reading_time_seconds, created_at, category:categories(slug)')
          .eq('author_user_id', pData.user_id).eq('status', 'approved').order('created_at', { ascending: false }),
        supabase.from('user_subscriptions').select('plan_id').eq('user_id', pData.user_id).maybeSingle(),
        user?.id
          ? supabase.from('followers').select('id').eq('follower_id', user.id).eq('following_id', pData.user_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const isVerified = pData.is_verified || (subRes.data?.plan_id && subRes.data.plan_id !== 'free');
      return {
        profile: { ...pData, is_verified: isVerified },
        articles: aRes.data || [],
        isFollowing: !!fRes.data,
      };
    },
    enabled: !!username,
    staleTime: 3 * 60 * 1000,
  });

  const [isFollowing, setIsFollowing] = useState<boolean | null>(null);
  const profile = data?.profile;
  const articles = data?.articles || [];
  // Use local state for follow if toggled, fallback to fetched value
  const following = isFollowing !== null ? isFollowing : (data?.isFollowing ?? false);

  const toggleFollow = async () => {
    if (!user?.id || !profile) return;
    setIsFollowLoading(true);
    if (following) {
      await supabase.rpc('unfollow_user', { target_user_id: profile.user_id });
    } else {
      await supabase.rpc('follow_user', { target_user_id: profile.user_id });
    }
    setIsFollowing(!following);
    setIsFollowLoading(false);
  };

  if (isLoading || isPending) return <div className="min-h-screen" />;
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-error font-bold">Profile not found.</div>;

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 pt-12 pb-32">
      <div className="bg-surface-container-lowest rounded-[2rem] p-8 shadow-xl relative overflow-hidden mb-8">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-primary to-tertiary opacity-90 z-0"/>
        
        <div className="relative z-10 mt-12 flex flex-col md:flex-row items-center md:items-end md:justify-between gap-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-32 h-32 rounded-full border-4 border-white overflow-hidden bg-white shadow-md">
              <img 
                src={profile.avatar_url || `https://api.dicebear.com/7.x/peeps/svg?seed=${profile.name}&face=${profile.gender?.toLowerCase() === 'female' ? 'smile' : 'cute'}`} 
                alt={profile.name} 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center md:text-left">
              <h1 className="text-3xl font-black font-headline text-slate-900 flex items-center justify-center md:justify-start gap-2">
                {profile.name}
                {profile.is_verified && <span className="material-symbols-outlined text-blue-500" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
              </h1>
              <p className="text-slate-500 font-bold">@{profile.username}</p>
              {profile.gender && (
                <span className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                  <span className="material-symbols-outlined text-[12px] mr-1">person</span>
                  {profile.gender}
                </span>
              )}
              <p className="mt-2 text-slate-700 max-w-lg">{profile.bio || "No bio provided yet."}</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-4 min-w-[120px]">
             {user?.id && user.id !== profile.user_id && (
               <button 
                 onClick={toggleFollow}
                 disabled={isFollowLoading}
                 className={`w-full py-2.5 rounded-xl font-bold transition-all ${following ? 'bg-surface-container-high text-slate-700 hover:bg-slate-300' : 'bg-primary text-white hover:bg-emerald-800 shadow-lg'}`}
               >
                 {isFollowLoading ? '...' : following ? 'Unfollow' : 'Follow'}
               </button>
             )}
          </div>
        </div>
        
        <div className="relative z-10 flex items-center justify-center md:justify-start gap-8 mt-8 border-t border-slate-100 pt-6">
          <div className="text-center">
             <p className="text-2xl font-black text-slate-900">{profile.followers_count || 0}</p>
             <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Followers</p>
          </div>
          <div className="text-center">
             <p className="text-2xl font-black text-slate-900">{profile.following_count || 0}</p>
             <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Following</p>
          </div>
          <div className="text-center">
             <p className="text-2xl font-black text-slate-900">{articles.length}</p>
             <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Articles</p>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold font-headline mb-6 text-slate-900">Published Articles</h2>
      {articles.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest rounded-3xl border border-slate-100">
          <p className="text-slate-500 font-bold">This author hasn't published any public articles yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {articles.map((post) => (
              <div key={post.id} className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-transparent hover:border-emerald-100 transition-all">
                <Link to={`/article/${post.slug}`}>
                  <h3 className="text-xl font-bold text-on-surface hover:text-primary transition-colors cursor-pointer mb-2">
                    {post.title}
                  </h3>
                </Link>
                {post.excerpt && (
                  <p className="text-slate-500 text-sm mb-4 line-clamp-2">{post.excerpt}</p>
                )}
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                  <span className="text-primary bg-primary/10 px-3 py-1 rounded-full">{Math.ceil(post.reading_time_seconds / 60)}m read</span>
                </div>
              </div>
            ))}
        </div>
      )}
    </main>
  );
}
