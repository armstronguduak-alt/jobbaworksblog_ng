import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';

interface Promotion {
  id: string;
  title: string;
  description: string;
  image_url: string;
  cta_text: string;
  cta_url: string;
  is_active: boolean;
  is_share_task?: boolean;
  share_reward_amount?: number;
  share_caption?: string;
}

export function AdminPromotions() {
  const { isAdmin, isModerator, permissions, isLoading: authLoading, profile } = useAuth();
  const hasAccess = isAdmin || (isModerator && permissions.includes('promotions'));
  const { showAlert, showConfirm } = useDialog();
  
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    ctaText: 'Promote now',
    ctaUrl: '',
    description: '',
    isShareTask: false,
    shareRewardAmount: '300',
    shareCaption: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Share Task Analytics
  const { data: shareAnalytics } = useQuery({
    queryKey: ['admin_share_analytics'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const [totalRes, todayRes, recentUsersRes] = await Promise.all([
        supabase.from('promotion_shares').select('*', { count: 'exact', head: true }),
        supabase.from('promotion_shares').select('*', { count: 'exact', head: true }).eq('share_date', today),
        supabase.from('promotion_shares')
          .select(`
            id, shared_at, reward_amount, share_date,
            profiles:user_id (name, username)
          `)
          .order('shared_at', { ascending: false })
          .limit(20)
      ]);

      return {
        totalShares: totalRes.count || 0,
        todayShares: todayRes.count || 0,
        recentShares: recentUsersRes.data || []
      };
    },
    enabled: !!hasAccess,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (hasAccess) fetchPromotions();
  }, [hasAccess]);

  const fetchPromotions = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('promotions').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      setPromotions(data);
    }
    setIsLoading(false);
  };

  const handleEdit = (promo: Promotion) => {
    setEditingId(promo.id);
    setFormData({
      title: promo.title,
      imageUrl: promo.image_url,
      ctaText: promo.cta_text,
      ctaUrl: promo.cta_url,
      description: promo.description || '',
      isShareTask: promo.is_share_task || false,
      shareRewardAmount: (promo.share_reward_amount || 300).toString(),
      shareCaption: promo.share_caption || ''
    });
    setImageFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    const confirmed = await showConfirm('Are you sure you want to delete this promotion?', 'Delete Promotion');
    if (!confirmed) return;
    const { error } = await supabase.from('promotions').delete().eq('id', id);
    if (error) showAlert('Failed to delete promotion');
    else {
      setPromotions(prev => prev.filter(p => p.id !== id));
      showAlert('Promotion deleted successfully', 'Success');
    }
  };

  const toggleActive = async (id: string, currentActive: boolean) => {
    const { error } = await supabase.from('promotions').update({ is_active: !currentActive }).eq('id', id);
    if (!error) {
      setPromotions(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentActive } : p));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.imageUrl;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('promotions').upload(fileName, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('promotions').getPublicUrl(fileName);
        finalImageUrl = urlData.publicUrl;
      }

      if (!finalImageUrl) throw new Error('Please provide an image URL or upload a file');

      const payload = {
        title: formData.title,
        description: formData.description,
        image_url: finalImageUrl,
        cta_text: formData.ctaText,
        cta_url: formData.ctaUrl,
        is_share_task: formData.isShareTask,
        share_reward_amount: Number(formData.shareRewardAmount) || 300,
        share_caption: formData.shareCaption,
      };

      if (editingId) {
        const { error } = await supabase.from('promotions').update(payload).eq('id', editingId);
        if (error) throw error;
        showAlert('Promotion updated!', 'Success');
      } else {
        const { error } = await supabase.from('promotions').insert({
          ...payload,
          created_by_user_id: profile.id
        });
        if (error) throw error;
        showAlert('Promotion added successfully!', 'Success');
      }

      setFormData({ title: '', imageUrl: '', ctaText: 'Promote now', ctaUrl: '', description: '', isShareTask: false, shareRewardAmount: '300', shareCaption: '' });
      setImageFile(null);
      setEditingId(null);
      fetchPromotions();
    } catch (error: any) {
      showAlert(`Error: ${error.message}`, 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!hasAccess) return <Navigate to="/dashboard" replace />;

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 pt-10 pb-32">
      <div className="mb-10">
        <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#dcfce7] text-[#006b3f] rounded-full mb-3">
          <span className="material-symbols-outlined text-sm">campaign</span>
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Promotional Hub</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-[#0f172a] tracking-tight mb-1 font-headline">
          Promotional Campaigns
        </h1>
        <p className="text-outline text-sm md:text-base">
          Manage promotions and daily share tasks visible to users.
        </p>
      </div>

      {/* Share Task Analytics */}
      {shareAnalytics && (shareAnalytics.totalShares > 0 || shareAnalytics.todayShares > 0) && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-on-surface-variant uppercase tracking-widest mb-4">Daily Share Task Analytics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-5 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-emerald-600 text-[18px]">share</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Total Shares</span>
              </div>
              <p className="text-2xl font-black text-emerald-700">{shareAnalytics.totalShares.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-blue-600 text-[18px]">today</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Today's Shares</span>
              </div>
              <p className="text-2xl font-black text-blue-700">{shareAnalytics.todayShares.toLocaleString()}</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-5 rounded-2xl border border-purple-100 col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-purple-600 text-[18px]">payments</span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-purple-600">Total Paid Out</span>
              </div>
              <p className="text-2xl font-black text-purple-700">₦{(shareAnalytics.totalShares * 300).toLocaleString()}</p>
            </div>
          </div>
          
          {/* Recent shares list */}
          {shareAnalytics.recentShares.length > 0 && (
            <div className="bg-white rounded-2xl border border-surface-container-low overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-widest">Recent Share Completions</h4>
              </div>
              <div className="divide-y divide-slate-50 max-h-60 overflow-y-auto">
                {shareAnalytics.recentShares.map((share: any) => (
                  <div key={share.id} className="flex justify-between items-center px-5 py-3 text-sm">
                    <div>
                      <span className="font-bold text-slate-800">{share.profiles?.name || 'Unknown'}</span>
                      <span className="text-slate-400 ml-2 text-xs">@{share.profiles?.username || 'user'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-600 font-bold text-xs">₦{Number(share.reward_amount).toLocaleString()}</span>
                      <span className="text-slate-400 text-[11px]">{new Date(share.shared_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Editor Form */}
        <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-[1.5rem] shadow-[0px_10px_30px_rgba(0,0,0,0.03)] border border-surface-container-low h-fit sticky top-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black font-headline text-[#191c1d]">
              {editingId ? 'Edit Promotion' : 'Create Promotion'}
            </h2>
            {editingId && (
              <button 
                onClick={() => {
                  setEditingId(null);
                  setFormData({ title: '', imageUrl: '', ctaText: 'Promote now', ctaUrl: '', description: '', isShareTask: false, shareRewardAmount: '300', shareCaption: '' });
                }}
                className="text-xs font-bold text-outline hover:text-primary transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input 
                type="text" placeholder="Title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-[#f8f9fa] border border-surface-container-low focus:border-emerald-500 text-sm font-bold shadow-sm" required
              />
            </div>

            <div className="p-3 rounded-xl bg-[#f8f9fa] border border-surface-container-low shadow-sm flex flex-col gap-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <label className="px-3 py-1.5 border border-emerald-600 text-[#006b3f] bg-[#dcfce7] rounded-lg font-bold cursor-pointer hover:bg-emerald-200 text-[11px] shrink-0">
                  Upload Image
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                </label>
                <span className="text-[11px] text-outline italic truncate">{imageFile ? imageFile.name : formData.imageUrl ? 'URL Provided' : 'Required'}</span>
              </div>
              <input 
                type="url" placeholder="Or Image URL" value={formData.imageUrl} onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-surface-container-low rounded-lg focus:border-emerald-500 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <input 
                type="text" placeholder="CTA Text" value={formData.ctaText} onChange={(e) => setFormData({...formData, ctaText: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-[#f8f9fa] border border-surface-container-low text-sm font-bold" required
              />
              <input 
                type="url" placeholder="CTA Action URL (Optional)" value={formData.ctaUrl} onChange={(e) => setFormData({...formData, ctaUrl: e.target.value})}
                className="w-full px-4 py-3 rounded-xl bg-[#f8f9fa] border border-surface-container-low text-sm font-bold"
              />
            </div>

            <div>
              <textarea 
                placeholder="Description" rows={3} value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-5 py-3 rounded-xl bg-[#f8f9fa] border border-surface-container-low resize-none text-sm font-medium" required
              ></textarea>
            </div>

            {/* Share Task Settings */}
            <div className="border-t border-surface-container-low pt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#25D366] text-[18px]">share</span>
                  <span className="text-sm font-bold text-on-surface">Enable as Daily Share Task</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({...prev, isShareTask: !prev.isShareTask}))}
                  className={`w-11 h-6 rounded-full transition-all relative flex items-center px-0.5 ${formData.isShareTask ? 'bg-[#25D366]' : 'bg-slate-200'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${formData.isShareTask ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
              
              {formData.isShareTask && (
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-3 animate-[fadeIn_0.2s_ease-out]">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Share Reward (₦)</label>
                    <input 
                      type="number" min="0" step="50"
                      value={formData.shareRewardAmount} 
                      onChange={(e) => setFormData({...formData, shareRewardAmount: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg bg-white border border-emerald-200 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">WhatsApp Share Caption</label>
                    <textarea 
                      rows={2} 
                      value={formData.shareCaption}
                      onChange={(e) => setFormData({...formData, shareCaption: e.target.value})}
                      className="w-full px-4 py-2.5 rounded-lg bg-white border border-emerald-200 text-sm font-medium text-slate-800 resize-none focus:ring-2 focus:ring-emerald-500/20 outline-none"
                      placeholder="Text users will share on WhatsApp..."
                    ></textarea>
                  </div>
                  <p className="text-[10px] text-emerald-700/70 leading-relaxed">
                    Users can claim ₦{Number(formData.shareRewardAmount || 300).toLocaleString()} once per day by sharing this promo on WhatsApp Status.
                  </p>
                </div>
              )}
            </div>

            <button 
              type="submit" disabled={isSubmitting}
              className="w-full bg-[#008751] hover:bg-[#006b3f] text-white py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-transform shadow-sm disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'SAVING...' : editingId ? 'UPDATE PROMOTION' : 'PUBLISH'}
            </button>
          </form>
        </div>

        {/* Existing Data Grid */}
        <div className="lg:col-span-7">
          <h2 className="text-xl font-black font-headline text-[#191c1d] mb-4">Existing Promotions</h2>
          
          {isLoading ? (
            <div className="text-center py-10"></div>
          ) : promotions.length === 0 ? (
            <div className="text-center py-20 bg-white border border-surface-container-high rounded-[1.5rem] opacity-50">
              <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
              <p className="font-bold">No active promotions</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promotions.map(promo => (
                <div key={promo.id} className="bg-white rounded-[1.5rem] p-4 flex flex-col gap-3 shadow-[0px_4px_12px_rgba(0,0,0,0.03)] border border-surface-container-low transition-all hover:border-emerald-200 group">
                  <div className="w-full h-32 bg-surface-container-low rounded-xl overflow-hidden relative">
                    <img src={promo.image_url} alt={promo.title} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button onClick={() => handleEdit(promo)} className="w-8 h-8 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center text-primary shadow hover:bg-primary-container">
                        <span className="material-symbols-outlined text-[16px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(promo.id)} className="w-8 h-8 bg-error/90 backdrop-blur rounded-lg flex items-center justify-center text-white shadow hover:bg-error">
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                    {/* Share Task Badge */}
                    {promo.is_share_task && (
                      <div className="absolute top-2 left-2 bg-[#25D366] text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg flex items-center gap-1 shadow">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/></svg>
                        Share Task
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-bold text-[#191c1d] truncate text-sm">{promo.title}</h3>
                      <button 
                        onClick={() => toggleActive(promo.id, promo.is_active)}
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${promo.is_active ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-surface-container-low text-outline border-transparent'}`}
                      >
                        {promo.is_active ? 'Active' : 'Hidden'}
                      </button>
                    </div>
                    <p className="text-xs text-outline line-clamp-2 leading-snug">{promo.description}</p>
                    {promo.is_share_task && (
                      <div className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-[#25D366]">
                        <span className="material-symbols-outlined text-[14px]">monetization_on</span>
                        ₦{Number(promo.share_reward_amount || 300).toLocaleString()}/share
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </main>
  );
}
