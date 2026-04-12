import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function Signup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const refCode = searchParams.get('ref') || '';
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [referrerUsername, setReferrerUsername] = useState<string | null>(null);
  const usernameDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    phone: '',
    email: '',
    gender: '',
    password: '',
    referral: refCode,
    agreeTerms: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // ── Fetch Referrer Name if refCode is present ───────────────────────────
  useEffect(() => {
    if (!refCode) return;
    const fetchReferrer = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username')
        .eq('referral_code', refCode)
        .maybeSingle();
      if (data?.username) {
        setReferrerUsername(data.username);
      }
    };
    fetchReferrer();
  }, [refCode]);

  // ── Username availability check (debounced 600ms) ─────────────────────────
  useEffect(() => {
    const username = formData.username.trim();
    if (!username || username.length < 3) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current);
    usernameDebounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .ilike('username', username)
        .maybeSingle();
      setUsernameStatus(data ? 'taken' : 'available');
    }, 600);
    return () => { if (usernameDebounceRef.current) clearTimeout(usernameDebounceRef.current); };
  }, [formData.username]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!formData.agreeTerms) {
      setErrorMsg('You must agree to the Terms of Service.');
      return;
    }
    if (usernameStatus === 'taken') {
      setErrorMsg('That username is already taken. Please choose another.');
      return;
    }

    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/email-verified`,
          data: {
            full_name: formData.fullName,
            username: formData.username,
            phone_number: formData.phone,
            gender: formData.gender,
            referral_code_used: formData.referral
          }
        }
      });

      if (error) throw error;
      
      // If auto-login happens and session exists, initialize account
      if (data.session) {
        // Initialize user profile and wallet via the predefined RPC
        const { error: initError } = await supabase.rpc('initialize_my_account', {
          _name: formData.fullName,
          _email: formData.email,
          _phone: formData.phone,
          _username: formData.username,
          _gender: formData.gender,
          _avatar_url: '',
          _referred_by_code: formData.referral || null
        });

        if (initError) {
          console.error("Account Initialization Error:", initError);
          // Still proceed to dashboard, maybe it partly succeeded or was a duplicate
        }
        
        navigate('/dashboard');
      } else {
        navigate('/email-confirmation');
      }
      
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-surface font-body text-on-surface antialiased min-h-screen flex flex-col">
      {/* Top Navigation Anchor */}
      <header className="w-full top-0 sticky z-50 bg-[#f8f9fa] dark:bg-[#191c1d]">
        <div className="flex items-center justify-between px-6 h-16 w-full max-w-screen-xl mx-auto">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.png" alt="JobbaWorks Logo" className="w-8 h-8 rounded-lg object-contain" />
            <span className="text-xl font-black text-[#008751] dark:text-[#00e479] font-headline tracking-tight">JobbaWorks</span>
          </Link>
          <div className="hidden md:flex gap-6 items-center">
            <Link to="#" className="text-[#191c1d] dark:text-[#f8f9fa] opacity-60 font-label text-sm hover:opacity-100 transition-opacity">
              Help Center
            </Link>
            <Link to="/login" className="text-[#008751] font-bold font-label text-sm">
              Login
            </Link>
          </div>
        </div>
      </header>
      
      <main className="flex-grow flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Branding/Value Proposition Section */}
          <div className="hidden md:block md:col-span-6 lg:col-span-7 pr-4 lg:pr-12">
            <h1 className="font-headline text-4xl lg:text-7xl font-extrabold text-on-primary-fixed-variant tracking-tight leading-[1.1] mb-6">
              Start your <span className="text-primary-container">reading journey</span> today.
            </h1>
            <p className="text-on-surface-variant text-base lg:text-xl leading-relaxed max-w-md mb-8">
              Join the platform where your time spent learning turns into earnings. Secure, intuitive, and built for readers.
            </p>
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-[0px_20px_40px_rgba(0,33,16,0.06)] bg-surface-container-low max-h-64">
              <img 
                alt="Professional team collaborating" 
                className="object-cover w-full h-full opacity-90"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAaurW1gy0AqFvvW8b56cEbLap4NBAT6MlUxF-XD5DYH8EY8IuEyozq_NMoFVWGfpy7HpQenx_IVWMI7MoAxFJzporLosnX9AGlUwB26mGkeMhCjcA-PCJnTqIGlkSSHVLO4sHejIrg06utKhs_KyW2s14AkZLAoU_pYsSFXWLMt4IV1XzOWIS8eOfu2RYiB3iWCH-AYvaWaQ3ZVVYuSKvyLFIPhOYj1eqKiH0HgLqyNzufwXYfWwQ3GNlhAxt67DeSakCRHJ-3XI8" 
              />
            </div>
          </div>
          
          {/* Signup Card */}
          <div className="md:col-span-6 lg:col-span-5 w-full max-w-md mx-auto md:max-w-none">
            <div className="bg-surface-container-lowest p-6 md:p-10 lg:p-12 rounded-[1.5rem] shadow-[0px_20px_40px_rgba(0,33,16,0.04)] relative overflow-hidden">
              <div className="mb-8">
                <h2 className="font-headline text-2xl md:text-3xl font-bold text-on-surface mb-2">Create Account</h2>
                <p className="text-on-surface-variant font-medium text-sm md:text-base">Enter your details to get started.</p>
              </div>

              {errorMsg && (
                <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm font-semibold">
                  {errorMsg}
                </div>
              )}
              
              <form className="space-y-4 md:space-y-6" onSubmit={handleSignup}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Full Name Input */}
                  <div className="space-y-1 pt-2">
                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Full Name</label>
                    <div className="group relative">
                      <input
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        className="w-full h-12 md:h-14 px-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary-fixed-dim focus:bg-surface-container-lowest transition-all placeholder:text-outline/50"
                        placeholder="Adebayo Mensah" 
                        type="text" 
                      />
                    </div>
                  </div>

                  {/* Username Input */}
                  <div className="space-y-1 pt-2">
                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Username</label>
                    <div className="group relative">
                      <input
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        required
                        className={`w-full h-12 md:h-14 px-4 bg-surface-container-low border-2 rounded-xl focus:ring-2 focus:bg-surface-container-lowest transition-all placeholder:text-outline/50 ${
                          usernameStatus === 'available' ? 'border-emerald-500 focus:ring-emerald-500/20' :
                          usernameStatus === 'taken' ? 'border-red-400 focus:ring-red-400/20' :
                          'border-transparent focus:ring-primary-fixed-dim'
                        }`}
                        placeholder="bayo_m" 
                        type="text" 
                      />
                    </div>
                    {usernameStatus === 'checking' && (
                      <p className="text-[10px] text-on-surface-variant ml-1 mt-1 flex items-center gap-1">
                        <span className="w-2.5 h-2.5 border-2 border-outline border-t-transparent rounded-full animate-spin inline-block"></span>
                        Checking availability...
                      </p>
                    )}
                    {usernameStatus === 'available' && (
                      <p className="text-[10px] text-emerald-600 font-bold ml-1 mt-1">✓ Username is available</p>
                    )}
                    {usernameStatus === 'taken' && (
                      <p className="text-[10px] text-red-500 font-bold ml-1 mt-1">✗ Username is already taken</p>
                    )}
                  </div>
                </div>

                {/* Phone Number Input */}
                <div className="space-y-1">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Phone Number</label>
                  <div className="group relative flex items-center">
                    <div className="h-12 md:h-14 px-4 flex items-center bg-surface-container-low border-none rounded-l-xl focus-within:ring-2 focus-within:ring-primary-fixed-dim focus-within:bg-surface-container-lowest transition-all">
                      <span className="font-bold text-on-surface-variant">+234</span>
                    </div>
                    <input
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full h-12 md:h-14 px-4 bg-surface-container-low border-none rounded-r-xl focus:ring-2 focus:ring-primary-fixed-dim focus:bg-surface-container-lowest transition-all placeholder:text-outline/50"
                      placeholder="801 234 5678" 
                      type="tel" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Email Address</label>
                    <div className="group relative">
                      <input
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full h-12 md:h-14 px-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary-fixed-dim focus:bg-surface-container-lowest transition-all placeholder:text-outline/50"
                        placeholder="name@example.com" 
                        type="email" 
                      />
                    </div>
                  </div>

                  {/* Gender Select */}
                  <div className="space-y-1">
                    <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Gender</label>
                    <div className="group relative">
                      <select 
                        name="gender"
                        value={formData.gender}
                        onChange={handleChange}
                        required
                        className="w-full h-12 md:h-14 px-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary-fixed-dim focus:bg-surface-container-lowest transition-all text-on-surface appearance-none cursor-pointer"
                      >
                        <option value="" disabled>Select Gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
                    </div>
                  </div>
                </div>
                
                {/* Password Input */}
                <div className="space-y-1 relative">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Password</label>
                  <div className="group relative">
                    <input
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={6}
                      className="w-full h-12 md:h-14 px-4 pr-12 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary-fixed-dim focus:bg-surface-container-lowest transition-all placeholder:text-outline/50"
                      placeholder="••••••••" 
                      type={showPassword ? "text" : "password"} 
                    />
                    <button 
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-primary transition-colors" 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {showPassword ? "visibility_off" : "visibility"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Referral Code (Optional) */}
                <div className="space-y-1 relative">
                  <label className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Referral Code (Optional)</label>
                  <div className="group relative">
                    <input
                      name="referral"
                      value={formData.referral}
                      onChange={handleChange}
                      className="w-full h-12 md:h-14 px-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary-fixed-dim focus:bg-surface-container-lowest transition-all placeholder:text-outline/50"
                      placeholder="Enter referral code" 
                      type="text" 
                      readOnly={!!refCode}
                    />
                  </div>
                  {referrerUsername ? (
                    <p className="text-[10px] md:text-xs text-primary font-medium ml-1 mt-1">
                      You were referred by <span className="font-bold">@{referrerUsername}</span>
                    </p>
                  ) : refCode ? (
                    <p className="text-[10px] md:text-xs text-primary font-medium ml-1 mt-1">
                      Applying referral code...
                    </p>
                  ) : null}
                </div>
                
                {/* Terms & Conditions */}
                <div className="flex items-start gap-3 py-2">
                  <div className="relative flex items-center h-5">
                    <input
                      name="agreeTerms"
                      checked={formData.agreeTerms}
                      onChange={handleChange}
                      className="h-4 w-4 md:h-5 md:w-5 rounded border-outline-variant text-primary focus:ring-primary-fixed-dim bg-surface-container-low"
                      type="checkbox" 
                    />
                  </div>
                  <label className="text-xs md:text-sm text-on-surface-variant leading-tight">
                    I agree to the <Link className="text-primary font-semibold hover:underline" to="#">Terms of Service</Link> and <Link className="text-primary font-semibold hover:underline" to="#">Privacy Policy</Link>.
                  </label>
                </div>
                
                {/* Primary Action */}
                <button
                  disabled={isLoading}
                  className="w-full h-12 md:h-14 bg-gradient-to-br from-[#006b3f] to-[#008751] text-on-primary-container font-headline font-bold text-base md:text-lg rounded-xl shadow-[0_4px_14px_0_rgba(0,107,63,0.39)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  type="submit"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                  {!isLoading && <span className="material-symbols-outlined text-[20px]">arrow_forward</span>}
                </button>
              </form>
              
              {/* Footer Link */}
              <div className="mt-8 md:mt-10 text-center">
                <p className="text-on-surface-variant font-medium text-sm md:text-base">
                  Already have an account?
                  <Link className="text-primary font-bold ml-1 hover:underline" to="/login">Login</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer Meta */}
      <footer className="w-full py-6 md:py-8 border-t border-transparent bg-surface">
        <div className="max-w-screen-xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-on-surface-variant text-[10px] md:text-sm">
          <p>© 2024 JobbaWorks. Licensed Fintech Solutions.</p>
          <div className="flex gap-4 md:gap-8">
            <Link className="hover:text-primary transition-colors" to="#">Security</Link>
            <Link className="hover:text-primary transition-colors" to="#">Cookies</Link>
            <Link className="hover:text-primary transition-colors" to="#">Accessibility</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
