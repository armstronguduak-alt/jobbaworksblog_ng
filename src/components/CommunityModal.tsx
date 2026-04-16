import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoined?: () => void;
}

export function CommunityModal({ isOpen, onClose, onJoined }: CommunityModalProps) {
  const { user } = useAuth();
  const [links, setLinks] = useState({ telegram: '#', whatsapp: '#' });
  const [joinedTelegram, setJoinedTelegram] = useState(false);
  const [joinedWhatsApp, setJoinedWhatsApp] = useState(false);

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  const fetchData = async () => {
    const { data: linkData } = await supabase.from('system_settings').select('value').eq('key', 'community_links').maybeSingle();
    if (linkData?.value) setLinks(linkData.value);
  };

  const handleTelegramClick = () => {
    window.open(links.telegram, '_blank');
    setJoinedTelegram(true);
  };

  const handleWhatsAppClick = () => {
    window.open(links.whatsapp, '_blank');
    setJoinedWhatsApp(true);
  };

  const handleConfirmJoined = async () => {
    // Mark the community task as started for this user
    if (user?.id) {
      await supabase.from('community_tasks').upsert({
        user_id: user.id,
        task_name: 'Join Our Community',
        status: 'start_task'
      });
    }
    if (onJoined) {
      onJoined();
    } else {
      onClose();
    }
  };

  if (!isOpen) return null;

  const bothJoined = joinedTelegram && joinedWhatsApp;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-3xl p-6 w-full max-w-sm shadow-xl border border-surface-container relative text-center animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 text-on-surface-variant hover:text-error transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl">groups</span>
        </div>

        <h3 className="text-xl font-headline font-black text-emerald-950 mb-2">Welcome! Join Our Community 🎉</h3>
        <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
          Join our Telegram and WhatsApp groups to stay updated, get support, and connect with other earners!
        </p>

        <div className="flex flex-col gap-3 mb-4">
          <button
            onClick={handleTelegramClick}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
              joinedTelegram
                ? 'bg-[#0088cc]/20 text-[#0088cc] border-2 border-[#0088cc]/30'
                : 'bg-[#0088cc] text-white hover:bg-[#0077b5]'
            }`}
          >
            <span className="material-symbols-outlined">send</span>
            {joinedTelegram ? '✓ Telegram Opened' : 'Join Telegram Group'}
          </button>
          <button
            onClick={handleWhatsAppClick}
            className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
              joinedWhatsApp
                ? 'bg-[#25D366]/20 text-[#128C7E] border-2 border-[#25D366]/30'
                : 'bg-[#25D366] text-white hover:bg-[#128C7E]'
            }`}
          >
            <span className="material-symbols-outlined">chat</span>
            {joinedWhatsApp ? '✓ WhatsApp Opened' : 'Join WhatsApp Group'}
          </button>
        </div>

        {bothJoined && (
          <button
            onClick={handleConfirmJoined}
            className="w-full bg-primary hover:bg-emerald-800 text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            I've Joined — Claim My Reward
          </button>
        )}

        {!bothJoined && (
          <p className="text-xs text-on-surface-variant mt-2">
            Join both groups above to unlock your community reward!
          </p>
        )}
      </div>
    </div>
  );
}
