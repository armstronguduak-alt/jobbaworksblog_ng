import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Notification {
  id: string;
  type: 'article_approved' | 'article_rejected' | 'story_approved' | 'story_rejected' | 'new_follower' | 'referral_bonus' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    
    if (data && !error) {
      setNotifications(data);
      setUnreadCount(data.filter((n: any) => !n.is_read).length);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [user?.id]);

  // Real-time subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notifications-${user.id}-${Math.random().toString(36).substring(7)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => fetchNotifications()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Close panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark all as read
  const markAllRead = async () => {
    if (!user?.id) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
    
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  // Mark single as read
  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'article_approved': return { icon: 'check_circle', color: 'text-emerald-500', bg: 'bg-emerald-50' };
      case 'article_rejected': return { icon: 'cancel', color: 'text-rose-500', bg: 'bg-rose-50' };
      case 'story_approved': return { icon: 'auto_stories', color: 'text-emerald-500', bg: 'bg-emerald-50' };
      case 'story_rejected': return { icon: 'auto_stories', color: 'text-rose-500', bg: 'bg-rose-50' };
      case 'new_follower': return { icon: 'person_add', color: 'text-blue-500', bg: 'bg-blue-50' };
      case 'referral_bonus': return { icon: 'payments', color: 'text-amber-500', bg: 'bg-amber-50' };
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

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center hover:bg-emerald-50 transition-colors"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-[22px] text-emerald-900" style={unreadCount > 0 ? { fontVariationSettings: "'FILL' 1" } : {}}>
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-md animate-bounce" style={{ animationDuration: '2s', animationIterationCount: '3' }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      <div className={`absolute top-full right-0 mt-3 w-[340px] md:w-[380px] bg-white rounded-2xl shadow-[0_15px_50px_rgba(0,0,0,0.12)] border border-surface-container overflow-hidden transform origin-top-right transition-all duration-200 ease-out ${
        isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
      }`}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-container bg-emerald-50/50">
          <div>
            <h3 className="font-headline font-bold text-emerald-950 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <p className="text-[10px] text-emerald-600 font-bold mt-0.5">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button 
              onClick={markAllRead}
              className="text-xs font-bold text-primary hover:text-emerald-800 transition-colors px-2 py-1 rounded-lg hover:bg-emerald-50"
            >
              Mark all read
            </button>
          )}
        </div>

        {/* Notification List */}
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">notifications_none</span>
              <p className="text-sm text-slate-400 font-medium">No notifications yet</p>
              <p className="text-xs text-slate-300 mt-1">We'll notify you about important updates</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const { icon, color, bg } = getIcon(notif.type);
              const content = (
                <div
                  key={notif.id}
                  onClick={() => { if (!notif.is_read) markAsRead(notif.id); }}
                  className={`flex items-start gap-3 px-4 py-3 hover:bg-surface-container-low/50 transition-colors cursor-pointer border-b border-surface-container/50 last:border-0 ${
                    !notif.is_read ? 'bg-emerald-50/30' : ''
                  }`}
                >
                  <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <span className={`material-symbols-outlined text-[18px] ${color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-bold text-emerald-950 truncate ${!notif.is_read ? '' : 'opacity-70'}`}>
                        {notif.title}
                      </p>
                      {!notif.is_read && (
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-[10px] text-slate-400 font-medium mt-1">{timeAgo(notif.created_at)}</p>
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

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="p-3 border-t border-surface-container bg-surface-container-lowest/50">
            <button 
              onClick={() => { markAllRead(); setIsOpen(false); }}
              className="block text-center text-xs font-bold text-primary hover:text-emerald-800 transition-colors py-1 w-full"
            >
              Mark All as Read & Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
