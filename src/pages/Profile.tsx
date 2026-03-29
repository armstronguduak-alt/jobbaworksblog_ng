import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useDialog } from '../contexts/DialogContext';

export function Profile() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { showAlert } = useDialog();

  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    phone: '',
    bio: '',
    avatarUrl: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.name || '',
        username: profile.username || '',
        phone: profile.phone || '',
        bio: profile.bio || '',
        avatarUrl: profile.avatar_url || `https://api.dicebear.com/7.x/notionists/svg?seed=${profile.name || 'User'}`
      });
    }
  }, [profile]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.fullName,
          username: formData.username,
          phone: formData.phone,
          bio: formData.bio,
          avatar_url: formData.avatarUrl,
        })
        .eq('user_id', user.id);

      if (error) throw error;
      showAlert('Profile updated successfully!', 'Success');
    } catch (err) {
      console.error('Error updating profile:', err);
      showAlert('Failed to update profile.', 'Error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setIsUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('post_images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('post_images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, avatarUrl: publicUrl }));
      showAlert('Avatar uploaded! Click Save Changes to keep it.', 'Success');
    } catch (err: any) {
      console.error(err);
      showAlert('Error uploading image: ' + err.message, 'Error');
    } finally {
      setIsUploadingImage(false);
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body min-h-[calc(100vh-80px)] selection:bg-primary-fixed-dim selection:text-on-primary-fixed my-8 md:my-12">
      <main className="max-w-3xl mx-auto px-4 md:px-6 space-y-8">
        {/* Header Action */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="transition-transform duration-200 active:scale-95 text-[#404943] dark:text-[#bfc9c1] flex items-center justify-center h-10 w-10 rounded-full hover:bg-surface-container-high"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="font-headline font-bold text-2xl tracking-tight text-on-surface">Edit Profile</h1>
            <p className="text-on-surface-variant text-sm mt-1">Manage your public presence and personal details</p>
          </div>
        </div>

        {/* Profile Avatar Editor Component */}
        <section className="bg-white rounded-[2rem] p-6 md:p-8 shadow-sm border border-surface-container-low/50">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="relative shrink-0">
              <div className="w-[120px] h-[120px] rounded-3xl overflow-hidden bg-surface-container ring-1 ring-surface-container-high">
                <img 
                  alt="Profile Avatar" 
                  className="w-full h-full object-cover"
                  src={formData.avatarUrl} 
                />
              </div>
              <label className="absolute -bottom-2 -right-2 bg-[#046c4e] text-white p-2.5 rounded-xl shadow-md cursor-pointer hover:bg-[#03543f] transition-colors z-10">
                <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleImageUpload} 
                  disabled={isUploadingImage}
                />
              </label>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-bold font-headline text-xl text-[#111928]">Profile Picture</h3>
              <p className="text-[15px] text-[#6b7280] max-w-sm leading-relaxed">
                We recommend an image of at least 800x800px. JPG, GIF, or PNG.
              </p>
              <div>
                <label className="inline-block cursor-pointer text-[#046c4e] font-bold text-sm bg-[#def7ec] px-5 py-2.5 rounded-full hover:bg-[#c3e6d5] transition-colors">
                  {isUploadingImage ? 'Uploading...' : 'Upload New Image'}
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageUpload} 
                    disabled={isUploadingImage}
                  />
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Personal Details Form */}
        <form className="bg-white rounded-[2rem] p-6 md:p-10 shadow-sm border border-surface-container-low/50 space-y-8">
          <h3 className="font-extrabold text-2xl font-headline pb-6 border-b border-gray-100 text-[#111928]">Personal Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#4b5563] ml-1">FULL NAME</label>
              <input
                className="w-full h-14 px-5 bg-[#f3f4f6] text-[#111928] font-semibold border-none rounded-2xl focus:ring-2 focus:ring-[#046c4e]/30 outline-none transition-all"
                name="fullName"
                value={formData.fullName} 
                onChange={handleChange}
                type="text" 
              />
            </div>
            
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#4b5563] ml-1">USERNAME</label>
              <input
                className="w-full h-14 px-5 bg-[#f3f4f6] text-[#111928] font-semibold border-none rounded-2xl focus:ring-2 focus:ring-[#046c4e]/30 outline-none transition-all"
                name="username"
                value={formData.username} 
                onChange={handleChange}
                type="text" 
              />
            </div>
            
            <div className="space-y-2.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#4b5563] ml-1">EMAIL ADDRESS (CANNOT EDIT)</label>
              <div className="relative">
                <input
                  className="w-full h-14 px-5 pr-12 bg-[#f9fafb] text-[#9ca3af] font-semibold border-none rounded-2xl outline-none cursor-not-allowed"
                  value={user?.email || ''} 
                  type="email" 
                  disabled
                />
                <span className="material-symbols-outlined absolute right-5 top-1/2 -translate-y-1/2 text-[#9ca3af] text-[20px]">lock</span>
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-[11px] font-bold uppercase tracking-widest text-[#4b5563] ml-1">PHONE NUMBER</label>
              <input
                className="w-full h-14 px-5 bg-[#f3f4f6] text-[#111928] font-semibold border-none rounded-2xl focus:ring-2 focus:ring-[#046c4e]/30 outline-none transition-all"
                name="phone"
                value={formData.phone} 
                onChange={handleChange}
                type="tel" 
              />
            </div>
          </div>

          <div className="space-y-2.5 pt-2">
            <label className="text-[11px] font-bold uppercase tracking-widest text-[#4b5563] ml-1">BIO</label>
            <textarea
              className="w-full p-5 bg-[#f3f4f6] text-[#111928] font-semibold border-none rounded-2xl focus:ring-2 focus:ring-[#046c4e]/30 outline-none transition-all resize-none min-h-[140px]"
              placeholder="Tell us a little bit about yourself..."
              name="bio"
              value={formData.bio}
              onChange={handleChange}
            ></textarea>
          </div>

          <div className="pt-6 border-t border-surface-container-highest flex justify-end gap-4">
            <button
              type="button"
              className="px-6 py-3 rounded-xl font-bold text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50"
              onClick={() => navigate(-1)}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/30 active:scale-95 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

      </main>
    </div>
  );
}
