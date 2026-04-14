import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SEO } from '../components/SEO';

export function StoryDetail() {
  const { slug } = useParams();
  const [isDescExpanded, setIsDescExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['story-detail', slug],
    enabled: !!slug,
    staleTime: 3 * 60 * 1000,
    queryFn: async () => {
      const { data: s } = await supabase.from('stories').select('*, profiles:author_id(name)').eq('slug', slug).single();
      if (!s) return null;
      const { data: c } = await supabase.from('story_chapters').select('chapter_number, title, id, created_at').eq('story_id', s.id).eq('status', 'published').order('chapter_number', { ascending: true });
      return { story: s, chapters: c || [] };
    },
  });

  // Track story view (once per session per story)
  useEffect(() => {
    if (!data?.story?.id) return;
    const viewKey = `story_viewed_${data.story.id}`;
    if (sessionStorage.getItem(viewKey)) return;
    
    sessionStorage.setItem(viewKey, 'true');
    supabase
      .from('stories')
      .update({ total_reads: (data.story.total_reads || 0) + 1 })
      .eq('id', data.story.id)
      .then(() => {});
  }, [data?.story?.id]);


  const story = data?.story;
  const chapters = data?.chapters || [];

  if (isLoading) return <div className="py-20 text-center animate-pulse"><div className="w-12 h-12 border-4 border-dotted border-primary rounded-full animate-spin mx-auto"></div></div>;
  if (!story) return <div className="py-20 text-center">Story not found.</div>;

  return (
    <>
    <SEO
      title={story.title}
      description={story.description?.substring(0, 155) + '...'}
      image={story.cover_image_url}
      url={`/stories/${story.slug}`}
      type="article"
      author={story.profiles?.name}
      datePublished={story.created_at}
      keywords={`${(story.genres || []).join(', ')}, story, webnovel, fiction, JobbaWorks`}
      breadcrumbs={[
        { name: 'Home', url: '/' },
        { name: 'Stories', url: '/stories' },
        { name: story.title, url: `/stories/${story.slug}` },
      ]}
    />
    <div className="bg-white min-h-screen font-body pb-20">
      <div className="max-w-3xl mx-auto">
        
        {/* Header Block matching Dreame Reference */}
        <div className="p-6 flex gap-4 md:gap-6 border-b border-slate-100">
           <div className="w-[120px] md:w-[150px] aspect-[2/3] shrink-0 rounded-xl overflow-hidden shadow-lg border border-slate-200 bg-slate-100 relative">
             {story.cover_image_url ? (
               <img src={story.cover_image_url} alt={story.title} className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-800"><span className="material-symbols-outlined text-4xl">auto_stories</span></div>
             )}
           </div>
           
           <div className="flex-1 min-w-0 pt-2">
             <h1 className="text-xl md:text-3xl font-black font-headline text-slate-900 leading-tight mb-2">{story.title}</h1>
             <p className="text-sm text-slate-500 font-bold mb-3 flex items-center gap-1 hover:text-primary cursor-pointer transition-colors w-max">
               {story.profiles?.name || 'Unknown Author'} <span className="material-symbols-outlined text-[16px]">chevron_right</span>
             </p>
             
             <div className="flex items-center gap-2 mb-4">
               {story.age_rating === 'mature' && <span className="px-1.5 py-0.5 rounded border border-rose-300 text-rose-500 text-[10px] font-black tracking-widest flex items-center gap-1 uppercase"><span className="material-symbols-outlined text-[12px]">menu_book</span> 18+</span>}
               {story.age_rating === 'teen' && <span className="px-1.5 py-0.5 rounded border border-amber-300 text-amber-600 text-[10px] font-black tracking-widest flex items-center gap-1 uppercase">13+</span>}
               {story.age_rating === 'general' && <span className="px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-600 text-[10px] font-black tracking-widest flex items-center gap-1 uppercase">General</span>}
             </div>

             <div className="flex gap-8">
               <div className="flex flex-col">
                 <span className="font-black text-slate-900 text-lg">{(story.total_reads || 0).toLocaleString()}</span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Read</span>
               </div>
               <div className="flex flex-col">
                 <span className="font-black text-slate-900 text-lg">{chapters.length}</span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Chapters</span>
               </div>
             </div>
           </div>
        </div>

        {/* Description & Tags */}
        <div className="p-6 border-b border-slate-100">
           <div className={`text-slate-600 text-sm md:text-base leading-relaxed relative ${isDescExpanded ? 'line-clamp-none' : 'line-clamp-3'}`}>
             {story.description}
             {!isDescExpanded && (
                <button onClick={() => setIsDescExpanded(true)} className="absolute bottom-0 right-0 bg-gradient-to-r from-transparent via-white to-white pl-8 pr-1 font-bold text-slate-400 hover:text-slate-700">
                  <span className="material-symbols-outlined align-middle">expand_more</span>
                </button>
             )}
           </div>
           
           <div className="flex flex-wrap gap-2 mt-4">
             {story.genres?.map((g: string) => (
               <span key={g} className="bg-slate-100 text-slate-600 px-3 py-1 rounded text-xs font-bold shadow-sm">{g.toLowerCase()}</span>
             ))}
           </div>
        </div>

        {/* Chapters List */}
        <div className="p-6">
           <h2 className="text-xl font-black font-headline text-slate-900 mb-6">Contents</h2>
           <div className="space-y-4">
             {chapters.length === 0 ? (
               <p className="text-slate-500 italic">No chapters published yet.</p>
             ) : (
               chapters.map((ch, i) => (
                 <Link key={ch.id} to={`/stories/read/${story.slug}/${ch.chapter_number}`} className="flex items-center gap-4 py-3 border-b border-slate-100 group hover:pl-2 transition-all">
                   <span className="text-sm font-bold text-slate-400 w-6">{(i+1).toString().padStart(2, '0')}</span>
                   <div className="flex-1 min-w-0">
                     <h3 className="font-bold text-slate-800 text-sm md:text-base group-hover:text-primary transition-colors">{ch.title}</h3>
                   </div>
                   <span className="material-symbols-outlined text-slate-300 group-hover:text-primary">chevron_right</span>
                 </Link>
               ))
             )}
           </div>
        </div>

      </div>

      {/* Sticky Bottom Bar CTA */}
      {chapters.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 z-50 flex justify-center shadow-[0px_-5px_20px_rgba(0,0,0,0.05)]">
           <Link to={`/stories/read/${story.slug}/1`} className="w-full max-w-lg bg-[#6c5ce7] text-white py-4 rounded-full font-bold text-center text-lg hover:bg-[#5b4bcc] transition-colors shadow-lg">
             Start Reading
           </Link>
        </div>
      )}
    </div>
    </>
  );
}
