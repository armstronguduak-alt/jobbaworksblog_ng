'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { X, Home, Coins, LayoutDashboard, Wallet, Settings } from 'lucide-react'
import { useAuth } from '@/components/client/AuthProvider'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface DashboardMobileMenuProps {
  isOpen: boolean
  onClose: () => void
  pageToggles: any
}

export function DashboardMobileMenu({ isOpen, onClose, pageToggles }: DashboardMobileMenuProps) {
  const { user } = useAuth()
  const pathname = usePathname()
  const [profile, setProfile] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    if (user?.id && isOpen && !profile) {
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle().then(({ data }) => {
        if (data) setProfile(data)
      })
    }
  }, [user?.id, isOpen, profile, supabase])

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-[60] md:hidden backdrop-blur-sm"
          onClick={onClose}
        />
      )}
      
      {/* Mobile Drawer */}
      <div className={`fixed top-0 left-0 w-72 max-w-[85vw] h-full bg-white dark:bg-slate-900 z-[70] transform transition-transform duration-300 ease-in-out md:hidden flex flex-col shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="JobbaWorks Logo" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-xl font-black text-emerald-900 dark:text-emerald-50 font-headline">JobbaWorks</span>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full dark:hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex flex-col gap-2 p-4 flex-grow overflow-y-auto">
          <Link href="/" onClick={onClose} style={{ animationDelay: '100ms' }} className="animate-fade-in-left opacity-0 fill-mode-forwards flex items-center gap-3 p-3 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-300 transition-colors">
            <Home size={20} className="text-emerald-600" />
            <span className="font-semibold px-2 font-body">Home</span>
          </Link>
          
          {pageToggles.earningsEnabled && (
            <Link href="/earn" onClick={onClose} style={{ animationDelay: '200ms' }} className={`animate-fade-in-left opacity-0 fill-mode-forwards flex items-center gap-3 p-3 rounded-xl transition-colors ${pathname?.includes('/earn') ? 'bg-emerald-50 dark:bg-emerald-900/30 text-primary' : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-300'}`}>
              <Coins size={20} className="text-emerald-600" />
              <span className="font-semibold px-2 font-body">Earn</span>
            </Link>
          )}
          
          {pageToggles.leaderboardEnabled && (
            <Link href="/dashboard" onClick={onClose} style={{ animationDelay: '300ms' }} className={`animate-fade-in-left opacity-0 fill-mode-forwards flex items-center gap-3 p-3 rounded-xl transition-colors ${pathname?.includes('/dashboard') ? 'bg-emerald-50 dark:bg-emerald-900/30 text-primary' : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-300'}`}>
              <LayoutDashboard size={20} className="text-emerald-600" />
              <span className="font-semibold px-2 font-body">Dashboard</span>
            </Link>
          )}
          
          {pageToggles.walletEnabled && (
            <Link href="/wallet" onClick={onClose} style={{ animationDelay: '400ms' }} className={`animate-fade-in-left opacity-0 fill-mode-forwards flex items-center gap-3 p-3 rounded-xl transition-colors ${pathname?.includes('/wallet') ? 'bg-emerald-50 dark:bg-emerald-900/30 text-primary' : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-300'}`}>
              <Wallet size={20} className="text-emerald-600" />
              <span className="font-semibold px-2 font-body">Wallet</span>
            </Link>
          )}
          
          <Link href="/settings" onClick={onClose} style={{ animationDelay: '500ms' }} className={`animate-fade-in-left opacity-0 fill-mode-forwards flex items-center gap-3 p-3 rounded-xl transition-colors ${pathname?.includes('/settings') ? 'bg-emerald-50 dark:bg-emerald-900/30 text-primary' : 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-700 dark:text-slate-300'}`}>
            <Settings size={20} className="text-emerald-600" />
            <span className="font-semibold px-2 font-body">Settings</span>
          </Link>
        </div>
        
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes fadeInLeft {
            from { opacity: 0; transform: translateX(-20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .animate-fade-in-left {
            animation: fadeInLeft 0.4s ease-out forwards;
          }
          .fill-mode-forwards {
            animation-fill-mode: forwards;
          }
        `}} />
        
        <div className="p-4 border-t border-slate-100 dark:border-slate-800">
          <Link href="/profile" onClick={onClose} className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl flex items-center gap-3 hover:bg-emerald-100 dark:hover:bg-emerald-800/40 transition-colors cursor-pointer group">
             <div className="w-[42px] h-[42px] rounded-full overflow-hidden bg-primary text-white flex items-center justify-center border-2 border-white dark:border-emerald-900 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
               {profile?.avatar_url ? (
                 <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
               ) : (
                 <span className="material-symbols-outlined text-xl">account_circle</span>
               )}
             </div>
             <div className="overflow-hidden">
               <p className="text-sm font-bold text-emerald-900 dark:text-emerald-100 truncate font-body">
                 {profile?.name || profile?.full_name || 'User Profile'}
               </p>
               <p className="text-xs text-slate-500 truncate font-body">
                 {profile?.username ? `@${profile.username}` : (profile?.phone || 'Manage Account')}
               </p>
             </div>
          </Link>
        </div>
      </div>
    </>
  )
}
