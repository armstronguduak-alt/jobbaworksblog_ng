
import { Link } from 'react-router-dom';
import { useDialog } from '../contexts/DialogContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function Promotional() {
  const { showAlert } = useDialog();
  
  const { data: promotions, isLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const filteredAssets = promotions || [];

  const handleDownload = (assetTitle: string) => {
    // Simulated direct download action
    showAlert(`Downloading high-quality asset: ${assetTitle}...`, 'Download');
  };

  const handleShare = (platform: string, assetTitle: string) => {
    // Simulated share action
    showAlert(`Preparing to share ${assetTitle} to ${platform}...`, 'Share');
  };

  return (
    <div className="bg-[#f8faf9] text-on-surface font-body min-h-screen">
      {/* Hero Section */}
      <section className="bg-primary pt-16 pb-24 md:pt-24 md:pb-32 px-4 md:px-6 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-900/50 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2 pointer-events-none"></div>
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <span className="bg-white/10 text-emerald-100 px-4 py-1.5 rounded-full text-xs font-bold tracking-[0.2em] uppercase border border-white/20 shadow-sm inline-block">
            Ambassador Toolkit
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-white font-headline tracking-tighter leading-tight">
            Grow Your <span className="text-emerald-300 italic">Network.</span>
          </h1>
          <p className="text-white/80 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            Access immediate self-serve keys, branded graphics, and high-quality banners. Share them on social media to empower your referral network effectively.
          </p>
          <div className="flex justify-center gap-4 pt-4">
            <Link to="/signup" className="bg-white text-primary font-bold px-8 py-3.5 rounded-full shadow-lg hover:bg-emerald-50 active:scale-95 transition-all w-full sm:w-auto">
              Get Started Now
            </Link>
            <a href="#assets" className="bg-emerald-800 text-white font-bold px-8 py-3.5 rounded-full hover:bg-emerald-900 active:scale-95 transition-all border border-emerald-700 w-full sm:w-auto hidden sm:block">
              Browse Gallery
            </a>
          </div>
        </div>
      </section>

      {/* Asset Gallery Section */}
      <section id="assets" className="max-w-7xl mx-auto px-4 md:px-6 py-16 -mt-10 relative z-20">
        
        {/* Modular Navigation / Filter */}
        <div className="bg-surface-container-lowest shadow-xl border border-surface-container-highest/30 rounded-3xl p-4 flex flex-col sm:flex-row justify-between items-center gap-4 mb-10 max-w-3xl mx-auto">
          <div className="flex bg-surface-container p-1 rounded-2xl w-full sm:w-auto">
            <button 
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all bg-white text-primary shadow-sm`}
            >
              All Assets
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm font-bold text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px]">cloud_download</span>
            {filteredAssets.length} Resources
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {isLoading && <p>Loading assets...</p>}
          {!isLoading && filteredAssets.length === 0 && <p className="text-on-surface-variant">No promotional assets available.</p>}
          {filteredAssets.map((asset) => (
            <div key={asset.id} className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-lg border border-surface-container-highest/20 group hover:border-primary/40 transition-colors">
              <div className="relative aspect-[16/9] md:aspect-[2/1] bg-surface-container overflow-hidden">
                <img 
                  src={asset.image_url} 
                  alt={asset.title} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="bg-white/90 backdrop-blur-md text-emerald-950 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">
                    Campaign
                  </span>
                </div>
              </div>
              <div className="p-6 md:p-8 space-y-6">
                <div>
                  <h3 className="text-xl md:text-2xl font-bold font-headline text-on-surface mb-2 leading-tight">
                    {asset.title}
                  </h3>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    {asset.description}
                  </p>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {asset.cta_text && (
                    <a href={asset.cta_url || '#'} target="_blank" rel="noreferrer" className="bg-surface-container px-3 py-1 rounded-lg text-xs font-semibold text-emerald-700 hover:bg-emerald-50">
                      {asset.cta_text} ↗
                    </a>
                  )}
                </div>

                <div className="pt-4 border-t border-surface-container-highest/50 flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => handleDownload(asset.title)}
                    className="flex-1 bg-primary text-white font-bold py-3.5 rounded-xl shadow-md hover:bg-emerald-800 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[20px]">download</span>
                    Direct Download
                  </button>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleShare('Twitter', asset.title)}
                      className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center hover:bg-blue-100 active:scale-95 transition-all"
                      title="Share to Twitter"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                    </button>
                    <button 
                      onClick={() => handleShare('Facebook', asset.title)}
                      className="w-12 h-12 bg-indigo-50 text-indigo-700 rounded-xl flex items-center justify-center hover:bg-indigo-100 active:scale-95 transition-all"
                      title="Share to Facebook"
                    >
                       <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                    </button>
                    <button 
                       onClick={() => handleShare('WhatsApp', asset.title)}
                       className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center hover:bg-green-100 active:scale-95 transition-all"
                       title="Share to WhatsApp"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.898-4.45 9.898-9.898 0-2.64-1.026-5.122-2.893-6.989-1.868-1.868-4.352-2.895-6.991-2.895-5.449 0-9.898 4.45-9.898 9.898 0 2.072.766 4.09 2.196 5.864l-1.092 3.992 4.088-1.564zm7.329-8.49c3.078 1.488 3.256 1.785 3.315 2.141.059.356-.239 1.13-.893 1.547-.653.416-2.083.714-2.887.476-.803-.238-1.838-.636-3.155-1.587-1.317-.951-2.221-2.482-2.5-2.86-.279-.378-1.251-1.561-1.251-2.748 0-1.187.653-1.636.893-1.874.238-.238.476-.356.714-.356.238 0 .476.012.653.012.179 0 .417-.06.653.416.238.476.834 2.141.893 2.261.059.119.119.356 0 .595-.119.238-.238.356-.476.595-.238.238-.417.356-.595.654-.179.297-.417.595.238.951.653.357 1.546 1.07 1.963 1.666z"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Global Call to Action */}
        <div className="mt-20 bg-emerald-950 rounded-3xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl"></div>
          <div className="relative z-10 flex flex-col items-center gap-6">
            <span className="material-symbols-outlined text-emerald-400 text-5xl">rocket_launch</span>
            <h2 className="text-3xl md:text-4xl font-black font-headline text-white max-w-xl">
              Ready to Maximize Your Re-Distribution Strategy?
            </h2>
            <p className="text-white/70 font-medium max-w-md">
              Share these branded materials using your unique referral unified links to drive conversions immediately.
            </p>
            <Link to="/referral" className="bg-emerald-400 text-emerald-950 font-bold px-8 py-4 rounded-full shadow-lg hover:bg-emerald-300 active:scale-95 transition-all mt-2">
              Get Your Referral Link
            </Link>
          </div>
        </div>

      </section>
    </div>
  );
}
