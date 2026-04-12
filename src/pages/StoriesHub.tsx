import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';

export function StoriesHub() {
  const [featuredStories, setFeaturedStories] = useState<any[]>([]);
  const [trendingStories, setTrendingStories] = useState<any[]>([]);
  const [newStories, setNewStories] = useState<any[]>([]);
  const [allStories, setAllStories] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGenre, setSelectedGenre] = useState<string>('All');

  const genres = ['All', 'Fantasy', 'Romance', 'Thriller', 'Mystery', 'Horror', 'Sci-Fi'];

  useEffect(() => {
    fetchMainData();
  }, []);

  const fetchMainData = async () => {
    setIsLoading(true);
    try {
      // Because we lack complex aggregation, we approximate "trending" by high total reads
      const { data: trending } = await supabase.from('stories').select('id, title, slug, cover_image_url, genres, total_reads').eq('status', 'published').order('total_reads', { ascending: false }).limit(5);
      const { data: latest } = await supabase.from('stories').select('id, title, slug, cover_image_url, genres, description').eq('status', 'published').order('created_at', { ascending: false }).limit(5);
      const { data: all } = await supabase.from('stories').select('id, title, slug, cover_image_url, genres, total_reads').eq('status', 'published').order('created_at', { ascending: false }).limit(50);
      
      if (trending) setTrendingStories(trending);
      if (latest) setNewStories(latest);
      if (all) {
        setAllStories(all);
        setFeaturedStories(trending?.slice(0, 4) || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAllStories = selectedGenre === 'All' 
    ? allStories 
    : allStories.filter(s => (s.genres || []).includes(selectedGenre));

  if (isLoading) {
    return <div className="py-20 text-center animate-pulse"><div className="w-12 h-12 border-4 border-dotted border-primary rounded-full animate-spin mx-auto"></div></div>;
  }

  return (
    <div className="bg-surface font-body min-h-screen">
      
      {/* Hero Section / Editor's Pick (Horizontal Scroll) */}
      <section className="bg-[#f0f4ff] pt-12 pb-16 px-4 md:px-8 border-b border-blue-100">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-black font-headline text-slate-800 mb-6 flex items-center gap-2">
             <span className="material-symbols-outlined text-purple-600">stars</span>
             Dreame-Editor's pick
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-6 snap-x snap-mandatory disabled-scrollbar pr-8">
            {featuredStories.map(story => (
              <Link 
                key={story.id} 
                to={`/stories/${story.slug}`} 
                className="w-[140px] md:w-[180px] shrink-0 snap-start group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className="w-full aspect-[2/3] bg-slate-200">
                   {story.cover_image_url ? (
                     <img src={story.cover_image_url} alt={story.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                   ) : (
                     <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-800"><span className="material-symbols-outlined text-4xl">auto_stories</span></div>
                   )}
                   <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"></div>
                </div>
                <div className="absolute bottom-0 inset-x-0 p-3">
                  <h3 className="font-bold text-white text-sm line-clamp-2 leading-tight">{story.title}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-white/80 mt-1">
                    <span className="material-symbols-outlined text-[12px]">visibility</span>
                    {(story.total_reads || 0).toLocaleString()}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 grid grid-cols-1 md:grid-cols-2 gap-12 border-b border-surface-container pb-16">
        
        {/* Reputation Ranking / Trending */}
        <section>
           <h2 className="text-2xl font-black font-headline text-slate-900 mb-2 flex items-center gap-2">
             <span className="material-symbols-outlined text-amber-500">trophy</span>
             Reputation Ranking
           </h2>
           <p className="text-xs text-slate-500 mb-6 font-bold uppercase tracking-wider">Highly recommended by Readers</p>
           
           <div className="space-y-4">
             {trendingStories.map((story, i) => (
               <Link key={story.id} to={`/stories/${story.slug}`} className="flex gap-4 items-center group">
                 <div className="w-16 h-20 shrink-0 rounded-lg overflow-hidden relative shadow-sm border border-slate-100">
                    {story.cover_image_url ? <img src={story.cover_image_url} className="w-full h-full object-cover" /> : <div className="bg-slate-800 w-full h-full"></div>}
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded flex items-center justify-center text-xs font-black text-white ${i===0?'bg-amber-400':i===1?'bg-slate-400':i===2?'bg-amber-700':'bg-[#0f172a]'}`}>
                      {i + 1}
                    </div>
                 </div>
                 <div className="flex-1 min-w-0">
                   <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors truncate">{story.title}</h4>
                   <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                     <span className="inline-block bg-slate-100 px-1.5 py-0.5 rounded text-[9px] mr-1 uppercase">{story.genres?.[0] || 'Story'}</span>
                     {(story.total_reads || 0).toLocaleString()} reads globally.
                   </p>
                 </div>
               </Link>
             ))}
           </div>
        </section>

        {/* Newest Best-Seller / Fresh Updates */}
        <section>
           <h2 className="text-2xl font-black font-headline text-slate-900 mb-2 flex items-center gap-2">
             <span className="material-symbols-outlined text-blue-500">calendar_month</span>
             Best Selling New
           </h2>
           <p className="text-xs text-slate-500 mb-6 font-bold uppercase tracking-wider">The Newest Best-Sellers</p>
           
           <div className="space-y-4">
             {newStories.map((story, i) => (
               <Link key={story.id} to={`/stories/${story.slug}`} className="flex gap-4 items-center group">
                 <div className="w-16 h-20 shrink-0 rounded-lg overflow-hidden relative shadow-sm border border-slate-100">
                    {story.cover_image_url ? <img src={story.cover_image_url} className="w-full h-full object-cover" /> : <div className="bg-slate-800 w-full h-full"></div>}
                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded flex items-center justify-center text-xs font-black text-white ${i===0?'bg-amber-400':i===1?'bg-slate-400':i===2?'bg-amber-700':'bg-[#0f172a]'}`}>
                      {i + 1}
                    </div>
                 </div>
                 <div className="flex-1 min-w-0">
                   <h4 className="font-bold text-slate-900 group-hover:text-primary transition-colors truncate">{story.title}</h4>
                   <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {story.description}
                   </p>
                 </div>
               </Link>
             ))}
           </div>
        </section>

      </div>

      {/* ALL STORIES GRID */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-10">
         <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
           <h2 className="text-xl md:text-2xl font-black font-headline text-slate-900">Explore Discoveries</h2>
           <div className="flex gap-2 overflow-x-auto disabled-scrollbar pb-2">
              {genres.map(g => (
                <button 
                  key={g} 
                  onClick={() => setSelectedGenre(g)} 
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedGenre === g ? 'bg-primary text-white border-primary' : 'bg-transparent text-slate-600 border-slate-200 hover:border-slate-400'}`}
                >
                  {g}
                </button>
              ))}
           </div>
         </div>

         {filteredAllStories.length === 0 ? (
           <p className="text-center text-slate-500 py-10">No stories match this genre yet.</p>
         ) : (
           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 md:gap-6">
              {filteredAllStories.map(story => (
                <Link key={story.id} to={`/stories/${story.slug}`} className="group hover:-translate-y-1 transition-transform">
                  <div className="w-full aspect-[2/3] bg-slate-100 rounded-xl overflow-hidden shadow-sm border border-slate-200 mb-2 relative">
                    {story.cover_image_url ? <img src={story.cover_image_url} className="w-full h-full object-cover" /> : null}
                    <div className="absolute top-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded border border-white/20">
                       <span className="material-symbols-outlined text-[10px] align-middle mr-0.5">visibility</span>{story.total_reads}
                    </div>
                  </div>
                  <h4 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-primary transition-colors">{story.title}</h4>
                </Link>
              ))}
           </div>
         )}
      </section>

    </div>
  );
}
