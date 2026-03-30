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
  const { pageToggles, monetizationRate: fetchedMonetizationRate, refetchToggles, refetchMonetizationRate } = useAppSettings();

  const [selectedTierId, setSelectedTierId] = useState('free');
  
  const [tierSettings, setTierSettings] = useState({
    price: '0',
    isActive: true,
    readReward: '10',
    commentReward: '5',
    dailyReadingLimit: '5',
    dailyCommentLimit: '4'
  });

  const [toggles, setToggles] = useState(pageToggles);
  const [monetizationRate, setMonetizationRate] = useState(fetchedMonetizationRate.toString());

  // Sync internal state when pageToggles load
  useEffect(() => {
    setToggles(pageToggles);
  }, [pageToggles]);

  useEffect(() => {
    setMonetizationRate(fetchedMonetizationRate.toString());
  }, [fetchedMonetizationRate]);

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
      setTierSettings({
        price: selectedTier.price.toString(),
        isActive: selectedTier.is_active,
        readReward: selectedTier.read_reward.toString(),
        commentReward: selectedTier.comment_reward.toString(),
        dailyReadingLimit: selectedTier.daily_read_limit.toString(),
        dailyCommentLimit: selectedTier.daily_comment_limit.toString()
      });
    }
  }, [selectedTierId, selectedTier]);

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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_subscription_plans'] });
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

                <div className="flex items-center h-full pt-6">
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

          {/* Feature Toggles */}
          <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[2rem] shadow-sm border border-surface-container-low relative">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined">toggle_on</span>
                </div>
                <h2 className="text-2xl font-extrabold font-headline text-on-surface">Page Visibility Toggles</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {Object.entries(toggles).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                  <span className="font-bold text-on-surface capitalize">{key} Page</span>
                  <button 
                    onClick={() => setToggles({...toggles, [key]: !value})}
                    className={`w-12 h-6 rounded-full transition-colors relative flex items-center px-1 ${value ? 'bg-emerald-500' : 'bg-surface-variant'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${value ? 'translate-x-6' : 'translate-x-0'}`}></div>
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end">
              <button onClick={handleTogglesSave} className="bg-primary hover:bg-primary/90 text-on-primary px-8 py-3.5 rounded-2xl font-bold shadow-md active:scale-95 transition-all">
                Save Toggles
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
