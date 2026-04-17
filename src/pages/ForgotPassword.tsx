import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setMessage('');
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setMessage('Password reset link sent! Check your email.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body min-h-screen flex flex-col relative overflow-hidden">
      {/* Top Navigation Shell */}
      <header className="w-full top-0 sticky bg-[#f8f9fa] z-20 shadow-sm">
        <div className="flex items-center justify-between px-6 h-16 w-full max-w-screen-xl mx-auto">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="JobbaWorks Logo" className="w-8 h-8 rounded-lg object-contain bg-primary" />
            <span className="text-xl font-black text-[#008751] font-headline tracking-tighter">JobbaWorks</span>
          </Link>
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center px-4 py-12 md:py-20 relative z-10 w-full">
        <div className="w-full max-w-md space-y-8">
          <div className="relative pl-4 border-l-4 border-primary-container">
            <h1 className="font-headline text-4xl font-extrabold text-on-primary-fixed-variant tracking-tight leading-tight">
              Reset <br /> <span className="text-primary-container">Password</span>
            </h1>
            <p className="mt-4 text-on-surface-variant text-base max-w-[280px]">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          <div className="bg-surface-container-lowest rounded-xl p-8 shadow-[0px_20px_40px_rgba(0,33,16,0.06)] relative z-20">
            {errorMsg && (
              <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm font-semibold">
                {errorMsg}
              </div>
            )}
            
            {message && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold">
                {message}
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handleReset}>
              <div className="space-y-2">
                <label className="font-label text-sm font-semibold text-on-surface-variant ml-1">Email Address</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline text-xl group-focus-within:text-primary transition-colors">mail</span>
                  </div>
                  <input
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-11 pr-4 py-3.5 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary-fixed-dim/40 focus:bg-surface-container-lowest transition-all text-on-surface placeholder:text-outline/60"
                    placeholder="name@company.com"
                    type="email"
                  />
                </div>
              </div>

              <button
                disabled={isLoading}
                className="w-full bg-gradient-to-br from-[#006b3f] to-[#008751] text-on-primary-container font-headline font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-70"
                type="submit"
              >
                {isLoading ? 'Sending Link...' : 'Send Reset Link'}
                {!isLoading && <span className="material-symbols-outlined text-xl">arrow_forward</span>}
              </button>
            </form>
          </div>
          
          <p className="text-center text-on-surface-variant font-medium relative z-20">
            Remembered your password?
            <Link to="/login" className="text-primary font-bold hover:underline underline-offset-4 decoration-2 decoration-primary-fixed-dim ml-1">
              Back to Login
            </Link>
          </p>
        </div>
      </main>

      <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] opacity-[0.03] pointer-events-none overflow-hidden select-none z-0">
        <span className="material-symbols-outlined text-[30rem] text-primary rotate-12" style={{ fontVariationSettings: "'FILL' 1" }}>
          password
        </span>
      </div>
    </div>
  );
}
