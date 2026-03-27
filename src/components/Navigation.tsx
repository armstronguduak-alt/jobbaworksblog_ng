import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

interface NavigationProps {
  onMenuToggle: () => void;
  isMenuOpen: boolean;
}

export function Navigation({ onMenuToggle, isMenuOpen }: NavigationProps) {
  const location = useLocation();
  const isDashboardOrWallet = location.pathname.includes('/leaderboard') || location.pathname.includes('/wallet') || location.pathname.includes('/earned');

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md docked full-width top-0 sticky z-50 shadow-[0px_20px_40px_rgba(0,33,16,0.06)]">
      <div className="flex justify-between items-center w-full px-4 md:px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 md:gap-4">
          <button 
            className="md:hidden text-emerald-900 dark:text-emerald-50 p-1"
            onClick={onMenuToggle}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          <Link to="/" className="flex items-center gap-2 md:gap-4">
            <img src="/logo.png" alt="JobbaWorks Logo" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-xl md:text-2xl font-black text-emerald-900 dark:text-emerald-50 font-headline tracking-tight">JobbaWorks</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <Link to="/" className="text-emerald-700 dark:text-emerald-400 font-bold font-headline tracking-tight">Home</Link>
          <Link to="/earn" className="text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors px-3 py-2 rounded-lg font-body font-medium">Earn</Link>
          <Link to="/articles" className="text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors px-3 py-2 rounded-lg font-body font-medium">Articles</Link>
          <Link to="/leaderboard" className="text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors px-3 py-2 rounded-lg font-body font-medium">Dashboard</Link>
        </nav>
        
        <div className="flex items-center gap-3">
          {isDashboardOrWallet && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 px-3 md:px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-800">
              <span className="text-sm md:text-base text-emerald-700 dark:text-emerald-400 font-bold">₦25,450.00</span>
            </div>
          )}
          <Link to="/profile" className="bg-primary text-white p-2 rounded-full hidden md:flex items-center justify-center">
            <span className="material-symbols-outlined">account_circle</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
