import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export function Referral() {
  const { user, profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadReferralData() {
      if (!user) return;
      setIsLoading(true);

      try {
        // Fetch wallet balance
        const { data: wallet } = await supabase
          .from('wallet_balances')
          .select('referral_earnings')
          .eq('user_id', user.id)
          .single();

        if (wallet) {
          setEarnings(wallet.referral_earnings || 0);
        }

        // Fetch referred users & their details
        // Note: Doing an explicit join using standard supabase syntax
        const { data: referralData, error } = await supabase
          .from('referrals')
          .select(`
            created_at,
            referred_user_id,
            profiles:referred_user_id (
              name,
              avatar_url,
              status
            )
          `)
          .eq('referrer_user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && referralData) {
          setReferrals(referralData);
        }
      } catch (err) {
        console.error('Error fetching referrals:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadReferralData();
  }, [user]);

  const referralCode = profile?.referral_code || 'Loading...';
  const referralLink = `${window.location.origin}/signup?ref=${referralCode}`;

  const copyToClipboard = () => {
    if (!profile?.referral_code) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=Join%20JobbaWorks%20and%20start%20earning!%20Sign%20up%20here:%20${encodeURIComponent(referralLink)}`, '_blank');
  };

  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=Join%20me%20on%20JobbaWorks%20and%20earn%20for%20reading!&url=${encodeURIComponent(referralLink)}`, '_blank');
  };

  const genericShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'JobbaWorks',
          text: 'Join me on JobbaWorks and start earning!',
          url: referralLink,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    } else {
      copyToClipboard();
    }
  };

  if (isLoading) {
     return <div className="text-center font-medium p-10">Loading Referral Data...</div>;
  }

  return (
    <div className="bg-surface font-body text-on-surface selection:bg-primary-fixed-dim min-h-screen">
      <main className="pt-8 pb-32 px-4 max-w-2xl mx-auto space-y-6">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-primary-container p-6 text-on-primary-container shadow-xl">
          <div className="relative z-10 space-y-2">
            <h2 className="font-headline text-3xl font-extrabold leading-tight">Share the Wealth, Get Paid Forever.</h2>
            <p className="text-emerald-50/80 text-sm font-medium leading-relaxed">
              Refer your friends to JobbaWorks and earn a massive{' '}
              <span className="text-tertiary-fixed-dim font-bold">25% commission</span> every time they upgrade.
            </p>
            <div className="pt-4">
              <span className="inline-flex items-center px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-wider">
                Unlimited Earnings
              </span>
            </div>
          </div>
          {/* Decorative Pattern */}
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[12rem]" style={{ fontVariationSettings: "'FILL' 1" }}>
              celebration
            </span>
          </div>
        </section>

        {/* Referral Code Card */}
        <section className="bg-surface-container-lowest p-6 rounded-3xl shadow-[0px_20px_40px_rgba(0,33,16,0.06)] space-y-4 border border-surface-container-highest/20">
          <div className="flex flex-col items-center text-center space-y-2">
            <p className="text-on-surface-variant font-semibold text-xs uppercase tracking-widest">Your Unique Invite Link</p>
            <div className="bg-surface-container w-full py-4 rounded-2xl flex items-center justify-between px-6 border-2 border-dashed border-outline-variant/30 flex-wrap gap-2">
              <span className="text-sm md:text-base font-black text-emerald-900 font-headline tracking-tighter truncate max-w-[200px] md:max-w-[400px]">
                {referralLink}
              </span>
              <button 
                onClick={copyToClipboard}
                className="flex items-center gap-2 text-primary font-bold hover:bg-primary-fixed-dim/10 px-3 py-1.5 rounded-lg transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">{copied ? 'check' : 'content_copy'}</span>
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
          <div className="space-y-3 pt-2">
            <p className="text-center text-xs text-on-surface-variant font-medium">Share via social media</p>
            <div className="flex justify-center gap-4">
              <button onClick={shareOnWhatsApp} className="w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366] hover:bg-[#25D366] hover:text-white transition-all shadow-sm">
                <span className="material-symbols-outlined">chat</span>
              </button>
              <button onClick={shareOnTwitter} className="w-12 h-12 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center text-[#1DA1F2] hover:bg-[#1DA1F2] hover:text-white transition-all shadow-sm">
                <span className="material-symbols-outlined">share</span>
              </button>
              <button onClick={genericShare} className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface hover:bg-on-surface hover:text-white transition-all shadow-sm">
                <span className="material-symbols-outlined">more_horiz</span>
              </button>
            </div>
          </div>
        </section>

        {/* Statistics Bento Grid */}
        <section className="grid grid-cols-2 gap-4">
          <div className="col-span-2 bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  payments
                </span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Total Referral Earnings</p>
                <h3 className="text-xl font-black text-emerald-900 font-headline">
                  ₦{earnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h3>
              </div>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-surface-container-highest/20">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Active Referrals</p>
            <div className="flex items-baseline gap-1 pt-1">
              <span className="text-2xl font-black text-emerald-900 font-headline">{referrals.length}</span>
            </div>
          </div>
          <div className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-surface-container-highest/20 opacity-60 pointer-events-none">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Pending Bonus</p>
            <div className="flex items-baseline gap-1 pt-1">
              <span className="text-2xl font-black text-on-surface-variant font-headline">₦0.00</span>
            </div>
          </div>
        </section>

        {/* How it Works */}
        <section className="bg-surface-container-lowest rounded-3xl p-6 shadow-sm space-y-6 border border-surface-container-highest/20">
          <h3 className="font-headline font-bold text-lg text-emerald-900">How to Earn</h3>
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                1
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm">Invite Friends</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Share your link with friends, family, or your social media followers.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm">They Purchase A Plan</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Your referrals upgrade their account subscriptions in the platform.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-sm">
                3
              </div>
              <div className="space-y-1">
                <p className="font-bold text-sm">You Get 25%</p>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Get 25% of their plan price credited instantly to your wallet. Every single time.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Referral List */}
        <section className="space-y-4 pb-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="font-headline font-bold text-lg text-emerald-900">Your Referrals</h3>
          </div>
          <div className="space-y-3">
            {referrals.length === 0 ? (
               <div className="text-center bg-surface-container-lowest p-8 border border-dashed border-outline-variant/30 rounded-2xl">
                 <p className="text-on-surface-variant font-medium mb-1">You haven't referred anyone yet.</p>
                 <p className="text-xs text-on-surface-variant">Share your link above to start earning!</p>
               </div>
            ) : (
              referrals.map((ref: any, index: number) => {
                const profileData = ref.profiles?.[0] || ref.profiles || {};
                const joinedDate = new Date(ref.created_at).toLocaleDateString();
                
                return (
                  <div key={index} className="bg-surface-container-lowest p-4 rounded-2xl flex items-center justify-between border border-surface-container-highest/20 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-surface-container border border-surface-container-highest">
                        <img
                          alt="Referral avatar"
                          className="w-full h-full object-cover"
                          src={profileData.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${profileData.name || 'user'}`}
                        />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-on-surface">{profileData.name || 'Unknown User'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-tertiary-fixed-dim"></span>
                          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-tight">Status: {profileData.status || 'Active'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Joined</p>
                      <p className="font-bold text-emerald-900 text-xs">{joinedDate}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
