import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function Dashboard() {
  const { user } = useAuth();
  
  const [walletData, setWalletData] = useState<any>(null);
  const [articlesRead, setArticlesRead] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user?.id) return;
      setIsLoading(true);

      try {
        // Fetch Wallet Balance
        const { data: wallet } = await supabase
          .from('wallet_balances')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (wallet) {
          setWalletData(wallet);
        }

        // Fetch user tasks (can represent reads/activity)
        const { count, error } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('completed_by', user.id);
          
        if (!error && count !== null) {
          setArticlesRead(count);
        }

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  // Fallback defaults
  const balance = walletData?.balance || 0;
  const totalEarnings = walletData?.total_earnings || 0;

  if (isLoading) {
    return <div className="p-8 text-center text-on-surface-variant font-medium">Loading Overview...</div>;
  }

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-12 space-y-8 w-full">
      {/* Value Shield (Wallet Section) */}
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary-container p-6 md:p-8 text-on-primary-container shadow-[0px_20px_40px_rgba(0,33,16,0.1)]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-on-primary-container/80 font-medium tracking-wide uppercase text-xs mb-1">
                Available Balance
              </p>
              <h2 className="text-3xl md:text-4xl font-extrabold font-headline tracking-tight mb-2">
                ₦{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              <div className="flex items-center gap-2 opacity-90">
                <span className="material-symbols-outlined text-sm">currency_exchange</span>
                <span className="font-medium">≈ ${(balance / 1500).toFixed(2)} USDT</span>
              </div>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-2xl p-3">
              <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8">
            <Link to="/wallet" className="flex items-center justify-center gap-2 bg-tertiary-fixed-dim text-on-tertiary-fixed font-bold py-3 md:py-4 rounded-xl active:scale-95 transition-transform text-sm md:text-base">
              <span className="material-symbols-outlined">payments</span>
              Withdraw
            </Link>
            <Link to="/swap" className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-3 md:py-4 rounded-xl active:scale-95 transition-transform text-sm md:text-base">
              <span className="material-symbols-outlined">swap_horiz</span>
              Swap
            </Link>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <nav className="flex flex-nowrap items-center gap-3 mb-8 overflow-x-auto pb-4 scrollbar-hide px-2">
        <button className="flex-shrink-0 px-6 py-2.5 rounded-full bg-primary text-white font-semibold text-sm shadow-md">Overview</button>
        <Link to="/analytics" className="flex-shrink-0 px-6 py-2.5 rounded-full bg-surface-container-highest text-on-surface-variant font-semibold text-sm hover:bg-primary-fixed-dim transition-colors">Analytics</Link>
        <Link to="/earn" className="flex-shrink-0 px-6 py-2.5 rounded-full bg-surface-container-highest text-on-surface-variant font-semibold text-sm hover:bg-primary-fixed-dim transition-colors">Earnings</Link>
        <Link to="/referral" className="flex-shrink-0 px-6 py-2.5 rounded-full bg-surface-container-highest text-on-surface-variant font-semibold text-sm hover:bg-primary-fixed-dim transition-colors">Referrals</Link>
      </nav>

      {/* Quick Actions Grid */}
      <section>
        <div className="flex justify-between items-end mb-4 px-2">
          <h3 className="text-lg font-bold font-headline text-on-surface">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-5 gap-4">
          <Link to="/earn" className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm group-active:scale-90 transition-all">
              <span className="material-symbols-outlined text-3xl">menu_book</span>
            </div>
            <span className="text-xs font-semibold text-center text-on-surface-variant">Read & Earn</span>
          </Link>
          <Link to="/referral" className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm group-active:scale-90 transition-all">
              <span className="material-symbols-outlined text-3xl">group_add</span>
            </div>
            <span className="text-xs font-semibold text-center text-on-surface-variant">Referral</span>
          </Link>
          <Link to="/plans" className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm group-active:scale-90 transition-all">
              <span className="material-symbols-outlined text-3xl">rocket_launch</span>
            </div>
            <span className="text-xs font-semibold text-center text-on-surface-variant">Plans</span>
          </Link>
          <Link to="/wallet" className="flex flex-col items-center gap-2 group cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm group-active:scale-90 transition-all">
              <span className="material-symbols-outlined text-3xl">history</span>
            </div>
            <span className="text-xs font-semibold text-center text-on-surface-variant">History</span>
          </Link>
          <Link to="/settings" className="hidden md:flex flex-col items-center gap-2 group cursor-pointer">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm group-active:scale-90 transition-all">
              <span className="material-symbols-outlined text-3xl">support_agent</span>
            </div>
            <span className="text-xs font-semibold text-center text-on-surface-variant">Support</span>
          </Link>
        </div>
      </section>

      {/* Bento Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="col-span-1 md:col-span-2 bg-surface-container-lowest p-6 rounded-[2rem] flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full">
              Total Earnings
            </span>
            <div className="mt-4">
              <h4 className="text-3xl font-black font-headline text-on-surface">
                ₦{totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h4>
              <p className="text-sm text-on-surface-variant mt-1">Consistency brings growth.</p>
            </div>
          </div>
          <div className="mt-6 flex gap-2">
            <div className="h-2 w-full bg-surface-container rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full"
                style={{ width: `${Math.min((balance / (totalEarnings || 1)) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-[2rem] shadow-sm">
            <span className="material-symbols-outlined text-tertiary mb-2">share</span>
            <p className="text-sm font-medium text-on-surface-variant">Referral Earnings</p>
            <h4 className="text-xl font-bold font-headline text-on-surface truncate">
              {/* Note: This is simulated until an actual referral earnings column exists */}
              ₦0.00
            </h4>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-[2rem] shadow-sm">
            <span className="material-symbols-outlined text-primary mb-2">article</span>
            <p className="text-sm font-medium text-on-surface-variant">Tasks Completed</p>
            <h4 className="text-xl font-bold font-headline text-on-surface">{articlesRead}</h4>
          </div>
        </div>
      </section>

      {/* Promotional Card */}
      <section className="relative rounded-[2rem] overflow-hidden aspect-[16/7] md:aspect-[21/6] group mt-6">
        <img 
          alt="Promotional Banner" 
          className="w-full h-full object-cover"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVzN6StLGsJSOuIdPHO2AG7KeSTjQNL7njCa5ELJU3LPosoYFhTSRmDY-1fvsBbNupPcgUH1XUyR2F-6SAFiyS-OVyrONuo87mQZTphF9wYUaG5Lr5ODv60vVyQTLxGYVFhbcpA9lCwiEApKIWD6x63Kq0OQ3JPegaieU_H-yEx0xQnQlq8whbQcSa9dkNysfdmvcgNATfCNzLQBNYE7C36W3E7L5oSEoLY-n0hcD9IT-wR9nv_WSnH96c2nrsf8iJo29ntG34Ti0" 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-950/80 to-transparent p-6 md:p-8 flex flex-col justify-center">
          <span className="text-emerald-300 font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] mb-2">Build Your Value</span>
          <h4 className="text-white text-xl md:text-2xl font-black font-headline max-w-[200px] md:max-w-[250px] leading-tight">
            Read Premium Articles Exclusively.
          </h4>
          <Link to="/plans" className="mt-4 bg-white text-emerald-900 font-bold px-4 md:px-6 py-2 rounded-full w-fit hover:bg-emerald-50 transition-colors text-sm">
            View Articles
          </Link>
        </div>
      </section>
    </main>
  );
}
