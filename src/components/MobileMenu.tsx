import { Link } from 'react-router-dom';
import { X, Home, Coins, LayoutDashboard, Wallet, Settings } from 'lucide-react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      
      {/* Mobile Drawer */}
      <div className={`fixed top-0 left-0 w-64 h-full bg-white dark:bg-slate-900 z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex items-center justify-between border-b dark:border-slate-800">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="JobbaWorks Logo" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-xl font-black text-emerald-900 dark:text-emerald-50 font-headline">JobbaWorks</span>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full dark:hover:bg-slate-800">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex flex-col gap-2 p-4 flex-grow overflow-y-auto">
          <Link to="/" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-300">
            <Home size={20} className="text-emerald-600" />
            <span className="font-semibold px-2">Home</span>
          </Link>
          
          <Link to="/earn" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-300">
            <Coins size={20} className="text-emerald-600" />
            <span className="font-semibold px-2">Earn</span>
          </Link>
          
          <Link to="/leaderboard" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-300">
            <LayoutDashboard size={20} className="text-emerald-600" />
            <span className="font-semibold px-2">Dashboard</span>
          </Link>
          
          <Link to="/wallet" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-300">
            <Wallet size={20} className="text-emerald-600" />
            <span className="font-semibold px-2">Wallet</span>
          </Link>
          
          <Link to="/settings" onClick={onClose} className="flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-300">
            <Settings size={20} className="text-emerald-600" />
            <span className="font-semibold px-2">Settings</span>
          </Link>
        </div>
        
        <div className="p-4 border-t dark:border-slate-800">
          <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl flex items-center gap-3">
             <div className="bg-primary text-white p-2 rounded-full flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">account_circle</span>
             </div>
             <div>
               <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100">Babatunde A.</p>
               <p className="text-xs text-slate-500">Premium Member</p>
             </div>
          </div>
        </div>
      </div>
    </>
  );
}
