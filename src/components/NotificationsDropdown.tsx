import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function NotificationsDropdown() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      
      const channel = supabase
        .channel('notifications-changes')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            setNotifications(prev => [payload.new, ...prev]);
            setUnreadCount(prev => prev + 1);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
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
        className="bg-white md:bg-transparent p-2 md:p-2.5 rounded-xl md:rounded-full md:shadow-sm md:border md:border-surface-container-highest/20 text-on-surface-variant hover:text-primary transition-colors relative group"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 md:top-2 right-1.5 md:right-2 w-2 h-2 bg-rose-500 rounded-full md:border-2 border-white animate-pulse"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-[calc(100%+0.5rem)] w-80 max-h-96 md:w-96 bg-surface shadow-2xl rounded-2xl border border-surface-container-highest/30 z-[100] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-surface-container-highest/20 flex items-center justify-between shrink-0 bg-surface-container-lowest">
            <h3 className="font-bold text-on-surface">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-lg font-bold">
                {unreadCount} New
              </span>
            )}
          </div>
          
          <div className="overflow-y-auto flex-1 p-2 space-y-1">
            {notifications.length === 0 ? (
              <div className="py-8 px-4 text-center text-sm font-medium text-on-surface-variant flex flex-col items-center gap-2">
                <span className="material-symbols-outlined text-4xl text-outline-variant/50">notifications_paused</span>
                You're all caught up!
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id}
                  className={`p-3 rounded-xl transition-colors ${!notif.is_read ? 'bg-primary/5 border border-primary/10' : 'hover:bg-surface-container/50'}`}
                >
                  <p className="text-sm text-on-surface whitespace-pre-wrap">{notif.message}</p>
                  <p className="text-[10px] font-bold text-on-surface-variant mt-2 uppercase tracking-wide">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
