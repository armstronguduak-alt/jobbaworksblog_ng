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
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reward_amount: 500,
    target_count: 1,
    task_type: 'custom',
    required_plan: 'all',
    affiliate_url: '',
    duration_hours: 24
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

  const createTaskMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('tasks').insert([{
        title: formData.title,
        description: formData.description,
        reward_amount: Number(formData.reward_amount),
        target_count: Number(formData.target_count),
        task_type: formData.task_type,
        required_plan: formData.required_plan,
        affiliate_url: formData.affiliate_url,
        duration_hours: Number(formData.duration_hours),
        status: 'active'
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_tasks'] });
      setIsModalOpen(false);
      showAlert('Task created successfully!', 'Success');
      setFormData({
        title: '', description: '', reward_amount: 500, target_count: 1, 
        task_type: 'custom', required_plan: 'all', affiliate_url: '', duration_hours: 24
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
                tasks?.map((task: any) => (
                  <tr key={task.id} className="border-b border-surface-container-low hover:bg-surface-container-low/30 transition-colors bg-white group">
                    <td className="py-6 px-6 first:rounded-l-2xl">
                      <p className="font-bold text-slate-900">{task.title}</p>
                      <p className="text-xs text-slate-500 max-w-xs truncate">{task.description}</p>
                    </td>
                    <td className="py-6 px-6">
                      <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-xs uppercase tracking-widest rounded-lg">
                        {task.task_type}
                      </span>
                      <p className="text-xs text-slate-500 mt-2 font-medium">Target: {task.target_count}</p>
                    </td>
                    <td className="py-6 px-6">
                      <p className="font-black text-emerald-700">₦{Number(task.reward_amount).toLocaleString()}</p>
                    </td>
                    <td className="py-6 px-6">
                      <p className="text-sm font-bold text-slate-700 uppercase">{task.required_plan}</p>
                      <p className="text-xs text-slate-500 mt-1">{task.duration_hours}h limit</p>
                    </td>
                    <td className="py-6 px-6">
                      <span className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${task.status === 'active' ? 'bg-[#dcfce7] text-[#006b3f]' : 'bg-slate-100 text-slate-500'}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="py-6 px-6 text-right last:rounded-r-2xl opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => toggleTaskStatus(task.id, task.status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${task.status === 'active' ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'}`}
                      >
                        {task.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Required Plan</label>
                  <select value={formData.required_plan} onChange={e => setFormData({...formData, required_plan: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-bold">
                    <option value="all">All Plans</option>
                    <option value="starter">Starter+</option>
                    <option value="pro">Pro+</option>
                    <option value="elite">Elite+</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Affiliate URL <span className="normal-case font-normal text-slate-400">(Optional)</span></label>
                  <input type="url" value={formData.affiliate_url} onChange={e => setFormData({...formData, affiliate_url: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-slate-900 font-medium" placeholder="https://... (optional)"/>
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
    </main>
  );
}
