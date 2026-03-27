import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Bell } from 'lucide-react';

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('earn') || path.includes('tasks')) return 'Tasks';
    if (path.includes('wallet')) return 'Wallet';
    if (path.includes('swap')) return 'Swap';
    if (path.includes('leaderboard')) return 'Leaderboard';
    if (path.includes('my-articles')) return 'My Articles';
    if (path.includes('plans')) return 'Plans';
    if (path.includes('referral')) return 'Referrals';
    if (path.includes('analytics')) return 'Analytics';
    if (path.includes('settings')) return 'Settings';
    if (path.includes('profile')) return 'Profile';
    return 'Overview'; // dashboard home
  };

  const menuItems = [
    { name: 'Overview', path: '/dashboard', icon: 'dashboard' },
    { name: 'Earnings', path: '/analytics', icon: 'monitoring' },
    { name: 'Wallet', path: '/wallet', icon: 'account_balance_wallet' },
    { name: 'Swap', path: '/swap', icon: 'swap_horiz' },
    { name: 'Leaderboard', path: '/leaderboard', icon: 'emoji_events' },
    { name: 'My Articles', path: '/articles', icon: 'article' },
    { name: 'Tasks', path: '/earn', icon: 'task_alt' },
    { name: 'Plans', path: '/plans', icon: 'rocket_launch' },
    { name: 'Referrals', path: '/referral', icon: 'group_add' },
  ];

  return (
    <div className="flex h-screen bg-[#f8faf9] text-on-surface font-body overflow-hidden">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 w-full h-[70px] bg-white border-b border-surface-container flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <button onClick={toggleSidebar} className="p-2 text-on-surface-variant bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to="/" className="w-10 h-10 bg-primary text-white flex items-center justify-center rounded-xl shadow-md">
            <span className="font-extrabold text-xl font-headline">J</span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
             <span className="material-symbols-outlined text-[20px]">home</span>
          </Link>
          <button className="p-2 bg-rose-50 text-rose-500 rounded-xl relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
          </button>
          <Link to="/profile" className="w-[38px] h-[38px] rounded-xl overflow-hidden shadow-sm border border-surface-container">
            <img src={profile?.avatar_url || "https://api.dicebear.com/7.x/notionists/svg?seed=Felix"} alt="User Avatar" className="w-full h-full object-cover" />
          </Link>
        </div>
      </div>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-[260px] bg-white border-r border-surface-container h-full
        flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo Section */}
        <div className="h-[90px] px-6 flex items-center gap-3 flex-shrink-0">
          <img src="/logo.png" alt="JobbaWorks Logo" className="w-8 h-8 rounded-lg object-contain bg-primary shadow-sm" />
          <span className="text-xl font-black text-emerald-950 font-headline tracking-tighter">JobbaWorks</span>
        </div>

        {/* Scrollable Nav Area */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-8 scrollbar-hide">
          
          {/* Main Menu */}
          <div>
            <p className="px-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Menu</p>
            <nav className="flex flex-col gap-1">
              {menuItems.map((item) => {
                const isActive = location.pathname.includes(item.path);
                return (
                  <Link 
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-semibold transition-all duration-200
                      ${isActive 
                        ? 'bg-emerald-50 text-emerald-700 shadow-[inset_0px_0px_0px_1px_rgba(4,120,87,0.1)]' 
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }
                    `}
                  >
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0" }}>
                      {item.icon}
                    </span>
                    <span className="text-[14px]">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Community Section */}
          <div>
            <p className="px-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Community</p>
            <nav className="flex flex-col gap-1">
              <Link to="#" className="flex items-center gap-4 px-4 py-3 rounded-2xl font-semibold text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors">
                <span className="material-symbols-outlined text-[20px]">forum</span>
                <span className="text-[14px]">Community Chat</span>
              </Link>
            </nav>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-surface-container flex items-center justify-between flex-shrink-0">
          <button 
            onClick={signOut}
            className="flex items-center gap-2 text-rose-500 hover:text-rose-600 font-bold px-3 py-2 rounded-xl transition-colors text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Logout
          </button>
          <Link to="/settings" className="p-2 text-on-surface-variant hover:bg-surface-container rounded-xl transition-colors">
            <span className="material-symbols-outlined text-[20px]">settings</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Desktop Top Bar */}
        <header className="hidden md:flex h-[90px] px-8 lg:px-12 items-center justify-between border-b border-surface-container/50 bg-[#f8faf9]/80 backdrop-blur-md z-30 flex-shrink-0 sticky top-0">
          <h1 className="text-xl lg:text-3xl font-black font-headline text-emerald-950 tracking-tight">
            {getPageTitle()}
          </h1>
          
          <div className="flex items-center gap-6">
            <button className="bg-white p-2.5 rounded-full shadow-sm border border-surface-container-highest/20 text-on-surface-variant hover:text-emerald-700 transition-colors relative group">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
              <div className="absolute top-full right-0 mt-2 bg-surface text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                Notifications
              </div>
            </button>
            
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-emerald-950 leading-tight">
                  {profile?.full_name || 'User'}
                </span>
                <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">
                  ID: #{profile?.id?.slice(0, 5) || '00000'}
                </span>
              </div>
              <Link to="/profile" className="w-[42px] h-[42px] rounded-full overflow-hidden shadow-sm border-2 border-white hover:border-emerald-100 transition-colors">
                <img src={profile?.avatar_url || "https://api.dicebear.com/7.x/notionists/svg?seed=Felix"} alt="User Avatar" className="w-full h-full object-cover" />
              </Link>
            </div>
          </div>
        </header>

        {/* Dashboard Pages Scrollable Content */}
        <div className="flex-1 overflow-y-auto mt-[70px] md:mt-0 relative pb-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
