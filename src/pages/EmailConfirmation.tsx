import { Link } from 'react-router-dom';
import { SEO } from '../components/SEO';

export function EmailConfirmation() {
  return (
    <>
      <SEO title="Confirm Your Email" description="Check your inbox to verify your JobbaWorks account." url="/email-confirmation" />
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
            {/* Animated mail icon */}
            <div className="w-28 h-28 mx-auto mb-8 bg-gradient-to-br from-emerald-100 to-blue-100 rounded-[2rem] flex items-center justify-center shadow-xl animate-bounce-slow">
              <span className="material-symbols-outlined text-emerald-600 text-6xl" style={{ fontVariationSettings: "'FILL' 1" }}>mark_email_unread</span>
            </div>

            <h1 className="font-headline text-3xl md:text-4xl font-black text-slate-900 mb-4">
              Check Your Inbox
            </h1>
            <p className="text-slate-500 text-base md:text-lg leading-relaxed mb-2">
              We've sent a confirmation link to your email address.
            </p>
            <p className="text-slate-500 text-sm leading-relaxed mb-8">
              Click the link in the email to verify your account and start earning rewards. 
              The link will expire in 24 hours. If you don't see it, check your spam or junk folder.
            </p>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 text-xl mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>tips_and_updates</span>
                <div className="text-left">
                  <p className="font-bold text-emerald-800 text-sm mb-1">What happens next?</p>
                  <ol className="text-sm text-emerald-700 space-y-1.5 list-decimal list-inside">
                    <li>Open the email from <strong>JobbaWorks</strong></li>
                    <li>Click <strong>"Confirm your email"</strong></li>
                    <li>You'll be redirected back to login</li>
                    <li>Sign in and start earning! 🎉</li>
                  </ol>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link 
                to="/login" 
                className="inline-flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-emerald-800 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">login</span>
                Go to Login
              </Link>
              <Link 
                to="/" 
                className="inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-600 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">home</span>
                Back to Home
              </Link>
            </div>
          </div>
        </main>

        <style>{`
          @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
          .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
        `}</style>
      </div>
    </>
  );
}
