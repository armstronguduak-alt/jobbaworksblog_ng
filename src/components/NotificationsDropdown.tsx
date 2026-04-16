import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface Notification {
  id: string;
  type: string;
  title?: string;
  message: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export function NotificationsDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Use TanStack Query for caching notifications
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      return (data || []) as Notification[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          // Optimistically add the new notification to the cache
          queryClient.setQueryData<Notification[]>(['notifications', user.id], (old = []) => {
            return [payload.new as Notification, ...old];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  // Close panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    if (!user) return;
    // Optimistic update
    queryClient.setQueryData<Notification[]>(['notifications', user.id], (old = []) => {
      return old.map(n => ({ ...n, is_read: true }));
    });
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  };

  const markAsRead = async (id: string) => {
    queryClient.setQueryData<Notification[]>(['notifications', user?.id], (old = []) => {
      return old.map(n => n.id === id ? { ...n, is_read: true } : n);
    });
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'article_approved': return { icon: 'check_circle', color: 'text-emerald-500', bg: 'bg-emerald-50' };
      case 'article_rejected': return { icon: 'cancel', color: 'text-rose-500', bg: 'bg-rose-50' };
      case 'story_approved': return { icon: 'auto_stories', color: 'text-emerald-500', bg: 'bg-emerald-50' };
      case 'story_rejected': return { icon: 'auto_stories', color: 'text-rose-500', bg: 'bg-rose-50' };
      case 'new_follower': return { icon: 'person_add', color: 'text-blue-500', bg: 'bg-blue-50' };
      case 'referral_bonus': return { icon: 'payments', color: 'text-amber-500', bg: 'bg-amber-50' };
      case 'earning': return { icon: 'monetization_on', color: 'text-emerald-500', bg: 'bg-emerald-50' };
      case 'withdrawal': return { icon: 'account_balance', color: 'text-blue-500', bg: 'bg-blue-50' };
      default: return { icon: 'notifications', color: 'text-slate-500', bg: 'bg-slate-50' };
    }
  };

  const timeAgo = (dateStr: string) => {
    const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (s < 60) return 'Just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };
  
  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState && unreadCount > 0) {
      markAllAsRead();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleToggle}
        className="relative bg-white md:bg-transparent p-2 md:p-2.5 rounded-xl md:rounded-full md:shadow-sm md:border md:border-surface-container-highest/20 text-on-surface-variant hover:text-primary transition-colors group"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 md:top-1.5 right-1 md:right-1.5 min-w-[16px] h-[16px] bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center px-1 shadow-md">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      <div className={`absolute right-0 top-[calc(100%+0.5rem)] w-80 md:w-96 bg-white rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.12)] border border-surface-container overflow-hidden transform origin-top-right transition-all duration-200 ease-out z-[100] ${
        isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-3.5 border-b border-surface-container bg-emerald-50/50">
          <div>
            <h3 className="font-headline font-bold text-emerald-950 text-xs">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-[9px] text-emerald-600 font-bold mt-0.5">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-[10px] font-bold text-primary hover:text-emerald-800 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-50"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-[350px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center">
              <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">notifications_none</span>
              <p className="text-xs text-slate-400 font-medium">No notifications yet</p>
              <p className="text-[10px] text-slate-300 mt-0.5">We'll notify you about important updates</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const { icon, color, bg } = getIcon(notif.type);
              const content = (
                <div
                  key={notif.id}
                  onClick={() => { if (!notif.is_read) markAsRead(notif.id); }}
                  className={`flex items-start gap-2.5 px-3.5 py-2.5 hover:bg-surface-container-low/50 transition-colors cursor-pointer border-b border-surface-container/50 last:border-0 ${
                    !notif.is_read ? 'bg-emerald-50/30' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <span className={`material-symbols-outlined text-[16px] ${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className={`text-xs font-bold text-emerald-950 truncate ${!notif.is_read ? '' : 'opacity-70'}`}>
                        {notif.title || 'Notification'}
                      </p>
                      {!notif.is_read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">{timeAgo(notif.created_at)}</p>
                  </div>
                </div>
              );

              if (notif.link) {
                return <Link key={notif.id} to={notif.link} onClick={() => { if (!notif.is_read) markAsRead(notif.id); setIsOpen(false); }}>{content}</Link>;
              }
              return content;
            })
          )}
        </div>
      </div>
    </div>
  );
}
