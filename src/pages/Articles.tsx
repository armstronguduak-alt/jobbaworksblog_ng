import { useState } from 'react';

export function Articles() {
  const [activeTab, setActiveTab] = useState('All');

  const tabs = ['All Articles', 'Published', 'Drafts'];

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-32 space-y-8 w-full">
      {/* Summary Analytics Header (Bento Style) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-primary p-6 md:p-8 rounded-3xl relative overflow-hidden shadow-lg group">
          <div className="absolute -right-4 -bottom-4 opacity-10 transition-transform group-hover:scale-110 duration-500">
            <span className="material-symbols-outlined text-[80px] md:text-[120px]">description</span>
          </div>
          <p className="text-primary-fixed text-xs md:text-sm font-semibold tracking-wider uppercase mb-2">Total Articles</p>
          <h2 className="text-white text-3xl md:text-4xl font-black font-headline">1,284</h2>
          <div className="mt-4 flex items-center gap-2 text-tertiary-fixed text-xs md:text-sm">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            <span>+12% this month</span>
          </div>
        </div>
        
        <div className="bg-surface-container-lowest p-6 md:p-8 rounded-3xl shadow-[0px_20px_40px_rgba(0,33,16,0.04)] border-b-4 border-emerald-100">
          <p className="text-outline text-xs md:text-sm font-semibold tracking-wider uppercase mb-2">Total Views</p>
          <h2 className="text-on-surface text-3xl md:text-4xl font-black font-headline">42.8M</h2>
          <div className="mt-4 flex items-center gap-2 text-primary font-medium text-xs md:text-sm">
            <span className="material-symbols-outlined text-sm">visibility</span>
            <span>Global reach active</span>
          </div>
        </div>
        
        <div className="bg-surface-container-lowest p-6 md:p-8 rounded-3xl shadow-[0px_20px_40px_rgba(0,33,16,0.04)] border-b-4 border-emerald-100">
          <p className="text-outline text-xs md:text-sm font-semibold tracking-wider uppercase mb-2">Total Paid Out</p>
          <h2 className="text-on-surface text-3xl md:text-4xl font-black font-headline">₦14.2M</h2>
          <div className="mt-4 flex items-center gap-2 text-tertiary font-medium text-xs md:text-sm">
            <span className="material-symbols-outlined text-sm">payments</span>
            <span>Verified payouts</span>
          </div>
        </div>
      </section>

      {/* Filters and Search */}
      <section className="flex flex-col lg:flex-row gap-4 mb-6 items-start lg:items-center justify-between">
        <div className="w-full lg:w-96 relative">
          <input
            className="w-full bg-surface-container-low border-none rounded-2xl py-3 md:py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary-container/40 transition-all text-on-surface placeholder:text-outline text-sm md:text-base"
            placeholder="Search by title or author..." 
            type="text" 
          />
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">search</span>
        </div>
        <div className="flex items-center gap-2 md:gap-3 overflow-x-auto pb-2 w-full lg:w-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-bold whitespace-nowrap transition-colors ${
                activeTab === tab || (activeTab === 'All' && tab === 'All Articles')
                  ? 'bg-primary-container text-on-primary-container'
                  : 'bg-surface-container-highest text-on-surface-variant hover:bg-emerald-50'
              }`}
            >
              {tab}
            </button>
          ))}
          <button className="bg-surface-container-low text-on-surface-variant p-2 md:p-2.5 rounded-xl border border-outline-variant/20 flex-shrink-0">
            <span className="material-symbols-outlined text-sm md:text-base">filter_list</span>
          </button>
        </div>
      </section>

      {/* Articles List/Table */}
      <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-[0px_20px_40px_rgba(0,33,16,0.04)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-surface-container-low/50">
                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-outline">Title & Author</th>
                <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-outline">Views</th>
                <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-outline">Rewards</th>
                <th className="px-4 md:px-6 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-outline">Status</th>
                <th className="px-6 md:px-8 py-4 md:py-5 text-[10px] md:text-xs font-black uppercase tracking-widest text-outline text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {/* Article Row 1 */}
              <tr className="group hover:bg-surface-container-low transition-colors">
                <td className="px-6 md:px-8 py-4 md:py-6">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-secondary-container overflow-hidden shrink-0">
                      <img 
                        alt="Article Thumbnail"
                        className="w-full h-full object-cover"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuB6xAKC2acUbcqWUR_ozZbVxK9_sDWq05gcSMvS0boUlrcx39acuVdks4-YELr2C2pHNJ4-ShuKRb8KjNQNfNg0LOVWMhIqO16OBngf70xhfpVATTYE1nmyJefidrnVZ9eyrZNb-rotWP4CqBVqZcPatKziOJ8USdFy8KdF-23WVr9gfqB2zLJvW_619oVAZPtSNyV24xH2-LrBS-BFjXQfsl53qlUSffvJJ5bmoM-jX60brpbn6QhKBThz7PHLEguCMBTbS6Ar9P8" 
                      />
                    </div>
                    <div>
                      <p className="font-bold text-on-surface text-sm md:text-base line-clamp-1">Maximizing Freelance Earnings in Lagos</p>
                      <p className="text-xs md:text-sm text-outline">by Adebayo K. • 2h ago</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 md:px-6 py-4 md:py-6">
                  <span className="text-on-surface font-semibold text-sm md:text-base">124.5k</span>
                </td>
                <td className="px-4 md:px-6 py-4 md:py-6">
                  <span className="text-tertiary font-bold text-sm md:text-base">₦45,000</span>
                </td>
                <td className="px-4 md:px-6 py-4 md:py-6">
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2 md:px-3 py-1 rounded-full">Published</span>
                </td>
                <td className="px-6 md:px-8 py-4 md:py-6 text-right">
                  <div className="flex items-center justify-end gap-1 md:gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 md:p-2 hover:bg-white rounded-lg text-outline hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-sm md:text-base">edit</span>
                    </button>
                    <button className="p-1.5 md:p-2 hover:bg-white rounded-lg text-outline hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-sm md:text-base">analytics</span>
                    </button>
                    <button className="p-1.5 md:p-2 hover:bg-white rounded-lg text-outline hover:text-error transition-colors">
                      <span className="material-symbols-outlined text-sm md:text-base">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
              
              {/* Article Row 2 */}
              <tr className="group hover:bg-surface-container-low transition-colors">
                <td className="px-6 md:px-8 py-4 md:py-6">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-secondary-container overflow-hidden shrink-0">
                      <img 
                        alt="Article Thumbnail"
                        className="w-full h-full object-cover"
                        src="https://lh3.googleusercontent.com/aida-public/AB6AXuA0aKr043eC1aI8GN_0cujbOPluK-03d0yODp1HpNbZ3Sn7KCFUSHKl57Rw0mS-FUKLG9o35gQnlzMmBmM8NACQXivbetYl3ATdPAXoy-YTTe8uR9BBOK89whUoQ8AAeOayP9BG0y7Mqqb1vS7Nq8dt_VeAuUFLmMTkGgsJX3wwBRuKpnWme_ZNYEzW9ikQ8EsxzW5O-y8Qvw1GdAxuiR5IcM_QTkb3LJA9BpNX5Rln4vPA5aeou4NU3J-__riv9xhFMIYWV9zn4_4" 
                      />
                    </div>
                    <div>
                      <p className="font-bold text-on-surface text-sm md:text-base line-clamp-1">The Future of Remote Work in Nigeria</p>
                      <p className="text-xs md:text-sm text-outline">by Chioma O. • 1d ago</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 md:px-6 py-4 md:py-6">
                  <span className="text-on-surface font-semibold text-sm md:text-base">89.2k</span>
                </td>
                <td className="px-4 md:px-6 py-4 md:py-6">
                  <span className="text-tertiary font-bold text-sm md:text-base">₦22,500</span>
                </td>
                <td className="px-4 md:px-6 py-4 md:py-6">
                  <span className="bg-emerald-100 text-emerald-800 text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2 md:px-3 py-1 rounded-full">Published</span>
                </td>
                <td className="px-6 md:px-8 py-4 md:py-6 text-right">
                  <div className="flex items-center justify-end gap-1 md:gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 md:p-2 hover:bg-white rounded-lg text-outline hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-sm md:text-base">edit</span>
                    </button>
                    <button className="p-1.5 md:p-2 hover:bg-white rounded-lg text-outline hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-sm md:text-base">analytics</span>
                    </button>
                    <button className="p-1.5 md:p-2 hover:bg-white rounded-lg text-outline hover:text-error transition-colors">
                      <span className="material-symbols-outlined text-sm md:text-base">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
              
              {/* Article Row 3 (Draft) */}
              <tr className="group hover:bg-surface-container-low transition-colors">
                <td className="px-6 md:px-8 py-4 md:py-6">
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-surface-container-highest overflow-hidden shrink-0 flex items-center justify-center">
                      <span className="material-symbols-outlined text-outline">image</span>
                    </div>
                    <div>
                      <p className="font-bold text-on-surface text-sm md:text-base line-clamp-1">Top 10 Tech Hubs to Watch in 2024</p>
                      <p className="text-xs md:text-sm text-outline">by Tunde S. • Draft</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 md:px-6 py-4 md:py-6">
                  <span className="text-outline font-semibold text-sm md:text-base">—</span>
                </td>
                <td className="px-4 md:px-6 py-4 md:py-6">
                  <span className="text-outline font-bold text-sm md:text-base">₦0</span>
                </td>
                <td className="px-4 md:px-6 py-4 md:py-6">
                  <span className="bg-surface-container-highest text-on-surface-variant text-[9px] md:text-[10px] font-black uppercase tracking-widest px-2 md:px-3 py-1 rounded-full">Draft</span>
                </td>
                <td className="px-6 md:px-8 py-4 md:py-6 text-right">
                  <div className="flex items-center justify-end gap-1 md:gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                    <button className="p-1.5 md:p-2 hover:bg-white rounded-lg text-outline hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-sm md:text-base">edit</span>
                    </button>
                    <button className="p-1.5 md:p-2 hover:bg-white rounded-lg text-outline hover:text-primary transition-colors">
                      <span className="material-symbols-outlined text-sm md:text-base">rocket_launch</span>
                    </button>
                    <button className="p-1.5 md:p-2 hover:bg-white rounded-lg text-outline hover:text-error transition-colors">
                      <span className="material-symbols-outlined text-sm md:text-base">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Pagination / Footer */}
        <div className="px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row items-center justify-between bg-surface-container-low/30 gap-4">
          <p className="text-xs md:text-sm text-outline">Showing 1 to 10 of 1,284 articles</p>
          <div className="flex items-center gap-1 md:gap-2">
            <button className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-outline hover:text-primary">
              <span className="material-symbols-outlined text-sm md:text-base">chevron_left</span>
            </button>
            <button className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl bg-primary text-white font-bold shadow-md shadow-primary/20 text-sm md:text-base">1</button>
            <button className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-on-surface font-bold hover:bg-emerald-50 transition-colors text-sm md:text-base">2</button>
            <button className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-outline hover:text-primary">
              <span className="material-symbols-outlined text-sm md:text-base">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* Floating Action Button (FAB) relative position wrapper to not obstruct content */}
      <div className="fixed bottom-6 right-6 z-[60] pt-8">
        <button className="flex items-center gap-2 md:gap-3 bg-gradient-to-br from-primary to-primary-container text-on-primary-container px-4 md:px-6 py-3 md:py-4 rounded-full shadow-[0px_20px_40px_rgba(0,33,16,0.25)] hover:scale-105 active:scale-95 transition-all duration-300">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
          <span className="font-headline font-bold text-xs md:text-sm tracking-tight hidden sm:inline">Create New Article</span>
        </button>
      </div>
    </main>
  );
}
