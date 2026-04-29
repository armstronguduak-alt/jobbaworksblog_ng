import { useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SendMessageModal } from '../components/SendMessageModal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function AdminUsers() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { regionView } = useOutletContext<{ regionView: 'all' | 'nigeria' | 'global' }>();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);

  // Role Management State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUserForRole, setSelectedUserForRole] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('user');
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  const availablePermissions = [
    { id: 'content', label: 'Content (Stories, Articles, Categories)' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'promotions', label: 'Promotions' },
    { id: 'tasks', label: 'Tasks & Bounties' },
    { id: 'referrals', label: 'Referrals' },
    { id: 'transactions', label: 'Transactions & Withdrawals' },
  ];

  const { data: analytics } = useQuery({
    queryKey: ['admin-users-analytics', regionView],
    queryFn: async () => {
      let query = supabase.from('profiles').select('joined_at, is_global');
      if (regionView === 'nigeria') query = query.eq('is_global', false);
      if (regionView === 'global') query = query.eq('is_global', true);
      
      const { data } = await query;
      if (!data) return { totalUsers: 0, activeToday: 0, chartData: [] };

      const totalUsers = data.length;
      const today = new Date();
      today.setHours(0,0,0,0);
      
      const activeToday = data.filter(u => new Date(u.joined_at) >= today).length;

      // Group by day for the last 7 days
      const days = [...Array(7)].map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        d.setHours(0,0,0,0);
        return d;
      });

      const chartData = days.map(day => {
        const nextDay = new Date(day);
        nextDay.setDate(nextDay.getDate() + 1);
        const count = data.filter(u => {
          const joined = new Date(u.joined_at);
          return joined >= day && joined < nextDay;
        }).length;
        return {
          name: day.toLocaleDateString('en-US', { weekday: 'short' }),
          users: count
        };
      });

      return { totalUsers, activeToday, chartData };
    },
    enabled: isAdmin
  });

  const { data: usersList = [], isLoading, refetch: fetchUsers } = useQuery({
    queryKey: ['admin-users', regionView, search],
    queryFn: async () => {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (regionView === 'nigeria') {
        query = query.eq('is_global', false);
      } else if (regionView === 'global') {
        query = query.eq('is_global', true);
      }

      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data } = await query;
      if (data && data.length > 0) {
        // Fetch wallet balances and referral counts in parallel
        const userIds = data.map((u: any) => u.user_id || u.id).filter(Boolean);
        const [walletsRes, referralsRes] = await Promise.all([
          supabase.from('wallet_balances').select('user_id, balance, usdt_balance, referral_earnings').in('user_id', userIds),
          supabase.from('referrals').select('referrer_user_id').in('referrer_user_id', userIds),
        ]);

        const walletMap: Record<string, any> = {};
        (walletsRes.data || []).forEach((w: any) => { walletMap[w.user_id] = w; });

        const refCountMap: Record<string, number> = {};
        (referralsRes.data || []).forEach((r: any) => {
          refCountMap[r.referrer_user_id] = (refCountMap[r.referrer_user_id] || 0) + 1;
        });

        return data.map((u: any) => ({
          ...u,
          _wallet: walletMap[u.user_id || u.id] || null,
          _referralCount: refCountMap[u.user_id || u.id] || 0,
        }));
      }
      return data || [];
    },
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const handleManageRole = async (user: any) => {
    setSelectedUserForRole(user);
    setIsRoleModalOpen(true);
    setUserRole('user');
    setUserPermissions([]);

    const { data } = await supabase
      .from('user_roles')
      .select('role, permissions')
      .eq('user_id', user.user_id || user.id)
      .maybeSingle();

    if (data) {
      setUserRole(data.role);
      if (data.permissions) {
        if (Array.isArray(data.permissions)) setUserPermissions(data.permissions);
        else if (typeof data.permissions === 'string') {
          try { setUserPermissions(JSON.parse(data.permissions)); } catch(e){}
        }
      }
    }
  };

  const saveRoleSettings = async () => {
    if (!selectedUserForRole) return;
    setIsUpdatingRole(true);
    const targetUserId = selectedUserForRole.user_id || selectedUserForRole.id;
    
    try {
      if (userRole === 'user') {
        const { error } = await supabase.from('user_roles').delete().eq('user_id', targetUserId);
        if (error) throw error;
      } else {
        await supabase.from('user_roles').upsert({
          user_id: targetUserId,
          role: userRole,
          permissions: userRole === 'moderator' ? userPermissions : []
        }, { onConflict: 'user_id, role' });
        
        // Let's actually delete existing first if we are changing role type to prevent UNIQUE constraint on (user_id, role)
        await supabase.from('user_roles').delete().eq('user_id', targetUserId);
        
        const { error } = await supabase.from('user_roles').insert({
          user_id: targetUserId,
          role: userRole,
          permissions: userRole === 'moderator' ? userPermissions : []
        });
        if (error) throw error;
      }
      setIsRoleModalOpen(false);
      alert('Role updated successfully.');
    } catch (err: any) {
      console.error(err);
      alert(`Error updating role: ${err.message}`);
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleFlagUser = async (user: any) => {
    const isCurrentlyFlagged = user.status === 'flagged';
    const action = isCurrentlyFlagged ? 'unflag' : 'flag';
    if (!window.confirm(`Are you sure you want to ${action} ${user.name}?`)) return;

    try {
      const { error } = await supabase.rpc('admin_toggle_user_flag', {
        p_user_id: user.user_id || user.id,
        p_is_flagged: !isCurrentlyFlagged
      });
      if (error) throw error;
      alert(`User successfully ${action}ged.`);
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    } catch (err: any) {
      console.error(err);
      alert(`Error ${action}ging user: ${err.message}`);
    }
  };

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

      {/* Analytics Section */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-surface-container-low flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">Total Users</p>
                <p className="text-4xl font-black text-on-surface mt-2">{analytics.totalUsers}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <span className="material-symbols-outlined">group</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-surface-container-low flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest">New Today</p>
                <p className="text-4xl font-black text-on-surface mt-2">{analytics.activeToday}</p>
              </div>
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                <span className="material-symbols-outlined">person_add</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-surface-container-low">
            <p className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-6">User Growth (Last 7 Days)</p>
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.chartData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#059669" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#059669" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280' }} dx={-10} allowDecimals={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ stroke: '#059669', strokeWidth: 1, strokeDasharray: '3 3' }}
                  />
                  <Area type="monotone" dataKey="users" stroke="#059669" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

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
                  <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">BALANCE</th>
                  <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">REFERRALS</th>
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
                    <td className="py-4 px-6 text-on-surface-variant text-xs">{u.email || 'No email stored'}</td>
                    <td className="py-4 px-6">
                      {u._wallet ? (
                        <div>
                          <p className="font-black text-emerald-700 text-sm">${Number(u._wallet.usdt_balance || 0).toFixed(2)}</p>
                          <p className="text-[10px] text-slate-400">₦{Number(u._wallet.balance || 0).toLocaleString()}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">$0.00</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`font-black text-sm ${u._referralCount > 0 ? 'text-blue-700' : 'text-slate-400'}`}>
                        {u._referralCount}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : u.status === 'flagged' ? 'bg-red-100 text-red-800' : 'bg-surface-variant text-on-surface-variant'}`}>
                        {u.status || 'Active'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-on-surface-variant text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex flex-col items-end gap-2">
                        <button onClick={() => handleManageRole(u)} className="text-primary font-bold hover:underline text-xs">Manage Role</button>
                        <button 
                          onClick={() => handleFlagUser(u)} 
                          className={`font-bold hover:underline text-xs ${u.status === 'flagged' ? 'text-emerald-600' : 'text-red-600'}`}
                        >
                          {u.status === 'flagged' ? 'Unflag User' : 'Flag User'}
                        </button>
                      </div>
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

      {isRoleModalOpen && selectedUserForRole && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="font-headline font-black text-xl mb-4 text-[#191c1d]">Manage User Role</h3>
            <div className="flex items-center gap-3 mb-6">
              <img src={selectedUserForRole.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${selectedUserForRole.name}`} alt="avatar" className="w-10 h-10 rounded-full" />
              <div>
                <p className="font-bold text-sm text-[#191c1d]">{selectedUserForRole.name}</p>
                <p className="text-xs text-outline">{selectedUserForRole.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-outline">Assign Role</label>
                <select 
                  value={userRole} 
                  onChange={(e) => {
                    setUserRole(e.target.value);
                    if (e.target.value !== 'moderator') setUserPermissions([]);
                  }}
                  className="w-full mt-2 p-3 bg-surface-container rounded-xl border-none focus:ring-2 focus:ring-primary font-bold"
                >
                  <option value="user">Normal User</option>
                  <option value="moderator">Moderator</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>

              {userRole === 'moderator' && (
                <div className="bg-surface-container-low p-4 rounded-xl border border-surface-container">
                  <label className="text-xs font-bold uppercase tracking-widest text-outline mb-2 block">Moderator Permissions</label>
                  <p className="text-[10px] text-outline mb-3 italic">Select which pages the moderator can manage:</p>
                  <div className="space-y-2">
                    {availablePermissions.map(perm => {
                      const hasPerm = userPermissions.includes(perm.id);
                      return (
                        <label key={perm.id} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={hasPerm}
                            onChange={() => {
                              if (hasPerm) setUserPermissions(prev => prev.filter(p => p !== perm.id));
                              else setUserPermissions(prev => [...prev, perm.id]);
                            }}
                            className="rounded text-primary focus:ring-primary"
                          />
                          <span className="text-sm font-medium">{perm.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-8">
              <button onClick={() => setIsRoleModalOpen(false)} className="px-5 py-2 hover:bg-surface-container rounded-xl font-bold text-sm text-on-surface-variant transition-colors">
                Cancel
              </button>
              <button 
                onClick={saveRoleSettings} 
                disabled={isUpdatingRole}
                className="px-5 py-2 bg-primary hover:bg-emerald-800 text-white rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
              >
                {isUpdatingRole ? 'Saving...' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
