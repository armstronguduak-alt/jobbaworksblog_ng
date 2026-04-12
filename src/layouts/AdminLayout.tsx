import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X } from 'lucide-react';
import { NotificationsDropdown } from '../components/NotificationsDropdown';

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const { profile, signOut } = useAuth();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const getPageTitle = () => {
    const path = location.pathname;
    if (path.includes('users')) return 'User Management';
    if (path.includes('moderation')) return 'Post Moderation';
    if (path.includes('categories')) return 'Categories';
    if (path.includes('tasks')) return 'Tasks & Bounties';
    if (path.includes('promotions')) return 'Promotions';
    if (path.includes('articles')) return 'Articles Management';
    if (path.includes('referrals')) return 'Referrals Management';
    if (path.includes('settings')) return 'Global Settings';
    return 'System Overview';
  };

  const menuItems = [
    { name: 'System Overview', path: '/admin', icon: 'admin_panel_settings' },
    { name: 'Post Moderation', path: '/admin/moderation', icon: 'fact_check' },
    { name: 'User Management', path: '/admin/users', icon: 'group' },
    { name: 'Categories', path: '/admin/categories', icon: 'sell' },
    { name: 'Transactions', path: '/admin/transactions', icon: 'payments' },
    { name: 'Tasks & Bounties', path: '/admin/tasks', icon: 'track_changes' },
    { name: 'Promotions', path: '/admin/promotions', icon: 'campaign' },
    { name: 'Articles Management', path: '/admin/articles', icon: 'article' },
    { name: 'Referrals', path: '/admin/referrals', icon: 'hub' },
    { name: 'Global Settings', path: '/admin/settings', icon: 'tune' },
  ];

  return (
    <div className="flex h-screen bg-surface font-body overflow-hidden">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 w-full h-[70px] bg-white border-b border-surface-container-low flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-3">
          <button onClick={toggleSidebar} className="p-2 text-on-surface bg-surface-container/50 rounded-xl shadow-sm border border-surface-container-low">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <Link to="/admin" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary bg-primary/10 p-1.5 rounded-lg">shield_person</span>
            <span className="font-extrabold text-xl font-headline text-[#191c1d]">JW <span className="text-primary">Admin</span></span>
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <NotificationsDropdown />
          <Link to="/profile" className="w-[38px] h-[38px] rounded-xl overflow-hidden shadow-sm border border-error/20">
            <img src={profile?.avatar_url || "https://api.dicebear.com/7.x/notionists/svg?seed=Admin"} alt="Admin Avatar" className="w-full h-full object-cover" />
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
        w-[260px] bg-white border-r border-surface-container-low h-full
        flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo Section */}
        <div className="h-[90px] px-6 flex items-center gap-3 flex-shrink-0 border-b border-transparent bg-white">
          <div className="bg-primary/10 p-2 rounded-lg text-primary flex items-center justify-center">
            <span className="material-symbols-outlined">verified_user</span>
          </div>
          <span className="text-2xl font-black text-[#191c1d] font-headline tracking-tight block">
            JW <span className="text-primary">Admin</span>
          </span>
        </div>

        {/* Scrollable Nav Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-8 scrollbar-hide">
          
          {/* Main Menu */}
          <div>
            <p className="px-3 text-[10px] font-bold text-outline uppercase tracking-widest mb-3">COMMAND CENTER</p>
            <nav className="flex flex-col gap-1">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
                return (
                  <Link 
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-[12px] font-bold transition-all duration-200
                      ${isActive 
                        ? 'bg-[#dcfce7] text-[#006b3f]' 
                        : 'text-[#191c1d] hover:bg-surface-container-low'
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

          <div className="mt-8">
            <p className="px-3 text-[10px] font-bold text-outline uppercase tracking-widest mb-3">QUICK LINKS</p>
            <nav className="flex flex-col gap-1">
              <Link 
                to="/dashboard" 
                onClick={() => setIsSidebarOpen(false)}
                className="flex items-center gap-4 px-4 py-3 rounded-[12px] font-bold transition-all duration-200 text-[#191c1d] hover:bg-surface-container-low"
              >
                <span className="material-symbols-outlined text-[20px]">
                  arrow_back
                </span>
                <span className="text-[14px]">Exit Admin Mode</span>
              </Link>
              <button 
                onClick={signOut}
                className="flex items-center gap-4 text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-4 py-3 rounded-[12px] font-bold transition-colors w-full text-left"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                <span className="text-[14px]">Secure Logout</span>
              </button>
            </nav>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Desktop Top Bar */}
        <header className="hidden md:flex h-[90px] px-8 lg:px-12 items-center justify-between border-b border-surface-container/50 bg-surface-container-lowest/80 backdrop-blur-md z-30 flex-shrink-0 sticky top-0">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-error animate-pulse"></span>
            <h1 className="text-xl lg:text-3xl font-black font-headline text-on-surface tracking-tight">
              {getPageTitle()}
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
            <NotificationsDropdown />
            
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-on-surface leading-tight">
                  {profile?.name || profile?.full_name || profile?.username || 'Admin'}
                </span>
                <span className="text-[10px] font-bold text-error tracking-wider uppercase">
                  Super Administrator
                </span>
              </div>
              <div className="w-[42px] h-[42px] rounded-full overflow-hidden shadow-sm border-2 border-error/50">
                <img src={profile?.avatar_url || "https://api.dicebear.com/7.x/notionists/svg?seed=Admin"} alt="Admin Avatar" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </header>

        {/* Admin Pages Scrollable Content */}
        <div className="flex-1 overflow-y-auto mt-[70px] md:mt-0 relative pb-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
