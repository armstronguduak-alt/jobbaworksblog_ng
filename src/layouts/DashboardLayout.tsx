import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X } from 'lucide-react';
import { NotificationsDropdown } from '../components/NotificationsDropdown';
import { SupportChatbot } from '../components/SupportChatbot';
import { useAppSettings } from '../hooks/useAppSettings';
import { CommunityModal } from '../components/CommunityModal';
import { PlanUpsellModal } from '../components/PlanUpsellModal';
import { supabase } from '../lib/supabase';

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommunityModalOpen, setIsCommunityModalOpen] = useState(false);
  const [isUpsellModalOpen, setIsUpsellModalOpen] = useState(false);
  const [communityChecked, setCommunityChecked] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, isAdmin, isModerator, signOut } = useAuth();

  // Auto-show community modal for new users who haven't started the community task
  useEffect(() => {
    if (!user?.id || communityChecked) return;
    (async () => {
      try {
        const { data } = await supabase
          .from('community_tasks')
          .select('status, reward_claimed')
          .eq('user_id', user.id)
          .eq('task_name', 'Join Our Community')
          .maybeSingle();

        // Show modal if user has never started the community task
        if (!data) {
          setIsCommunityModalOpen(true);
        }
      } catch (err) {
        console.log('Community check skipped:', err);
      } finally {
        setCommunityChecked(true);
      }
    })();
  }, [user?.id, communityChecked]);

  // Auto-show Upsell Modal logic (Once a day)
  useEffect(() => {
    if (!profile?.id || isCommunityModalOpen) return;
    
    // Check if user is on the highest plan
    if (profile?.plan_id?.toLowerCase() === 'platinum') return;

    const today = new Date().toISOString().split('T')[0];
    const lastUpsellDate = localStorage.getItem(`last_upsell_${profile.id}`);

    if (lastUpsellDate !== today) {
      // Delay showing it to not overwhelm them on load
      const timer = setTimeout(() => {
        setIsUpsellModalOpen(true);
        localStorage.setItem(`last_upsell_${profile.id}`, today);
      }, 5000); // show 5 seconds after load
      return () => clearTimeout(timer);
    }
  }, [profile, isCommunityModalOpen]);

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
    if (path.includes('transactions')) return 'Transactions';
    if (path.includes('settings')) return 'Settings';
    if (path.includes('profile')) return 'Profile';
    return 'Overview'; // dashboard home
  };

  const { pageToggles } = useAppSettings();

  const menuItems = [
    { name: 'Overview', path: '/dashboard', icon: 'dashboard', show: true },
    { name: 'Earnings', path: '/analytics', icon: 'monitoring', show: true },
    { name: 'Transactions', path: '/transactions', icon: 'receipt_long', show: true },
    { name: 'Wallet', path: '/wallet', icon: 'account_balance_wallet', show: pageToggles.walletEnabled },
    { name: 'Swap', path: '/swap', icon: 'swap_horiz', show: pageToggles.swapEnabled && profile?.is_nigerian !== false },
    { name: 'Leaderboard', path: '/leaderboard', icon: 'emoji_events', show: pageToggles.leaderboardEnabled },
    { name: 'My Articles', path: '/articles', icon: 'article', show: true },
    { name: 'My Stories', path: '/dashboard/mystories', icon: 'auto_stories', show: pageToggles.storiesEnabled },
    { name: 'Tasks', path: '/earn', icon: 'task_alt', show: pageToggles.earningsEnabled },
    { name: 'Plans', path: '/plans', icon: 'rocket_launch', show: true },
    { name: 'Referrals', path: '/referral', icon: 'group_add', show: pageToggles.referralsEnabled },
    { name: 'Promotions', path: '/promotional', icon: 'campaign', show: pageToggles.promotionsEnabled },
  ].filter(item => item.show);

  return (
    <div className="flex h-screen bg-surface text-on-surface font-body overflow-hidden">
      
      {/* Mobile Top Bar */}
      <div className="md:hidden fixed top-0 w-full h-[70px] bg-surface-container-lowest border-b border-surface-container flex items-center justify-between px-4 z-50">
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
          <NotificationsDropdown />
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
        w-[260px] bg-surface-container-lowest border-r border-surface-container h-full
        flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo Section */}
        <Link to="/" className="h-[90px] px-6 flex items-center gap-3 flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="JobbaWorks Logo" className="w-8 h-8 rounded-lg object-contain bg-primary shadow-sm" />
          <span className="text-xl font-black text-emerald-950 font-headline tracking-tighter">JobbaWorks</span>
        </Link>

        {/* Scrollable Nav Area */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-8 scrollbar-hide">
          
          {/* Main Menu */}
          <div>
            <p className="px-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Menu</p>
            <nav className="flex flex-col gap-1 overflow-x-hidden p-1">
              {menuItems.map((item, idx) => {
                const isActive = location.pathname.includes(item.path);
                const staggerDelay = `${idx * 60 + 100}ms`;
                return (
                  <Link 
                    key={item.name}
                    to={item.path}
                    onClick={() => setIsSidebarOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-semibold transition-all duration-300 transform ${!isSidebarOpen ? 'max-md:-translate-x-8 max-md:opacity-0 delay-0' : 'max-md:translate-x-0 max-md:opacity-100'}
                      ${isActive 
                        ? 'bg-emerald-50 text-emerald-700 shadow-[inset_0px_0px_0px_1px_rgba(4,120,87,0.1)]' 
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                      }
                    `}
                    style={{
                      transitionDelay: isSidebarOpen ? staggerDelay : '0ms'
                    }}
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

          {/* Connect & Community */}
          <div className="mt-4">
            <p className="px-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-3">Community</p>
            <button 
              onClick={() => {
                setIsSidebarOpen(false);
                setIsCommunityModalOpen(true);
              }}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl font-bold bg-primary text-white hover:bg-emerald-800 transition-colors shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-[20px]">group_add</span>
              <span className="text-[14px]">Join Our Community</span>
            </button>
          </div>

          {/* Admin / Moderator Mode Switch */}
          {(isAdmin || isModerator) && (
            <div className="mt-8">
              <p className={`px-3 text-[10px] font-bold uppercase tracking-widest mb-3 ${isAdmin ? 'text-error' : 'text-amber-600'}`}>
                {isAdmin ? 'Security & Operations' : 'Moderator Access'}
              </p>
              <nav className="flex flex-col gap-1">
                <Link 
                  to="/admin" 
                  onClick={() => setIsSidebarOpen(false)}
                  className={`flex items-center gap-4 px-4 py-3 rounded-2xl font-bold transition-all duration-200
                    ${location.pathname.startsWith('/admin') 
                      ? isAdmin ? 'bg-error text-white shadow-md shadow-error/30' : 'bg-amber-500 text-white shadow-md shadow-amber-400/30'
                      : isAdmin ? 'text-error hover:bg-error/10' : 'text-amber-600 hover:bg-amber-50'
                    }
                  `}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: location.pathname.startsWith('/admin') ? "'FILL' 1" : "'FILL' 0" }}>
                    {isAdmin ? 'shield_person' : 'manage_accounts'}
                  </span>
                  <span className="text-[14px]">{isAdmin ? 'Admin Mode' : 'Moderator Panel'}</span>
                </Link>
              </nav>
            </div>
          )}
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
        <header className="hidden md:flex h-[90px] px-8 lg:px-12 items-center justify-between border-b border-surface-container/50 bg-surface/80 backdrop-blur-md z-30 flex-shrink-0 sticky top-0">
          <h1 className="text-xl lg:text-3xl font-black font-headline text-emerald-950 tracking-tight">
            {getPageTitle()}
          </h1>
          
          <div className="flex items-center gap-6">
            <NotificationsDropdown />
            
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-bold text-emerald-950 leading-tight">
                  {profile?.name || profile?.full_name || profile?.username || 'User'}
                </span>
                <span className="text-[10px] font-bold text-on-surface-variant tracking-wider uppercase">
                  ID: #{profile?.id?.slice(0, 5) || '00000'}
                </span>
              </div>
              <Link to="/profile" className="w-[42px] h-[42px] rounded-full overflow-hidden shadow-sm border-2 border-white hover:border-emerald-100 transition-colors bg-surface-container">
                <img src={profile?.avatar_url || "https://api.dicebear.com/7.x/notionists/svg?seed=Felix"} alt="User Avatar" className="w-full h-full object-cover" />
              </Link>
            </div>
          </div>
        </header>

        {/* Dashboard Pages Scrollable Content */}
        <div className="flex-1 overflow-y-auto mt-[70px] md:mt-0 relative pb-10">
          <Outlet />
        </div>
        <SupportChatbot />
        <CommunityModal
          isOpen={isCommunityModalOpen}
          onClose={() => setIsCommunityModalOpen(false)}
          onJoined={() => {
            setIsCommunityModalOpen(false);
            navigate('/earn');
          }}
        />
        <PlanUpsellModal 
          isOpen={isUpsellModalOpen}
          onClose={() => setIsUpsellModalOpen(false)}
          currentPlanId={profile?.plan_id?.toLowerCase() || 'free'}
        />
      </div>
    </div>
  );
}
