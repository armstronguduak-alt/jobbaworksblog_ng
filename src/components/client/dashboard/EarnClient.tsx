'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/client/AuthProvider'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { CommunityTaskCardClient } from './CommunityTaskCardClient'
import confetti from 'canvas-confetti'
import { useCurrency } from '@/lib/hooks/useCurrency'

export function EarnClient() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { formatAmount, isGlobal } = useCurrency()
  const [claimingId, setClaimingId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [sharingPromoId, setSharingPromoId] = useState<string | null>(null)
  const supabase = createClient()

  const { data, isLoading } = useQuery({
    queryKey: ['earnData', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0]

      const [readCountRes, taskCountRes, walletDataRes, counterDataRes, subDataRes, readPostIdsRes, activeTasksRes, userTasksDoneDataRes, totalReferralsRes, referralCommissionsRes, sharePromoRes, todayShareRes] = await Promise.all([
        supabase.from('post_reads').select('*', { count: 'exact', head: true }).eq('user_id', user!.id),
        supabase.from('user_tasks').select('*', { count: 'exact', head: true }).eq('user_id', user!.id).eq('completed', true),
        supabase.from('wallet_balances').select('balance, total_earnings').eq('user_id', user!.id).maybeSingle(),
        supabase.from('daily_user_counters').select('read_count, comment_count').eq('user_id', user!.id).eq('counter_date', today).maybeSingle(),
        supabase.from('user_subscriptions').select('plan_id, plan_earnings, is_completed').eq('user_id', user!.id).maybeSingle(),
        supabase.from('post_reads').select('post_id').eq('user_id', user!.id),
        supabase.from('tasks').select('*').eq('status', 'active'),
        supabase.from('user_tasks').select('task_id, completed').eq('user_id', user!.id),
        supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_user_id', user!.id),
        supabase.from('referral_commissions').select('plan_id').eq('referrer_user_id', user!.id),
        supabase.from('promotions').select('*').eq('is_active', true).eq('is_share_task', true).order('created_at', { ascending: false }).limit(1),
        supabase.from('promotion_shares').select('id').eq('user_id', user!.id).eq('share_date', today).maybeSingle()
      ])

      let planDetails = { daily_read_limit: 5, daily_comment_limit: 4, read_reward: 10, comment_reward: 10 }
      if (subDataRes.data?.plan_id) {
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('daily_read_limit, daily_comment_limit, read_reward, comment_reward')
          .eq('id', subDataRes.data.plan_id)
          .maybeSingle()
        if (planData) planDetails = planData
      }

      const readsDone = counterDataRes.data?.read_count || 0
      const commentsDone = counterDataRes.data?.comment_count || 0

      const stats = {
        tasksCompleted: (readCountRes.count || 0) + (taskCountRes.count || 0),
        totalEarned: walletDataRes.data?.total_earnings || 0,
        dailyReadsLeft: Math.max(0, planDetails.daily_read_limit - readsDone),
        dailyCommentsLeft: Math.max(0, planDetails.daily_comment_limit - commentsDone),
      }

      const alreadyRead = (readPostIdsRes.data || []).map((r: any) => r.post_id)

      let postsQuery = supabase
        .from('posts')
        .select('id, slug, title, excerpt, featured_image, reading_time_seconds')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(10)

      if (alreadyRead.length > 0) {
        postsQuery = postsQuery.not('id', 'in', `(${alreadyRead.join(',')})`)
      }
      const { data: availablePosts } = await postsQuery

      const allActiveTasks = activeTasksRes.data || []
      const userTasksDoneData = userTasksDoneDataRes.data || []
      const completedTaskIds = userTasksDoneData.filter((t: any) => t.completed).map((t: any) => t.task_id)
      
      const availableTasks = allActiveTasks.filter((task: any) => !completedTaskIds.includes(task.id))

      const planReferralCounts: Record<string, number> = { all: totalReferralsRes.count || 0 }
      if (referralCommissionsRes.data) {
        referralCommissionsRes.data.forEach((rc: any) => {
          planReferralCounts[rc.plan_id] = (planReferralCounts[rc.plan_id] || 0) + 1
        })
      }

      return { 
        stats, 
        availablePosts: availablePosts || [], 
        availableTasks: availableTasks || [],
        walletData: walletDataRes.data,
        planReferralCounts,
        planDetails,
        sharePromo: (sharePromoRes.data && sharePromoRes.data.length > 0) ? sharePromoRes.data[0] : null,
        hasSharedToday: !!todayShareRes.data
      }
    },
    staleTime: 5 * 60 * 1000,
  })

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.id) return

    const walletChannel = supabase
      .channel(`earn-wallet-realtime-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_balances', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['earnData', user.id] })
      )
      .subscribe()

    const tasksChannel = supabase
      .channel(`earn-tasks-realtime-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'post_reads', filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ['earnData', user.id] })
      )
      .subscribe()

    return () => {
      supabase.removeChannel(walletChannel)
      supabase.removeChannel(tasksChannel)
    }
  }, [user, queryClient, supabase])

  const handleClaimRead = async (postId: string) => {
    if (claimingId) return
    setClaimingId(postId)
    setMessage('')

    try {
      const { data: claimData, error } = await supabase.rpc('claim_post_read', { _post_id: postId })

      if (error) {
        setMessage(error.message)
      } else if (claimData) {
        setMessage(claimData.message)
        if (claimData.success && user?.id) {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
          queryClient.invalidateQueries({ queryKey: ['earnData', user.id] })
        }
      }
    } catch (err) {
      setMessage('An error occurred while claiming.')
    } finally {
      setClaimingId(null)
    }
  }

  const handleExecuteExternalTask = async (task: any) => {
    if (task.affiliate_url) window.open(task.affiliate_url, '_blank')
    
    setClaimingId(task.id)
    setMessage('')
    try {
      const { error } = await supabase.rpc('claim_task_reward', { p_task_id: task.id })
      if (error) {
        setMessage(error.message)
      } else {
        setMessage('Task submission received for verification!')
        queryClient.invalidateQueries({ queryKey: ['earnData', user?.id] })
      }
    } catch (err: any) {
      setMessage('Error verifying task.')
    } finally {
      setClaimingId(null)
    }
  }

  const stats = data?.stats || { tasksCompleted: 0, totalEarned: 0, dailyReadsLeft: 0, dailyCommentsLeft: 0 }
  const availablePosts = data?.availablePosts || []
  const availableTasks = data?.availableTasks || []
  const sharePromo = data?.sharePromo
  const hasSharedToday = data?.hasSharedToday || false

  const handleShareAndClaim = async (promo: any) => {
    if (sharingPromoId || hasSharedToday) return
    setSharingPromoId(promo.id)
    setMessage('')

    const shareText = promo.share_caption || promo.description || promo.title || 'Check this out!'
    const shareUrl = promo.cta_url ? `\n${promo.cta_url}` : ''
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + shareUrl)}`
    
    window.open(whatsappUrl, '_blank')

    await new Promise(resolve => setTimeout(resolve, 2000))

    try {
      const { data: claimResult, error } = await supabase.rpc('claim_promotion_share', { 
        p_promotion_id: promo.id 
      })

      if (error) {
        setMessage(error.message)
      } else if (claimResult) {
        setMessage(claimResult.message)
        if (claimResult.success) {
          confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } })
          queryClient.invalidateQueries({ queryKey: ['earnData', user?.id] })
        }
      }
    } catch (err) {
      setMessage('Error claiming share reward.')
    } finally {
      setSharingPromoId(null)
    }
  }

  return (
    <div className="bg-surface font-body text-on-surface selection:bg-primary-fixed-dim w-full flex flex-col items-center">
      <main className="max-w-xl mx-auto px-4 md:px-6 py-8 space-y-8 w-full">
        {/* Daily Progress Card */}
        <Link href="/analytics" className="block relative bg-gradient-to-br from-[#006b3f] to-[#008751] rounded-[2rem] p-8 overflow-hidden shadow-xl transition-transform hover:scale-[1.02] active:scale-[0.98]">
          <div className="absolute top-[-20%] right-[-10%] opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[180px]">spa</span>
          </div>
          <div className="relative z-10 flex flex-col gap-6">
            <div>
              <div className="flex items-center justify-between">
                <p className="text-white/70 text-sm font-medium uppercase tracking-widest mb-1">Your Journey</p>
                <div className="flex gap-2 items-center">
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-white/60 uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse"></span>
                    Live
                  </span>
                  <span className="material-symbols-outlined text-white/70 text-sm">open_in_new</span>
                </div>
              </div>
              <h2 className="text-white text-3xl font-extrabold tracking-tight font-headline hover:underline">Daily Progress</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Reads Left Today</p>
                <p className="text-white text-2xl font-black font-headline mt-1">{isLoading ? '...' : stats.dailyReadsLeft}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Comments Left</p>
                <p className="text-white text-2xl font-black font-headline mt-1">{isLoading ? '...' : stats.dailyCommentsLeft}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-white/90 text-sm bg-black/10 self-start px-4 py-2 rounded-full backdrop-blur-sm">
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span>Complete reads to maximize daily earnings</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Total Reads</p>
                <p className="text-white text-2xl font-black font-headline mt-1">{isLoading ? '...' : stats.tasksCompleted}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-wider">Total Earned</p>
                <p className="text-white text-2xl font-black font-headline mt-1">{isLoading ? '...' : formatAmount(stats.totalEarned)}</p>
              </div>
            </div>
          </div>
        </Link>

        {message && (
          <div className={`p-4 rounded-2xl text-sm font-bold text-center ${
            message.includes('earned') || message.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {message}
          </div>
        )}

        <section className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xl font-bold font-headline text-on-surface">Platform Bounties</h3>
            <span className="text-[#008751] text-sm font-semibold">{availableTasks.length + 1} bounties</span>
          </div>
          
          <div className="grid gap-5">
            <CommunityTaskCardClient />

            {sharePromo && (
              <div className="bg-surface-container-lowest rounded-[1.5rem] shadow-sm border border-surface-container-highest/20 overflow-hidden">
                {sharePromo.image_url && (
                  <div className="relative h-40 overflow-hidden">
                    <img 
                      src={sharePromo.image_url} 
                      alt={sharePromo.title} 
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 flex justify-between items-end">
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-400">Daily Task</span>
                        <h4 className="text-white font-bold text-sm line-clamp-1 mt-0.5">{sharePromo.title}</h4>
                      </div>
                      <div className="bg-emerald-500 text-white font-black text-xs px-3 py-1 rounded-full shadow-lg whitespace-nowrap">
                        ₦{Number(sharePromo.share_reward_amount || 300).toLocaleString()}
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="p-5 space-y-4">
                  {(sharePromo.share_caption || sharePromo.description) && (
                    <p className="text-on-surface-variant text-[13px] leading-relaxed line-clamp-3">
                      {sharePromo.share_caption || sharePromo.description}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-2 bg-emerald-50 px-3 py-2 rounded-xl">
                    <span className="material-symbols-outlined text-emerald-600 text-[18px]">monetization_on</span>
                    <span className="text-xs font-bold text-emerald-700">
                      Earn ₦{Number(sharePromo.share_reward_amount || 300).toLocaleString()} by sharing to WhatsApp Status daily
                    </span>
                  </div>

                  {hasSharedToday ? (
                    <div className="w-full py-3 bg-emerald-100 text-emerald-700 font-bold rounded-xl flex items-center justify-center gap-2 text-sm">
                      <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                      Completed Today — Come Back Tomorrow
                    </div>
                  ) : (
                    <button
                      onClick={() => handleShareAndClaim(sharePromo)}
                      disabled={!!sharingPromoId}
                      className={`w-full py-3.5 font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 text-sm shadow-md ${
                        sharingPromoId 
                          ? 'bg-surface-variant text-on-surface-variant' 
                          : 'bg-[#25D366] hover:bg-[#1ebe57] text-white shadow-[#25D366]/30'
                      }`}
                    >
                      {sharingPromoId ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Claiming Reward...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.204 0-4.249-.711-5.91-1.918l-.412-.31-2.674.896.896-2.674-.31-.412A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z"/></svg>
                          Share on WhatsApp Status to Earn
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}

            {availableTasks.map((task: any) => {
              const isReferral = task.task_type === 'referrals'
              const target = task.target_count || 1
              const current = isReferral ? (data?.planReferralCounts?.[task.required_plan] || 0) : 0
              const completed = current >= target

              return (
                <div key={task.id} className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-surface-container-highest/20 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-secondary-container text-on-secondary-container flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined">
                          {task.task_type === 'social' ? 'thumb_up' : task.task_type === 'referrals' ? 'group_add' : 'task_alt'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-on-surface line-clamp-1">
                          {task.title}
                          {isReferral && <span className="ml-2 text-xs font-bold text-primary">({current}/{target})</span>}
                        </h4>
                        <p className="text-on-surface-variant text-[13px] line-clamp-2 mt-1">
                          {task.description}
                          {isReferral && task.required_plan !== 'all' && ` (Requires ${task.required_plan.toUpperCase()} plan)`}
                        </p>
                        {isReferral && !completed && (
                          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${Math.min((current/target)*100, 100)}%` }}></div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-primary font-black">{formatAmount(task.reward_amount || 0)}</span>
                      <span className="text-[10px] text-outline uppercase font-bold tracking-tighter">Reward</span>
                    </div>
                  </div>
                  {isReferral && !completed ? (
                    <Link
                      href="/referral"
                      className="w-full py-3 font-bold rounded-xl active:scale-95 transition-all border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex justify-center items-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">group_add</span> Invite ({target - current} left)
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleExecuteExternalTask(task)}
                      disabled={claimingId === task.id}
                      className={`w-full py-3 font-bold rounded-xl active:scale-95 transition-all flex justify-center items-center gap-2 ${
                        isReferral && completed ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                      }`}
                    >
                      {claimingId === task.id ? 'Working...' : isReferral && completed ? 'Claim Reward' : 'Complete Task'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xl font-bold font-headline text-on-surface">Available to Read</h3>
            <span className="text-primary text-sm font-semibold">{availablePosts.length} available</span>
          </div>

          <div className="grid gap-5">
            {isLoading && !data ? (
              <div className="py-10" />
            ) : stats.dailyReadsLeft === 0 && availablePosts.length > 0 ? (
              <>
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center space-y-2">
                  <span className="material-symbols-outlined text-3xl text-amber-500">schedule</span>
                  <p className="text-amber-800 font-bold text-sm">Daily reading limit reached!</p>
                  <p className="text-amber-600 text-xs">You've completed all your reads for today. Come back tomorrow to continue earning.</p>
                </div>
                {availablePosts.slice(0, 3).map((post: any) => (
                  <div key={post.id} className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-surface-container-highest/20 flex flex-col gap-4 opacity-70">
                    <div className="flex justify-between items-start">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-secondary-container overflow-hidden flex items-center justify-center shrink-0">
                          {post.featured_image ? (
                            <img src={post.featured_image} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-on-secondary-container">description</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-on-surface line-clamp-1">{post.title}</h4>
                          <p className="text-on-surface-variant text-sm line-clamp-1">
                            {Math.ceil(post.reading_time_seconds / 60)} min read
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      disabled
                      className="w-full py-3 font-bold rounded-xl bg-amber-100 text-amber-700 cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[18px]">schedule</span>
                      Continue Tomorrow
                    </button>
                  </div>
                ))}
              </>
            ) : availablePosts.length > 0 ? (
              availablePosts.map((post: any) => (
                <div key={post.id} className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-surface-container-highest/20 flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-secondary-container overflow-hidden flex items-center justify-center shrink-0">
                        {post.featured_image ? (
                          <img src={post.featured_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-on-secondary-container">description</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-on-surface line-clamp-1">{post.title}</h4>
                        <p className="text-on-surface-variant text-sm line-clamp-1">
                          {Math.ceil(post.reading_time_seconds / 60)} min read
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="block text-primary font-bold">Earn {formatAmount(data?.planDetails?.read_reward || 10)}</span>
                      <span className="text-[10px] text-outline uppercase font-bold tracking-tighter">Per Article</span>
                    </div>
                  </div>
                  {typeof window !== 'undefined' && localStorage.getItem(`jobbaworks_read_${post.id}`) === 'true' ? (
                    <button
                      onClick={() => handleClaimRead(post.id)}
                      disabled={claimingId === post.id}
                      className={`w-full py-3 font-bold rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 ${
                        claimingId === post.id
                          ? 'bg-surface-variant text-on-surface-variant'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md'
                      }`}
                    >
                      {claimingId === post.id ? 'Claiming...' : (
                        <>
                          <span className="material-symbols-outlined text-[18px]">payments</span> Claim Reward
                        </>
                      )}
                    </button>
                  ) : (
                    <Link
                      href={`/${post.slug}`} 
                      className="w-full py-3 font-bold rounded-xl active:scale-95 transition-all text-center bg-primary text-white hover:bg-emerald-800 shadow-sm block"
                    >
                      Read Content First
                    </Link>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center bg-surface-container-lowest p-8 border border-dashed border-outline-variant/30 rounded-2xl space-y-2">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant/30">check_circle</span>
                <p className="text-on-surface-variant font-medium">All caught up! No new articles to read.</p>
                <p className="text-xs text-on-surface-variant">Check back later for new content.</p>
              </div>
            )}

            <div className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-surface-container-highest/20 flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary-fixed flex items-center justify-center text-on-primary-fixed-variant">
                    <span className="material-symbols-outlined">group_add</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-on-surface">Refer a Friend</h4>
                    <p className="text-on-surface-variant text-sm">Earn 25% of their plan purchase</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block text-primary font-bold">25%</span>
                  <span className="text-[10px] text-outline uppercase font-bold tracking-tighter">Commission</span>
                </div>
              </div>
              <Link href="/referral" className="w-full py-3 bg-surface-container-low text-on-surface font-bold rounded-xl active:scale-95 transition-all text-center">
                Invite Contacts
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
