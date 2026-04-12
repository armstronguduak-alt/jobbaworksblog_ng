import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';
import confetti from 'canvas-confetti';
import { useEffect } from 'react';

export function EmailVerified() {
  useEffect(() => {
    // Celebration confetti on mount
    const timer = setTimeout(() => {
      confetti({ particleCount: 150, spread: 100, origin: { y: 0.6 }, colors: ['#008751', '#00b894', '#6c5ce7', '#fdcb6e'] });
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <SEO title="Email Verified" description="Your JobbaWorks email has been verified. You're all set!" url="/email-verified" />
      <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
        <header className="w-full top-0 sticky z-50 bg-[#f8f9fa]">
          <div className="flex items-center justify-between px-6 h-16 w-full max-w-screen-xl mx-auto">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="JobbaWorks Logo" className="w-8 h-8 rounded-lg object-contain" />
              <span className="text-xl font-black text-[#008751] font-headline tracking-tight">JobbaWorks</span>
            </Link>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center px-4 py-16">
          <div className="max-w-lg w-full text-center">
            {/* Success icon */}
            <div className="w-28 h-28 mx-auto mb-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-600/30 animate-scale-in">
              <span className="material-symbols-outlined text-white text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>

            <h1 className="font-headline text-3xl md:text-4xl font-black text-slate-900 mb-4">
              Email Verified! 🎉
            </h1>
            <p className="text-slate-500 text-base md:text-lg leading-relaxed mb-2">
              Your email address has been successfully confirmed.
            </p>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Welcome to the JobbaWorks community! Your account is fully active and ready to go. 
              Sign in now to start exploring articles, earning rewards, and connecting with creators.
            </p>

            <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border border-emerald-200 rounded-2xl p-6 mb-8">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <span className="material-symbols-outlined text-emerald-600 text-2xl mb-1 block" style={{ fontVariationSettings: "'FILL' 1" }}>auto_stories</span>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Read & Earn</p>
                </div>
                <div className="text-center">
                  <span className="material-symbols-outlined text-blue-600 text-2xl mb-1 block" style={{ fontVariationSettings: "'FILL' 1" }}>swap_horiz</span>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-800">Swap Funds</p>
                </div>
                <div className="text-center">
                  <span className="material-symbols-outlined text-purple-600 text-2xl mb-1 block" style={{ fontVariationSettings: "'FILL' 1" }}>group_add</span>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-800">Refer Friends</p>
                </div>
              </div>
            </div>

            <Link 
              to="/login" 
              className="inline-flex items-center justify-center gap-2 bg-gradient-to-br from-[#006b3f] to-[#008751] text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl shadow-emerald-600/20 hover:shadow-2xl hover:shadow-emerald-600/30 active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">login</span>
              Sign In to Get Started
            </Link>
          </div>
        </main>

        <style>{`
          @keyframes scale-in { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
          .animate-scale-in { animation: scale-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) both; }
        `}</style>
      </div>
    </>
  );
}
