import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SendMessageModal } from '../components/SendMessageModal';

export function AdminUsers() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, search]);

  async function fetchUsers() {
    setIsLoading(true);
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data } = await query;
      if (data) setUsersList(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setIsLoading(false);
    }
  }

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0f172a] tracking-tight mb-1 font-headline">User Management</h1>
          <p className="text-outline text-sm md:text-base">Monitor community health and manage account privileges.</p>
        </div>
        <div className="relative w-full md:w-[320px]">
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant text-[20px]">search</span>
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-sm border border-surface-container-low shadow-sm focus:ring-2 focus:ring-primary outline-none transition-shadow"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-transparent overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                if (selectedUserIds.size === usersList.length) {
                  setSelectedUserIds(new Set());
                } else {
                  setSelectedUserIds(new Set(usersList.map(u => u.id)));
                }
              }}
              className="px-4 py-2 bg-surface-container hover:bg-surface-variant transition-colors rounded-xl text-xs font-bold text-on-surface-variant uppercase tracking-widest whitespace-nowrap"
            >
              {selectedUserIds.size === usersList.length && usersList.length > 0 ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={() => setIsMessageModalOpen(true)}
              disabled={selectedUserIds.size === 0}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-colors flex items-center gap-1.5
                ${selectedUserIds.size > 0 ? 'bg-primary text-white hover:bg-emerald-800' : 'bg-surface-container-high text-outline-variant cursor-not-allowed opacity-50'}
              `}
            >
              <span className="material-symbols-outlined text-[16px]">send</span>
              Message ({selectedUserIds.size})
            </button>
            <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container-high px-3 py-2 rounded-xl hidden md:block">
              Top 50
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="text-center py-10 text-on-surface-variant">Loading users...</div>
        ) : usersList.length === 0 ? (
          <div className="text-center py-10 text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">group_off</span>
            <p>No users found matching "{search}".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white rounded-full shadow-sm border border-surface-container-low text-[#49454f]">
                  <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em] rounded-l-full">USER</th>
                  <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">EMAIL</th>
                  <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">STATUS</th>
                  <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">JOINED</th>
                  <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em] text-right rounded-r-full">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="before:content-[''] before:block before:h-4 text-sm divide-y divide-surface-container/50">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-black/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <img 
                          className="w-8 h-8 rounded-full bg-surface-container" 
                          src={u.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${u.name || 'User'}`} 
                          alt="avatar" 
                        />
                        <span className="font-semibold text-on-surface">{u.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-on-surface-variant">{u.email || 'No email stored'}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-variant text-on-surface-variant'}`}>
                        {u.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-on-surface-variant">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button className="text-primary font-bold hover:underline text-xs">View/Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SendMessageModal
        isOpen={isMessageModalOpen}
        onClose={() => setIsMessageModalOpen(false)}
        selectedUsers={usersList.filter(u => selectedUserIds.has(u.id))}
        onSuccess={() => {
          setSelectedUserIds(new Set());
        }}
      />
    </main>
  );
}
