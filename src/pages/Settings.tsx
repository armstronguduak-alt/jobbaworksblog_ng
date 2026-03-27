import { Link } from 'react-router-dom';

export function Settings() {
  return (
    <main className="w-full max-w-2xl mx-auto px-4 md:px-6 pt-8 pb-32 space-y-8">
      {/* Profile Section: Asymmetric Editorial Layout */}
      <section className="relative">
        <div className="grid grid-cols-12 gap-6 items-center">
          <div className="col-span-4 relative group">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden bg-surface-container-high ring-4 ring-surface shadow-lg">
              <img 
                alt="Chinaza Okoro" 
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAuN-sFIQeeYhTq5iWmAsOEyqxjiV1rbUkLMM9_T2DF6qXttzgpbUWet2o289MATv5dsj6a7O_GtcWpZWlR6vBQC6Jegbcv7noKYWyUeVD2QZSVjMa5XfI0aKCL1UHUfCCqJUi7edlx0YOD_Ix3wbjuGq689d63MtLeT5QgOu7eVSTfhNZWPZTA1GHg7E7UYdDrjCtYuJR1nhEAHKe1dYCEpsCQHmVEuWtL71lHrtJ7HOFPD2qL2AwsTUrTLBy9Sgd9NcA0zJ82ax4" 
              />
            </div>
            <button className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95">
              <span className="material-symbols-outlined text-sm">edit</span>
            </button>
          </div>
          <div className="col-span-8 space-y-1">
            <h2 className="text-2xl md:text-3xl font-headline font-extrabold tracking-tight text-on-surface">Chinaza Okoro</h2>
            <p className="text-on-surface-variant font-medium text-sm md:text-base">chinaza@example.com</p>
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
          <button className="w-full flex items-center justify-between group">
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
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Payments: Value Shield Aesthetic */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60">Payment Methods</h3>
          <button className="text-primary font-bold text-xs uppercase tracking-wider">Add New</button>
        </div>
        <div className="space-y-3">
          {/* OPay Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-5 flex items-center justify-between border border-transparent hover:border-primary/20 transition-all cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#e8f5e9] flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">account_balance</span>
              </div>
              <div>
                <p className="font-bold text-on-surface text-sm md:text-base">OPay - 08123456789</p>
                <p className="text-[10px] md:text-xs text-on-surface-variant">Default Withdrawal Account</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>

          {/* MiniPay Card */}
          <div className="bg-surface-container-lowest rounded-3xl p-5 flex items-center justify-between border border-transparent hover:border-primary/20 transition-all cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant">account_balance_wallet</span>
              </div>
              <div>
                <p className="font-bold text-on-surface text-sm md:text-base">MiniPay Wallet</p>
                <p className="text-[10px] md:text-xs text-on-surface-variant">0x123...abc</p>
              </div>
            </div>
            <button className="text-outline-variant hover:text-error transition-colors">
              <span className="material-symbols-outlined">more_vert</span>
            </button>
          </div>
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
        <button className="w-full text-left p-4 rounded-2xl hover:bg-surface-container transition-colors flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">policy</span>
          <span className="font-semibold text-sm md:text-base">Privacy Policy</span>
        </button>
        
        <div className="pt-6">
          <Link 
            to="/login"
            className="w-full py-4 rounded-2xl bg-error-container text-on-error-container font-bold flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
          >
            <span className="material-symbols-outlined">logout</span>
            Log Out
          </Link>
        </div>
      </div>
    </main>
  );
}
