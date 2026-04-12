import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { fetchArticleData } from './PublicArticle';



export function Home() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All Feed');

  const queryClient = useQueryClient();

  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['publicPosts'],
    queryFn: async () => {
      const { data: categories } = await supabase.from('categories').select('*');
      
      const { data: posts } = await supabase
        .from('posts')
        .select(`
          id, title, slug, excerpt, featured_image, reading_time_seconds, published_at, created_at,
          category:categories(name),
          author:profiles!posts_author_user_id_fkey(name, username, avatar_url, is_verified)
        `)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });
        
      const allPosts: any[] = posts || [];

      return {
        categories: categories || [],
        featuredPosts: allPosts.slice(0, 4),
        latestPosts: allPosts
      };
    }
  });


  const featuredPosts = data?.featuredPosts || [];
  const latestPosts = data?.latestPosts || [];
  const categories = data?.categories || [];

  useEffect(() => {
    if (slug && categories.length > 0) {
      const category = categories.find((c: any) => c.slug === slug);
      if (category) {
        setActiveCategory(category.name);
      } else {
        setActiveCategory('All Feed');
      }
    } else if (!slug) {
      setActiveCategory('All Feed');
    }
  }, [slug, categories]);

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
          <div className="flex flex-col md:flex-row items-center gap-6 py-8 px-6 md:px-10 bg-gradient-to-br from-primary to-primary-container text-on-primary-container relative z-10">
            <div className="w-full md:w-1/2 space-y-4">
              <span className="inline-block px-3 py-1 rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed font-bold text-[10px] uppercase tracking-widest">
                Premium Tool for the Ambitious
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tighter leading-tight font-headline text-white">
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
                  className="w-full h-[250px] object-cover"
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
          onClick={() => navigate('/')}
          className={`flex-shrink-0 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors ${
            activeCategory === 'All Feed' ? 'bg-primary text-white shadow-md' : 'bg-surface-container-highest text-on-surface-variant hover:bg-primary-fixed-dim'
          }`}
        >
          All Feed
        </button>
        {categories.map((cat: any) => (
          <button
            key={cat.id}
            onClick={() => navigate(`/category/${cat.slug}`)}
            className={`flex-shrink-0 px-6 py-2.5 rounded-full font-semibold text-sm transition-colors ${
              activeCategory === cat.name ? 'bg-primary text-white shadow-md' : 'bg-surface-container-highest text-on-surface-variant hover:bg-primary-fixed-dim'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </nav>

      {/* Featured Bento Section */}
      <h2 className="text-2xl md:text-3xl font-bold font-headline mb-8 text-on-primary-fixed-variant">Featured Articles</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-20">
        {/* Large Featured Card */}
        <div className="md:col-span-8 group relative rounded-3xl overflow-hidden bg-surface-container-lowest shadow-[0px_20px_40px_rgba(0,33,16,0.06)] hover:shadow-xl transition-all duration-300 min-h-[300px] flex">
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
                <Link to={`/article/${featuredPosts[0].slug}`}>
                  <h3 className="text-2xl md:text-4xl font-bold text-white mb-4 leading-tight hover:underline cursor-pointer">{featuredPosts[0].title}</h3>
                </Link>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img
                      className="w-10 h-10 rounded-full border-2 border-white bg-white"
                      alt="author"
                      src={featuredPosts[0].author?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${featuredPosts[0].author?.name || 'Author'}`}
                    />
                    <Link to={`/author/${featuredPosts[0].author?.username || 'unknown'}`} className="text-white/90 text-sm font-medium hover:underline flex items-center gap-1">
                      {featuredPosts[0].author?.name || 'Author'}
                      {featuredPosts[0].author?.is_verified && <span className="material-symbols-outlined text-blue-400 text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>}
                      {' '}• {Math.ceil(featuredPosts[0].reading_time_seconds / 60)} min read
                    </Link>
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
        <div className="md:col-span-4 flex flex-col gap-4">
          {isLoading ? (
            <>
              <div className="bg-surface-container-low p-4 rounded-2xl h-24 animate-pulse"></div>
              <div className="bg-surface-container-low p-4 rounded-2xl h-24 animate-pulse"></div>
            </>
          ) : featuredPosts.length > 1 ? (
             featuredPosts.slice(1, 4).map((post) => (
              <div key={post.id} className="bg-surface-container-lowest p-3 rounded-2xl shadow-[0px_8px_16px_rgba(0,33,16,0.04)] hover:-translate-y-1 transition-all flex gap-3 h-[110px] border border-transparent hover:border-emerald-100 group">
                {post.featured_image ? (
                  <div className="w-24 h-full rounded-xl overflow-hidden flex-shrink-0 relative">
                     <img src={post.featured_image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={post.title} />
                     <div className="absolute top-1 max-w-[80%] left-1 bg-black/60 backdrop-blur-sm rounded text-white text-[8px] font-bold px-1.5 py-0.5 uppercase truncate">
                        {post.category?.name || 'Topic'}
                     </div>
                  </div>
                ) : (
                  <div className="w-24 h-full rounded-xl bg-surface-container flex items-center justify-center flex-shrink-0">
                     <span className="material-symbols-outlined text-outline">article</span>
                  </div>
                )}
                <div className="flex flex-col py-1 overflow-hidden pr-2">
                  <Link to={`/article/${post.slug}`} className="block">
                    <h4 className="text-sm font-bold text-on-surface leading-snug line-clamp-2 group-hover:text-primary transition-colors">{post.title}</h4>
                  </Link>
                  <div className="mt-auto flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                    <span>{timeAgo(post.created_at)}</span>
                    <span className="w-1 h-1 rounded-full bg-outline/30"></span>
                    <span className="text-emerald-700 font-bold">{Math.ceil(post.reading_time_seconds / 60)}m read</span>
                  </div>
                </div>
              </div>
            ))
          ) : null}

          {/* Upgrade CTA */}
          {!user && (
            <div className="bg-[#0f172a] text-white p-4 rounded-2xl shadow-xl flex items-center justify-between group overflow-hidden relative mt-auto border border-[#1e293b]">
              <div className="relative z-10 flex-1">
                <div className="flex items-center gap-1.5 mb-0.5">
                   <span className="material-symbols-outlined text-lg text-[#dcfce7]">verified_user</span>
                   <h4 className="text-sm font-bold">Join the LIT Club</h4>
                </div>
                <p className="text-[10px] opacity-80 max-w-[160px] leading-tight">Premium tasks & insights.</p>
              </div>
              <Link to="/signup" className="py-2 px-4 bg-[#006b3f] hover:bg-[#008751] text-white text-xs font-bold rounded-lg shadow-md active:scale-95 transition-all relative z-10 shrink-0">
                Join Now
              </Link>
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                <span className="material-symbols-outlined text-7xl">shield</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredLatest.map((post) => (
              <div 
                key={post.id} 
                className="bg-surface-container-lowest p-4 rounded-3xl flex flex-col h-full gap-3 shadow-sm border border-transparent hover:border-emerald-100 hover:-translate-y-1 transition-all group"
                onMouseEnter={() => {
                  queryClient.prefetchQuery({
                    queryKey: ['article', post.slug, user?.id],
                    queryFn: () => fetchArticleData(post.slug, user?.id),
                    staleTime: 5 * 60 * 1000
                  });
                }}
              >
                <div className="w-full aspect-[4/3] flex-shrink-0 rounded-2xl overflow-hidden bg-surface-container-highest relative">
                  {post.featured_image ? (
                    <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={post.title} src={post.featured_image} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">article</span>
                    </div>
                  )}
                  {/* Fake Tag/Label Overlay */}
                  <div className="absolute bottom-2 left-2 flex gap-1">
                    <span className="px-2 py-0.5 bg-black/60 backdrop-blur-md text-white rounded-md text-[9px] font-bold uppercase tracking-wider shadow-sm">
                      {post.category?.name || 'Topic'}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-col flex-grow">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400 text-[10px] font-medium">• {timeAgo(post.created_at)}</span>
                    <span className="text-emerald-700 text-[10px] font-bold">{Math.ceil(post.reading_time_seconds / 60)}m read</span>
                  </div>
                  <Link to={`/article/${post.slug}`} className="block flex-grow">
                    <h3 className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors cursor-pointer line-clamp-2 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-slate-500 text-xs mt-1.5 line-clamp-2 md:line-clamp-2 hidden sm:block">{post.excerpt}</p>
                  </Link>
                  
                  <div className="mt-3 pt-3 border-t border-surface-container-high flex items-center justify-between">
                     <span className="text-xs text-on-surface-variant font-medium group-hover:text-primary transition-colors flex items-center gap-1">
                        Read Story <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                     </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
