import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
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
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">User Management</h1>
          <p className="text-on-surface-variant font-medium">View, edit, and moderate all platform users.</p>
        </div>
        <Link to="/admin" className="text-primary font-bold hover:underline">Back to Overview</Link>
      </div>

      <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-surface-container pb-4">
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="w-full sm:max-w-sm px-4 py-2 bg-surface-container-low rounded-xl text-sm border-none focus:ring-1 focus:ring-primary outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="p-4 w-12 rounded-tl-xl text-center">
                    <span className="material-symbols-outlined text-outline-variant text-[18px]">check_box_outline_blank</span>
                  </th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">User</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Email</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Joined</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/50 text-sm">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-surface-container-low/30 transition-colors">
                    <td className="p-4 cursor-pointer" onClick={() => {
                        const newSet = new Set(selectedUserIds);
                        if (newSet.has(u.id)) newSet.delete(u.id);
                        else newSet.add(u.id);
                        setSelectedUserIds(newSet);
                      }}>
                      <div className="flex justify-center flex-col items-center">
                        <input type="checkbox" checked={selectedUserIds.has(u.id)} onChange={() => {}} className="cursor-pointer appearance-none w-5 h-5 border-2 border-surface-container-highest checked:bg-primary checked:border-primary rounded flex items-center justify-center relative checked:after:content-['✓'] checked:after:absolute checked:after:text-white checked:after:text-xs checked:after:font-bold" />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <img 
                          className="w-8 h-8 rounded-full bg-surface-container" 
                          src={u.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${u.name || 'User'}`} 
                          alt="avatar" 
                        />
                        <span className="font-semibold text-on-surface">{u.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-on-surface-variant">{u.email || 'No email stored'}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-variant text-on-surface-variant'}`}>
                        {u.status || 'Active'}
                      </span>
                    </td>
                    <td className="p-4 text-on-surface-variant">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
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
