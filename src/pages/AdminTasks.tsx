import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function AdminTasks() {
  const { isAdmin, isModerator, permissions, isLoading: authLoading } = useAuth();
  const hasAccess = isAdmin || (isModerator && permissions.includes('tasks'));
  const { showAlert } = useDialog();
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingTaskId, setViewingTaskId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reward_amount: 500,
    target_count: 1,
    task_type: 'custom',
    required_plan: 'all',
    affiliate_url: '',
    duration_hours: 24,
    duration_type: 'hours',
    max_participants: 0,
    start_date: '',
    end_date: '',
    priority: 'normal',
    verification_type: 'auto',
    instructions: ''
  });

  const { data: tasks, isLoading: tasksLoading } = useQuery({
    queryKey: ['admin_tasks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!hasAccess
  });

  const { data: communityTasks, isLoading: communityTasksLoading } = useQuery({
    queryKey: ['admin_community_tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('community_tasks')
        .select(`
          id, task_name, status, created_at,
          user:profiles (user_id, name, username, email)
        `)
        .eq('status', 'pending_review')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!hasAccess
  });

  const { data: taskParticipants, isLoading: loadingParticipants } = useQuery({
    queryKey: ['admin_task_participants', viewingTaskId],
    queryFn: async () => {
      // First get user_tasks
      const { data: utRows, error: utError } = await supabase
        .from('user_tasks')
        .select(`
          id, completed, reward_claimed, user_id, updated_at,
          profiles!inner(name, username, email)
        `)
        .eq('task_id', viewingTaskId);
      
      if (utError) throw utError;
      if (!utRows || utRows.length === 0) return [];

      const userIds = utRows.map(r => r.user_id);
      
      // Get their default payout method
      const { data: pmList } = await supabase
        .from('payout_methods')
        .select('*')
        .in('user_id', userIds)
        .eq('is_default', true);

      // Also get wallet balances to check task_earnings
      const { data: walletList } = await supabase
        .from('wallet_balances')
        .select('user_id, task_earnings, balance')
        .in('user_id', userIds);

      return utRows.map(ut => ({
        ...ut,
        payoutMethod: pmList?.find(pm => pm.user_id === ut.user_id) || null,
        walletData: walletList?.find(w => w.user_id === ut.user_id) || null
      }));
    },
    enabled: !!viewingTaskId
  });

  const payoutTaskRewardMutation = useMutation({
    mutationFn: async ({ userId, amount, taskId }: { userId: string, amount: number, taskId: string }) => {
      const { error } = await supabase.rpc('deduct_task_reward', {
        p_user_id: userId,
        p_amount: amount,
        p_task_id: taskId
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_task_participants'] });
      showAlert('Payout marked as complete. Amount deducted from user wallet.', 'Success');
    },
    onError: (err: any) => showAlert(`Payout deduction failed: ${err.message}`, 'Error')
  });

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        title: formData.title,
        description: formData.description,
        reward_amount: Number(formData.reward_amount),
        target_count: Number(formData.target_count),
        task_type: formData.task_type,
        required_plan: formData.required_plan,
        affiliate_url: formData.affiliate_url,
        duration_hours: formData.duration_type === 'days' ? Number(formData.duration_hours) * 24 : Number(formData.duration_hours),
        status: 'active',
        meta: {
          duration_type: formData.duration_type,
          duration_value: Number(formData.duration_hours),
          max_participants: Number(formData.max_participants) || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          priority: formData.priority,
          verification_type: formData.verification_type,
          instructions: formData.instructions || null,
        }
      };
      const { error } = await supabase.from('tasks').insert([payload]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_tasks'] });
      setIsModalOpen(false);
      showAlert('Task created successfully!', 'Success');
      setFormData({
        title: '', description: '', reward_amount: 500, target_count: 1, 
        task_type: 'custom', required_plan: 'all', affiliate_url: '', duration_hours: 24, duration_type: 'hours',
        max_participants: 0, start_date: '', end_date: '', priority: 'normal',
        verification_type: 'auto', instructions: ''
      });
    },
    onError: (err: any) => showAlert(`Error: ${err.message}`, 'Error')
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    createTaskMutation.mutate();
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin_tasks'] });
    } catch (error: any) {
      showAlert(`Error: ${error.message}`, 'Error');
    }
  };

  const updateCommunityTask = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('community_tasks').update({ status: newStatus }).eq('id', taskId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['admin_community_tasks'] });
      showAlert(`Task marked as ${newStatus}`, 'Success');
    } catch (error: any) {
      showAlert(`Error: ${error.message}`, 'Error');
    }
  };

  const verifyAllCommunityTasks = async () => {
    try {
      const pendingIds = communityTasks?.map((t: any) => t.id) || [];
      if (pendingIds.length === 0) return showAlert('No pending tasks to verify.', 'Info');
      
      // Bulk verify
      const { error } = await supabase.from('community_tasks').update({ status: 'verified' }).in('id', pendingIds);
      if (error) throw error;
      
      queryClient.invalidateQueries({ queryKey: ['admin_community_tasks'] });
      showAlert(`Successfully verified ${pendingIds.length} tasks!`, 'Success');
    } catch (error: any) {
      showAlert(`Error batch verifying tasks: ${error.message}`, 'Error');
    }
  };

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!hasAccess) return <Navigate to="/dashboard" replace />;

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 pt-10 pb-32">
      <div className="flex justify-between items-start mb-10">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0f172a] tracking-tight mb-1 font-headline">
            Task Management
          </h1>
          <p className="text-outline text-sm md:text-base">
            Create daily tasks and bounties for users.
          </p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-5 py-2.5 rounded-[12px] font-bold flex items-center gap-2 transition-transform shadow-sm whitespace-nowrap text-sm"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Task
        </button>
      </div>

      <div className="bg-transparent overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-white rounded-full shadow-sm border border-surface-container-low text-[#49454f]">
                <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em] rounded-l-full">TASK DETAILS</th>
                <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">TYPE/TARGET</th>
                <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">REWARD</th>
                <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">PLAN / TIME</th>
                <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">STATUS</th>
                <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em] text-right rounded-r-full">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="before:content-[''] before:block before:h-4">
              {tasksLoading ? (
                <tr><td colSpan={6} className="py-10 text-center text-outline">Loading tasks...</td></tr>
              ) : tasks?.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-outline bg-white rounded-3xl mt-4 block p-8 shadow-sm">
                    <p className="font-bold text-lg text-slate-500 flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-4xl">task</span>
                      No tasks yet
                    </p>
                  </td>
                </tr>
              ) : (
                tasks?.map((task: any) => {
                  const meta = task.meta || {};
                  const priorityColors: Record<string, string> = {
                    low: 'bg-green-50 text-green-700',
                    normal: 'bg-blue-50 text-blue-700',
                    high: 'bg-orange-50 text-orange-700',
                    urgent: 'bg-red-50 text-red-700',
                  };
                  return (
                  <tr key={task.id} className="border-b border-surface-container-low hover:bg-surface-container-low/30 transition-colors bg-white group">
                    <td className="py-6 px-6 first:rounded-l-2xl">
                      <p className="font-bold text-slate-900">{task.title}</p>
                      <p className="text-xs text-slate-500 max-w-xs truncate">{task.description}</p>
                      {meta.priority && meta.priority !== 'normal' && (
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${priorityColors[meta.priority] || 'bg-slate-50 text-slate-500'}`}>
                          {meta.priority}
                        </span>
                      )}
                    </td>
                    <td className="py-6 px-6">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs uppercase tracking-widest rounded-lg">
                        {task.task_type}
                      </span>
                      <p className="text-xs text-slate-500 mt-2 font-medium">Target: {task.target_count}</p>
                      {meta.max_participants > 0 && (
                        <p className="text-xs text-slate-400 mt-0.5 font-medium">Max: {meta.max_participants} people</p>
                      )}
                    </td>
                    <td className="py-6 px-6">
                      <p className="font-black text-emerald-700">₦{Number(task.reward_amount).toLocaleString()}</p>
                      {meta.verification_type && meta.verification_type !== 'auto' && (
                        <span className="text-[10px] text-slate-400 font-medium capitalize">{meta.verification_type.replace('_', ' ')}</span>
                      )}
                    </td>
                    <td className="py-6 px-6">
                      <p className="text-sm font-bold text-slate-700 uppercase">{task.required_plan}</p>
                      <p className="text-xs text-slate-500 mt-1">{meta.duration_type === 'days' ? `${meta.duration_value} days` : `${meta.duration_value || task.duration_hours} ${meta.duration_type || 'hours'}`} limit</p>
                      {meta.start_date && (
                        <p className="text-[10px] text-slate-400 mt-0.5">From: {new Date(meta.start_date).toLocaleDateString()}</p>
                      )}
                      {meta.end_date && (
                        <p className="text-[10px] text-slate-400">To: {new Date(meta.end_date).toLocaleDateString()}</p>
                      )}
                    </td>
                    <td className="py-6 px-6">
                      <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${task.status === 'active' ? 'bg-[#dcfce7] text-[#006b3f]' : 'bg-slate-100 text-slate-500'}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="py-6 px-6 text-right last:rounded-r-2xl opacity-0 group-hover:opacity-100 transition-opacity gap-2 flex justify-end flex-wrap items-center h-full">
                      <button 
                        onClick={() => setViewingTaskId(task.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors text-slate-600 bg-slate-50 hover:bg-slate-200"
                      >
                        Participants
                      </button>
                      <button 
                        onClick={() => toggleTaskStatus(task.id, task.status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${task.status === 'active' ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}
                      >
                        {task.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Community Tasks Verification Section */}
      <div className="mt-16">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl md:text-2xl font-black text-[#0f172a] tracking-tight font-headline">
            Community Verification Requests
          </h2>
          {communityTasks && communityTasks.length > 0 && (
            <button 
              onClick={verifyAllCommunityTasks}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm text-sm"
            >
              Verify
            </button>
          )}
        </div>
        <div className="bg-transparent overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-white rounded-full shadow-sm border border-surface-container-low text-[#49454f]">
                  <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em] rounded-l-full">USER</th>
                  <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">TASK NAME</th>
                  <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em]">SUBMITTED</th>
                  <th className="py-4 px-6 font-black text-[10px] md:text-xs uppercase tracking-[0.15em] text-right rounded-r-full">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="before:content-[''] before:block before:h-4">
                {communityTasksLoading ? (
                  <tr><td colSpan={4} className="py-10 text-center text-outline">Loading requests...</td></tr>
                ) : communityTasks?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-outline bg-white rounded-3xl mt-4 block p-8 shadow-sm">
                      No pending community verifications.
                    </td>
                  </tr>
                ) : (
                  communityTasks?.map((req: any) => (
                    <tr key={req.id} className="border-b border-surface-container-low bg-white">
                      <td className="py-4 px-6 first:rounded-l-2xl">
                        <p className="font-bold text-slate-900">{req.user?.name || 'Unknown'}</p>
                        <p className="text-xs text-slate-500">@{req.user?.username || 'user'}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs uppercase rounded-lg">
                          {req.task_name}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-500">
                        {new Date(req.created_at).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-right last:rounded-r-2xl gap-2 flex justify-end">
                        <button 
                          onClick={() => updateCommunityTask(req.id, 'rejected')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100"
                        >
                          Reject
                        </button>
                        <button 
                          onClick={() => updateCommunityTask(req.id, 'verified')}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                        >
                          Verify
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold font-headline text-slate-900">Create New Task</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors">
                <span className="material-symbols-outlined text-[20px] text-slate-600">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Task Title</label>
                  <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-medium" placeholder="e.g. Follow JobbaWorks on Twitter"/>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Description</label>
                  <textarea rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-medium resize-none" placeholder="Task requirements..."></textarea>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Reward Amount (₦)</label>
                  <input type="number" required min={0} value={formData.reward_amount} onChange={e => setFormData({...formData, reward_amount: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-bold"/>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Target Count</label>
                  <input type="number" required min={1} value={formData.target_count} onChange={e => setFormData({...formData, target_count: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-bold"/>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Task Type</label>
                  <select value={formData.task_type} onChange={e => setFormData({...formData, task_type: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-bold">
                    <option value="custom">Custom</option>
                    <option value="social">Social Media</option>
                    <option value="referrals">Referrals</option>
                    <option value="reads">Reading</option>
                    <option value="signup">Sign Up</option>
                    <option value="deposit">Deposit</option>
                    <option value="survey">Survey</option>
                    <option value="bounty">Bounty</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Required Plan</label>
                  <select value={formData.required_plan} onChange={e => setFormData({...formData, required_plan: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-bold">
                    <option value="all">All Plans</option>
                    <option value="starter">Starter+</option>
                    <option value="pro">Pro+</option>
                    <option value="elite">Elite+</option>
                    <option value="vip">VIP+</option>
                    <option value="executive">Executive+</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Affiliate URL <span className="normal-case font-normal text-slate-400">(Optional)</span></label>
                  <input type="url" value={formData.affiliate_url} onChange={e => setFormData({...formData, affiliate_url: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-medium" placeholder="https://... (optional)"/>
                </div>
              </div>

              {/* Advanced Settings Separator */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-4 text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Advanced Settings</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Duration</label>
                  <div className="flex gap-2">
                    <input type="number" min={1} value={formData.duration_hours} onChange={e => setFormData({...formData, duration_hours: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-bold"/>
                    <select value={formData.duration_type} onChange={e => setFormData({...formData, duration_type: e.target.value})} className="w-1/2 px-2 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-bold">
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">How long users have to complete</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Max Participants</label>
                  <input type="number" min={0} value={formData.max_participants} onChange={e => setFormData({...formData, max_participants: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-bold"/>
                  <p className="text-[10px] text-slate-400 mt-1">0 = unlimited participants</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Priority</label>
                  <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-bold">
                    <option value="low">🟢 Low</option>
                    <option value="normal">🔵 Normal</option>
                    <option value="high">🟠 High</option>
                    <option value="urgent">🔴 Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Start Date <span className="normal-case font-normal text-slate-400">(Optional)</span></label>
                  <input type="datetime-local" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-medium text-sm"/>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">End Date <span className="normal-case font-normal text-slate-400">(Optional)</span></label>
                  <input type="datetime-local" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-medium text-sm"/>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Verification</label>
                  <select value={formData.verification_type} onChange={e => setFormData({...formData, verification_type: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-bold">
                    <option value="auto">Auto (System verifies)</option>
                    <option value="manual">Manual (User submits proof)</option>
                    <option value="admin_review">Admin Review (Admin approves)</option>
                  </select>
                </div>

                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Step-by-Step Instructions <span className="normal-case font-normal text-slate-400">(Optional)</span></label>
                  <textarea rows={3} value={formData.instructions} onChange={e => setFormData({...formData, instructions: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-medium resize-none" placeholder="Step 1: Go to...&#10;Step 2: Click on...&#10;Step 3: Submit screenshot"></textarea>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={createTaskMutation.isPending} className="px-6 py-2.5 rounded-xl font-bold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-sm disabled:opacity-50">
                  {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Participants Modal */}
      {viewingTaskId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-bold font-headline text-slate-900">Task Participants & Payouts</h2>
              <button onClick={() => setViewingTaskId(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors">
                <span className="material-symbols-outlined text-[20px] text-slate-600">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {loadingParticipants ? (
                <div className="py-10 text-center text-slate-500">Loading participants...</div>
              ) : !taskParticipants || taskParticipants.length === 0 ? (
                <div className="py-10 text-center text-slate-500 bg-slate-50 rounded-2xl">No one has started this task yet.</div>
              ) : (
                <div className="space-y-4">
                  {taskParticipants.map((p: any) => {
                    const taskObj = tasks?.find((t: any) => t.id === viewingTaskId);
                    const rewardAmt = taskObj?.reward_amount || 0;
                    const pm = p.payoutMethod;
                    const wallet = p.walletData;
                    // If they have unclaimed or wallet balance covers it, admin can deduct
                    const canDeduct = wallet?.balance >= rewardAmt;

                    return (
                      <div key={p.id} className="bg-white border text-sm border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">{p.profiles?.name} <span className="text-xs text-slate-400 font-normal">@{p.profiles?.username}</span></p>
                          <p className="text-xs text-slate-500 mb-2">{p.profiles?.email}</p>
                          
                          <div className="flex gap-2 mb-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${p.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                              {p.completed ? 'Completed' : 'Started'}
                            </span>
                            {p.reward_claimed && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-blue-100 text-blue-700">
                                Reward Reached Wallet
                              </span>
                            )}
                          </div>

                          {pm ? (
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Default Payout Info</p>
                              <div className="text-xs text-slate-600 grid grid-cols-2 gap-x-4 gap-y-1">
                                <p><span className="font-medium">Method:</span> <span className="uppercase text-slate-800">{pm.method}</span></p>
                                {pm.account_number && <p><span className="font-medium">Num:</span> {pm.account_number}</p>}
                                {pm.bank_name && <p><span className="font-medium">Bank:</span> {pm.bank_name}</p>}
                                {pm.account_name && <p><span className="font-medium">Name:</span> {pm.account_name}</p>}
                                {pm.wallet_address && <p className="col-span-2 truncate"><span className="font-medium">Address:</span> {pm.wallet_address}</p>}
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs italic text-amber-600 mt-2">No payout method configured.</p>
                          )}
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4">
                           <p className="text-xs text-slate-500 font-medium">Task Earnings: <strong className="text-slate-800">₦{wallet?.task_earnings || 0}</strong></p>
                           <p className="text-xs text-slate-500 font-medium">Total Bal: <strong className="text-slate-800">₦{wallet?.balance || 0}</strong></p>
                           
                           {p.completed && (
                             <button
                               onClick={() => {
                                 if(confirm(`Are you sure you want to deduct ₦${rewardAmt} from this user's wallet as a direct payment?`)) {
                                   payoutTaskRewardMutation.mutate({ userId: p.user_id, amount: rewardAmt, taskId: viewingTaskId });
                                 }
                               }}
                               disabled={!canDeduct || payoutTaskRewardMutation.isPending}
                               className="mt-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-slate-800 transition-colors shadow-sm"
                             >
                               Mark Paid & Deduct ₦{rewardAmt}
                             </button>
                           )}
                           {!canDeduct && p.completed && <p className="text-[10px] text-rose-500">Insufficient balance to deduct</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
