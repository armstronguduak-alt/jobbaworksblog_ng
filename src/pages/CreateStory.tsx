import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { useNavigate, useSearchParams } from 'react-router-dom';

const GENRES = ['Fantasy', 'Romance', 'Thriller', 'Mystery', 'Horror', 'Sci-Fi', 'Action', 'Drama', 'Comedy'];

export function CreateStory() {
  const { user } = useAuth();
  const { showAlert } = useDialog();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storyIdParam = searchParams.get('id');

  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStory, setActiveStory] = useState<any>(null);

  // Metadata Form
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [ageRating, setAgeRating] = useState('general');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

  // Chapter Form
  const editorRef = useRef<HTMLDivElement>(null);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterNumber, setChapterNumber] = useState(1);

  useEffect(() => {
    if (storyIdParam) {
      loadExistingStory(storyIdParam);
    }
  }, [storyIdParam]);

  const loadExistingStory = async (id: string) => {
    try {
      const { data, error } = await supabase.from('stories').select('*, story_chapters(id)').eq('id', id).single();
      if (!error && data) {
        setActiveStory(data);
        setTitle(data.title);
        setDescription(data.description || '');
        setCoverUrl(data.cover_image_url || '');
        setAgeRating(data.age_rating || 'general');
        setSelectedGenres(data.genres || []);
        setChapterNumber((data.story_chapters?.length || 0) + 1);
        setStep(2);
      }
    } catch (e) {}
  };

  const handleMetadataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || selectedGenres.length === 0) {
      showAlert('Please fill title, description, and at least one genre.', 'Error');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);
      
      let payload = {
        title, slug, description, cover_image_url: coverUrl, age_rating: ageRating, genres: selectedGenres, author_id: user!.id, status: 'draft'
      };

      let resultId = '';
      if (activeStory) {
        const { error } = await supabase.from('stories').update(payload).eq('id', activeStory.id);
        if (error) throw error;
        resultId = activeStory.id;
      } else {
        const { data, error } = await supabase.from('stories').insert(payload).select('id').single();
        if (error) throw error;
        resultId = data.id;
        setActiveStory({ ...payload, id: resultId });
      }
      
      setStep(2);
      showAlert('Story details saved! Now add your first chapter.', 'Success');
    } catch (err: any) {
      console.error(err);
      showAlert(err.message, 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChapterSubmit = async () => {
    if (!activeStory) return;
    const content = editorRef.current?.innerHTML || '';
    if (!chapterTitle || !content || content === '<br>') {
      showAlert('Chapter title and content are required.', 'Error');
      return;
    }

    setIsSubmitting(true);
    try {
      const pay = {
        story_id: activeStory.id,
        chapter_number: chapterNumber,
        title: chapterTitle,
        content: content,
        status: 'under_review',
        word_count: content.split(/\s+/).length
      };

      const { error } = await supabase.from('story_chapters').insert(pay);
      if (error) throw error;

      showAlert('Chapter submitted for review!', 'Success');
      navigate('/dashboard/mystories');
    } catch (err: any) {
      console.error(err);
      showAlert(err.message, 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleGenre = (g: string) => {
    setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animation-fade-in">
      {/* Steps Header */}
      <div className="flex items-center gap-4 mb-8 border-b border-surface-container pb-4">
        <button onClick={() => setStep(1)} className={`font-bold text-sm tracking-wider uppercase px-4 py-2 flex items-center gap-2 rounded-full transition-colors ${step === 1 ? 'bg-[#0f172a] text-white' : 'text-outline hover:bg-surface-container'}`}>
          <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span> Story Setup
        </button>
        <button disabled={!activeStory} onClick={() => setStep(2)} className={`font-bold text-sm tracking-wider uppercase px-4 py-2 flex items-center gap-2 rounded-full transition-colors disabled:opacity-30 ${step === 2 ? 'bg-[#008751] text-white' : 'text-outline hover:bg-surface-container'}`}>
           <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span> Chapters Editor
        </button>
      </div>

      {step === 1 && (
        <form onSubmit={handleMetadataSubmit} className="space-y-6 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-surface-container-low">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#0f172a]">Novel Title</label>
            <input type="text" placeholder="The Alpha's Return..." value={title} onChange={e => setTitle(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/50 focus:border-primary rounded-xl px-4 py-3 font-bold text-lg" required />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#0f172a]">Cover Image URL</label>
            <input type="url" placeholder="https://..." value={coverUrl} onChange={e => setCoverUrl(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/50 focus:border-primary rounded-xl px-4 py-3 text-sm" />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#0f172a]">Synopsis</label>
            <textarea rows={5} placeholder="What is the story about? Hook your readers..." value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/50 focus:border-primary rounded-xl px-4 py-3 text-sm resize-none" required />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-[#0f172a] block mb-2">Genres</label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(g => (
                <button type="button" key={g} onClick={() => toggleGenre(g)} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${selectedGenres.includes(g) ? 'bg-primary text-white border-primary' : 'bg-surface border-surface-container text-on-surface-variant hover:border-primary/50'}`}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#0f172a] block">Age Rating</label>
            <select value={ageRating} onChange={e => setAgeRating(e.target.value)} className="bg-surface-container-lowest border border-outline-variant/50 rounded-xl px-4 py-3 text-sm font-bold">
              <option value="general">General Audience</option>
              <option value="teen">Teen (13+)</option>
              <option value="mature">Mature (18+)</option>
            </select>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-4 rounded-xl bg-[#0f172a] text-white font-black text-lg hover:bg-slate-800 transition-colors">
            {isSubmitting ? 'Saving...' : 'Save & Continue to Chapters'}
          </button>
        </form>
      )}

      {step === 2 && activeStory && (
        <div className="space-y-6">
          <div className="bg-[#f8fafc] p-6 rounded-2xl border border-slate-200">
            <h2 className="font-headline font-black text-xl text-slate-800">Writing Chapter {chapterNumber} for "{activeStory.title}"</h2>
            <p className="text-sm text-slate-500 mt-1">Submit each chapter for admin review to be published and start earning reads.</p>
          </div>

          <div className="space-y-4 bg-white p-6 md:p-8 rounded-[2rem] shadow-[0px_10px_30px_rgba(0,0,0,0.03)] border border-surface-container-low">
            <div className="flex gap-4">
               <div className="w-24 shrink-0">
                 <label className="text-[10px] font-black uppercase tracking-widest text-[#0f172a]">Ch. No</label>
                 <input type="number" min="1" value={chapterNumber} onChange={e => setChapterNumber(parseInt(e.target.value)||1)} className="w-full bg-surface-container-lowest border border-outline-variant/50 text-center rounded-xl px-4 py-3 font-bold text-lg" required />
               </div>
               <div className="flex-1">
                 <label className="text-[10px] font-black uppercase tracking-widest text-[#0f172a]">Chapter Title</label>
                 <input type="text" placeholder="The Awakening..." value={chapterTitle} onChange={e => setChapterTitle(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant/50 focus:border-primary rounded-xl px-4 py-3 font-bold text-lg" required />
               </div>
            </div>

            <div className="space-y-1 pt-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-[#0f172a] block">Chapter Content (Rich Text)</label>
              
              <div 
                ref={editorRef}
                className="w-full min-h-[400px] bg-surface-container-lowest rounded-xl p-4 md:p-6 border border-outline-variant/50 focus:border-primary transition-colors outline-none text-on-surface overflow-y-auto prose prose-emerald prose-headings:font-headline"
                contentEditable
                data-placeholder="Once upon a time..."
                style={{ emptyCells: 'show' }}
              />
              <style>{'[contentEditable]:empty:before { content: attr(data-placeholder); color: #94a3b8; pointer-events: none; display: block; }'}</style>
            </div>
            
            <button onClick={handleChapterSubmit} disabled={isSubmitting} className="w-full py-4 rounded-xl bg-primary text-white font-black text-lg hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all">
              {isSubmitting ? 'Submitting...' : 'Submit Chapter for Review'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
