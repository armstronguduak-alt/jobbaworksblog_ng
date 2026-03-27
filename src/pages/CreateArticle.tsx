import { useNavigate } from 'react-router-dom';

export function CreateArticle() {
  const navigate = useNavigate();

  return (
    <div className="bg-surface font-body text-on-surface selection:bg-primary-fixed min-h-screen">
      {/* Top Navigation specific to Task Screen */}
      <header className="sticky top-0 w-full z-50 bg-slate-50/80 backdrop-blur-md flex items-center justify-between px-6 py-4 shadow-[0px_20px_40px_rgba(0,33,16,0.06)]">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-emerald-50/50 transition-colors active:scale-95 duration-200"
          >
            <span className="material-symbols-outlined text-emerald-900">arrow_back</span>
          </button>
          <h1 className="text-emerald-800 font-bold text-lg font-headline">Task Oasis</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-headline text-sm font-bold tracking-tight text-slate-500 hidden sm:inline">Draft Auto-saved</span>
          <div className="w-10 h-10 rounded-full bg-surface-container overflow-hidden">
            <img 
              alt="Admin Profile" 
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuBwC-6Bq7db6c8WU0dv5CNWrKWv31mLh8Oe8ZlDZ0q0BsKrxBmUnzG8iYyHyDzca2JjKWgbmoJ5AP2s-AGIEJyIKI1d93mb58BSLP5xAcNUgexC1um3bE0vp_XLo-gLBsgdAw-Jp7_1V02fHkcOh4IH_SWrtsYMWVwDczT03hX_46xQTXliq4YQ7K8V_pQn7ThyWzwTNr_JC3EQ7e1117qoILhb5b5liOcKHeXpK0XVY1870Nv4WJEEScRDmLfncl8vMF4O-Yve9Ec" 
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 flex flex-col lg:flex-row gap-8 lg:gap-10 pb-32">
        {/* Left Column: Form Controls */}
        <div className="flex-1 space-y-6 md:space-y-8">
          {/* Header Section */}
          <section className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-headline font-extrabold text-on-primary-fixed-variant tracking-tight">Create Article</h2>
            <p className="text-on-surface-variant text-base md:text-lg">Craft your next insightful piece for the Oasis community.</p>
          </section>

          {/* Title & Editor Canvas */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 space-y-6 shadow-[0px_20px_40px_rgba(0,33,16,0.04)]">
            {/* Title Input */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-on-surface-variant px-1">Article Title</label>
              <input
                className="w-full bg-surface-container-low border-none rounded-xl px-4 md:px-6 py-3 md:py-4 text-lg md:text-xl font-headline font-bold focus:ring-2 focus:ring-primary/20 focus:bg-surface-container-lowest transition-all placeholder:text-outline/50"
                placeholder="Enter a captivating title..." 
                type="text" 
              />
            </div>

            {/* Rich Text Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-surface-container rounded-2xl overflow-x-auto">
              <button className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">format_bold</span>
              </button>
              <button className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">format_italic</span>
              </button>
              <button className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">format_list_bulleted</span>
              </button>
              <div className="w-px h-6 bg-outline-variant/30 mx-1 hidden sm:block"></div>
              <button className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">link</span>
              </button>
              <button className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">image</span>
              </button>
              <button className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors group">
                <span className="material-symbols-outlined text-sm md:text-base text-on-surface-variant group-hover:text-primary">format_quote</span>
              </button>
              <div className="ml-auto flex items-center gap-2 pr-2">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-outline">Markdown Enabled</span>
              </div>
            </div>

            {/* Main Content Area */}
            <div 
              className="w-full min-h-[300px] md:min-h-[450px] bg-surface-container-low rounded-2xl p-4 md:p-6 border-none focus:bg-surface-container-lowest focus:ring-2 focus:ring-primary/10 transition-all outline-none text-on-surface overflow-y-auto"
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Start writing your story here..."
              style={{ emptyCells: 'show' }}
            >
              <style>{
                `[contentEditable]:empty:before { content: attr(data-placeholder); color: #6e7a70; opacity: 0.5; cursor: text; display: block; }`
              }</style>
            </div>
          </div>
        </div>

        {/* Right Column: Settings Bento */}
        <aside className="w-full lg:w-96 space-y-6">
          {/* Featured Image Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 space-y-4 shadow-[0px_20px_40px_rgba(0,33,16,0.04)]">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-on-primary-fixed-variant">Featured Image</h3>
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>add_photo_alternate</span>
            </div>
            <div className="group relative aspect-video bg-surface-container-low rounded-2xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all border-2 border-dashed border-outline-variant/50 flex flex-col items-center justify-center gap-2 p-4 text-center">
              <span className="material-symbols-outlined text-outline text-3xl">upload_file</span>
              <span className="text-xs font-bold text-outline uppercase tracking-tighter">Click to upload</span>
            </div>
          </div>

          {/* Configuration Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-6 md:p-8 space-y-6 shadow-[0px_20px_40px_rgba(0,33,16,0.04)]">
            {/* Category Dropdown */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Category</label>
              <div className="relative">
                <select className="w-full appearance-none bg-surface-container border-none rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20 cursor-pointer text-on-surface">
                  <option>Fintech Insights</option>
                  <option>Product Updates</option>
                  <option>Wealth Management</option>
                  <option>Community Spotlight</option>
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
              </div>
            </div>

            {/* Reward Setting */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Reader Reward</label>
              <div className="flex items-center gap-3 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0">
                  ₦
                </div>
                <input
                  className="bg-transparent border-none p-0 focus:ring-0 text-xl font-headline font-extrabold text-primary w-full"
                  type="number" 
                  defaultValue="250" 
                />
              </div>
              <p className="text-[10px] md:text-xs text-outline-variant leading-tight px-1 font-medium">
                This amount will be credited to users who complete reading the article.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <button className="w-full bg-gradient-to-br from-[#006b3f] to-[#008751] text-on-primary-container py-4 rounded-xl font-headline font-bold text-base md:text-lg shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
              <span>Publish Article</span>
              <span className="material-symbols-outlined">send</span>
            </button>
            <button className="w-full bg-surface-container-highest text-primary py-4 rounded-xl font-headline font-bold text-base md:text-lg hover:bg-surface-container-low transition-all">
              Save Draft
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
