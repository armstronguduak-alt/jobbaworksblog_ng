export function Referral() {
  return (
    <div className="bg-surface font-body text-on-surface selection:bg-primary-fixed-dim min-h-screen">
      <main className="pt-8 pb-32 px-4 max-w-2xl mx-auto space-y-6">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-container p-6 text-on-primary-container shadow-xl">
          <div className="relative z-10 space-y-2">
            <h2 className="font-headline text-3xl font-extrabold leading-tight">Share the Wealth, Get Paid Forever.</h2>
            <p className="text-emerald-50/80 text-sm font-medium leading-relaxed">
              Refer your friends to JobbaWorks and earn a massive{' '}
              <span className="text-tertiary-fixed-dim font-bold">25% commission</span> on every single naira they earn on the platform.
            </p>
            <div className="pt-4">
              <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wider">
                Unlimited Earnings
              </span>
            </div>
          </div>
          {/* Decorative Pattern */}
          <div className="absolute -right-8 -bottom-8 opacity-10">
            <span className="material-symbols-outlined text-[12rem]" style={{ fontVariationSettings: "'FILL' 1" }}>
              celebration
            </span>
          </div>
        </section>

        {/* Referral Code Card */}
        <section className="bg-surface-container-lowest p-6 rounded-3xl shadow-[0px_20px_40px_rgba(0,33,16,0.06)] space-y-4 border border-surface-container-highest/20">
          <div className="flex flex-col items-center text-center space-y-2">
            <p className="text-on-surface-variant font-semibold text-xs uppercase tracking-widest">Your Unique Invite Code</p>
            <div className="bg-surface-container w-full py-4 rounded-2xl flex items-center justify-between px-6 border-2 border-dashed border-outline-variant/30">
              <span className="text-2xl font-black text-emerald-900 font-headline tracking-widest">JOBBA-X82P</span>
              <button className="flex items-center gap-2 text-primary font-bold hover:bg-primary-fixed-dim/10 px-3 py-1 rounded-lg transition-all active:scale-95">
                <span className="material-symbols-outlined text-sm">content_copy</span>
                Copy
              </button>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-center text-xs text-on-surface-variant font-medium">Share via social media</p>
            <div className="flex justify-center gap-4">
              <button className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all">
                <span className="material-symbols-outlined">chat</span>
              </button>
              <button className="w-12 h-12 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white transition-all">
                <span className="material-symbols-outlined">share</span>
              </button>
              <button className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-on-surface hover:text-white transition-all">
                <span className="material-symbols-outlined">more_horiz</span>
              </button>
            </div>
          </div>
        </section>

        {/* Statistics Bento Grid */}
        <section className="grid grid-cols-2 gap-4">
          <div className="col-span-2 bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  payments
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total Referral Earnings</p>
                <h3 className="text-xl font-black text-emerald-900 font-headline">₦128,400.00</h3>
              </div>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-surface-container-highest/20">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Active Referrals</p>
            <div className="flex items-baseline gap-1 pt-1">
              <span className="text-2xl font-black text-emerald-900 font-headline">42</span>
              <span className="text-xs font-bold text-tertiary-container">+5 new</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-surface-container-highest/20">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Pending</p>
            <div className="flex items-baseline gap-1 pt-1">
              <span className="text-2xl font-black text-on-surface-variant font-headline">₦8,250</span>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm space-y-6 border border-surface-container-highest/20">
          <h3 className="font-headline font-bold text-lg text-emerald-900">How to Earn Big</h3>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm">Invite Friends</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Share your code with friends, family, or your social media followers.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm">They Start Earning</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Your referrals complete jobs and tasks within the JobbaWorks ecosystem.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm">You Get 25%</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Get 25% of their platform earnings credited instantly to your wallet. Every time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Referral List */}
        <section className="space-y-4 pb-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-headline font-bold text-lg text-emerald-900">Recent Referrals</h3>
            <button className="text-primary font-bold text-sm hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {/* User Item 1 */}
            <div className="bg-surface-container-lowest p-4 rounded-2xl flex items-center justify-between border border-surface-container-highest/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container">
                  <img
                    alt="Referral avatar"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuD3jfcsh15E1Nvbe0_Ba_-IJaHB72Uq5eqoda0HThgU3lUwzSCkyIokxW3xyXWluxvxg6KJ18VmYsAay--KiFlQYUF2zT1Xy8YwO_gcpcZ3OfDkdjBx0wOW3s9dOxOpvFROD7ioRyUu12SNaB9TA5hWpPssBMKFdrQN4KWrCqJvzg15DNvvfRVwItZW8YnL_8gSrXAVALfpHRZB-DbJYFeNteAkI6UZQ_OxCijvd9MPV7VsskApFVYxVxtyEAIhIqaOnyyn_6FeALU"
                  />
                </div>
                <div>
                  <p className="font-bold text-sm">Chidinma Okeeke</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></span>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight">Active • 12 Jobs Done</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-on-surface-variant uppercase">Your Cut</p>
                <p className="font-black text-primary">₦12,500</p>
              </div>
            </div>
            {/* User Item 2 */}
            <div className="bg-surface-container-lowest p-4 rounded-2xl flex items-center justify-between border border-surface-container-highest/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container">
                  <img
                    alt="Referral avatar"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuBje8OZYgwOeyyOgPvZBtyK66ceIFjz44PtBgWs81lXb9LfdmFcvGd0epFZPNpoUQrYGgqAcTsI_cVV1tplUnejToVtwgmwLEgK4ZSOueCgLWjV5mdvom8j_qp0n2YP72AfrZOonDc-1awr5eD7Vc29AfPEC8DRDh71-PXcuX70a0xTAIj-Tv8fuvogeBpt7JsD-lj2huLIZ-mq2KxOMr15hdICkfstXbAHdj5vmjg3tZspUQDRL3LzHR7oPeoJ_LhvgU06OZFaa-o"
                  />
                </div>
                <div>
                  <p className="font-bold text-sm">Tunde Bakare</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></span>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight">Active • 8 Jobs Done</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-on-surface-variant uppercase">Your Cut</p>
                <p className="font-black text-primary">₦4,200</p>
              </div>
            </div>
            {/* User Item 3 */}
            <div className="bg-surface-container-lowest p-4 rounded-2xl flex items-center justify-between opacity-70 border border-surface-container-highest/20">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container grayscale">
                  <img
                    alt="Referral avatar"
                    className="w-full h-full object-cover"
                    src="https://lh3.googleusercontent.com/aida-public/AB6AXuAMdIWrPFqo0oYlguXxhNc0Db8yh3sNFjaVtjFIGXvtaTKW_wgiKE6zP2yrrWzLWwhXXtvGRvXnQrwm5IlSxmj_1w_Tm6JF7DFoVefxWwiwRV_cnwGaOIfmZ_QSDCCd-svLdgtICyTWEyM2pNXMI43gcAzD2lQRWYFxWv87tlKBwJ_fB3JZrs4LxhlzTEQuAqiLcPwddb8jC07gIE_krIcUIFm2j2e14Pxiy8mOHatKVehzO54d6-L6pim8GvuPxAczjlyP4aQGqlU"
                  />
                </div>
                <div>
                  <p className="font-bold text-sm">Emeka Uzor</p>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                    <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight">Inactive • 0 Jobs Done</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-on-surface-variant uppercase">Your Cut</p>
                <p className="font-black text-on-surface-variant">₦0.00</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
