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
  const [coverPreview, setCoverPreview] = useState('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [ageRating, setAgeRating] = useState('general');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const coverInputRef = useRef<HTMLInputElement>(null);

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
        setCoverPreview(data.cover_image_url || '');
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

  // Rich text commands (same as article editor)
  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleInsertLink = () => {
    const url = prompt('Enter the link URL:');
    if (url) executeCommand('createLink', url);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      showAlert('Please upload an image file (PNG, JPG, WebP).', 'Invalid File');
      return;
    }

    // Validate aspect ratio (2:3, with tolerance)
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = async () => {
      const ratio = img.width / img.height;
      const targetRatio = 2 / 3;
      const tolerance = 0.15;

      if (Math.abs(ratio - targetRatio) > tolerance) {
        showAlert(`Cover image should be portrait format (2:3 ratio). Your image is ${img.width}x${img.height}. Try a 400x600 or 600x900 image.`, 'Wrong Aspect Ratio');
        URL.revokeObjectURL(objectUrl);
        return;
      }

      setCoverPreview(objectUrl);
      setIsUploadingCover(true);

      try {
        const ext = file.name.split('.').pop();
        const fileName = `story-covers/${user!.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('post_images').upload(fileName, file, { upsert: true });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('post_images').getPublicUrl(fileName);
        setCoverUrl(urlData.publicUrl);
        showAlert('Cover image uploaded successfully!', 'Success');
      } catch (err: any) {
        showAlert('Upload failed: ' + err.message, 'Error');
        setCoverPreview('');
      } finally {
        setIsUploadingCover(false);
      }
    };
    img.src = objectUrl;
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 animation-fade-in">
      {/* Story Creation Hero */}
      <div className="bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] rounded-3xl p-6 md:p-8 mb-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="material-symbols-outlined text-3xl">auto_stories</span>
            <h1 className="text-2xl md:text-3xl font-black font-headline">Write Your Story</h1>
          </div>
          <p className="text-white/80 max-w-lg text-sm md:text-base leading-relaxed">
            Create serialized fiction chapters that readers will love. Set up your novel details first, then write and submit chapters for review. Each published chapter earns you reader engagement points!
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <span className="bg-white/15 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">edit_note</span> Write Chapters
            </span>
            <span className="bg-white/15 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">monetization_on</span> Earn Per Read
            </span>
            <span className="bg-white/15 backdrop-blur-sm text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">trending_up</span> Build Audience
            </span>
          </div>
        </div>
      </div>

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

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-[#0f172a]">Cover Image <span className="text-slate-400 normal-case">(2:3 portrait ratio — e.g. 400×600px)</span></label>
            <div className="flex gap-4 items-start">
              {/* Preview */}
              <div className="w-[100px] aspect-[2/3] bg-slate-100 rounded-xl overflow-hidden border-2 border-dashed border-slate-300 flex items-center justify-center shrink-0 relative">
                {coverPreview ? (
                  <img src={coverPreview} className="w-full h-full object-cover" alt="Cover preview" />
                ) : (
                  <div className="text-center p-2">
                    <span className="material-symbols-outlined text-slate-300 text-3xl">image</span>
                    <p className="text-[8px] text-slate-400 font-bold mt-1">No cover</p>
                  </div>
                )}
                {isUploadingCover && (
                  <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              {/* Upload Button */}
              <div className="flex-1 space-y-2">
                <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-sm cursor-pointer transition-all border-2 border-dashed ${
                  isUploadingCover ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 hover:border-emerald-400'
                }`}>
                  <span className="material-symbols-outlined text-[18px]">{isUploadingCover ? 'hourglass_empty' : 'upload'}</span>
                  {isUploadingCover ? 'Uploading...' : coverPreview ? 'Change Cover' : 'Upload Cover Image'}
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleCoverUpload}
                    disabled={isUploadingCover}
                  />
                </label>
                <p className="text-[10px] text-slate-400">PNG, JPG or WebP · Portrait 2:3 ratio recommended</p>
              </div>
            </div>
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
              
              {/* Rich Text Toolbar */}
              <div className="flex flex-wrap items-center gap-1 p-2 bg-surface-container rounded-2xl overflow-x-auto">
                <button title="Bold" onMouseDown={e => { e.preventDefault(); executeCommand('bold'); }} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                  <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">format_bold</span>
                </button>
                <button title="Italic" onMouseDown={e => { e.preventDefault(); executeCommand('italic'); }} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                  <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">format_italic</span>
                </button>
                <button title="Underline" onMouseDown={e => { e.preventDefault(); executeCommand('underline'); }} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                  <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">format_underlined</span>
                </button>
                <button title="Heading 2" onMouseDown={e => { e.preventDefault(); executeCommand('formatBlock', 'h2'); }} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                  <span className="text-xs font-black text-on-surface-variant group-hover:text-primary">H2</span>
                </button>
                <button title="Heading 3" onMouseDown={e => { e.preventDefault(); executeCommand('formatBlock', 'h3'); }} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                  <span className="text-xs font-black text-on-surface-variant group-hover:text-primary">H3</span>
                </button>
                <div className="w-px h-6 bg-outline-variant/30 mx-1 hidden sm:block"></div>
                <button title="Bullet List" onMouseDown={e => { e.preventDefault(); executeCommand('insertUnorderedList'); }} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                  <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">format_list_bulleted</span>
                </button>
                <button title="Numbered List" onMouseDown={e => { e.preventDefault(); executeCommand('insertOrderedList'); }} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                  <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">format_list_numbered</span>
                </button>
                <div className="w-px h-6 bg-outline-variant/30 mx-1 hidden sm:block"></div>
                <button title="Insert Link" onMouseDown={e => { e.preventDefault(); handleInsertLink(); }} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                  <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">link</span>
                </button>
                <button title="Blockquote" onMouseDown={e => { e.preventDefault(); executeCommand('formatBlock', 'BLOCKQUOTE'); }} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                  <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">format_quote</span>
                </button>
                <button title="Undo" onMouseDown={e => { e.preventDefault(); executeCommand('undo'); }} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                  <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">undo</span>
                </button>
                <button title="Redo" onMouseDown={e => { e.preventDefault(); executeCommand('redo'); }} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                  <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">redo</span>
                </button>
                <div className="ml-auto flex items-center gap-2 pr-2">
                  <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-outline">Story Editor</span>
                </div>
              </div>

              <div 
                ref={editorRef}
                className="w-full min-h-[400px] bg-surface-container-lowest rounded-xl p-4 md:p-6 border border-outline-variant/50 focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all outline-none text-on-surface overflow-y-auto"
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Once upon a time..."
                style={{ emptyCells: 'show' }}
              />
              <style>{`
                [contentEditable]:empty:before { content: attr(data-placeholder); color: #94a3b8; pointer-events: none; display: block; }
                [contentEditable] h1 { font-size: 2em; font-weight: 900; margin: 1rem 0 0.5rem; line-height: 1.2; }
                [contentEditable] h2 { font-size: 1.5em; font-weight: 800; margin: 1rem 0 0.5rem; line-height: 1.3; }
                [contentEditable] h3 { font-size: 1.2em; font-weight: 700; margin: 0.75rem 0 0.5rem; }
                [contentEditable] p { margin-bottom: 0.75rem; line-height: 1.8; }
                [contentEditable] strong, [contentEditable] b { font-weight: 700; }
                [contentEditable] em, [contentEditable] i { font-style: italic; }
                [contentEditable] u { text-decoration: underline; }
                [contentEditable] blockquote { border-left: 4px solid #008751; padding-left: 1rem; color: #404943; font-style: italic; margin: 1rem 0; }
                [contentEditable] ul { list-style-type: disc !important; padding-left: 2rem !important; margin-bottom: 1rem !important; display: block !important; }
                [contentEditable] ol { list-style-type: decimal !important; padding-left: 2rem !important; margin-bottom: 1rem !important; display: block !important; }
                [contentEditable] li { margin-bottom: 0.5rem !important; display: list-item !important; }
                [contentEditable] br { display: block; content: ""; margin-top: 0.5rem; }
              `}</style>
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
