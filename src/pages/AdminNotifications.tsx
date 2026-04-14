import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useDialog } from '../contexts/DialogContext';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export function AdminNotifications() {
  const { isAdmin, isModerator, permissions, isLoading: authLoading } = useAuth();
  const hasAccess = isAdmin || (isModerator && permissions.includes('notifications'));
  const { showAlert } = useDialog();
  const [users, setUsers] = useState<any[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (hasAccess) {
      fetchUsers();
      fetchRecentNotifications();
    }
  }, [hasAccess]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users);
      return;
    }
    const lower = searchTerm.toLowerCase();
    setFilteredUsers(users.filter(u => 
      u.name?.toLowerCase().includes(lower) || 
      u.email?.toLowerCase().includes(lower) ||
      u.username?.toLowerCase().includes(lower)
    ));
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('user_id, name, email, username').order('created_at', { ascending: false });
    if (data) {
      setUsers(data);
      setFilteredUsers(data);
    }
  };

  const fetchRecentNotifications = async () => {
    const { data } = await supabase.from('notifications')
      .select('*, profiles(name, email)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setRecentNotifications(data);
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId && selectedUserId !== 'ALL') {
      showAlert('Please select a target user.', 'Warning');
      return;
    }
    if (!notificationTitle || !notificationMessage) {
      showAlert('Please fill out the title and message.', 'Warning');
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedUserId === 'ALL') {
        const payload = users.map(u => ({
          user_id: u.user_id,
          title: notificationTitle,
          message: notificationMessage,
          type: 'system',
          is_read: false
        }));
        
        // chunk inserts to prevent huge payload errors
        for (let i = 0; i < payload.length; i += 1000) {
           await supabase.from('notifications').insert(payload.slice(i, i + 1000));
        }
      } else {
        await supabase.from('notifications').insert({
          user_id: selectedUserId,
          title: notificationTitle,
          message: notificationMessage,
          type: 'system',
          is_read: false
        });
      }

      showAlert('Notification successfully sent!');
      setNotificationTitle('');
      setNotificationMessage('');
      fetchRecentNotifications();
    } catch (err) {
      console.error(err);
      showAlert('Error sending notification.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!hasAccess) return <Navigate to="/dashboard" replace />;

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-32 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">Push Notifications</h1>
        <p className="text-on-surface-variant font-medium">Send formal alerts, payment verifications, and system updates to specific users.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <div className="bg-surface-container-lowest p-6 rounded-[2rem] shadow-sm border border-surface-container-highest/20">
          <h2 className="text-lg font-bold font-headline mb-4 pb-2 border-b border-surface-container">Compose Message</h2>
          <form onSubmit={handleSendNotification} className="space-y-4">
            
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Target User (Search or Select All)</label>
              <input 
                type="text"
                placeholder="Search user by name, email, or username..."
                className="w-full bg-surface-container-low border-transparent focus:border-primary rounded-xl px-4 py-3 text-sm transition-colors mb-2"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <select 
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-surface-container-low border-transparent focus:border-primary rounded-xl px-4 py-3 text-sm transition-colors"
                required
              >
                <option value="">Select a user...</option>
                <option value="ALL">🌟 ALL USERS (Global Broadcast)</option>
                {filteredUsers.slice(0, 50).map(u => (
                  <option key={u.user_id} value={u.user_id}>{u.name} ({u.email})</option>
                ))}
              </select>
              {filteredUsers.length > 50 && <p className="text-[10px] text-primary mt-1">Showing 50 of {filteredUsers.length} search results.</p>}
            </div>

            <div className="space-y-1 mt-4">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Notice Title</label>
              <input 
                type="text"
                placeholder="e.g. Withdrawal Approved"
                value={notificationTitle}
                onChange={(e) => setNotificationTitle(e.target.value)}
                className="w-full bg-surface-container-low border-transparent focus:border-primary rounded-xl px-4 py-3 text-sm transition-colors"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Detailed Message</label>
              <textarea 
                placeholder="Write the professional notification context here..."
                rows={5}
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                className="w-full bg-surface-container-low border-transparent focus:border-primary rounded-xl px-4 py-3 text-sm transition-colors resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-primary text-white font-bold rounded-xl hover:bg-emerald-800 transition-colors shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Dispatch Notification'}
            </button>
          </form>
        </div>

        <div className="bg-surface-container-lowest p-6 rounded-[2rem] shadow-sm border border-surface-container-highest/20 h-full max-h-[800px] flex flex-col">
          <h2 className="text-lg font-bold font-headline mb-4 pb-2 border-b border-surface-container">Recent Dispatches</h2>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {recentNotifications.length === 0 ? (
               <p className="text-center text-on-surface-variant py-8">No recent notifications sent.</p>
            ) : (
              recentNotifications.map(n => (
                <div key={n.id} className="bg-surface-container-low p-4 rounded-xl text-sm">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-on-surface">{n.title}</span>
                    <span className="text-[10px] text-on-surface-variant">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-on-surface-variant text-xs mb-2 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] bg-white border border-outline-variant/30 px-2 py-1 rounded inline-block">
                    <span className="font-semibold text-primary">To:</span> {n.profiles?.name || 'Unknown User'} ({n.profiles?.email || 'N/A'})
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
