import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { supabase } from '../lib/supabase';

interface Promotion {
  id: string;
  title: string;
  description: string;
  image_url: string;
  cta_text: string;
  cta_url: string;
  is_active: boolean;
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
    description: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      description: promo.description || ''
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

      if (editingId) {
        const { error } = await supabase.from('promotions').update({
          title: formData.title,
          description: formData.description,
          image_url: finalImageUrl,
          cta_text: formData.ctaText,
          cta_url: formData.ctaUrl,
        }).eq('id', editingId);
        if (error) throw error;
        showAlert('Promotion updated!', 'Success');
      } else {
        const { error } = await supabase.from('promotions').insert({
          title: formData.title,
          description: formData.description,
          image_url: finalImageUrl,
          cta_text: formData.ctaText,
          cta_url: formData.ctaUrl,
          created_by_user_id: profile.id
        });
        if (error) throw error;
        showAlert('Promotion added successfully!', 'Success');
      }

      setFormData({ title: '', imageUrl: '', ctaText: 'Promote now', ctaUrl: '', description: '' });
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
          Manage and monitor all active promotions globally visible to users.
        </p>
      </div>

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
                  setFormData({ title: '', imageUrl: '', ctaText: 'Promote now', ctaUrl: '', description: '' });
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
