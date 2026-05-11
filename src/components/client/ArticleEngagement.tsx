'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/client/AuthProvider'

interface ArticleEngagementProps {
  postId: string
  postSlug: string
  authorUserId: string
  authorUsername?: string
  categorySlug: string
}

/**
 * Client-only engagement island — handles:
 * - View tracking
 * - Like/unlike
 * - Follow/unfollow author
 * - Comment posting
 * - Reading timer
 * 
 * This component hydrates independently without affecting
 * the server-rendered article content above it.
 */
export function ArticleEngagement({
  postId,
  postSlug,
  authorUserId,
  authorUsername,
  categorySlug,
}: ArticleEngagementProps) {
  const supabase = createClient()
  const { user } = useAuth()

  const [isFollowing, setIsFollowing] = useState(false)
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [commentSuccess, setCommentSuccess] = useState('')
  const [comments, setComments] = useState<any[]>([])
  const [hasRead, setHasRead] = useState(false)

  const viewTracked = useRef(false)

  // Track view — fire once
  useEffect(() => {
    if (!viewTracked.current && postSlug) {
      viewTracked.current = true
      void supabase.rpc('increment_view_count', { post_slug: postSlug })
    }
  }, [postSlug, supabase])

  // Fetch engagement data (comments, follow status, read status)
  useEffect(() => {
    if (!postId) return

    const fetchEngagement = async () => {
      // Fetch comments
      const commentsResult = await supabase
        .from('post_comments')
        .select('id, content, created_at, user_id')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(50)

      let followResult: any = { data: null }
      let readResult: any = { data: null }

      if (user?.id) {
        const [fRes, rRes] = await Promise.all([
          supabase.from('followers').select('id').eq('follower_id', user.id).eq('following_id', authorUserId).maybeSingle(),
          supabase.from('post_reads').select('id').eq('post_id', postId).eq('user_id', user.id).maybeSingle(),
        ])
        followResult = fRes
        readResult = rRes
      }

      const rawComments = commentsResult.data || []
      // Enrich comments with profiles
      if (rawComments.length > 0) {
        const userIds = [...new Set(rawComments.map((c: any) => c.user_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, username, avatar_url')
          .in('user_id', userIds)

        const profileMap: Record<string, any> = {}
        ;(profiles || []).forEach((p: any) => { profileMap[p.user_id] = p })

        setComments(rawComments.map((c: any) => ({
          ...c,
          profiles: profileMap[c.user_id] || { name: 'Unknown', username: 'user' },
        })))
      }

      if (user?.id) {
        setIsFollowing(!!followResult?.data)
        setHasRead(!!readResult?.data)
      }
    }

    fetchEngagement()
  }, [postId, user?.id, authorUserId, supabase])

  // Toggle follow
  const toggleFollow = async () => {
    if (!user?.id || !authorUserId) return
    setIsFollowLoading(true)
    try {
      if (isFollowing) {
        await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', authorUserId)
        setIsFollowing(false)
      } else {
        await supabase.from('followers').insert({ follower_id: user.id, following_id: authorUserId })
        setIsFollowing(true)
      }
    } catch {} finally {
      setIsFollowLoading(false)
    }
  }

  // Submit comment
  const submitComment = async () => {
    if (!user?.id || !newComment.trim()) return
    setIsSubmittingComment(true)
    try {
      const { error } = await supabase.from('post_comments').insert({
        post_id: postId,
        user_id: user.id,
        content: newComment.trim(),
      })
      if (!error) {
        setNewComment('')
        setCommentSuccess('Comment posted!')
        setTimeout(() => setCommentSuccess(''), 3000)
        // Re-fetch comments
        const { data } = await supabase
          .from('post_comments')
          .select('id, content, created_at, user_id')
          .eq('post_id', postId)
          .order('created_at', { ascending: false })
          .limit(50)
        if (data && data.length > 0) {
          const userIds = [...new Set(data.map((c: any) => c.user_id))]
          const { data: profiles } = await supabase.from('profiles').select('user_id, name, username, avatar_url').in('user_id', userIds)
          const profileMap: Record<string, any> = {}
          ;(profiles || []).forEach((p: any) => { profileMap[p.user_id] = p })
          setComments(data.map((c: any) => ({ ...c, profiles: profileMap[c.user_id] || { name: 'Unknown', username: 'user' } })))
        }
      }
    } catch {} finally {
      setIsSubmittingComment(false)
    }
  }

  const timeAgo = (dateStr: string) => {
    const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
    if (s < 60) return 'Just now'
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return new Date(dateStr).toLocaleDateString()
  }

  return (
    <div className="space-y-8">
      {/* Engagement Bar */}
      <div className="flex items-center justify-between py-4 border-y border-slate-100">
        <div className="flex items-center gap-4">
          {user?.id && user.id !== authorUserId && (
            <button
              onClick={toggleFollow}
              disabled={isFollowLoading}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                isFollowing ? 'bg-slate-100 text-slate-600' : 'bg-primary text-white hover:bg-emerald-800'
              }`}
            >
              {isFollowLoading ? '...' : isFollowing ? 'Following' : 'Follow'}
            </button>
          )}
        </div>

        {/* Share Button */}
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({
                title: document.title,
                url: window.location.href,
              })
            } else {
              navigator.clipboard.writeText(window.location.href)
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">share</span>
          Share
        </button>
      </div>

      {/* Comments Section */}
      <section className="pt-4">
        <h3 className="text-lg font-black font-headline text-slate-900 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">forum</span>
          Comments ({comments.length})
        </h3>

        {/* Comment Form */}
        {user ? (
          <div className="mb-8">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full p-4 rounded-2xl bg-surface-container-lowest border border-surface-container text-sm text-on-surface resize-none focus:border-primary focus:ring-2 focus:ring-emerald-100 transition-all"
              rows={3}
            />
            <div className="flex items-center justify-between mt-2">
              {commentSuccess && (
                <span className="text-xs font-bold text-emerald-600">{commentSuccess}</span>
              )}
              <button
                onClick={submitComment}
                disabled={isSubmittingComment || !newComment.trim()}
                className="ml-auto px-5 py-2 bg-primary text-white font-bold text-sm rounded-xl hover:bg-emerald-800 transition-colors disabled:opacity-50"
              >
                {isSubmittingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-8 p-4 bg-surface-container-lowest rounded-2xl border border-surface-container text-center">
            <p className="text-sm text-on-surface-variant mb-3">Sign in to join the conversation</p>
            <div className="flex gap-2 justify-center">
              <Link href="/login" className="text-xs font-bold text-primary border border-primary/30 px-4 py-1.5 rounded-full hover:bg-primary/10 transition-colors">
                Login
              </Link>
              <Link href="/signup" className="text-xs font-bold text-white bg-primary px-4 py-1.5 rounded-full hover:bg-emerald-800 transition-colors">
                Sign Up
              </Link>
            </div>
          </div>
        )}

        {/* Comments List */}
        <div className="space-y-4">
          {comments.map((comment: any) => (
            <div key={comment.id} className="flex gap-3 p-4 bg-surface-container-lowest rounded-2xl border border-surface-container/50">
              <img
                src={comment.profiles?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${comment.profiles?.name}`}
                className="w-9 h-9 rounded-full object-cover shrink-0"
                alt={comment.profiles?.name}
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-slate-900">{comment.profiles?.name}</span>
                  <span className="text-[10px] text-slate-400">{timeAgo(comment.created_at)}</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">{comment.content}</p>
              </div>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-sm text-on-surface-variant text-center py-8">No comments yet. Be the first!</p>
          )}
        </div>
      </section>
    </div>
  )
}
