import { Link } from 'react-router-dom';

export function Home() {
  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-32 w-full">
      {/* Hero Section: The Kinetic Oasis */}
      <section className="relative overflow-hidden mb-20 rounded-3xl">
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
              <button className="bg-white text-primary hover:bg-surface-container-lowest transition-all px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg shadow-xl active:scale-95 duration-200">
                Start Earning
              </button>
              <button className="bg-transparent border-2 border-white/30 text-white hover:bg-white/10 transition-all px-6 md:px-8 py-3 md:py-4 rounded-xl font-bold text-base md:text-lg backdrop-blur-sm">
                Learn More
              </button>
            </div>
          </div>
          <div className="w-full md:w-1/2 relative hidden md:block">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
              <img 
                className="w-full h-[400px] object-cover" 
                alt="high-end tablet showing professional financial dashboard" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBq1CeKILoKqcBKgFdJn0PvEentEGBVdRE-y2-bbnopQXg2uMW9UpBxSQHcRpncxlj1Zn8p9PTAYZT3mOaWvnah82sKTHi6t40s8rN2qlK80L3ELEeSjLYUIQgo_3k7Dj7wnlBkZXA4R71dehM-F7sBQEY7mJ2ZMVLZ8dAQNN4D9v8o6906hhEn13c_SsK8DTSrkrfq_Boi1uSQVHdnlAvY-A05ukAGOvhUzGToOpGY_vDb2UiPd-TGRzph2DrnZHH0SfUj8vtkoQs" 
              />
              <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-lg flex items-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-full">
                  <span className="material-symbols-outlined text-emerald-700">trending_up</span>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">Earnings Today</p>
                  <p className="text-lg font-black text-on-surface">+ ₦4,500.00</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Background Decorative Elements */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-tertiary-fixed-dim/20 rounded-full blur-3xl hidden md:block"></div>
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary-container/30 rounded-full blur-3xl hidden md:block"></div>
      </section>

      {/* Category Filter */}
      <nav className="flex flex-nowrap items-center gap-3 mb-12 overflow-x-auto pb-4 scrollbar-hide">
        <button className="flex-shrink-0 px-6 py-2.5 rounded-full bg-primary text-white font-semibold text-sm shadow-md">All Feed</button>
        <button className="flex-shrink-0 px-6 py-2.5 rounded-full bg-surface-container-highest text-on-surface-variant font-semibold text-sm hover:bg-primary-fixed-dim transition-colors">Entertainment</button>
        <button className="flex-shrink-0 px-6 py-2.5 rounded-full bg-surface-container-highest text-on-surface-variant font-semibold text-sm hover:bg-primary-fixed-dim transition-colors">Health</button>
        <button className="flex-shrink-0 px-6 py-2.5 rounded-full bg-surface-container-highest text-on-surface-variant font-semibold text-sm hover:bg-primary-fixed-dim transition-colors">Fintech</button>
        <button className="flex-shrink-0 px-6 py-2.5 rounded-full bg-surface-container-highest text-on-surface-variant font-semibold text-sm hover:bg-primary-fixed-dim transition-colors">Technology</button>
        <button className="flex-shrink-0 px-6 py-2.5 rounded-full bg-surface-container-highest text-on-surface-variant font-semibold text-sm hover:bg-primary-fixed-dim transition-colors">Politics</button>
      </nav>

      {/* Featured Bento Section */}
      <h2 className="text-2xl md:text-3xl font-bold font-headline mb-8 text-on-primary-fixed-variant">Featured Insights</h2>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-20">
        {/* Large Featured Card */}
        <div className="md:col-span-8 group relative rounded-3xl overflow-hidden bg-surface-container-lowest shadow-[0px_20px_40px_rgba(0,33,16,0.06)] hover:shadow-xl transition-all duration-300">
          <img 
            className="w-full h-[350px] md:h-[500px] object-cover group-hover:scale-105 transition-transform duration-700" 
            alt="minimalist workspace" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCVC7STWOUW_YuIwg1csIvelYpC7NAQHbZwFLjpyZN9SxZ1MCB7_Zc9_EFAtL2gN-BuOSOm-ZWKcV1JAKoNkwpYZ6b-pNzNHwZ5gLWzFMbEgqIc1-I7rShI7K0dVA4M1GbtIOJ8vSqkEU9T6oHUoSVrUwMV5ilc4vsQPwkv1nwVH5FIa9_WghnJefa8HEdVpIFsZnybRtSli5iZFhwrRGybKj7ktpHdUyF0uAiVCPrtH_PsIBOWURjE5s8IBhsU3PvzKEW4CzzD2C8" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-col justify-end p-6 md:p-12">
            <span className="inline-block self-start px-3 py-1 rounded-full bg-tertiary-fixed-dim text-on-tertiary-fixed font-bold text-xs mb-4">
              Fintech Exclusive
            </span>
            <h3 className="text-2xl md:text-4xl font-bold text-white mb-4 leading-tight">The Rise of Digital Nomads in Lagos: A 2024 Perspective</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img 
                  className="w-10 h-10 rounded-full border-2 border-white" 
                  alt="portrait of editor" 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuBh7_QV7e0chtI-7J33dyA9FYX7XikQ0jioMJf7lRVMOHtzoIBNoVySDFcf-2-93pz2lqCzkHytfyuujQNyqbFZtd0ZWpkTQphe3LyYiEX0JknLHsTBZkgJo9cPeI5nsE7XCRfAi7eL_0lO2nHBGe0GwA3uiogcYxIY2POcUMDTRdUpa9kgTqZkBIb533laCsfqeFJMb9sM70RHuM4tk6_oDOMeWmY0lx78kRBjq7JC_NKvkVclmPbZ8pEYlPrQnLg8XBS3ufWLgPg" 
                />
                <span className="text-white/90 text-sm font-medium">Babatunde Alade • 5 min read</span>
              </div>
              <div className="bg-white/20 backdrop-blur-xl border border-white/30 px-4 py-2 rounded-2xl flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary-fixed-dim text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                <span className="text-white font-black">Earn ₦250</span>
              </div>
            </div>
          </div>
        </div>
        {/* Side Featured Items */}
        <div className="md:col-span-4 flex flex-col gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-[0px_20px_40px_rgba(0,33,16,0.06)] hover:-translate-y-1 transition-all">
            <span className="text-primary font-bold text-xs uppercase tracking-tighter mb-2 block">Health & Wellness</span>
            <h4 className="text-xl font-bold text-on-surface mb-3 leading-snug">5 Bio-hacks to Double Your Productivity During Power Cuts</h4>
            <div className="flex items-center justify-between mt-4">
              <span className="text-slate-400 text-xs font-medium">10 min read</span>
              <span className="text-primary font-bold text-sm bg-primary-fixed/20 px-3 py-1 rounded-full">+₦120</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-[0px_20px_40px_rgba(0,33,16,0.06)] hover:-translate-y-1 transition-all">
            <span className="text-tertiary font-bold text-xs uppercase tracking-tighter mb-2 block">Technology</span>
            <h4 className="text-xl font-bold text-on-surface mb-3 leading-snug">Why 5G is the Backbone of Nigeria's Upcoming Tech Renaissance</h4>
            <div className="flex items-center justify-between mt-4">
              <span className="text-slate-400 text-xs font-medium">7 min read</span>
              <span className="text-primary font-bold text-sm bg-primary-fixed/20 px-3 py-1 rounded-full">+₦150</span>
            </div>
          </div>
          <div className="bg-emerald-900 text-white p-6 rounded-3xl shadow-xl flex flex-col justify-between h-full relative overflow-hidden">
            <div>
              <span className="material-symbols-outlined text-4xl mb-4 text-tertiary-fixed-dim">verified_user</span>
              <h4 className="text-lg font-bold mb-2">Join the Elite Club</h4>
              <p className="text-sm opacity-80">Get access to premium high-paying tasks and executive insights.</p>
            </div>
            <button className="mt-6 w-full py-3 bg-tertiary-fixed-dim text-on-tertiary-fixed font-bold rounded-xl active:scale-95 transition-transform relative z-10">
              Upgrade Now
            </button>
            {/* Abstract Background */}
            <div className="absolute -right-10 -bottom-10 opacity-10">
              <span className="material-symbols-outlined text-9xl">shield</span>
            </div>
          </div>
        </div>
      </div>

      {/* Latest Posts Feed */}
      <section className="mb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl md:text-3xl font-bold font-headline text-on-primary-fixed-variant">Latest for You</h2>
          <Link to="/articles" className="text-primary font-bold flex items-center gap-1 hover:gap-2 transition-all">
            View All <span className="material-symbols-outlined">trending_flat</span>
          </Link>
        </div>
        <div className="space-y-6">
          {/* Transactional Style List Item 1 */}
          <div className="bg-surface-container-lowest p-5 rounded-3xl flex flex-col md:flex-row items-center gap-6 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-transparent hover:border-emerald-100 transition-all">
            <div className="w-full md:w-48 h-40 md:h-32 flex-shrink-0 rounded-2xl overflow-hidden">
              <img 
                className="w-full h-full object-cover" 
                alt="diverse group of young entrepreneurs laughing" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCsH3FQzv4dOhPDqICh6CEOqVz15NzQm61PxRGAc3zCTLlK5KSC8IFmGmabgpSu3zXnuFmdqydHBz4EwtZ_kwQwsar8mW2qCMP8OkhyMjTNOLj5MueU_c50uwwP_zcuOftf3XSqeJM7LCEC7LmOVeV2U-S66VunWM9xAFfHe6Ro51yR9nd89ap1-oxZzo3q85cHU3HRYmFNJr4TnumpRihi3an7w5QoND-RtjsJJndt-HXMMTAO-EAWHSKUmn4oc_ytlMyP0mMUk5w" 
              />
            </div>
            <div className="flex-grow w-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-surface-container-high rounded-full text-[10px] font-bold text-slate-500 uppercase">Lifestyle</span>
                <span className="text-slate-400 text-xs">• 3 hours ago</span>
              </div>
              <h3 className="text-xl font-bold text-on-surface hover:text-primary transition-colors cursor-pointer">
                Unlocking the Secret to Sustainable Wealth in your 20s
              </h3>
              <p className="text-slate-500 text-sm mt-1 line-clamp-2 md:line-clamp-1">Financial freedom isn't about how much you make, but how much you keep and grow.</p>
            </div>
            <div className="w-full md:w-auto flex flex-row md:flex-col items-center justify-between gap-4 border-t md:border-t-0 md:border-l border-surface-container pt-4 md:pt-0 md:pl-8">
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium md:text-right text-left">Reward</p>
                <p className="text-2xl font-black text-emerald-700">₦100</p>
              </div>
              <button className="bg-primary-container text-on-primary-container px-6 py-2 rounded-full font-bold text-sm shadow-md active:scale-95 transition-all w-full md:w-auto">
                Read Now
              </button>
            </div>
          </div>
          
          {/* Item 2 */}
          <div className="bg-surface-container-lowest p-5 rounded-3xl flex flex-col md:flex-row items-center gap-6 shadow-[0px_4px_20px_rgba(0,0,0,0.02)] border border-transparent hover:border-emerald-100 transition-all">
            <div className="w-full md:w-48 h-40 md:h-32 flex-shrink-0 rounded-2xl overflow-hidden">
              <img 
                className="w-full h-full object-cover" 
                alt="gourmet African cuisine platter" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDk_y7JwAYvKCXReqjHxjBDj4U7wIqqhAIrr81C5Il6_jZ0sf77yIbJOLNmDMInafOje_IASRGyBweXGfikB_Lvdrt8rOkqylwQtGJBX65wn9upNBThr-igPWM-Y8urq7sPMpFw2c2O6FmYcjMaO2zIVE21z6rF-5Eky3WbZBjQKUHTrpFmlmTlWvqRPQDTlDi-3VJ06Dv_7Z9BaD4XVdFRhP6j8M3c65svbu2tnPUQrv_g_znpqfwFRcYv7dmQuoHQY9aZ-XY0NYA" 
              />
            </div>
            <div className="flex-grow w-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-surface-container-high rounded-full text-[10px] font-bold text-slate-500 uppercase">Entertainment</span>
                <span className="text-slate-400 text-xs">• 5 hours ago</span>
              </div>
              <h3 className="text-xl font-bold text-on-surface hover:text-primary transition-colors cursor-pointer">
                10 Afrobeat Albums that Defined the Last Decade
              </h3>
              <p className="text-slate-500 text-sm mt-1 line-clamp-2 md:line-clamp-1">Explore the rhythm and blues that conquered the global music charts.</p>
            </div>
            <div className="w-full md:w-auto flex flex-row md:flex-col items-center justify-between gap-4 border-t md:border-t-0 md:border-l border-surface-container pt-4 md:pt-0 md:pl-8">
              <div className="text-right">
                <p className="text-xs text-slate-400 font-medium md:text-right text-left">Reward</p>
                <p className="text-2xl font-black text-emerald-700">₦80</p>
              </div>
              <button className="bg-primary-container text-on-primary-container px-6 py-2 rounded-full font-bold text-sm shadow-md active:scale-95 transition-all w-full md:w-auto">
                Read Now
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Referral CTA */}
      <section className="bg-surface-container p-6 md:p-12 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-8 border-2 border-white/50">
        <div className="max-w-xl text-center md:text-left">
          <h2 className="text-2xl md:text-3xl font-black font-headline text-on-primary-fixed-variant mb-4">Sharing is Earning</h2>
          <p className="text-base md:text-lg text-on-surface-variant font-medium">
            Invite your friends to JobbaWorks and earn a massive <span className="text-primary font-bold">₦1,000</span> for every successful registration.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="flex-grow bg-white px-6 py-4 rounded-2xl border border-outline-variant/30 font-mono text-primary font-bold text-center">
            JOBBA-REF-2024
          </div>
          <button className="bg-on-surface text-white px-8 py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors">
            <span className="material-symbols-outlined text-sm">content_copy</span> Copy
          </button>
        </div>
      </section>
    </main>
  );
}
