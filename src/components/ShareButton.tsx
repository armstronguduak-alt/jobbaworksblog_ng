import { useState, useRef, useEffect } from 'react';

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
}

export function ShareButton({ url, title, description }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(description || `Check out "${title}" on JobbaWorks`);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = fullUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareLinks = [
    {
      name: 'WhatsApp',
      icon: '💬',
      color: 'bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366]',
      url: `https://api.whatsapp.com/send?text=${encodedTitle}%0A%0A${encodedDesc}%0A%0A${encodedUrl}`,
    },
    {
      name: 'Facebook',
      icon: '📘',
      color: 'bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2]',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
    },
    {
      name: 'Twitter / X',
      icon: '𝕏',
      color: 'bg-slate-100 hover:bg-slate-200 text-slate-800',
      url: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      name: 'Telegram',
      icon: '✈️',
      color: 'bg-[#0088cc]/10 hover:bg-[#0088cc]/20 text-[#0088cc]',
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    },
  ];

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary font-semibold text-sm transition-colors px-3 py-2 rounded-xl hover:bg-emerald-50"
        title="Share"
      >
        <span className="material-symbols-outlined text-[18px]">share</span>
        <span className="hidden sm:inline">Share</span>
      </button>

      {/* Share Panel */}
      <div className={`absolute bottom-full right-0 mb-2 w-[260px] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-surface-container overflow-hidden transform origin-bottom-right transition-all duration-200 ease-out z-50 ${
        isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 pointer-events-none'
      }`}>
        <div className="p-3 border-b border-surface-container">
          <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">Share this</p>
        </div>

        <div className="p-2 space-y-1">
          {/* Copy Link button */}
          <button
            onClick={copyLink}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${
              copied ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-surface-container-low text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{copied ? 'check_circle' : 'content_copy'}</span>
            {copied ? 'Link Copied!' : 'Copy Link'}
          </button>

          <div className="h-px bg-surface-container mx-2 my-1"></div>

          {/* Social Links */}
          {shareLinks.map((social) => (
            <a
              key={social.name}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsOpen(false)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm ${social.color}`}
            >
              <span className="text-base w-5 text-center">{social.icon}</span>
              {social.name}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
