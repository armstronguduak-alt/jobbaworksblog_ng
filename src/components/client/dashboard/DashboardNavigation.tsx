'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/components/client/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { DashboardMobileMenu } from './DashboardMobileMenu'

interface DashboardNavigationProps {
  pageToggles: any
}

export function DashboardNavigation({ pageToggles }: DashboardNavigationProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const supabase = createClient()

  const isDashboardOrWallet = pathname?.includes('/leaderboard') || pathname?.includes('/wallet') || pathname?.includes('/dashboard') || pathname?.includes('/earn')

  // Fetch wallet and subscribe
  useEffect(() => {
    if (!user?.id) return

    const fetchWallet = async () => {
      const { data } = await supabase.from('wallet_balances').select('balance').eq('user_id', user.id).maybeSingle()
      if (data) setWalletBalance(data.balance)
    }

    fetchWallet()

    const channel = supabase
      .channel('nav-wallet-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wallet_balances', filter: `user_id=eq.${user.id}` }, (payload: any) => {
        if (payload.new?.balance !== undefined) {
          setWalletBalance(payload.new.balance)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, supabase])

  return (
    <>
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md docked full-width top-0 sticky z-50 shadow-[0px_20px_40px_rgba(0,33,16,0.06)] border-b border-slate-100 dark:border-slate-800">
        <div className="flex justify-between items-center w-full px-4 md:px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              className="md:hidden text-emerald-900 dark:text-emerald-50 p-1"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            
            <Link href="/" className="flex items-center gap-2 md:gap-4">
              <img src="/logo.png" alt="JobbaWorks Logo" className="w-8 h-8 rounded-lg object-contain" />
              <span className="text-xl md:text-2xl font-black text-emerald-900 dark:text-emerald-50 font-headline tracking-tight">JobbaWorks</span>
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-emerald-700 dark:text-emerald-400 font-bold font-headline tracking-tight">Home</Link>
            {pageToggles.earningsEnabled && (
              <Link href="/earn" className={`hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors px-3 py-2 rounded-lg font-body font-medium ${pathname?.includes('/earn') ? 'text-primary bg-emerald-50 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>Earn</Link>
            )}
            <Link href="/articles" className="text-slate-600 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors px-3 py-2 rounded-lg font-body font-medium">Articles</Link>
            {pageToggles.leaderboardEnabled && (
              <Link href="/dashboard" className={`hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors px-3 py-2 rounded-lg font-body font-medium ${pathname?.includes('/dashboard') ? 'text-primary bg-emerald-50 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>Dashboard</Link>
            )}
          </nav>
          
          <div className="flex items-center gap-3">
            {isDashboardOrWallet && walletBalance !== null && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 px-3 md:px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-800">
                <span className="text-sm md:text-base text-emerald-700 dark:text-emerald-400 font-bold">₦{walletBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            )}
            <Link href="/profile" className="bg-primary text-white p-2 rounded-full hidden md:flex items-center justify-center hover:scale-105 transition-transform">
              <span className="material-symbols-outlined">account_circle</span>
            </Link>
          </div>
        </div>
      </header>

      <DashboardMobileMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
        pageToggles={pageToggles}
      />
    </>
  )
}
