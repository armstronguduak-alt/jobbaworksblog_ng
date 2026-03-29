import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { supabase } from '../lib/supabase';

export function AdminPromotions() {
  const { isAdmin, isLoading: authLoading } = useAuth();
  const { showAlert } = useDialog();
  
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    ctaText: 'Promote now',
    ctaUrl: '',
    description: ''
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.imageUrl;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError, data } = await supabase.storage
          .from('promotions')
          .upload(fileName, imageFile);
          
        if (uploadError) throw uploadError;
        
        const { data: urlData } = supabase.storage.from('promotions').getPublicUrl(fileName);
        finalImageUrl = urlData.publicUrl;
      }

      if (!finalImageUrl) throw new Error('Please provide an image URL or upload a file');

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
      setFormData({ title: '', imageUrl: '', ctaText: 'Promote now', ctaUrl: '', description: '' });
      setImageFile(null);
    } catch (error: any) {
      showAlert(`Error: ${error.message}`, 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <main className="max-w-4xl mx-auto px-4 md:px-6 pt-10 pb-32">
      <div className="mb-10">
        <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#dcfce7] text-[#006b3f] rounded-full mb-3">
          <span className="material-symbols-outlined text-sm">campaign</span>
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Promotional Hub</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-[#0f172a] tracking-tight mb-1 font-headline">
          Promotional Campaigns
        </h1>
        <p className="text-outline text-sm md:text-base mb-8">
          Share ready-made product promotions to help users grow JobbaWorks reach and conversions.
        </p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-[1.5rem] shadow-[0px_10px_30px_rgba(0,0,0,0.03)] border border-surface-container-low overflow-hidden">
        <h2 className="text-xl md:text-2xl font-black font-headline text-[#191c1d] mb-6">Add Promotion</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 sr-only">Promotion title</label>
              <input 
                type="text" 
                placeholder="Promotion title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-5 py-4 rounded-xl bg-[#f8f9fa] border border-surface-container-low focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-[#191c1d] font-bold shadow-sm"
                required
              />
            </div>

            {/* Image Upload/URL Container */}
            <div className="p-4 rounded-xl bg-[#f8f9fa] border border-surface-container-low shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <label className="px-4 py-2 border border-emerald-600 text-[#006b3f] bg-[#dcfce7] rounded-xl font-bold cursor-pointer hover:bg-emerald-200 transition-colors text-xs shrink-0 self-center">
                  Choose File
                  <input type="file" className="hidden" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                </label>
                <span className="text-xs text-outline italic truncate">{imageFile ? imageFile.name : 'No file chosen'}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-outline uppercase tracking-widest shrink-0">OR URL</span>
                <input 
                  type="url" 
                  placeholder="https://..."
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({...formData, imageUrl: e.target.value})}
                  className="w-full px-4 py-3 bg-white border border-surface-container-low rounded-lg focus:border-emerald-500 outline-none transition-all text-sm font-medium"
                />
              </div>
            </div>

            {/* CTA Text */}
            <div>
               <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 sr-only">Promote now</label>
              <input 
                type="text" 
                placeholder="Promote now"
                value={formData.ctaText}
                onChange={(e) => setFormData({...formData, ctaText: e.target.value})}
                className="w-full px-5 py-4 rounded-xl bg-[#f8f9fa] border border-surface-container-low focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-[#191c1d] font-bold shadow-sm"
                required
              />
            </div>

            {/* CTA URL */}
            <div>
               <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 sr-only">CTA URL</label>
              <input 
                type="url" 
                placeholder="CTA URL"
                value={formData.ctaUrl}
                onChange={(e) => setFormData({...formData, ctaUrl: e.target.value})}
                className="w-full px-5 py-4 rounded-xl bg-[#f8f9fa] border border-surface-container-low focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-[#191c1d] font-bold shadow-sm"
                required
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
               <label className="block text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-2 sr-only">Description</label>
              <textarea 
                placeholder="Description"
                rows={4}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-5 py-4 rounded-xl bg-[#f8f9fa] border border-surface-container-low focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-[#191c1d] font-bold shadow-sm resize-none"
                required
              ></textarea>
            </div>
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-[#008751] hover:bg-[#006b3f] text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-transform shadow-sm text-sm disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              {isSubmitting ? 'UPLOADING...' : 'ADD PROMOTION'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
