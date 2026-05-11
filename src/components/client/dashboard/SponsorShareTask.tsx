'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/client/AuthProvider';
import { StatusModal, StatusType } from '@/components/client/motion/StatusModal';
import { DotLoader } from '@/components/client/motion/DotLoader';

interface SponsorShareTaskProps {
  taskId?: string;
  promoImages?: string[];
}

const platforms = [
  {
    key: 'facebook',
    name: 'Facebook',
    icon: '📘',
    color: 'bg-blue-600',
    shareUrl: (text: string, url: string) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`,
  },
  {
    key: 'whatsapp',
    name: 'WhatsApp',
    icon: '💬',
    color: 'bg-green-500',
    shareUrl: (text: string, url: string) => `https://api.whatsapp.com/send?text=${encodeURIComponent(text + '\n\n' + url)}`,
  },
  {
    key: 'twitter',
    name: 'X / Twitter',
    icon: '🐦',
    color: 'bg-black',
    shareUrl: (text: string, url: string) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
  },
  {
    key: 'telegram',
    name: 'Telegram',
    icon: '✈️',
    color: 'bg-sky-500',
    shareUrl: (text: string, url: string) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  },
  {
    key: 'tiktok',
    name: 'TikTok',
    icon: '🎵',
    color: 'bg-slate-900',
    shareUrl: (_text: string, _url: string) => `https://www.tiktok.com/`, // TikTok doesn't have a share URL API — user copies text
  },
];

export function SponsorShareTask({ taskId, promoImages = [] }: SponsorShareTaskProps) {
  const supabase = createClient();
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState('');
  const [sharedPlatforms, setSharedPlatforms] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<StatusType>(null);
  const [copied, setCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);

  useEffect(() => {
    if (user?.id) {
      supabase
        .from('profiles')
        .select('referral_code')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.referral_code) setReferralCode(data.referral_code);
        });
    }
  }, [user?.id]);

  const referralLink = `https://jobbaworks.com/signup?ref=${referralCode}`;

  const shareTexts = [
    `🚀 I just earned real money reading articles on JobbaWorks! Join me and start earning today 💰\n\nSign up free:`,
    `📖 Get paid to read, write, and grow! JobbaWorks is changing the game for online earners.\n\n👉 Join now:`,
    `💸 Stop scrolling, start earning! I've been making money on JobbaWorks — articles, stories, referrals & more.\n\n🔗 Sign up:`,
    `🌟 Looking for a legit platform to earn online? JobbaWorks pays you for reading articles, daily logins, & referrals!\n\n✅ Join free:`,
  ];

  const shareText = shareTexts[Math.floor(Date.now() / 86400000) % shareTexts.length]; // rotates daily

  const handleShare = async (platform: typeof platforms[0]) => {
    const url = platform.shareUrl(shareText, referralLink);
    window.open(url, '_blank', 'width=600,height=500');
    
    setSharedPlatforms(prev => {
      const next = new Set(prev);
      next.add(platform.key);
      return next;
    });

    // If shared to 3+ platforms, attempt to claim
    if (sharedPlatforms.size + 1 >= 3 && taskId) {
      setStatus('pending');
      try {
        const { error } = await supabase.rpc('claim_task_reward', { p_task_id: taskId });
        if (error) throw error;
        setStatus('success');
      } catch {
        setStatus('error');
      }
    }
  };

  const copyShareText = () => {
    navigator.clipboard.writeText(`${shareText}\n\n${referralLink}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-surface-container-low overflow-hidden"
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            campaign
          </span>
          <div>
            <h3 className="text-sm font-black">Daily Share & Earn</h3>
            <p className="text-[10px] opacity-80">Share on 3+ platforms to claim your reward</p>
          </div>
        </div>
        <div className="mt-3 flex gap-1">
          {platforms.map(p => (
            <div
              key={p.key}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                sharedPlatforms.has(p.key) ? 'bg-white/30 ring-2 ring-white' : 'bg-white/10'
              }`}
            >
              {sharedPlatforms.has(p.key) ? '✓' : p.icon}
            </div>
          ))}
        </div>
      </div>

      {/* Promo image selector */}
      {promoImages.length > 0 && (
        <div className="px-5 pt-4">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">Promotional Image</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {promoImages.map((img, i) => (
              <motion.button
                key={i}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedImage(i)}
                className={`w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 ${
                  selectedImage === i ? 'border-primary' : 'border-transparent'
                }`}
              >
                <img src={img} alt={`Promo ${i + 1}`} className="w-full h-full object-cover" />
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Share text preview */}
      <div className="px-5 py-3">
        <div className="bg-surface-container-lowest rounded-xl p-3 text-xs text-slate-600 leading-relaxed border border-surface-container">
          {shareText}
          <br />
          <span className="text-primary font-bold break-all">{referralLink}</span>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={copyShareText}
          className="mt-2 w-full py-2 rounded-xl bg-surface-container-low text-xs font-bold text-slate-600 hover:bg-surface-container transition-colors"
        >
          {copied ? '✓ Copied!' : '📋 Copy Share Text'}
        </motion.button>
      </div>

      {/* Platform buttons */}
      <div className="px-5 pb-5 grid grid-cols-2 gap-2">
        {platforms.map(p => (
          <motion.button
            key={p.key}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => handleShare(p)}
            disabled={sharedPlatforms.has(p.key)}
            className={`flex items-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold text-white transition-all ${
              sharedPlatforms.has(p.key) ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
            } ${p.color}`}
          >
            <span>{p.icon}</span>
            <span>{sharedPlatforms.has(p.key) ? 'Shared ✓' : `Share on ${p.name}`}</span>
          </motion.button>
        ))}
      </div>

      {/* Progress */}
      <div className="px-5 pb-4">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mb-1">
          <span>Progress</span>
          <span>{sharedPlatforms.size}/3 platforms</span>
        </div>
        <div className="h-1.5 bg-surface-container-low rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full"
            animate={{ width: `${Math.min((sharedPlatforms.size / 3) * 100, 100)}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          />
        </div>
      </div>

      <StatusModal status={status} onClose={() => setStatus(null)} />
    </motion.div>
  );
}
