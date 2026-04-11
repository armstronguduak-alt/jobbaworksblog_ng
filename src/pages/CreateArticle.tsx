import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useDialog } from '../contexts/DialogContext';

export function CreateArticle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { showAlert } = useDialog();
  
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [featuredImage, setFeaturedImage] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImportingDoc, setIsImportingDoc] = useState(false);
  const [docFileName, setDocFileName] = useState('');
  
  const editorRef = useRef<HTMLDivElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const inlineImageInputRef = useRef<HTMLInputElement>(null);

  const [isPreviewMode, setIsPreviewMode] = useState(false);

  useEffect(() => {
    const initializeEditor = async () => {
      // 1. Fetch categories
      const { data: catsData } = await supabase.from('categories').select('*').eq('is_active', true);
      if (catsData) {
        setCategories(catsData);
        if (catsData.length > 0) setCategoryId(catsData[0].id);
      }

      // 2. Fetch existing article if editing
      if (id) {
        const { data: articleData, error } = await supabase
          .from('posts')
          .select('*')
          .eq('id', id)
          .single();

        if (articleData && !error) {
          setTitle(articleData.title || '');
          setCategoryId(articleData.category_id || (catsData?.[0]?.id || ''));
          setFeaturedImage(articleData.featured_image || '');
          if (editorRef.current) {
            editorRef.current.innerHTML = articleData.content || '';
          }
        }
      }
    };
    initializeEditor();
  }, [id]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `featured/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('post_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('post_images')
        .getPublicUrl(filePath);

      setFeaturedImage(publicUrl);
    } catch (err: any) {
      showAlert('Error uploading image: ' + err.message);
    } finally {
      setIsUploadingImage(false);
    }
  };

  // ── DOC FILE IMPORT ────────────────────────────────────────────────────────
  const handleDocImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['doc', 'docx', 'txt', 'html', 'htm'].includes(ext || '')) {
      showAlert('Please upload a .doc, .docx, .txt, or .html file.');
      return;
    }

    setIsImportingDoc(true);
    setDocFileName(file.name);

    try {
      if (ext === 'txt') {
        // Plain text — wrap in paragraphs preserving line breaks
        const text = await file.text();
        const html = text
          .split(/\n\n+/)
          .map(para => `<p>${para.replace(/\n/g, '<br>')}</p>`)
          .join('');
        if (editorRef.current) editorRef.current.innerHTML = html;

      } else if (ext === 'html' || ext === 'htm') {
        // Raw HTML — inject directly
        const html = await file.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        if (editorRef.current) editorRef.current.innerHTML = doc.body.innerHTML;

      } else {
        // .doc / .docx — use mammoth.js via CDN (loaded lazily)
        // We read as ArrayBuffer and pass to mammoth
        const arrayBuffer = await file.arrayBuffer();

        // Dynamically load mammoth from CDN if not already loaded
        if (!(window as any).mammoth) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load mammoth.js'));
            document.head.appendChild(script);
          });
        }

        const mammoth = (window as any).mammoth;
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          {
            styleMap: [
              "p[style-name='Heading 1'] => h1:fresh",
              "p[style-name='Heading 2'] => h2:fresh",
              "p[style-name='Heading 3'] => h3:fresh",
              "b => strong",
              "i => em",
              "u => u",
            ]
          }
        );

        if (editorRef.current) {
          editorRef.current.innerHTML = result.value;
        }

        if (result.messages?.length > 0) {
          console.warn('Mammoth conversion warnings:', result.messages);
        }
      }

      showAlert(`"${file.name}" imported successfully! Review and edit as needed.`, 'Imported');
    } catch (err: any) {
      showAlert('Error importing file: ' + err.message, 'Import Error');
    } finally {
      setIsImportingDoc(false);
      // Reset input so same file can be re-imported
      if (docInputRef.current) docInputRef.current.value = '';
    }
  }, [showAlert]);

  const executeCommand = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleInsertLink = () => {
    const url = prompt('Enter the link URL:');
    if (url) executeCommand('createLink', url);
  };

  const handleInlineImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Save current selection to restore after upload
    const selection = window.getSelection();
    let range: Range | null = null;
    if (selection && selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    }
    
    showAlert('Uploading image, please wait...', 'Uploading');
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `inline_${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      const filePath = `post_images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('post_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('post_images')
        .getPublicUrl(filePath);

      // Restore selection and insert image
      if (range && selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      editorRef.current?.focus();
      executeCommand('insertImage', publicUrl);
    } catch (err: any) {
      showAlert('Error uploading inline image: ' + err.message);
    } finally {
      if (inlineImageInputRef.current) inlineImageInputRef.current.value = '';
    }
  };

  const handleInsertYoutube = () => {
    const url = prompt('Enter YouTube Video URL:');
    if (url) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
      const match = url.match(regExp);
      const videoId = (match && match[2].length === 11) ? match[2] : null;

      if (videoId) {
        const iframeHtml = `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 12px; margin: 16px 0;">
          <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;" src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>
        </div><p><br></p>`;
        executeCommand('insertHTML', iframeHtml);
      } else {
        showAlert('Invalid YouTube URL');
      }
    }
  };

  const extractExcerpt = (html: string) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent?.substring(0, 150) + '...' || '';
  };

  const handlePublish = async (status: 'pending' | 'draft') => {
    if (!title.trim()) {
      showAlert('Please enter a title');
      return;
    }
    const content = editorRef.current?.innerHTML || '';
    if (!content.trim() || content === '<br>') {
      showAlert('Please enter some content');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const excerpt = extractExcerpt(content);
      // Only generate new slug if it's new
      const slug = id ? undefined : title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now().toString().slice(-4);

      const postPayload: any = {
        title,
        content,
        excerpt,
        featured_image: featuredImage || null,
        status,
        author_user_id: user?.id,
        category_id: categoryId,
        reading_time_seconds: Math.max(60, Math.floor(content.length / 15)),
      };
      
      if (slug) postPayload.slug = slug;

      let error;
      if (id) {
        // Update existing article
        const { error: updateError } = await supabase
          .from('posts')
          .update(postPayload)
          .eq('id', id);
        error = updateError;
      } else {
        // Create new article
        const { error: insertError } = await supabase
          .from('posts')
          .insert(postPayload);
        error = insertError;
      }

      if (error) throw error;

      await showAlert(status === 'pending' ? 'Article submitted for review!' : 'Draft saved!');
      navigate('/articles');
    } catch (err: any) {
      showAlert('Error submitting article: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface font-body text-on-surface selection:bg-primary-fixed min-h-screen">
      <header className="sticky top-0 w-full z-50 bg-slate-50/80 backdrop-blur-md flex items-center justify-between px-6 py-4 shadow-[0px_20px_40px_rgba(0,33,16,0.06)]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-emerald-50/50 transition-colors active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined text-emerald-900">arrow_back</span>
          </button>
          <h1 className="text-emerald-800 font-bold text-lg font-headline">{id ? 'Edit Article' : 'Studio Editor'}</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-headline text-sm font-bold tracking-tight text-slate-500 hidden sm:inline">User Submission</span>
          <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden">
            <img 
              alt="Profile" 
              className="w-full h-full object-cover"
              src={profile?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${user?.id}`} 
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col lg:flex-row gap-8 lg:gap-10 pb-32">
        {/* Left Column: Form Controls */}
        <div className="flex-1 space-y-6 md:space-y-8">
          <section className="space-y-2 flex justify-between items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-on-primary-fixed-variant tracking-tight">{id ? 'Edit Article' : 'Create Article'}</h2>
              <p className="text-on-surface-variant text-base md:text-lg">Craft your insightful piece. It will be reviewed by admins before publishing.</p>
            </div>
            <button 
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className="px-4 py-2 bg-surface-container-high rounded-xl font-bold flex items-center gap-2 hover:bg-surface-container-highest transition-colors"
            >
              <span className="material-symbols-outlined">{isPreviewMode ? 'edit' : 'visibility'}</span>
              {isPreviewMode ? 'Edit' : 'Preview'}
            </button>
          </section>

          {/* Doc Import Banner */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <span className="material-symbols-outlined text-blue-600 text-2xl shrink-0">upload_file</span>
            <div className="flex-1">
              <p className="font-bold text-blue-900 text-sm">Import from Document</p>
              <p className="text-blue-700 text-xs mt-0.5">Upload a .docx, .doc, .txt, or .html file — formatting (bold, italic, headings, lists) will be preserved.</p>
              {docFileName && <p className="text-blue-500 text-xs font-medium mt-1 truncate">📄 {docFileName}</p>}
            </div>
            <label className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all shrink-0 ${isImportingDoc ? 'bg-blue-200 text-blue-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'}`}>
              <span className="material-symbols-outlined text-[18px]">{isImportingDoc ? 'hourglass_empty' : 'file_open'}</span>
              {isImportingDoc ? 'Importing...' : 'Choose File'}
              <input
                ref={docInputRef}
                type="file"
                accept=".doc,.docx,.txt,.html,.htm"
                className="hidden"
                onChange={handleDocImport}
                disabled={isImportingDoc}
              />
            </label>
          </div>

          {/* Title & Editor Canvas */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 space-y-6 shadow-[0px_20px_40px_rgba(0,33,16,0.04)]">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface-variant px-1">Article Title</label>
              <input
                className="w-full bg-surface-container-low border-none rounded-xl px-4 md:px-6 py-3 md:py-4 text-lg md:text-xl font-headline font-bold focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline/50"
                placeholder="Enter a captivating title..." 
                value={title}
                onChange={e => setTitle(e.target.value)}
                type="text" 
              />
            </div>

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
              <button title="Undo" onMouseDown={e => { e.preventDefault(); executeCommand('undo'); }} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">undo</span>
              </button>
              <button title="Redo" onMouseDown={e => { e.preventDefault(); executeCommand('redo'); }} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">redo</span>
              </button>
              <div className="w-px h-6 bg-outline-variant/30 mx-1 hidden sm:block"></div>
              <button title="Insert Image" onMouseDown={e => { e.preventDefault(); inlineImageInputRef.current?.click(); }} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">image</span>
              </button>
              <input type="file" accept="image/*" ref={inlineImageInputRef} onChange={handleInlineImageUpload} className="hidden" />
              <button title="Insert YouTube Video" onMouseDown={e => { e.preventDefault(); handleInsertYoutube(); }} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                <span className="material-symbols-outlined text-sm md:text-base text-rose-500 group-hover:text-rose-600">smart_display</span>
              </button>
              <button title="Blockquote" onMouseDown={e => { e.preventDefault(); executeCommand('formatBlock', 'BLOCKQUOTE'); }} className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">format_quote</span>
              </button>
              <div className="ml-auto flex items-center gap-2 pr-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-outline">Rich Text Editor</span>
              </div>
            </div>

            {isPreviewMode ? (
              <div className="w-full min-h-[300px] md:min-h-[450px] bg-surface rounded-2xl p-4 md:p-6 text-on-surface overflow-y-auto mt-4">
                {featuredImage && (
                  <div className="w-full h-48 md:h-[300px] object-cover mb-6 rounded-2xl overflow-hidden shadow-sm">
                    <img src={featuredImage} alt="Featured" className="w-full h-full object-cover" />
                  </div>
                )}
                <h1 className="text-4xl font-headline font-black mb-6">{title || 'Untitled Article'}</h1>
                <div className="prose prose-lg md:prose-xl max-w-none prose-emerald prose-headings:font-headline" dangerouslySetInnerHTML={{ __html: editorRef.current?.innerHTML || '' }} />
              </div>
            ) : (
              <div 
                ref={editorRef}
                className="w-full min-h-[300px] md:min-h-[450px] bg-surface-container-low rounded-2xl p-4 md:p-6 border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/10 transition-all outline-none text-on-surface overflow-y-auto mt-4"
                contentEditable
                suppressContentEditableWarning
                data-placeholder="Start writing your story here, or import a document above..."
                style={{ emptyCells: 'show' }}
              >
              </div>
            )}
            <style>{
              `[contentEditable]:empty:before { content: attr(data-placeholder); color: #6e7a70; opacity: 0.5; cursor: text; display: block; }
               [contentEditable] h1 { font-size: 2em; font-weight: 900; margin: 1rem 0 0.5rem; line-height: 1.2; }
               [contentEditable] h2 { font-size: 1.5em; font-weight: 800; margin: 1rem 0 0.5rem; line-height: 1.3; }
               [contentEditable] h3 { font-size: 1.2em; font-weight: 700; margin: 0.75rem 0 0.5rem; }
               [contentEditable] p { margin-bottom: 0.75rem; line-height: 1.7; }
               [contentEditable] strong, [contentEditable] b { font-weight: 700; }
               [contentEditable] em, [contentEditable] i { font-style: italic; }
               [contentEditable] u { text-decoration: underline; }
               [contentEditable] iframe { display: block; margin: 10px auto; max-width: 100%; border-radius: 8px; }
               [contentEditable] blockquote { border-left: 4px solid #008751; padding-left: 1rem; color: #404943; font-style: italic; margin: 1rem 0; }
               [contentEditable] ul { list-style-type: disc !important; padding-left: 2rem !important; margin-bottom: 1rem !important; display: block !important; }
               [contentEditable] ol { list-style-type: decimal !important; padding-left: 2rem !important; margin-bottom: 1rem !important; display: block !important; }
               [contentEditable] li { margin-bottom: 0.5rem !important; display: list-item !important; }`
            }</style>
          </div>
        </div>

        {/* Right Column: Settings Bento */}
        <aside className="w-full lg:w-96 space-y-6">
          {/* Featured Image Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 space-y-4 shadow-[0px_20px_40px_rgba(0,33,16,0.04)]">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-on-primary-fixed-variant">Featured Image</h3>
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>image</span>
            </div>
            <div className="space-y-3">
              <input 
                type="text" 
                placeholder="https://example.com/image.jpg"
                value={featuredImage}
                onChange={e => setFeaturedImage(e.target.value)}
                className="w-full bg-surface-container-low border-none p-3 rounded-xl focus:ring-2 focus:ring-primary text-sm"
              />
              <div className="flex items-center gap-2">
                <div className="h-px bg-surface-container-highest flex-1"></div>
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">OR</span>
                <div className="h-px bg-surface-container-highest flex-1"></div>
              </div>
              <label className="flex items-center justify-center gap-2 w-full bg-surface-container hover:bg-surface-container-high text-on-surface py-3 rounded-xl cursor-pointer transition-colors font-semibold text-sm">
                <span className="material-symbols-outlined text-[20px]">{isUploadingImage ? 'hourglass_empty' : 'upload'}</span>
                {isUploadingImage ? 'Uploading...' : 'Upload from Device'}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload} 
                  disabled={isUploadingImage}
                />
              </label>
            </div>
            {featuredImage && (
              <div className="aspect-video bg-surface-container-low rounded-xl overflow-hidden mt-4 relative group">
                <img src={featuredImage} alt="Featured" className="w-full h-full object-cover" />
                <button 
                  onClick={() => setFeaturedImage('')}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-error text-white p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
            )}
          </div>

          {/* Configuration Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 space-y-6 shadow-[0px_20px_40px_rgba(0,33,16,0.04)]">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Category</label>
              <div className="relative">
                <select 
                  className="w-full appearance-none bg-surface-container border-none rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20 cursor-pointer text-on-surface"
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
              </div>
            </div>

            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10 text-sm text-on-surface-variant">
              <p className="flex items-center gap-2 font-bold text-primary mb-1">
                <span className="material-symbols-outlined text-base">verified</span>
                Review Process
              </p>
              Your article will be reviewed by administrators. Once approved, the reward rate will be automatically determined by the reader's subscription plan.
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <button 
              onClick={() => handlePublish('pending')}
              disabled={isSubmitting}
              className="w-full bg-gradient-to-br from-[#006b3f] to-[#008751] text-white py-4 rounded-xl font-headline font-bold text-base md:text-lg shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Submitting...' : 'Submit for Review'}</span>
              <span className="material-symbols-outlined">send</span>
            </button>
            <button 
              onClick={() => handlePublish('draft')}
              disabled={isSubmitting}
              className="w-full bg-surface-container-highest text-primary py-4 rounded-xl font-headline font-bold text-base md:text-lg hover:bg-surface-container-low transition-all disabled:opacity-50"
            >
              Save Draft
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
