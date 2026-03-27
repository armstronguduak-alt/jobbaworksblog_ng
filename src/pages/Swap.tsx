export function Swap() {
  return (
    <div className="bg-background font-body text-on-background min-h-screen">
      <main className="pt-8 pb-32 px-4 md:px-6 max-w-2xl mx-auto space-y-8">
        {/* Page Title */}
        <div className="space-y-2">
          <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-primary-fixed-variant">
            Currency Swap
          </h2>
          <p className="text-on-surface-variant leading-relaxed">
            Instantly convert your earnings between local and international currencies with the best market rates.
          </p>
        </div>

        {/* Value Shield: Balance Display */}
        <section className="relative overflow-hidden bg-primary p-8 rounded-3xl shadow-[0px_20px_40px_rgba(0,33,16,0.06)]">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
          <div className="relative z-10 space-y-1">
            <span className="text-primary-fixed text-sm font-medium tracking-wide uppercase">Available Balance</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-headline font-black text-on-primary">₦1,240,500.00</span>
            </div>
            <div className="pt-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary-fixed-dim" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified_user
              </span>
              <p className="text-primary-fixed text-xs">Secured by JobbaVault Technology</p>
            </div>
          </div>
        </section>

        {/* Swap Interface */}
        <div className="bg-surface-container-lowest p-6 rounded-[2rem] space-y-6 shadow-sm border border-surface-container-highest/30">
          {/* From Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-sm font-semibold text-on-surface-variant">From</label>
              <span className="text-xs text-primary font-medium cursor-pointer hover:underline">Max: ₦1,240,500</span>
            </div>
            <div className="bg-surface-container-low rounded-2xl p-4 flex items-center justify-between group focus-within:bg-surface-container-lowest transition-all duration-300 border border-transparent focus-within:border-primary-fixed-dim/40">
              <div className="flex flex-col flex-1">
                <input
                  className="bg-transparent border-none p-0 text-2xl font-headline font-bold text-on-surface focus:ring-0 w-full placeholder:text-outline-variant outline-none"
                  placeholder="0.00"
                  type="number"
                  defaultValue="500000"
                />
                <span className="text-xs text-outline font-medium">Nigerian Naira</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm shrink-0">
                <span className="w-6 h-6 bg-green-700 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                  NGN
                </span>
                <span className="font-bold text-sm">₦</span>
              </div>
            </div>
          </div>

          {/* Swap Trigger */}
          <div className="relative flex justify-center -my-3 z-10">
            <button className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white shadow-lg active:scale-90 transition-transform">
              <span className="material-symbols-outlined">swap_vert</span>
            </button>
          </div>

          {/* To Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center px-1">
              <label className="text-sm font-semibold text-on-surface-variant">To (Estimated)</label>
            </div>
            <div className="bg-surface-container-low rounded-2xl p-4 flex items-center justify-between">
              <div className="flex flex-col">
                <p className="text-2xl font-headline font-bold text-on-surface">312.50</p>
                <span className="text-xs text-outline font-medium">United States Dollar</span>
              </div>
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm">
                <span className="w-6 h-6 bg-blue-700 rounded-full flex items-center justify-center text-[10px] text-white font-bold">
                  USD
                </span>
                <span className="font-bold text-sm">$</span>
              </div>
            </div>
          </div>

          {/* Real-time Rate Display */}
          <div className="bg-surface-container rounded-2xl p-4 flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-tertiary-fixed-dim/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-tertiary text-sm">trending_up</span>
              </div>
              <div>
                <p className="text-xs font-medium text-outline">Current Rate</p>
                <p className="text-sm font-bold text-on-surface">1 USD = ₦1,600.00</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-tertiary uppercase tracking-wider">Live Market</p>
              <p className="text-xs text-outline">Updated 2s ago</p>
            </div>
          </div>

          {/* Transaction Details */}
          <div className="space-y-3 pt-4 border-t border-surface-container-highest">
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Service Fee (0.5%)</span>
              <span className="font-semibold text-on-surface">₦2,500.00</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-on-surface-variant">Estimated Arrival</span>
              <span className="font-semibold text-primary">Instant</span>
            </div>
          </div>

          {/* Confirm Button */}
          <button className="w-full bg-gradient-to-br from-[#006b3f] to-[#008751] text-on-primary-container py-5 rounded-2xl font-headline font-bold text-lg shadow-xl shadow-primary/10 active:scale-95 transition-all mt-6">
            Confirm Swap
          </button>
        </div>

        {/* Info Card */}
        <div className="bg-secondary-container/30 p-5 rounded-2xl flex gap-4 items-start">
          <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>
            info
          </span>
          <p className="text-sm text-on-secondary-container leading-relaxed">
            Conversion rates are subject to market volatility. The rate shown will be locked for 60 seconds once you
            proceed to the next step.
          </p>
        </div>
      </main>
    </div>
  );
}
