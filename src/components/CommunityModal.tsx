import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommunityModal({ isOpen, onClose }: CommunityModalProps) {
  const { user } = useAuth();
  const [links, setLinks] = useState({ telegram: '#', whatsapp: '#' });
  const [taskStatus, setTaskStatus] = useState<string | null>(null);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchData();
    }
  }, [isOpen, user?.id]);

  const fetchData = async () => {
    if (!user?.id) return;
    
    // Fetch links and reward
    const { data: linkData } = await supabase.from('system_settings').select('value').eq('key', 'community_links').maybeSingle();
    if (linkData?.value) setLinks(linkData.value);

    const { data: rwData } = await supabase.from('system_settings').select('value').eq('key', 'community_reward').maybeSingle();
    if (rwData?.value?.amount) setRewardAmount(rwData.value.amount);

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
    
    // Process reward (Update wallet and mark claimed)
    const { data: wallet } = await supabase.from('wallet_balances').select('balance, total_earnings').eq('user_id', user.id).single();
    
    // In production, robust transaction logic should be handled by an RPC, doing it client side for UI representation.
    await supabase.from('wallet_balances').update({
      balance: (wallet?.balance || 0) + rewardAmount,
      total_earnings: (wallet?.total_earnings || 0) + rewardAmount
    }).eq('user_id', user.id);

    await supabase.from('community_tasks').update({ reward_claimed: true, status: 'approved' }).eq('user_id', user.id).eq('task_name', 'Join Our Community');
    
    setTaskStatus('reward_claimed');
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-3xl p-6 w-full max-w-sm shadow-xl border border-surface-container relative text-center">
        <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-error transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl">groups</span>
        </div>

        <h3 className="text-xl font-headline font-black text-emerald-950 mb-2">Join Our Community</h3>
        <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
          Connect with thousands of other earners, get tips, and stay updated!
        </p>

        <div className="flex flex-col gap-3 mb-6">
          <a href={links.telegram} target="_blank" rel="noopener noreferrer" className="w-full bg-[#0088cc] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#0077b5] transition-colors">
            <span className="material-symbols-outlined">send</span> Telegram Group
          </a>
          <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" className="w-full bg-[#25D366] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#128C7E] transition-colors">
             <span className="material-symbols-outlined">chat</span> WhatsApp Group
          </a>
        </div>

        <div className="border-t border-surface-container pt-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Community Task</span>
            <span className="text-xs font-black text-primary">Reward: ₦{rewardAmount}</span>
          </div>

          {taskStatus === 'not_started' && (
            <button onClick={handleStartTask} disabled={isLoading} className="w-full bg-surface-container-highest text-on-surface py-3 rounded-xl font-bold hover:bg-primary/10 hover:text-primary transition-colors">
              {isLoading ? 'Starting...' : 'Start Task'}
            </button>
          )}

          {taskStatus === 'start_task' && (
            <button onClick={handleConfirmJoined} disabled={isLoading} className="w-full bg-primary text-white py-3 rounded-xl font-bold hover:bg-emerald-800 transition-colors">
              {isLoading ? 'Confirming...' : 'I Have Joined'}
            </button>
          )}

          {taskStatus === 'pending_review' && (
            <div className="bg-amber-50 text-amber-800 p-3 rounded-xl text-sm font-semibold border border-amber-200">
              Your request is pending admin review. Check back later!
            </div>
          )}

          {taskStatus === 'rejected' && (
            <div className="bg-rose-50 text-rose-800 p-3 rounded-xl text-sm font-semibold border border-rose-200 mb-2">
              Task rejected. Please ensure you joined the groups.
              <button onClick={handleStartTask} className="w-full mt-2 bg-white text-rose-700 py-2 rounded-lg font-bold">Try Again</button>
            </div>
          )}

          {taskStatus === 'approved' && (
            <button onClick={handleClaimReward} disabled={isLoading} className="w-full bg-emerald-500 text-white py-3 rounded-xl font-black animate-pulse shadow-lg shadow-emerald-500/30 active:scale-95 transition-all">
              {isLoading ? 'Claiming...' : 'Claim Reward!'}
            </button>
          )}

          {taskStatus === 'reward_claimed' && (
            <div className="flex items-center justify-center gap-2 text-emerald-600 font-black bg-emerald-50 py-3 rounded-xl">
              <span className="material-symbols-outlined">check_circle</span>
              Reward Claimed!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
