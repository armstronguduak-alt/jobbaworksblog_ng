import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface CommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommunityModal({ isOpen, onClose }: CommunityModalProps) {
  const { user } = useAuth();
  const [links, setLinks] = useState({ telegram: '#', whatsapp: '#' });
  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  const fetchData = async () => {
    // Fetch links
    const { data: linkData } = await supabase.from('system_settings').select('value').eq('key', 'community_links').maybeSingle();
    if (linkData?.value) setLinks(linkData.value);
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

      </div>
    </div>
  );
}
