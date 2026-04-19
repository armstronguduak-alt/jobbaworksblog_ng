import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAppSettings } from '../hooks/useAppSettings';

export function AdminSettings() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { showAlert } = useDialog();
  const queryClient = useQueryClient();
  const { 
    pageToggles, 
    monetizationRate: fetchedMonetizationRate, 
    exchangeRates: fetchedExchangeRates, 
    usdtAddresses: fetchedUsdtAddresses,
    nonNigerianPlans: fetchedNonNigerianPlans,
    referralSettings: fetchedReferralSettings,
    refetchToggles, 
    refetchMonetizationRate, 
    refetchExchangeRates,
    refetchUsdtAddresses,
    refetchNonNigerianPlans,
    refetchReferralSettings,
    streakSettings: fetchedStreakSettings,
    refetchStreakSettings
  } = useAppSettings();

  const [selectedTierId, setSelectedTierId] = useState('free');
  
  const [tierSettings, setTierSettings] = useState({
    price: '0',
    isActive: true,
    readReward: '10',
    commentReward: '5',
    dailyReadingLimit: '5',
    dailyCommentLimit: '4',
    globalPrice: '0',
    globalReadReward: '0.02',
    globalCommentReward: '0.01',
    streakNgnMin: '10',
    streakNgnMax: '500',
    streakUsdMin: '0.20',
    streakUsdMax: '0.50'
  });

  const [toggles, setToggles] = useState(pageToggles);
  const [monetizationRate, setMonetizationRate] = useState(fetchedMonetizationRate.toString());
  const [exchangeRates, setExchangeRates] = useState({
    dollarPrice: fetchedExchangeRates.dollarPrice.toString(),
    swapFee: fetchedExchangeRates.swapFee.toString(),
    withdrawalFee: fetchedExchangeRates.withdrawalFee.toString()
  });

  const [usdtAddrs, setUsdtAddrs] = useState<string[]>(fetchedUsdtAddresses || []);

  // Referral settings state
  const [refPercent, setRefPercent] = useState(fetchedReferralSettings.nigerianReferralPercent?.toString() || '25');
  const [crossRewards, setCrossRewards] = useState<Record<string, number>>(fetchedReferralSettings.crossReferralRewards || {
    free: 0, starter: 0.50, pro: 1.50, elite: 3.00, vip: 5.00, executive: 7.00, platinum: 10.00
  });
  const [swapEnabledForNigerians, setSwapEnabledForNigerians] = useState(fetchedReferralSettings.swapEnabledForNigerians !== false);

  // Sync internal state when pageToggles load
  useEffect(() => {
    setToggles(pageToggles);
  }, [pageToggles]);

  useEffect(() => {
    setUsdtAddrs(fetchedUsdtAddresses || []);
  }, [fetchedUsdtAddresses]);

  useEffect(() => {
    setMonetizationRate(fetchedMonetizationRate.toString());
  }, [fetchedMonetizationRate]);

  useEffect(() => {
    setExchangeRates({
      dollarPrice: fetchedExchangeRates.dollarPrice.toString(),
      swapFee: fetchedExchangeRates.swapFee.toString(),
      withdrawalFee: fetchedExchangeRates.withdrawalFee.toString()
    });
  }, [fetchedExchangeRates]);

  useEffect(() => {
    setRefPercent(fetchedReferralSettings.nigerianReferralPercent?.toString() || '25');
    setCrossRewards(fetchedReferralSettings.crossReferralRewards || {
      free: 0, starter: 0.50, pro: 1.50, elite: 3.00, vip: 5.00, executive: 7.00, platinum: 10.00
    });
    setSwapEnabledForNigerians(fetchedReferralSettings.swapEnabledForNigerians !== false);
  }, [fetchedReferralSettings]);

  const { data: tiersMaster, isLoading: isTiersLoading } = useQuery({
    queryKey: ['admin_subscription_plans'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subscription_plans').select('*');
      if (error) throw error;
      return data || [];
    }
  });

  const selectedTier = tiersMaster?.find(t => t.id === selectedTierId);

  // Update form when a tier is selected
  useEffect(() => {
    if (selectedTier) {
      const gs = fetchedNonNigerianPlans?.[selectedTier.id];
      const ss = fetchedStreakSettings?.[selectedTier.id];
      setTierSettings({
        price: selectedTier.price.toString(),
        isActive: selectedTier.is_active,
        readReward: selectedTier.read_reward.toString(),
        commentReward: selectedTier.comment_reward.toString(),
        dailyReadingLimit: selectedTier.daily_read_limit.toString(),
        dailyCommentLimit: selectedTier.daily_comment_limit.toString(),
        globalPrice: gs?.price?.toString() || '0',
        globalReadReward: gs?.usdReadReward?.toString() || '0',
        globalCommentReward: gs?.usdCommentReward?.toString() || '0',
        streakNgnMin: ss?.ngnMin?.toString() || '10',
        streakNgnMax: ss?.ngnMax?.toString() || '500',
        streakUsdMin: ss?.usdMin?.toString() || '0.20',
        streakUsdMax: ss?.usdMax?.toString() || '0.50'
      });
    }
  }, [selectedTierId, selectedTier, fetchedNonNigerianPlans, fetchedStreakSettings]);

  const updateTierMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('subscription_plans').update({
        price: Number(tierSettings.price),
        is_active: tierSettings.isActive,
        read_reward: Number(tierSettings.readReward),
        comment_reward: Number(tierSettings.commentReward),
        daily_read_limit: Number(tierSettings.dailyReadingLimit),
        daily_comment_limit: Number(tierSettings.dailyCommentLimit)
      }).eq('id', selectedTierId);
      if (error) throw error;

      if (error) throw error;

      const updatedGlobalPlans = { 
        ...fetchedNonNigerianPlans, 
        [selectedTierId]: { 
          id: selectedTierId, 
          price: Number(tierSettings.globalPrice),
          usdReadReward: Number(tierSettings.globalReadReward),
          usdCommentReward: Number(tierSettings.globalCommentReward)
        } 
      };
      const { error: sysError } = await supabase.from('system_settings').upsert({ key: 'non_nigerian_plans', value: updatedGlobalPlans });
      if (sysError) throw sysError;

      const updatedStreakSettings = {
        ...fetchedStreakSettings,
        [selectedTierId]: {
          ngnMin: Number(tierSettings.streakNgnMin),
          ngnMax: Number(tierSettings.streakNgnMax),
          usdMin: Number(tierSettings.streakUsdMin),
          usdMax: Number(tierSettings.streakUsdMax)
        }
      };
      const { error: streakError } = await supabase.from('system_settings').upsert({ key: 'streak_settings', value: updatedStreakSettings });
      if (streakError) throw streakError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_subscription_plans'] });
      refetchNonNigerianPlans();
      refetchStreakSettings();
      showAlert(`Successfully updated settings for ${selectedTier?.name}.`);
    },
    onError: (err: any) => showAlert(`Error: ${err.message}`, 'Error')
  });

  const handleTierSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTierMutation.mutate();
  };

  const updateTogglesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('system_settings')
        .upsert({ key: 'page_toggles', value: toggles });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchToggles();
      showAlert(`Page visibility toggles saved successfully.`);
    },
    onError: (err: any) => showAlert(`Error: ${err.message}`, 'Error')
  });

  const handleTogglesSave = () => {
    updateTogglesMutation.mutate();
  };

  const updateMonetizationMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('system_settings')
        .upsert({ key: 'monetization_rate', value: { rate: Number(monetizationRate) } });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchMonetizationRate();
      showAlert(`Monetization rate saved successfully.`);
    },
    onError: (err: any) => showAlert(`Error: ${err.message}`, 'Error')
  });

  const handleMonetizationSave = () => {
    updateMonetizationMutation.mutate();
  };

  const updateExchangeRatesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('system_settings')
        .upsert({ 
          key: 'exchange_rates', 
          value: { 
            dollarPrice: Number(exchangeRates.dollarPrice),
            swapFee: Number(exchangeRates.swapFee),
            withdrawalFee: Number(exchangeRates.withdrawalFee),
          } 
        });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchExchangeRates();
      showAlert(`Exchange rates & fees saved successfully.`);
    },
    onError: (err: any) => showAlert(`Error: ${err.message}`, 'Error')
  });

  const handleExchangeRatesSave = () => {
    updateExchangeRatesMutation.mutate();
  };

  const updateUsdtAddressesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('system_settings')
        .upsert({ key: 'usdt_addresses', value: usdtAddrs.filter(a => a.trim() !== '') });
      if (error) throw error;
    },
    onSuccess: () => {
      refetchUsdtAddresses();
      showAlert(`USDT Addresses saved successfully.`);
    },
    onError: (err: any) => showAlert(`Error: ${err.message}`, 'Error')
  });

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-8 pb-32">
      <div className="flex justify-between items-center mb-10">
        <div>
          <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#dcfce7] text-[#006b3f] rounded-full mb-3">
            <span className="material-symbols-outlined text-sm">settings</span>
            <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Configuration</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-[#0f172a] tracking-tight mb-1 font-headline">Global Settings</h1>
          <p className="text-outline text-sm md:text-base">Configure subscription tiers and global application toggles.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Tiers List */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-4">Select Tier to Adjust</h3>
          <div className="space-y-3">
            {isTiersLoading ? <p>Loading tiers...</p> : tiersMaster?.map(tier => (
              <button
                key={tier.id}
                onClick={() => setSelectedTierId(tier.id)}
                className={`w-full text-left p-5 rounded-[1.5rem] transition-all duration-300 border-2 ${
                  selectedTierId === tier.id 
                    ? 'bg-primary text-on-primary border-primary shadow-lg shadow-primary/20 scale-[1.02]' 
                    : 'bg-surface-container-lowest text-on-surface border-transparent hover:border-primary/20 hover:bg-surface-container-low'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Plan ID: {tier.id.toUpperCase()}</span>
                  {selectedTierId === tier.id && <span className="material-symbols-outlined text-sm">bolt</span>}
                </div>
                <h4 className="text-xl font-extrabold font-headline leading-tight">{tier.name}</h4>
                <p className={`text-xs mt-2 ${selectedTierId === tier.id ? 'text-on-primary/80' : 'text-on-surface-variant'}`}>
                  ₦{Number(tier.price).toFixed(2)} per read • {tier.daily_read_limit} limit
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Settings Forms */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Tier Settings Form */}
          <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[2rem] shadow-sm border border-surface-container-low">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">tune</span>
              </div>
              <h2 className="text-2xl font-extrabold font-headline text-on-surface">Fine-tune {selectedTier?.name} Settings</h2>
            </div>

            <form onSubmit={handleTierSave} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Plan Price (₦)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant material-symbols-outlined text-[18px]">payments</span>
                    <input 
                      type="number" 
                      value={tierSettings.price}
                      onChange={(e) => setTierSettings({...tierSettings, price: e.target.value})}
                      className="w-full pl-11 pr-4 py-4 rounded-2xl bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-on-surface font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Global Price (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-[18px]">$</span>
                    <input 
                      type="number" 
                      value={tierSettings.globalPrice}
                      onChange={(e) => setTierSettings({...tierSettings, globalPrice: e.target.value})}
                      className="w-full pl-11 pr-4 py-4 rounded-2xl bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-on-surface font-bold"
                    />
                  </div>
                </div>

                <div className="flex items-center h-full pt-6 md:col-span-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox" 
                        checked={tierSettings.isActive}
                        onChange={(e) => setTierSettings({...tierSettings, isActive: e.target.checked})}
                        className="peer sr-only" 
                      />
                      <div className="w-6 h-6 rounded-md border-2 border-on-surface-variant peer-checked:bg-primary peer-checked:border-primary transition-colors"></div>
                      <span className="material-symbols-outlined absolute text-on-primary text-[16px] opacity-0 peer-checked:opacity-100 transition-opacity">check</span>
                    </div>
                    <span className="text-sm font-bold text-on-surface group-hover:text-primary transition-colors">Plan is Active (Available to Users)</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Read Reward Amount (₦)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant material-symbols-outlined text-[18px]">monetization_on</span>
                    <input 
                      type="number" 
                      value={tierSettings.readReward}
                      onChange={(e) => setTierSettings({...tierSettings, readReward: e.target.value})}
                      className="w-full pl-11 pr-4 py-4 rounded-2xl bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-on-surface font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Comment Reward Amount (₦)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant material-symbols-outlined text-[18px]">chat_bubble</span>
                    <input 
                      type="number" 
                      value={tierSettings.commentReward}
                      onChange={(e) => setTierSettings({...tierSettings, commentReward: e.target.value})}
                      className="w-full pl-11 pr-4 py-4 rounded-2xl bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-on-surface font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Daily Reading Limit (Posts)</label>
                  <input 
                    type="number" 
                    value={tierSettings.dailyReadingLimit}
                    onChange={(e) => setTierSettings({...tierSettings, dailyReadingLimit: e.target.value})}
                    className="w-full px-4 py-4 rounded-2xl bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-on-surface font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Daily Comment Limit (Actions)</label>
                  <input 
                    type="number" 
                    value={tierSettings.dailyCommentLimit}
                    onChange={(e) => setTierSettings({...tierSettings, dailyCommentLimit: e.target.value})}
                    className="w-full px-4 py-4 rounded-2xl bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-on-surface font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Global Read Reward (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-[18px]">$</span>
                    <input 
                      type="number" step="0.01"
                      value={tierSettings.globalReadReward}
                      onChange={(e) => setTierSettings({...tierSettings, globalReadReward: e.target.value})}
                      className="w-full pl-11 pr-4 py-4 rounded-2xl bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-on-surface font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2">Global Comment Reward (USD)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant font-bold text-[18px]">$</span>
                    <input 
                      type="number" step="0.01"
                      value={tierSettings.globalCommentReward}
                      onChange={(e) => setTierSettings({...tierSettings, globalCommentReward: e.target.value})}
                      className="w-full pl-11 pr-4 py-4 rounded-2xl bg-surface-container-low border-transparent focus:bg-surface-container-lowest focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-on-surface font-bold"
                    />
                  </div>
                </div>

                <div className="md:col-span-2 pt-4 border-t border-surface-container-low grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-full">
                    <h4 className="text-sm font-bold text-on-surface uppercase tracking-widest flex items-center gap-2">
                       <span className="material-symbols-outlined text-primary">spa</span> Daily Login Streak Settings
                    </h4>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Nigerian Min Reward (₦)</label>
                    <input type="number" value={tierSettings.streakNgnMin} onChange={(e) => setTierSettings({...tierSettings, streakNgnMin: e.target.value})} className="w-full px-4 py-3 rounded-2xl bg-surface-container-low border-transparent text-sm font-bold text-on-surface" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Nigerian Max Reward (₦)</label>
                    <input type="number" value={tierSettings.streakNgnMax} onChange={(e) => setTierSettings({...tierSettings, streakNgnMax: e.target.value})} className="w-full px-4 py-3 rounded-2xl bg-surface-container-low border-transparent text-sm font-bold text-on-surface" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Global Min Reward (USD)</label>
                    <input type="number" step="0.01" value={tierSettings.streakUsdMin} onChange={(e) => setTierSettings({...tierSettings, streakUsdMin: e.target.value})} className="w-full px-4 py-3 rounded-2xl bg-surface-container-low border-transparent text-sm font-bold text-on-surface" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Global Max Reward (USD)</label>
                    <input type="number" step="0.01" value={tierSettings.streakUsdMax} onChange={(e) => setTierSettings({...tierSettings, streakUsdMax: e.target.value})} className="w-full px-4 py-3 rounded-2xl bg-surface-container-low border-transparent text-sm font-bold text-on-surface" />
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-surface-container flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-bold text-xs">
                  <span className="material-symbols-outlined text-[18px]">sync</span>
                  <span className="uppercase tracking-widest">Live Synchronization Active</span>
                </div>
                <button type="submit" className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-8 py-3.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-md active:scale-95">
                  <span className="material-symbols-outlined text-[20px]">save</span>
                  Apply Changes
                </button>
              </div>
            </form>
          </div>

          {/* Page Visibility Toggles */}
          <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[2rem] shadow-sm border border-surface-container-low">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">toggle_on</span>
              </div>
              <div>
                <h2 className="text-2xl font-extrabold font-headline text-on-surface">Page Visibility Controls</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Toggle any page on or off across the entire platform instantly.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
              {([
                { key: 'blogEnabled', label: 'Blog / Articles', desc: 'Public article pages & home feed', icon: 'article', danger: true },
                { key: 'storiesEnabled', label: 'Stories Hub', desc: 'Community fiction & story pages', icon: 'auto_stories', danger: false },
                { key: 'walletEnabled', label: 'Wallet', desc: 'User withdrawals & balance page', icon: 'account_balance_wallet', danger: true },
                { key: 'swapEnabled', label: 'Swap / Convert', desc: 'Currency swap & conversion page', icon: 'swap_horiz', danger: false },
                { key: 'leaderboardEnabled', label: 'Leaderboard (Dashboard)', desc: 'Rankings visible in user dashboard', icon: 'emoji_events', danger: false },
                { key: 'leaderboardPublicEnabled', label: 'Leaderboard (Public)', desc: 'Rankings visible to non-logged-in users', icon: 'leaderboard', danger: false },
                { key: 'earningsEnabled', label: 'Tasks / Earn', desc: 'Daily earning tasks for users', icon: 'task_alt', danger: false },
                { key: 'referralsEnabled', label: 'Referrals', desc: 'Referral program & invite tracking', icon: 'group_add', danger: false },
                { key: 'promotionsEnabled', label: 'Promotions', desc: 'Promotional offers & campaigns page', icon: 'campaign', danger: false },
              ] as const).map(({ key, label, desc, icon, danger }) => {
                const isOn = (toggles as any)[key] !== false;
                return (
                  <div key={key} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${isOn ? 'bg-surface-container-low border-surface-container' : danger ? 'bg-red-50 border-red-100' : 'bg-amber-50/40 border-amber-100/50'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isOn ? 'bg-primary/10 text-primary' : danger ? 'bg-red-100 text-red-500' : 'bg-amber-100 text-amber-600'}`}>
                        <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-on-surface">{label}</p>
                        <p className="text-[11px] text-on-surface-variant leading-tight">{desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setToggles({ ...toggles, [key]: !isOn })}
                      className={`w-12 h-6 rounded-full transition-all relative flex items-center px-1 shrink-0 ml-3 ${isOn ? 'bg-emerald-500 shadow-inner' : 'bg-slate-200'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${isOn ? 'translate-x-6' : 'translate-x-0'}`} />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleTogglesSave}
                disabled={updateTogglesMutation.isPending}
                className="bg-primary hover:bg-primary/90 disabled:opacity-60 text-on-primary px-8 py-3.5 rounded-2xl font-bold shadow-md active:scale-95 transition-all flex items-center gap-2"
              >
                {updateTogglesMutation.isPending ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : <><span className="material-symbols-outlined text-[18px]">save</span>Save All Toggles</>}
              </button>
            </div>
          </div>


          {/* Monetization Settings */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-surface-container-low/50 relative">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-[#def7ec] flex items-center justify-center text-[#046c4e]">
                <span className="material-symbols-outlined">link</span>
              </div>
              <h2 className="text-2xl font-extrabold font-headline text-[#111928]">Monetization Settings</h2>
            </div>
            
            <div className="bg-[#f9fafb] p-6 rounded-2xl border border-gray-100 mb-4">
              <label className="block text-[11px] font-bold text-[#4b5563] uppercase tracking-widest mb-3">
                AUTHOR REWARD PER 1,000 VIEWS (₦)
              </label>
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="relative flex-1">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[#9ca3af] material-symbols-outlined text-[18px]">link</span>
                  <input 
                    type="number" 
                    value={monetizationRate}
                    onChange={(e) => setMonetizationRate(e.target.value)}
                    className="w-full pl-12 pr-5 py-4 rounded-xl bg-white focus:ring-2 focus:ring-[#046c4e]/20 outline-none transition-all text-[#111928] font-bold shadow-sm"
                  />
                </div>
                <button 
                  onClick={handleMonetizationSave}
                  className="bg-[#046c4e] hover:bg-[#03543f] text-white px-8 py-4 rounded-xl font-bold shadow-md active:scale-95 transition-all whitespace-nowrap"
                >
                  Save Rate
                </button>

              </div>
              <p className="text-[13px] text-[#6b7280] leading-relaxed">
                This is the base rate paid to authors automatically as their articles generate distinct views across the ecosystem.
              </p>
            </div>
          </div>

          {/* Exchange Rates & Fees */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-surface-container-low/50 relative">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                <span className="material-symbols-outlined">currency_exchange</span>
              </div>
              <h2 className="text-2xl font-extrabold font-headline text-[#111928]">Rates & Platform Fees</h2>
            </div>
            
            <div className="bg-[#f9fafb] p-6 rounded-2xl border border-gray-100 mb-4 space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-[11px] font-bold text-[#4b5563] uppercase tracking-widest mb-2">
                    DOLLAR PRICE (₦/$1)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af] font-black">₦</span>
                    <input 
                      type="number" 
                      value={exchangeRates.dollarPrice}
                      onChange={(e) => setExchangeRates(prev => ({...prev, dollarPrice: e.target.value}))}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 border border-gray-200 outline-none transition-all text-[#111928] font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#4b5563] uppercase tracking-widest mb-2">
                    SWAP FEE (%)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af] font-black">%</span>
                    <input 
                      type="number" 
                      value={exchangeRates.swapFee}
                      onChange={(e) => setExchangeRates(prev => ({...prev, swapFee: e.target.value}))}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 border border-gray-200 outline-none transition-all text-[#111928] font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#4b5563] uppercase tracking-widest mb-2">
                    WITHDRAWAL FEE (%)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af] font-black">%</span>
                    <input 
                      type="number" 
                      value={exchangeRates.withdrawalFee}
                      onChange={(e) => setExchangeRates(prev => ({...prev, withdrawalFee: e.target.value}))}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-white focus:ring-2 focus:ring-blue-500/20 border border-gray-200 outline-none transition-all text-[#111928] font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button 
                  onClick={handleExchangeRatesSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all"
                >
                  Save Rates & Fees
                </button>
              </div>

            </div>
          </div>

          {/* Global Payment Addresses */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-surface-container-low/50 relative mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                <span className="material-symbols-outlined">account_balance_wallet</span>
              </div>
              <h2 className="text-2xl font-extrabold font-headline text-[#111928]">Global Payment USDT Addresses</h2>
            </div>
            
            <div className="bg-[#f9fafb] p-6 rounded-2xl border border-gray-100 mb-4">
              <p className="text-[13px] text-[#6b7280] leading-relaxed mb-4">
                These addresses will be shown to non-Nigerian users when they try to purchase a plan. The system will rotate between them.
              </p>
              
              <div className="space-y-4">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div key={index}>
                    <label className="block text-[11px] font-bold text-[#4b5563] uppercase tracking-widest mb-1">
                      USDT Address {index + 1}
                    </label>
                    <input 
                      type="text" 
                      value={usdtAddrs[index] || ''}
                      onChange={(e) => {
                        const newAddrs = [...usdtAddrs];
                        newAddrs[index] = e.target.value;
                        setUsdtAddrs(newAddrs);
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-white focus:ring-2 focus:ring-amber-500/20 border border-gray-200 outline-none transition-all text-[#111928] font-mono text-sm"
                      placeholder="e.g. TRxxxxxxxxxxxxxxxxxxxxxxxxxx..."
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-6 mt-6 border-t border-gray-200">
                <button 
                  onClick={() => updateUsdtAddressesMutation.mutate()}
                  disabled={updateUsdtAddressesMutation.isPending}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all flex items-center gap-2"
                >
                  {updateUsdtAddressesMutation.isPending ? 'Saving...' : 'Save USDT Addresses'}
                </button>
              </div>
            </div>
          </div>

          {/* Referral & Cross-Referral Settings */}
          <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-surface-container-low/50 relative">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                <span className="material-symbols-outlined">group_add</span>
              </div>
              <div>
                <h2 className="text-2xl font-extrabold font-headline text-[#111928]">Referral & Cross-Referral Settings</h2>
                <p className="text-xs text-on-surface-variant mt-0.5">Adjust referral percentages and cross-referral rewards per plan.</p>
              </div>
            </div>

            <div className="bg-[#f9fafb] p-6 rounded-2xl border border-gray-100 mb-6 space-y-6">
              {/* Nigerian-to-Nigerian Referral % */}
              <div>
                <label className="block text-[11px] font-bold text-[#4b5563] uppercase tracking-widest mb-2">
                  Nigerian-to-Nigerian Referral Percentage (%)
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af] font-black">%</span>
                  <input 
                    type="number" 
                    value={refPercent}
                    onChange={(e) => setRefPercent(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white focus:ring-2 focus:ring-purple-500/20 border border-gray-200 outline-none transition-all text-[#111928] font-bold"
                  />
                </div>
                <p className="text-[13px] text-[#6b7280] mt-2">Percentage of the referred Nigerian user&apos;s plan purchase paid to the referrer.</p>
              </div>

              {/* Swap Toggle for Nigerians */}
              <div className="flex items-center justify-between p-4 rounded-2xl border bg-surface-container-low border-surface-container">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-blue-100 text-blue-600">
                    <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-on-surface">Swap Button (Nigerians)</p>
                    <p className="text-[11px] text-on-surface-variant">Enable or disable the NGN → USD swap feature for Nigerian users.</p>
                  </div>
                </div>
                <button
                  onClick={() => setSwapEnabledForNigerians(!swapEnabledForNigerians)}
                  className={`w-12 h-6 rounded-full transition-all relative flex items-center px-1 shrink-0 ml-3 ${swapEnabledForNigerians ? 'bg-emerald-500 shadow-inner' : 'bg-slate-200'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${swapEnabledForNigerians ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Cross-Referral Rewards (Non-Nigerian refers Nigerian) */}
              <div>
                <label className="block text-[11px] font-bold text-[#4b5563] uppercase tracking-widest mb-3">
                  Cross-Referral Rewards (Non-Nigerian → Nigerian, in USD)
                </label>
                <p className="text-[13px] text-[#6b7280] mb-4">When a non-Nigerian refers a Nigerian, the non-Nigerian earns USD based on the referred user&apos;s subscription plan.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {['free', 'starter', 'pro', 'elite', 'vip', 'executive', 'platinum'].map(planKey => (
                    <div key={planKey}>
                      <label className="block text-[10px] font-bold text-[#6b7280] uppercase tracking-widest mb-1">{planKey}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af] font-bold text-sm">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={crossRewards[planKey] ?? 0}
                          onChange={(e) => setCrossRewards({ ...crossRewards, [planKey]: Number(e.target.value) })}
                          className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-white focus:ring-2 focus:ring-purple-500/20 border border-gray-200 outline-none transition-all text-[#111928] font-bold text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button 
                  onClick={async () => {
                    try {
                      const { error } = await supabase.from('system_settings').upsert({
                        key: 'referral_settings',
                        value: {
                          nigerianReferralPercent: Number(refPercent),
                          crossReferralRewards: crossRewards,
                          swapEnabledForNigerians
                        }
                      });
                      if (error) throw error;
                      refetchReferralSettings();
                      showAlert('Referral settings saved successfully.');
                    } catch (err: any) {
                      showAlert(`Error: ${err.message}`, 'Error');
                    }
                  }}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-xl font-bold shadow-md active:scale-95 transition-all"
                >
                  Save Referral Settings
                </button>
              </div>
            </div>
          </div>

          {/* System Lockdown Mode */}
          <div className="bg-[#fff1f2] p-6 md:p-8 rounded-[2rem] shadow-sm relative">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-[#e11d48] text-2xl">gpp_bad</span>
              <h2 className="text-2xl font-extrabold font-headline text-[#be123c]">System Lockdown Mode</h2>
            </div>
            
            <p className="text-[#9f1239] text-[15px] leading-relaxed mb-6 max-w-2xl">
              Emergency feature to suspend all platform rewards instantly. Use this only in the event of an economic attack or critical bug.
            </p>
            
            <button 
              onClick={() => showAlert('WARNING: Initializing platform-wide lockdown...', 'Security Alert')}
              className="bg-[#e11d48] hover:bg-[#be123c] text-white px-8 py-4 rounded-xl font-extrabold uppercase tracking-widest text-sm shadow-md shadow-[#e11d48]/20 active:scale-95 transition-all"
            >
              ACTIVATE REWARD LOCKDOWN
            </button>
          </div>

        </div>
      </div>
    </main>
  );
}
