import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string | null;
  reading_time_seconds: number;
  published_at: string;
  created_at: string;
  category: { name: string } | null;
  author: { name: string; avatar_url: string | null } | null;
}

export function Home() {
  const [activeCategory, setActiveCategory] = useState('All Feed');

  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['publicPosts'],
    queryFn: async () => {
      const [catRes, postsRes] = await Promise.all([
        supabase.from('categories').select('id, name, slug').eq('is_active', true),
        supabase.from('posts').select(
          'id, title, slug, excerpt, featured_image, reading_time_seconds, published_at, created_at, category_id, author_user_id'
        ).eq('status', 'approved').order('created_at', { ascending: false }).limit(12)
      ]);

      const categories = catRes.data || [];
      const posts = postsRes.data || [];

      // Fetch profiles for all unique author IDs
      const authorIds = [...new Set(posts.map((p: any) => p.author_user_id).filter(Boolean))];
      let profilesMap: Record<string, any> = {};
      if (authorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, name, avatar_url')
          .in('user_id', authorIds);
        (profilesData || []).forEach((p: any) => { profilesMap[p.user_id] = p; });
      }

      // Fetch category names for all unique category IDs
      const catIds = [...new Set(posts.map((p: any) => p.category_id).filter(Boolean))];
      let catsMap: Record<string, any> = {};
      if (catIds.length > 0) {
        const { data: catsData } = await supabase
          .from('categories')
          .select('id, name')
          .in('id', catIds);
        (catsData || []).forEach((c: any) => { catsMap[c.id] = c; });
      }

      const normalized = posts.map((p: any) => ({
        ...p,
        category: catsMap[p.category_id] || null,
        author: profilesMap[p.author_user_id] || null,
      }));

      return {
        categories,
        featuredPosts: normalized.slice(0, 3) as Post[],
        latestPosts: normalized.slice(3) as Post[],
      };
    }
  });


  const featuredPosts = data?.featuredPosts || [];
  const latestPosts = data?.latestPosts || [];
  const categories = data?.categories || [];

  const filteredLatest = activeCategory === 'All Feed'
    ? latestPosts
    : latestPosts.filter(p => p.category?.name === activeCategory);

  const timeAgo = (date: string) => {
    if (!date) return '';
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-32 w-full">
      {/* Hero Section */}
      {!user && (
        <section className="relative overflow-hidden mb-20 rounded-3xl shadow-xl">
          <div className="flex flex-col md:flex-row items-center gap-12 py-12 px-6 md:px-16 bg-gradient-to-br from-primary to-primary-container text-on-primary-container relative z-10">
            <div className="w-full md:w-1/2 space-y-6">
              <span className="inline-block px-4 py-1.5 rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed font-bold text-xs uppercase tracking-widest">
                Premium Tool for the Ambitious
              </span>
              <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter leading-tight font-headline text-white">
                Turn your focus into <span className="text-tertiary-fixed-dim">wealth.</span>
              </h1>
              <p className="text-lg opacity-90 max-w-lg font-body leading-relaxed">
                The ultimate destination for professional growth and daily rewards. Engage with top-tier content and get paid for your attention.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Link to="/signup" className="bg-white text-primary hover:bg-surface-container-lowest transition-all px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg shadow-xl active:scale-95 duration-200">
                  Start Earning
                </Link>
                <Link to="/login" className="bg-transparent border-2 border-white/30 text-white hover:bg-white/10 transition-all px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg backdrop-blur-sm">
                  Login
                </Link>
              </div>
            </div>
            <div className="w-full md:w-1/2 relative hidden md:block">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
                <img
                  className="w-full h-[400px] object-cover"
                  alt="Professional financial dashboard"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBq1CeKILoKqcBKgFdJn0PvEentEGBVdRE-y2-bbnopQXg2uMW9UpBxSQHcRpncxlj1Zn8p9PTAYZT3mOaWvnah82sKTHi6t40s8rN2qlK80L3ELEeSjLYUIQgo_3k7Dj7wnlBkZXA4R71dehM-F7sBQEY7mJ2ZMVLZ8dAQNN4D9v8o6906hhEn13c_SsK8DTSrkrfq_Boi1uSQVHdnlAvY-A05ukAGOvhUzGToOpGY_vDb2UiPd-TGRzph2DrnZHH0SfUj8vtkoQs"
                />
              </div>
            </div>
          </div>
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-tertiary-fixed-dim/20 rounded-full blur-3xl hidden md:block" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-container/30 rounded-full blur-3xl hidden md:block" />
        </section>
      )}

      {/* Category Filter */}
      <nav className="flex flex-nowrap items-center gap-3 mb-12 overflow-x-auto pb-4 scrollbar-hide">
        <button
          onClick={() => setActiveCategory('All Feed')}
          className={`flex-shrink-0 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors ${
            activeCategory === 'All Feed' ? 'bg-primary text-white shadow-md' : 'bg-surface-container-highest text-on-surface-variant hover:bg-primary-fixed-dim'
          }`}
        >
          All Feed
        </button>
        {categories.map((cat: any) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.name)}
            className={`flex-shrink-0 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors ${
              activeCategory === cat.name ? 'bg-primary text-white shadow-md' : 'bg-surface-container-highest text-on-surface-variant hover:bg-primary-fixed-dim'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </nav>

      {/* Featured Bento Section */}
      <h2 className="text-2xl md:text-3xl font-bold font-headline mb-8 text-on-primary-fixed-variant">Featured Insights</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-20">
        {/* Large Featured Card */}
        <div className="md:col-span-8 group relative rounded-3xl overflow-hidden bg-surface-container-lowest shadow-[0px_20px_40px_rgba(0,33,16,0.06)] hover:shadow-xl transition-all duration-300 min-h-[400px] flex">
          {isLoading ? (
            <div className="w-full h-full bg-surface-container-low animate-pulse"></div>
          ) : featuredPosts[0] ? (
            <>
              {featuredPosts[0].featured_image ? (
                <img
                  className="w-full object-cover group-hover:scale-105 transition-transform duration-700 h-full absolute inset-0"
                  alt={featuredPosts[0].title}
                  src={featuredPosts[0].featured_image}
                />
              ) : (
                <div className="w-full bg-gradient-to-br from-primary/20 to-primary-container/30 flex items-center justify-center h-full absolute inset-0">
                  <span className="material-symbols-outlined text-[80px] text-primary/20">article</span>
                </div>
              )}
              <div className="relative z-10 w-full bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-12 mt-auto min-h-[60%]">
                <span className="inline-block self-start px-3 py-1 rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed font-bold text-xs mb-4">
                  {featuredPosts[0].category?.name || 'Featured'}
                </span>
                <h3 className="text-2xl md:text-4xl font-bold text-white mb-4 leading-tight">{featuredPosts[0].title}</h3>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      className="w-10 h-10 rounded-full border-2 border-white bg-white"
                      alt="author"
                      src={featuredPosts[0].author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${featuredPosts[0].author?.name || 'Author'}`}
                    />
                    <span className="text-white/90 text-sm font-medium">
                      {featuredPosts[0].author?.name || 'Author'} • {Math.ceil(featuredPosts[0].reading_time_seconds / 60)} min read
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full flex items-center justify-center flex-col gap-4">
              <span className="material-symbols-outlined text-[64px] text-on-surface-variant/30">auto_awesome</span>
              <p className="font-bold text-on-surface-variant">Featured articles will appear here.</p>
            </div>
          )}
        </div>

        {/* Side Items */}
        <div className="md:col-span-4 flex flex-col gap-6">
          {isLoading ? (
            <>
              <div className="bg-surface-container-low p-6 rounded-3xl h-32 animate-pulse"></div>
              <div className="bg-surface-container-low p-6 rounded-3xl h-32 animate-pulse"></div>
            </>
          ) : featuredPosts.length > 1 ? (
             featuredPosts.slice(1, 3).map((post) => (
              <div key={post.id} className="bg-surface-container-lowest p-6 rounded-3xl shadow-[0px_20px_40px_rgba(0,33,16,0.06)] hover:-translate-y-1 transition-all">
                <span className="text-primary font-bold text-xs uppercase tracking-tighter mb-2 block">{post.category?.name || 'Article'}</span>
                <h4 className="text-xl font-bold text-on-surface mb-3 leading-snug line-clamp-2">{post.title}</h4>
                <div className="flex items-center justify-between mt-4">
                  <span className="text-slate-400 text-xs font-medium">{Math.ceil(post.reading_time_seconds / 60)} min read</span>
                  <span className="text-xs text-on-surface-variant">{timeAgo(post.created_at)}</span>
                </div>
              </div>
            ))
          ) : null}

          {/* Upgrade CTA */}
          {!user && (
            <div className="bg-[#0f172a] text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between h-full relative overflow-hidden">
              <div>
                <span className="material-symbols-outlined text-4xl mb-4 text-[#dcfce7]">verified_user</span>
                <h4 className="text-lg font-bold mb-2">Join the LIT Club</h4>
                <p className="text-sm opacity-80">Get access to premium high-paying tasks and executive insights.</p>
              </div>
              <Link to="/signup" className="mt-6 w-full py-3 bg-[#006b3f] hover:bg-[#008751] text-white font-bold rounded-xl active:scale-95 transition-all relative z-10 text-center block">
                Get Started
              </Link>
              <div className="absolute -right-10 -bottom-10 opacity-10">
                <span className="material-symbols-outlined text-9xl">shield</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Latest Posts Feed */}
      <section className="mb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold font-headline text-on-primary-fixed-variant">Latest for You</h2>
        </div>
        
        {isLoading ? (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-surface-container-low h-32 w-full rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredLatest.length === 0 ? (
          <div className="py-16 text-center bg-surface-container-lowest rounded-3xl shadow-sm border border-surface-container">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3 block">article</span>
            <p className="text-on-surface-variant font-medium">No articles found right now. Check back later!</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredLatest.map((post) => (
              <div key={post.id} className="bg-surface-container-lowest p-5 rounded-3xl flex flex-col md:flex-row items-center gap-6 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-transparent hover:border-emerald-100 transition-all">
                <div className="w-full md:w-48 h-40 md:h-32 flex-shrink-0 rounded-2xl overflow-hidden bg-surface-container-highest">
                  {post.featured_image ? (
                    <img className="w-full h-full object-cover" alt={post.title} src={post.featured_image} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">article</span>
                    </div>
                  )}
                </div>
                <div className="flex-grow w-full">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-surface-container-high rounded-full text-[10px] font-bold text-slate-500 uppercase">
                      {post.category?.name || 'Article'}
                    </span>
                    <span className="text-slate-400 text-xs">• {timeAgo(post.created_at)}</span>
                  </div>
                  <h3 className="text-xl font-bold text-on-surface hover:text-primary transition-colors cursor-pointer line-clamp-1">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-slate-500 text-sm mt-1 line-clamp-2 md:line-clamp-1">{post.excerpt}</p>
                  )}
                </div>
                <div className="w-full md:w-auto flex flex-row md:flex-col items-center justify-between gap-4 border-t md:border-t-0 md:border-l border-surface-container pt-4 md:pt-0 md:pl-8">
                  <div className="text-right">
                    <p className="text-xs text-slate-400 font-medium md:text-right text-left">Read Time</p>
                    <p className="text-lg font-black text-emerald-700">{Math.ceil(post.reading_time_seconds / 60)}m</p>
                  </div>
                  <Link to="/signup" className="bg-primary-container text-on-primary-container px-6 py-2 rounded-full font-bold text-sm shadow-md active:scale-95 transition-all w-full md:w-auto text-center">
                    Read Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
