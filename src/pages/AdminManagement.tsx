import { Link } from 'react-router-dom';

export function AdminManagement() {
  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-32">
      {/* Welcome Header */}
      <section className="mb-10">
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">Operations Overview</h1>
        <p className="text-on-surface-variant font-medium">Monitoring platform health and transaction velocity.</p>
      </section>

      {/* Bento Grid Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Total Users (Primary Accent) */}
        <div className="bg-primary-container p-6 rounded-[1.5rem] relative overflow-hidden group shadow-lg">
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white mb-4">
              <span className="material-symbols-outlined">group</span>
            </div>
            <p className="text-white/80 text-sm font-medium mb-1">Total Users</p>
            <h3 className="text-white text-3xl font-bold font-headline">124,892</h3>
            <div className="mt-4 flex items-center gap-2 text-primary-fixed text-xs font-bold">
              <span className="material-symbols-outlined text-sm">trending_up</span>
              <span>+12% from last month</span>
            </div>
          </div>
          {/* Abstract Pattern */}
          <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
            <span className="material-symbols-outlined text-[120px] text-white" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
          </div>
        </div>

        {/* Pending Withdrawals (Neon Highlight) */}
        <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-[0px_20px_40px_rgba(0,33,16,0.06)] border border-outline-variant/20">
          <div className="w-12 h-12 rounded-full bg-tertiary-fixed-dim/20 flex items-center justify-center text-tertiary mb-4">
            <span className="material-symbols-outlined">payments</span>
          </div>
          <p className="text-on-surface-variant text-sm font-medium mb-1">Pending Withdrawals</p>
          <h3 className="text-on-surface text-3xl font-bold font-headline">₦4,250,000</h3>
          <div className="mt-4 flex items-center gap-2 text-error text-xs font-bold">
            <span className="material-symbols-outlined text-sm">priority_high</span>
            <span>24 requests requiring action</span>
          </div>
        </div>

        {/* Total Posts (Subtle Depth) */}
        <div className="bg-surface-container-low p-6 rounded-[1.5rem]">
          <div className="w-12 h-12 rounded-full bg-secondary-container flex items-center justify-center text-on-secondary-container mb-4">
            <span className="material-symbols-outlined">post_add</span>
          </div>
          <p className="text-on-surface-variant text-sm font-medium mb-1">Total Active Posts</p>
          <h3 className="text-on-surface text-3xl font-bold font-headline">8,642</h3>
          <div className="mt-4 flex items-center gap-2 text-primary text-xs font-bold">
            <span className="material-symbols-outlined text-sm">check_circle</span>
            <span>98% moderation accuracy</span>
          </div>
        </div>
      </div>

      {/* Asymmetric Section: Pending Approvals & Quick Insights */}
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Pending Approvals (Main Column) */}
        <div className="flex-grow space-y-6">
          <div className="flex justify-between items-end px-2">
            <h2 className="text-xl font-bold font-headline text-on-surface">Recent Withdrawal Requests</h2>
            <Link to="#" className="text-primary text-sm font-bold hover:underline">View All</Link>
          </div>
          <div className="space-y-4">
            {/* Withdrawal Item 1 */}
            <div className="bg-surface-container-lowest p-5 rounded-[1.2rem] flex items-center justify-between shadow-sm border border-transparent hover:border-primary-fixed-dim/40 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant">person</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface text-sm md:text-base">Chukwudi Evans</p>
                  <p className="text-[10px] md:text-xs text-on-surface-variant">Ref: #WTH-90210 • 2 mins ago</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-on-surface text-sm md:text-base">₦45,000.00</p>
                <span className="inline-block px-2 py-0.5 md:px-3 md:py-1 bg-tertiary-fixed-dim/10 text-tertiary text-[10px] font-black rounded-full uppercase tracking-widest mt-1">Pending</span>
              </div>
            </div>

            {/* Withdrawal Item 2 */}
            <div className="bg-surface-container-lowest p-5 rounded-[1.2rem] flex items-center justify-between shadow-sm border border-transparent hover:border-primary-fixed-dim/40 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant">person</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface text-sm md:text-base">Amina Bello</p>
                  <p className="text-[10px] md:text-xs text-on-surface-variant">Ref: #WTH-90211 • 15 mins ago</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-on-surface text-sm md:text-base">₦120,500.00</p>
                <span className="inline-block px-2 py-0.5 md:px-3 md:py-1 bg-tertiary-fixed-dim/10 text-tertiary text-[10px] font-black rounded-full uppercase tracking-widest mt-1">Pending</span>
              </div>
            </div>

            {/* Withdrawal Item 3 */}
            <div className="bg-surface-container-lowest p-5 rounded-[1.2rem] flex items-center justify-between shadow-sm border border-transparent hover:border-primary-fixed-dim/40 transition-all">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-on-surface-variant">person</span>
                </div>
                <div>
                  <p className="font-bold text-on-surface text-sm md:text-base">Tunde Adeyemi</p>
                  <p className="text-[10px] md:text-xs text-on-surface-variant">Ref: #WTH-90212 • 1 hour ago</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-on-surface text-sm md:text-base">₦12,000.00</p>
                <span className="inline-block px-2 py-0.5 md:px-3 md:py-1 bg-tertiary-fixed-dim/10 text-tertiary text-[10px] font-black rounded-full uppercase tracking-widest mt-1">Pending</span>
              </div>
            </div>
          </div>
        </div>

        {/* Side Insights (Offset Grid) */}
        <div className="lg:w-80 space-y-8">
          <div className="bg-inverse-surface p-6 rounded-[1.5rem] text-white shadow-lg">
            <h4 className="font-bold mb-4 font-label">Admin Dashboards</h4>
            <div className="grid grid-cols-2 gap-3">
              <Link to="/admin/users" className="flex flex-col items-center justify-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                <span className="material-symbols-outlined text-tertiary-fixed">group</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-center">Users</span>
              </Link>
              <Link to="/admin/transactions" className="flex flex-col items-center justify-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                <span className="material-symbols-outlined text-primary-fixed">payments</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-center">Finances</span>
              </Link>
              <Link to="/admin/content" className="flex flex-col items-center justify-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                <span className="material-symbols-outlined text-secondary-fixed">article</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-center">Content</span>
              </Link>
              <button className="flex flex-col items-center justify-center gap-2 p-4 bg-white/10 rounded-xl hover:bg-white/20 transition-colors">
                <span className="material-symbols-outlined text-error-container">report</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-center">Logs</span>
              </button>
            </div>
          </div>

          {/* Moderation Heatmap Style Area */}
          <div className="bg-surface-container p-6 rounded-[1.5rem]">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-on-surface text-sm">Platform Health</h4>
              <span className="w-3 h-3 rounded-full bg-tertiary-fixed-dim animate-pulse"></span>
            </div>
            <div className="space-y-4">
              <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-primary w-[85%]"></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                <span>Server Load</span>
                <span>85% Optimal</span>
              </div>
              <div className="h-2 w-full bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-tertiary w-[94%]"></div>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                <span>Uptime</span>
                <span>99.9%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
