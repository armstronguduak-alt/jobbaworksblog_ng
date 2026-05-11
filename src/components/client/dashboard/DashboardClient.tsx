'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/client/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { DailyLoginStreakModalClient } from './DailyLoginStreakModalClient'
import { useCurrency } from '@/lib/hooks/useCurrency'
import { UpgradeCard } from './UpgradeCard'
import { SponsorShareTask } from './SponsorShareTask'
import { PageTransition, FadeIn, StaggerList, StaggerItem, FloatingCard, AnimatedButton, AnimatedCounter } from '@/components/client/motion'

interface DashboardClientProps {
  referralSettings: any
  streakSettings: any
}

export function DashboardClient({ referralSettings, streakSettings }: DashboardClientProps) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { isGlobal, symbol, formatAmount } = useCurrency()
  const showSwap = !isGlobal && referralSettings.swapEnabledForNigerians !== false
  const supabase = createClient()
  
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0)
  const [showStreakModal, setShowStreakModal] = useState(false)
  const [streakChecked, setStreakChecked] = useState(false)
  const [showTierBreakdown, setShowTierBreakdown] = useState(false)

  // TanStack Query
  const { data: dashData } = useQuery({
    queryKey: ['dashboard', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('Not authenticated')
      
      const [walletRes, tasksRes, promoRes, referralTiersRes, subRes] = await Promise.all([
        supabase.from('wallet_balances').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('user_tasks').select('*', { count: 'exact', head: true })
          .eq('user_id', user.id).eq('completed', true),
        supabase.from('promotions').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('referral_commissions').select('tier, amount').eq('referrer_user_id', user.id),
        supabase.from('user_subscriptions').select('plan_id').eq('user_id', user.id).maybeSingle()
      ])
      
      // Calculate tier breakdowns
      const tierBreakdown = { tier1: 0, tier2: 0, tier3: 0 }
      if (referralTiersRes.data) {
        referralTiersRes.data.forEach((rc: any) => {
          const tier = rc.tier || 1
          if (tier === 1) tierBreakdown.tier1 += Number(rc.amount || 0)
          else if (tier === 2) tierBreakdown.tier2 += Number(rc.amount || 0)
          else if (tier === 3) tierBreakdown.tier3 += Number(rc.amount || 0)
        })
      }
        
      return {
        wallet: walletRes.data || { balance: 0, total_earnings: 0, referral_earnings: 0 },
        articlesRead: tasksRes.count ?? 0,
        promotions: promoRes.data || [],
        tierBreakdown,
        plan: subRes.data?.plan_id || 'free',
      }
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  })

  // Real-time subscription for wallet balance
  useEffect(() => {
    if (!user?.id) return
    const walletChannel = supabase
      .channel(`dashboard-wallet-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_balances', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new) {
            queryClient.setQueryData(['dashboard', user.id], (old: any) => old ? { ...old, wallet: payload.new } : old)
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(walletChannel) }
  }, [user?.id, queryClient, supabase])

  const walletData = dashData?.wallet
  const articlesRead = dashData?.articlesRead || 0
  const promotions = dashData?.promotions || []
  const tierBreakdown = dashData?.tierBreakdown || { tier1: 0, tier2: 0, tier3: 0 }

  // Carousel auto-slide
  useEffect(() => {
    if (promotions.length <= 1) return
    const interval = setInterval(() => {
      setCurrentPromoIndex((prev) => (prev + 1) % promotions.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [promotions.length])

  // Fallback defaults
  const balance = walletData?.balance || 0
  const totalEarnings = walletData?.total_earnings || 0
  const referralEarnings = walletData?.referral_earnings || 0
  const usdtBalance = walletData?.usdt_balance || 0
  const referralBalance = walletData?.referral_balance || 0
  const referralUsdtBalance = walletData?.referral_usdt_balance || 0
  
  const displayActivityBalance = isGlobal ? usdtBalance : balance
  const displayReferralBalance = isGlobal ? referralUsdtBalance : referralBalance

  // Check login streak on mount
  useEffect(() => {
    if (!user?.id || streakChecked) return
    ;(async () => {
      try {
        const { data } = await supabase.rpc('get_login_streak_status')
        if (data && !data.claimed_today) {
          setShowStreakModal(true)
        }
      } catch (err) {
        console.log('Streak check skipped:', err)
      } finally {
        setStreakChecked(true)
      }
    })()
  }, [user?.id, streakChecked, supabase])

  return (
    <PageTransition className="max-w-7xl mx-auto px-4 md:px-6 pt-6 pb-12 space-y-6 w-full">
      {/* Upgrade Card */}
      {dashData?.plan && <UpgradeCard currentPlan={dashData.plan} />}

      {/* Dual Wallet Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Activity Wallet */}
        <section className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-primary to-primary-container p-5 md:p-6 text-on-primary-container shadow-[0px_16px_32px_rgba(0,33,16,0.08)]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-[16px] text-on-primary-container/70">work</span>
                  <p className="text-on-primary-container/80 font-semibold tracking-wide uppercase text-[9px]">Activity Wallet</p>
                </div>
                <h2 className="text-xl md:text-2xl font-extrabold font-headline tracking-tight">
                  {symbol}{displayActivityBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                {!isGlobal && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1 inline-flex items-center gap-1.5 mt-1">
                    <span className="w-4 h-4 bg-blue-700 rounded-full flex items-center justify-center text-[7px] text-white font-bold">$</span>
                    <span className="font-bold text-xs text-white">${usdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-xl p-2">
                <span className="material-symbols-outlined text-xl">account_balance_wallet</span>
              </div>
            </div>
            <p className="text-on-primary-container/60 text-[10px] mb-3">Earnings from reading, tasks, streaks & writing</p>
            <div className="grid grid-cols-2 gap-2">
              <Link href="/wallet?source=activity" className={`flex items-center justify-center gap-1.5 bg-tertiary-fixed-dim text-on-tertiary-fixed font-bold py-2 rounded-xl active:scale-95 transition-transform text-xs ${!showSwap ? 'col-span-2' : ''}`}>
                <span className="material-symbols-outlined text-[16px]">payments</span>
                Withdraw
              </Link>
              {showSwap && (
                <Link href="/swap?source=activity" className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-2 rounded-xl active:scale-95 transition-transform text-xs">
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                  Swap
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Referral Wallet */}
        <section className="relative overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#6b21a8] to-[#a855f7] p-5 md:p-6 text-white shadow-[0px_16px_32px_rgba(107,33,168,0.12)]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="material-symbols-outlined text-[16px] text-white/70">group_add</span>
                  <p className="text-white/80 font-semibold tracking-wide uppercase text-[9px]">Affiliate Wallet</p>
                </div>
                <h2 className="text-xl md:text-2xl font-extrabold font-headline tracking-tight">
                  {symbol}{displayReferralBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h2>
                {!isGlobal && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1 inline-flex items-center gap-1.5 mt-1">
                    <span className="w-4 h-4 bg-blue-700 rounded-full flex items-center justify-center text-[7px] text-white font-bold">$</span>
                    <span className="font-bold text-xs text-white">${referralUsdtBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>
              <div className="bg-white/20 backdrop-blur-md rounded-xl p-2">
                <span className="material-symbols-outlined text-xl">diversity_3</span>
              </div>
            </div>
            <p className="text-white/60 text-[10px] mb-3">Earnings from affiliate referral commissions</p>
            
            <button 
              onClick={() => setShowTierBreakdown(!showTierBreakdown)}
              className="w-full flex items-center justify-between bg-white/10 backdrop-blur-sm rounded-xl px-3 py-2 mb-3 text-xs font-semibold text-white/80 hover:bg-white/15 transition-all active:scale-[0.98]"
            >
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[14px]">analytics</span>
                Affiliate Earnings Breakdown
              </span>
              <span className={`material-symbols-outlined text-[16px] transition-transform duration-300 ${showTierBreakdown ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            
            {showTierBreakdown && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 mb-3 space-y-2 animate-[fadeIn_0.2s_ease-out]">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-white/70">All-Time Total</span>
                  <span className="font-bold text-white">{formatAmount(referralEarnings)}</span>
                </div>
                <div className="h-px bg-white/15"></div>
                {[
                  { label: 'Tier 1 (Direct)', amount: tierBreakdown.tier1, color: 'bg-emerald-400' },
                  { label: 'Tier 2 (2nd Level)', amount: tierBreakdown.tier2, color: 'bg-sky-400' },
                  { label: 'Tier 3 (3rd Level)', amount: tierBreakdown.tier3, color: 'bg-amber-400' },
                ].map(t => (
                  <div key={t.label} className="flex justify-between items-center text-[11px]">
                    <span className="flex items-center gap-1.5 text-white/70">
                      <span className={`w-1.5 h-1.5 rounded-full ${t.color}`}></span>
                      {t.label}
                    </span>
                    <span className="font-bold text-white">{formatAmount(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Link href="/wallet?source=referral" className={`flex items-center justify-center gap-1.5 bg-white/25 hover:bg-white/30 backdrop-blur-sm text-white font-bold py-2 rounded-xl active:scale-95 transition-transform text-xs ${!showSwap ? 'col-span-2' : ''}`}>
                <span className="material-symbols-outlined text-[16px]">payments</span>
                Withdraw
              </Link>
              {showSwap && (
                <Link href="/swap?source=referral" className="flex items-center justify-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-bold py-2 rounded-xl active:scale-95 transition-transform text-xs">
                  <span className="material-symbols-outlined text-[16px]">swap_horiz</span>
                  Swap
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Category Filter */}
      <nav className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-3 scrollbar-hide px-1">
        <button className="flex-shrink-0 px-5 py-2 rounded-full bg-primary text-white font-semibold text-xs shadow-md">Overview</button>
        <Link href="/analytics" className="flex-shrink-0 px-5 py-2 rounded-full bg-surface-container-highest text-on-surface-variant font-semibold text-xs hover:bg-primary-fixed-dim transition-colors">Analytics</Link>
        <Link href="/earn" className="flex-shrink-0 px-5 py-2 rounded-full bg-surface-container-highest text-on-surface-variant font-semibold text-xs hover:bg-primary-fixed-dim transition-colors">Earnings</Link>
        <Link href="/referral" className="flex-shrink-0 px-5 py-2 rounded-full bg-surface-container-highest text-on-surface-variant font-semibold text-xs hover:bg-primary-fixed-dim transition-colors">Referrals</Link>
      </nav>

      {/* Quick Actions Grid */}
      <section>
        <div className="flex justify-between items-end mb-3 px-1">
          <h3 className="text-sm font-bold font-headline text-on-surface">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-5 gap-3">
          <Link href="/" className="flex flex-col items-center gap-1.5 group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm group-active:scale-90 transition-all">
              <span className="material-symbols-outlined text-2xl">menu_book</span>
            </div>
            <span className="text-[10px] font-semibold text-center text-on-surface-variant leading-tight">Read & Earn</span>
          </Link>
          <Link href="/referral" className="flex flex-col items-center gap-1.5 group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm group-active:scale-90 transition-all">
              <span className="material-symbols-outlined text-2xl">group_add</span>
            </div>
            <span className="text-[10px] font-semibold text-center text-on-surface-variant leading-tight">Refer to Earn</span>
          </Link>
          <Link href="/create-article" className="flex flex-col items-center gap-1.5 group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm group-active:scale-90 transition-all">
              <span className="material-symbols-outlined text-2xl">edit_note</span>
            </div>
            <span className="text-[10px] font-semibold text-center text-on-surface-variant leading-tight">Write Articles</span>
          </Link>
          <Link href="/stories/create" className="flex flex-col items-center gap-1.5 group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm group-active:scale-90 transition-all">
              <span className="material-symbols-outlined text-2xl">auto_stories</span>
            </div>
            <span className="text-[10px] font-semibold text-center text-on-surface-variant leading-tight">Write Story</span>
          </Link>
          <Link href="/plans" className="flex flex-col items-center gap-1.5 group cursor-pointer">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-amber-500 shadow-sm group-active:scale-90 transition-all border border-surface-container-highest">
              <span className="material-symbols-outlined text-2xl">bolt</span>
            </div>
            <span className="text-[10px] font-semibold text-center text-amber-500 leading-tight">Boost Earnings</span>
          </Link>
        </div>
      </section>

      {/* Bento Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 md:col-span-2 bg-surface-container-lowest p-5 rounded-[1.5rem] flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-0.5 rounded-full">
              Total Earnings
            </span>
            <div className="mt-3">
              <h4 className="text-xl md:text-2xl font-black font-headline text-on-surface truncate">
                {formatAmount(totalEarnings)}
              </h4>
              <p className="text-xs text-on-surface-variant mt-0.5">Consistency brings growth.</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${Math.min((balance / (totalEarnings || 1)) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm relative overflow-hidden">
            <div className="absolute top-2.5 right-2.5">
              <span className="inline-flex items-center gap-1 text-[8px] font-bold text-primary uppercase tracking-widest">
                <span className="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
                Live
              </span>
            </div>
            <span className="material-symbols-outlined text-tertiary text-[20px] mb-1.5">share</span>
            <p className="text-xs font-medium text-on-surface-variant">Referral Earnings</p>
            <h4 className="text-base md:text-lg font-bold font-headline text-on-surface truncate">
              {formatAmount(referralEarnings)}
            </h4>
          </div>
          <div className="bg-surface-container-lowest p-4 rounded-[1.5rem] shadow-sm">
            <span className="material-symbols-outlined text-primary text-[20px] mb-1.5">article</span>
            <p className="text-[11px] font-medium text-on-surface-variant">Tasks Completed</p>
            <h4 className="text-base md:text-lg font-bold font-headline text-on-surface truncate">{articlesRead}</h4>
          </div>
        </div>
      </section>

      {/* Promotional Card Carousel */}
      <section className="relative rounded-[1.5rem] overflow-hidden aspect-[16/7] md:aspect-[21/6] group mt-4">
        {promotions.length > 0 ? (
          <>
            <div className="relative w-full h-full">
              {promotions.map((promo, idx) => (
                <div 
                  key={promo.id} 
                  className={`absolute inset-0 transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    idx === currentPromoIndex 
                      ? 'opacity-100 scale-100 translate-x-0' 
                      : idx < currentPromoIndex 
                        ? 'opacity-0 scale-95 -translate-x-4' 
                        : 'opacity-0 scale-95 translate-x-4'
                  }`}
                >
                  <img 
                    alt={promo.title} 
                    className="w-full h-full object-cover"
                    src={promo.image_url}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent" />
                  <div className="absolute inset-0 p-5 md:p-7 flex flex-col justify-center">
                    <span className="text-emerald-400 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.2em] mb-1.5">Featured</span>
                    <h4 className="text-white text-lg md:text-xl font-black font-headline max-w-[200px] md:max-w-[320px] leading-tight line-clamp-2">
                      {promo.title}
                    </h4>
                    {(promo.description) && (
                       <p className="text-white/70 text-[11px] md:text-xs max-w-[200px] md:max-w-[280px] mt-1.5 line-clamp-2 hidden sm:block leading-relaxed">
                         {promo.description}
                       </p>
                    )}
                    {promo.cta_url && promo.cta_text && (
                      <a href={promo.cta_url} target="_blank" rel="noopener noreferrer" className="mt-3 bg-white text-slate-900 font-bold px-4 md:px-5 py-1.5 rounded-full w-fit hover:bg-emerald-50 transition-all text-xs shadow-sm hover:scale-105 hover:shadow-md">
                        {promo.cta_text}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
            
            {promotions.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20">
                {promotions.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPromoIndex(idx)}
                    className={`rounded-full transition-all duration-300 ${
                      idx === currentPromoIndex ? 'bg-white w-5 h-1.5' : 'bg-white/40 hover:bg-white/60 w-1.5 h-1.5'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="absolute inset-0">
            <img 
              alt="Promotional Banner" 
              className="w-full h-full object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuAVzN6StLGsJSOuIdPHO2AG7KeSTjQNL7njCa5ELJU3LPosoYFhTSRmDY-1fvsBbNupPcgUH1XUyR2F-6SAFiyS-OVyrONuo87mQZTphF9wYUaG5Lr5ODv60vVyQTLxGYVFhbcpA9lCwiEApKIWD6x63Kq0OQ3JPegaieU_H-yEx0xQnQlq8whbQcSa9dkNysfdmvcgNATfCNzLQBNYE7C36W3E7L5oSEoLY-n0hcD9IT-wR9nv_WSnH96c2nrsf8iJo29ntG34Ti0" 
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent p-5 md:p-7 flex flex-col justify-center">
              <span className="text-emerald-400 font-bold text-[9px] md:text-[10px] uppercase tracking-[0.2em] mb-1.5">Featured</span>
              <h4 className="text-white text-lg md:text-xl font-black font-headline max-w-[200px] md:max-w-[250px] leading-tight">
                Read Premium Articles Exclusively.
              </h4>
              <Link href="/plans" className="mt-3 bg-white text-slate-900 font-bold px-4 md:px-5 py-1.5 rounded-full w-fit hover:bg-emerald-50 transition-all text-xs shadow-sm">
                View Articles
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Sponsor Share Task */}
      <SponsorShareTask taskId="daily-sponsor-share" promoImages={promotions.map(p => p.image_url)} />

      <DailyLoginStreakModalClient
        isOpen={showStreakModal}
        onClose={() => setShowStreakModal(false)}
        streakSettings={streakSettings}
      />
    </PageTransition>
  )
}
