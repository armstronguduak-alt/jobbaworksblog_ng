import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ChangePasswordModal } from '../components/ChangePasswordModal';
import { TwoFactorModal } from '../components/TwoFactorModal';
import { PaymentMethodModal } from '../components/PaymentMethodModal';

export function Settings() {
  const { user, profile, signOut } = useAuth();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [is2FAModalOpen, setIs2FAModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isMfaEnabled, setIsMfaEnabled] = useState(false);
  const [payoutMethods, setPayoutMethods] = useState<any[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<any>(null);

  useEffect(() => {
    checkMfaStatus();
    if (user?.id) fetchPayoutMethods();
  }, [user]);

  const fetchPayoutMethods = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return;
    
    const { data: methods } = await supabase
      .from('payout_methods')
      .select('*')
      .eq('user_id', data.session.user.id)
      .order('is_default', { ascending: false });
      
    if (methods) setPayoutMethods(methods);
  };

  const checkMfaStatus = async () => {
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const existingTotp = factors?.all.find(f => f.factorType === 'totp' && f.status === 'verified');
    setIsMfaEnabled(!!existingTotp);
  };

  const handleToggleMfa = async () => {
    if (isMfaEnabled) {
      // Unenroll logic
      if (!window.confirm("Are you sure you want to disable 2FA? This makes your account less secure.")) return;
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const existingTotp = factors?.all.find(f => f.factorType === 'totp' && f.status === 'verified');
      if (existingTotp) {
        await supabase.auth.mfa.unenroll({ factorId: existingTotp.id });
        setIsMfaEnabled(false);
      }
    } else {
      setIs2FAModalOpen(true);
    }
  };
  return (
    <main className="w-full max-w-2xl mx-auto px-4 md:px-6 pt-8 pb-32 space-y-8">
      {/* Profile Section: Asymmetric Editorial Layout */}
      <section className="relative">
        <div className="grid grid-cols-12 gap-6 items-center">
          <div className="col-span-4 relative group">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden bg-surface-container-high ring-4 ring-surface shadow-lg">
              <img 
                alt={profile?.name || 'User Avatar'}
                className="w-full h-full object-cover"
                src={profile?.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile?.name || 'user'}`}
              />
            </div>
            <button className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95">
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
          </div>
          <div className="col-span-8 space-y-1">
            <h2 className="text-2xl md:text-3xl font-headline font-extrabold tracking-tight text-on-surface">{profile?.name || 'Platform User'}</h2>
            <p className="text-on-surface-variant font-medium text-sm md:text-base">{user?.email}</p>
            <div className="pt-2">
              <button className="text-primary font-semibold text-sm md:text-base inline-flex items-center gap-1 hover:underline">
                Edit Profile
                <span className="material-symbols-outlined text-base">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Preferences: Stacked Glassmorphism Cards */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 px-2">Account & Security</h3>
        <div className="bg-surface-container-lowest rounded-[2rem] p-6 space-y-6 shadow-[0px_20px_40px_rgba(0,33,16,0.04)]">
          {/* Change Password */}
          <button 
            onClick={() => setIsPasswordModalOpen(true)}
            className="w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors duration-300">
                <span className="material-symbols-outlined">lock</span>
              </div>
              <div className="text-left">
                <p className="font-bold text-on-surface text-sm md:text-base">Change Password</p>
                <p className="text-xs text-on-surface-variant">Update your login credentials</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-outline-variant text-base">chevron_right</span>
          </button>
          
          {/* Two-Factor Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">verified_user</span>
              </div>
              <div>
                <p className="font-bold text-on-surface text-sm md:text-base">Two-Factor Auth</p>
                <p className="text-xs text-on-surface-variant">Secure your account with 2FA</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isMfaEnabled}
                onChange={handleToggleMfa} 
              />
              <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Payments: Value Shield Aesthetic */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Payment Methods</h3>
          <button 
            onClick={() => {
              setSelectedMethod(null);
              setIsPaymentModalOpen(true);
            }} 
            className="text-primary font-bold text-xs uppercase tracking-wider"
          >
            Add New
          </button>
        </div>
        <div className="space-y-3">
          {payoutMethods.length === 0 ? (
            <div className="text-center py-6 bg-surface-container-lowest rounded-3xl border border-dashed border-outline/30 text-on-surface-variant text-sm">
              No payment methods set. Add one to start withdrawing earnings.
            </div>
          ) : (
            payoutMethods.map((pm: any) => (
              <div 
                key={pm.id} 
                onClick={() => {
                  setSelectedMethod(pm);
                  setIsPaymentModalOpen(true);
                }}
                className={`bg-surface-container-lowest rounded-3xl p-5 flex items-center justify-between border transition-all cursor-pointer shadow-sm
                  ${pm.is_default ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:border-primary/20'}
                `}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center ${pm.is_default ? 'bg-primary/20 text-primary' : 'bg-surface-container text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined">
                      {pm.method === 'minipay' ? 'account_balance_wallet' : 'account_balance'}
                    </span>
                  </div>
                  <div>
                    <p className="font-bold text-on-surface text-sm md:text-base capitalize">
                      {pm.method} - {pm.account_number || pm.wallet_address || pm.minipay_uid}
                    </p>
                    <p className="text-[10px] md:text-xs text-on-surface-variant">
                      {pm.is_default ? 'Default Withdrawal Account' : pm.account_name || 'Standard Method'}
                    </p>
                  </div>
                </div>
                {pm.is_default ? (
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                ) : (
                  <span className="material-symbols-outlined text-outline-variant hover:text-primary transition-colors">edit</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Preferences */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 px-2">Preferences</h3>
        <div className="bg-surface-container-lowest rounded-[2rem] p-4 shadow-[0px_10px_30px_rgba(0,0,0,0.02)]">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">dark_mode</span>
              <span className="font-semibold text-sm md:text-base">Dark Mode</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" />
              <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
          <div className="h-px bg-surface-container-low mx-2 my-1"></div>
          <button className="w-full flex items-center justify-between p-2">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
              <span className="font-semibold text-sm md:text-base">Notification Settings</span>
            </div>
            <span className="material-symbols-outlined text-outline-variant">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Support & Legal */}
      <div className="space-y-3 pb-8">
        <button className="w-full text-left p-4 rounded-2xl hover:bg-surface-container transition-colors flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">headset_mic</span>
          <span className="font-semibold text-sm md:text-base">Contact Support</span>
        </button>
        <Link to="/privacy-policy" className="w-full text-left p-4 rounded-2xl hover:bg-surface-container transition-colors flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">policy</span>
          <span className="font-semibold text-sm md:text-base">Privacy Policy</span>
        </Link>
        <Link to="/terms-of-service" className="w-full text-left p-4 rounded-2xl hover:bg-surface-container transition-colors flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">description</span>
          <span className="font-semibold text-sm md:text-base">Terms of Service</span>
        </Link>
        
        <div className="pt-6">
          <button 
            onClick={signOut}
            className="w-full py-4 rounded-2xl bg-error-container text-on-error-container font-bold flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            <span className="material-symbols-outlined">logout</span>
            Log Out
          </button>
        </div>
      </div>

      <ChangePasswordModal 
        isOpen={isPasswordModalOpen} 
        onClose={() => setIsPasswordModalOpen(false)} 
      />
      <TwoFactorModal 
        isOpen={is2FAModalOpen} 
        onClose={() => setIs2FAModalOpen(false)} 
        onSuccess={() => {
          setIs2FAModalOpen(false);
          setIsMfaEnabled(true);
        }} 
      />
      <PaymentMethodModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={fetchPayoutMethods}
        existingMethod={selectedMethod}
      />
    </main>
  );
}
