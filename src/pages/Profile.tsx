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
        })
        .eq('id', user.id);

      if (error) throw error;
      showAlert('Profile updated successfully!', 'Success');
    } catch (err) {
      console.error('Error updating profile:', err);
      showAlert('Failed to update profile.', 'Error');
    } finally {
      setIsSaving(false);
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
        <section className="bg-surface-container-lowest rounded-[2rem] p-6 shadow-sm border border-surface-container-highest/20">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl overflow-hidden bg-surface-container-high ring-4 ring-surface shadow-lg">
                <img 
                  alt="Profile Avatar" 
                  className="w-full h-full object-cover group-hover:opacity-80 transition-opacity"
                  src={formData.avatarUrl} 
                />
              </div>
              <button className="absolute -bottom-2 -right-2 bg-primary text-on-primary p-3 rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95 z-10">
                <span className="material-symbols-outlined text-sm">photo_camera</span>
              </button>
            </div>
            <div className="text-center md:text-left space-y-2">
              <h3 className="font-bold font-headline text-lg">Profile Picture</h3>
              <p className="text-sm text-on-surface-variant max-w-sm">We recommend an image of at least 800x800px. JPG, GIF, or PNG.</p>
              <button className="mt-2 text-primary font-bold text-sm bg-primary-container/20 px-4 py-2 rounded-full hover:bg-primary-container/30 transition-colors">
                Upload New Image
              </button>
            </div>
          </div>
        </section>

        {/* Personal Details Form */}
        <form className="bg-surface-container-lowest rounded-[2rem] p-6 md:p-8 shadow-sm border border-surface-container-highest/20 space-y-6">
          <h3 className="font-bold text-lg font-headline mb-4 pb-4 border-b border-surface-container-highest">Personal Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Full Name</label>
              <input
                className="w-full h-14 px-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary-fixed-dim focus:bg-surface-container-lowest transition-all"
                name="fullName"
                value={formData.fullName} 
                onChange={handleChange}
                type="text" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Username</label>
              <input
                className="w-full h-14 px-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary-fixed-dim focus:bg-surface-container-lowest transition-all"
                name="username"
                value={formData.username} 
                onChange={handleChange}
                type="text" 
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Email Address (Cannot Edit)</label>
              <div className="relative">
                <input
                  className="w-full h-14 px-4 bg-surface-container-low border-none rounded-xl text-outline opacity-60 cursor-not-allowed"
                  value={user?.email || ''} 
                  type="email" 
                  disabled
                />
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline/50">lock</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Phone Number</label>
              <input
                className="w-full h-14 px-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary-fixed-dim focus:bg-surface-container-lowest transition-all"
                name="phone"
                value={formData.phone} 
                onChange={handleChange}
                type="tel" 
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant ml-1">Bio</label>
            <textarea
              className="w-full p-4 bg-surface-container-low border-none rounded-xl focus:ring-2 focus:ring-primary-fixed-dim focus:bg-surface-container-lowest transition-all resize-none min-h-[120px]"
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
