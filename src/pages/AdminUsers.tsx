import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export function AdminUsers() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const [usersList, setUsersList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

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
        <div className="flex justify-between items-center mb-6 border-b border-surface-container pb-4">
          <input 
            type="text" 
            placeholder="Search by name or email..." 
            className="w-full max-w-sm px-4 py-2 bg-surface-container-low rounded-xl text-sm border-none focus:ring-1 focus:ring-primary outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="text-xs font-bold text-on-surface-variant uppercase tracking-widest bg-surface-container-high px-3 py-1.5 rounded-full">
            Top 50 Results
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
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest rounded-tl-xl">User</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Email</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Joined</th>
                  <th className="p-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/50 text-sm">
                {usersList.map(u => (
                  <tr key={u.id} className="hover:bg-surface-container-low/30 transition-colors">
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
    </main>
  );
}
