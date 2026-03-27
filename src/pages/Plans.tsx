export function Plans() {
  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-32 w-full">
      {/* Hero Section */}
      <section className="mb-16 text-center md:text-left max-w-3xl">
        <span className="bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant px-4 py-1.5 rounded-full text-xs md:text-sm font-bold tracking-wider mb-6 inline-block">
          UPGRADE YOUR CAREER
        </span>
        <h2 className="text-4xl md:text-6xl font-headline font-extrabold text-on-surface leading-[1.1] tracking-tight mb-6">
          Scale your earnings with <span className="text-primary italic">Kinetic Plans.</span>
        </h2>
        <p className="text-base md:text-lg text-on-surface-variant leading-relaxed opacity-80">
          Choose the growth path that matches your ambition. Unlock higher article rates, exclusive bonuses, and unlimited potential.
        </p>
      </section>

      {/* Plans Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
        {/* Free Plan */}
        <div className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-[0px_20px_40px_rgba(0,33,16,0.04)] hover:translate-y-[-8px] transition-all duration-300">
          <div className="mb-8">
            <h3 className="text-2xl font-headline font-bold mb-2">Free Plan</h3>
            <p className="text-on-surface-variant text-sm">Perfect for getting started</p>
          </div>
          <div className="mb-10 flex items-baseline gap-1">
            <span className="text-4xl font-black text-on-surface">₦0</span>
            <span className="text-on-surface-variant text-sm font-medium">/month</span>
          </div>
          <ul className="space-y-4 md:space-y-5 mb-12">
            <li className="flex items-center gap-3 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span>Low earnings per article</span>
            </li>
            <li className="flex items-center gap-3 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span>Base daily read limit (5)</span>
            </li>
            <li className="flex items-center gap-3 text-sm text-on-surface-variant opacity-50">
              <span className="material-symbols-outlined text-outline/40">cancel</span>
              <span className="line-through">Bonus earnings</span>
            </li>
            <li className="flex items-center gap-3 text-sm text-on-surface-variant opacity-50">
              <span className="material-symbols-outlined text-outline/40">cancel</span>
              <span className="line-through">Priority support</span>
            </li>
          </ul>
          <button className="w-full py-3 md:py-4 rounded-xl font-bold bg-surface-container-high text-on-surface hover:bg-surface-variant transition-colors active:scale-95 duration-200">
            Current Plan
          </button>
        </div>

        {/* Premium Plan (Prominent Highlight) */}
        <div className="relative bg-gradient-to-br from-[#006b3f] to-[#008751] p-6 md:p-8 rounded-2xl shadow-[0px_40px_80px_rgba(0,107,63,0.15)] transform md:scale-105 z-10 text-on-primary-container ring-4 ring-tertiary-fixed-dim/20">
          <div className="absolute -top-4 md:-top-5 left-1/2 -translate-x-1/2 bg-tertiary-fixed-dim text-on-tertiary-fixed px-4 md:px-6 py-1.5 md:py-2 rounded-full text-[10px] md:text-sm font-black tracking-widest uppercase shadow-lg whitespace-nowrap">
            MOST POPULAR
          </div>
          <div className="mb-8 pt-4">
            <h3 className="text-2xl md:text-3xl font-headline font-extrabold mb-2">Premium Plan</h3>
            <p className="text-on-primary-container/80 text-sm">Maximum earnings potential</p>
          </div>
          <div className="mb-10 flex items-baseline gap-1">
            <span className="text-4xl md:text-5xl font-black text-on-primary-container">₦15,000</span>
            <span className="text-on-primary-container/70 text-xs md:text-sm font-medium">/month</span>
          </div>
          <ul className="space-y-4 md:space-y-5 mb-12">
            <li className="flex items-center gap-3 text-sm">
              <span className="material-symbols-outlined text-tertiary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
              <span className="font-semibold">High earnings per article</span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <span className="material-symbols-outlined text-tertiary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>all_inclusive</span>
              <span className="font-semibold">Unlimited daily reads</span>
            </li>
            <li className="flex items-center gap-3 text-base md:text-sm">
              <span className="material-symbols-outlined text-tertiary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>add_moderator</span>
              <span className="font-semibold text-base md:text-lg">10% Bonus on all revenue</span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <span className="material-symbols-outlined text-tertiary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
              <span className="font-semibold">Instant payout access</span>
            </li>
          </ul>
          <button className="w-full py-4 md:py-5 rounded-xl font-bold bg-surface-container-lowest text-primary hover:bg-primary-fixed transition-all shadow-xl active:scale-95 duration-200 text-base md:text-lg">
            Subscribe Now
          </button>
        </div>

        {/* Basic Plan */}
        <div className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-[0px_20px_40px_rgba(0,33,16,0.04)] hover:translate-y-[-8px] transition-all duration-300">
          <div className="mb-8">
            <h3 className="text-2xl font-headline font-bold mb-2">Basic Plan</h3>
            <p className="text-on-surface-variant text-sm">Stepping up your game</p>
          </div>
          <div className="mb-10 flex items-baseline gap-1">
            <span className="text-4xl font-black text-on-surface">₦5,500</span>
            <span className="text-on-surface-variant text-sm font-medium">/month</span>
          </div>
          <ul className="space-y-4 md:space-y-5 mb-12">
            <li className="flex items-center gap-3 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span>Medium earnings per article</span>
            </li>
            <li className="flex items-center gap-3 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span>Higher daily limits (20)</span>
            </li>
            <li className="flex items-center gap-3 text-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-primary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              <span className="font-semibold">5% bonus on all revenue</span>
            </li>
            <li className="flex items-center gap-3 text-sm text-on-surface-variant opacity-50">
              <span className="material-symbols-outlined text-outline/40">cancel</span>
              <span>Standard support</span>
            </li>
          </ul>
          <button className="w-full py-3 md:py-4 rounded-xl font-bold border-2 border-primary text-primary hover:bg-primary/5 transition-colors active:scale-95 duration-200">
            Subscribe
          </button>
        </div>
      </div>

      {/* Asymmetric Value Section */}
      <section className="mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
        <div className="md:col-span-7 bg-surface-container-low rounded-3xl p-6 md:p-12 overflow-hidden relative">
          <div className="bg-white/40 absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-3xl hidden md:block"></div>
          <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-headline font-bold mb-8 text-on-primary-fixed-variant">Why upgrade?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-container rounded-2xl flex items-center justify-center text-on-primary-container">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                </div>
                <h4 className="font-bold text-base md:text-lg">Compound Growth</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  The 10% bonus isn't just a number—it compounds your effort daily, turning small tasks into significant capital.
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-secondary-container rounded-2xl flex items-center justify-center text-on-secondary-container">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>speed</span>
                </div>
                <h4 className="font-bold text-base md:text-lg">Unlimited Velocity</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Remove the ceiling. Read as many articles as you want and earn without restrictions on Premium.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="md:col-span-5 hidden md:block">
          <div className="rounded-2xl overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
            <img 
              alt="Premium Access" 
              className="w-full aspect-square object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAE8kqNLHrgYs_wuhNxAksUEaSFuK6qRaXpBUG0Ixel61-AmVKGUBZY_mKFli3Ml-UMRExyMl-AamMJz6ebZ6NHaHrw_-BpMEHXRQT_zMikQRLsot742DXE5ci945ahx1SaZco9A8Sj8sDz39Ny8f0NGuhY8ho8QplsxOi3z5DqORazMiwY60TmikSQT3XpBmQUe4GuMSIc9Kme6_Tbl0nA5fuZcS7zH4QY0xAmCgwMCoyehnmO4h390ZW7Nz95UMdBIue_2Jodwk" 
            />
          </div>
        </div>
      </section>
    </main>
  );
}
