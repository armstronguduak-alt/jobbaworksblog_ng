import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import confetti from 'canvas-confetti';

export function CommunityTaskCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [links, setLinks] = useState({ telegram: '#', whatsapp: '#' });
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    
    // Fetch links and reward
    const { data: linkData } = await supabase.from('system_settings').select('value').eq('key', 'community_links').maybeSingle();
    if (linkData?.value) setLinks(linkData.value);

    const { data: rwData } = await supabase.from('system_settings').select('value').eq('key', 'community_reward').maybeSingle();
    if (rwData?.value?.amount) {
      setRewardAmount(rwData.value.amount);
    } else {
      setRewardAmount(200); // Default reward
    }

    // Fetch task status
    const { data: taskData } = await supabase
      .from('community_tasks')
      .select('status, reward_claimed')
      .eq('user_id', user.id)
      .eq('task_name', 'Join Our Community')
      .maybeSingle();

    if (taskData) {
      if (taskData.reward_claimed) {
        setTaskStatus('reward_claimed');
      } else {
        setTaskStatus(taskData.status);
      }
    } else {
      setTaskStatus('not_started');
    }
  };

  const handleStartTask = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    await supabase.from('community_tasks').upsert({
      user_id: user.id,
      task_name: 'Join Our Community',
      status: 'start_task'
    });
    setTaskStatus('start_task');
    setIsLoading(false);
  };

  const handleConfirmJoined = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    await supabase.from('community_tasks').update({ status: 'pending_review' }).eq('user_id', user.id).eq('task_name', 'Join Our Community');
    setTaskStatus('pending_review');
    setIsLoading(false);
  };

  const handleClaimReward = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    
    const { data: wallet } = await supabase.from('wallet_balances').select('balance, total_earnings').eq('user_id', user.id).single();
    
    await supabase.from('wallet_balances').update({
      balance: (wallet?.balance || 0) + rewardAmount,
      total_earnings: (wallet?.total_earnings || 0) + rewardAmount
    }).eq('user_id', user.id);

    await supabase.from('community_tasks').update({ reward_claimed: true, status: 'approved' }).eq('user_id', user.id).eq('task_name', 'Join Our Community');
    
    setTaskStatus('reward_claimed');
    setIsLoading(false);
    confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    queryClient.invalidateQueries({ queryKey: ['earnData', user.id] });
  };

  return (
    <div className="bg-surface-container-lowest p-5 rounded-[1.5rem] shadow-sm border border-emerald-500/20 flex flex-col gap-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-[100px] pointer-events-none"></div>
      <div className="flex justify-between items-start">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-emerald-700">forum</span>
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-on-surface line-clamp-1">Join Our Community</h4>
            <p className="text-on-surface-variant text-[13px] line-clamp-2 mt-1">
              Join our Telegram and WhatsApp channels for updates, payments, and support!
            </p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className="block text-emerald-600 font-black">₦{rewardAmount}</span>
          <span className="text-[10px] text-outline uppercase font-bold tracking-tighter">Reward</span>
        </div>
      </div>
      
      {taskStatus === 'start_task' && (
        <div className="grid grid-cols-2 gap-3 mt-1 relative z-10">
          <a href={links.telegram} target="_blank" rel="noreferrer" className="w-full py-3 bg-[#0088cc] text-white font-bold rounded-xl text-center flex items-center justify-center gap-2 hover:bg-[#0077b3] transition-colors shadow-sm">
            Telegram
          </a>
          <a href={links.whatsapp} target="_blank" rel="noreferrer" className="w-full py-3 bg-[#25D366] text-white font-bold rounded-xl text-center flex items-center justify-center gap-2 hover:bg-[#128C7E] transition-colors shadow-sm">
            WhatsApp
          </a>
        </div>
      )}

      {taskStatus === 'not_started' && (
        <button onClick={handleStartTask} disabled={isLoading} className="w-full py-3 font-bold rounded-xl active:scale-95 transition-all bg-emerald-600 text-white hover:bg-emerald-700 flex justify-center items-center gap-2">
          {isLoading ? 'Loading...' : 'Start Task Context'}
        </button>
      )}

      {taskStatus === 'start_task' && (
        <button onClick={handleConfirmJoined} disabled={isLoading} className="w-full py-3 font-bold rounded-xl active:scale-95 transition-all bg-surface-container-high text-on-surface hover:bg-surface-container-highest flex justify-center items-center gap-2 mt-2">
          {isLoading ? 'Confirming...' : 'I Have Joined'}
        </button>
      )}

      {taskStatus === 'pending_review' && (
        <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-sm font-semibold border border-amber-200 text-center">
          Pending Admin Verification
        </div>
      )}

      {taskStatus === 'rejected' && (
        <div className="bg-rose-50 text-rose-800 p-3 rounded-xl text-sm font-semibold border border-rose-200 mb-2 text-center flex flex-col gap-2">
          <span>Task rejected. Join the groups and try again.</span>
          <button onClick={handleStartTask} className="w-full mt-2 bg-white text-rose-700 py-2 rounded-lg font-bold shadow-sm">Restart Task</button>
        </div>
      )}

      {taskStatus === 'approved' && (
        <button onClick={handleClaimReward} disabled={isLoading} className="w-full bg-emerald-500 text-white py-3 rounded-xl font-black animate-pulse shadow-lg shadow-emerald-500/30 active:scale-95 transition-all">
          {isLoading ? 'Claiming...' : 'Claim Community Reward!'}
        </button>
      )}

      {taskStatus === 'reward_claimed' && (
        <div className="flex items-center justify-center gap-2 text-emerald-600 font-black bg-emerald-50 py-3 rounded-xl">
          <span className="material-symbols-outlined">check_circle</span>
          Reward Claimed!
        </div>
      )}
    </div>
  );
}
