import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';

export function AdminCategories() {
  const { isAdmin, isModerator, permissions, isLoading: authLoading } = useAuth();
  const hasAccess = isAdmin || (isModerator && permissions.includes('content'));
  const { showAlert, showConfirm } = useDialog();

  const [categories, setCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (hasAccess) {
      fetchCategories();
    }
  }, [hasAccess]);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      
      if (data) setCategories(data);
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      if (err.code !== 'PGRST116') {
        showAlert('Failed to load categories.', 'Error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    
    setIsLoading(true);
    const slug = newCategoryName.toLowerCase().replace(/ /g, '-');
    try {
      const { data, error } = await supabase.from('categories').insert([{ name: newCategoryName, slug }]).select();
      if (error) throw error;
      if (data) {
        setCategories([...data, ...categories]);
        setNewCategoryName('');
        showAlert('Category added securely.', 'Success');
      }
    } catch (err: any) {
      showAlert(`Error: ${err.message}`, 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (id: string, currentName: string) => {
    const newName = window.prompt(`Rename category "${currentName}" to:`, currentName);
    if (!newName || newName.trim() === currentName) return;

    setIsLoading(true);
    try {
      const slug = newName.trim().toLowerCase().replace(/ /g, '-');
      const { error } = await supabase.from('categories').update({ name: newName.trim(), slug }).eq('id', id);
      if (error) throw error;
      setCategories(prev => prev.map(c => c.id === id ? { ...c, name: newName.trim(), slug } : c));
      showAlert(`Category renamed to "${newName.trim()}" successfully.`);
    } catch (err: any) {
      showAlert(`Error: ${err.message}`, 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, currentName: string) => {
    const confirmed = await showConfirm(
      `Are you sure you want to delete the "${currentName}" category?`,
      'Delete Category'
    );
    if (confirmed) {
      setIsLoading(true);
      try {
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (error) throw error;
        setCategories(prev => prev.filter(c => c.id !== id));
        showAlert(`${currentName} category removed.`);
      } catch (err: any) {
        showAlert(`Error deleting: ${err.message}`, 'Error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  if (authLoading) return <div className="p-10 text-center">Loading admin check...</div>;
  if (!hasAccess) return <Navigate to="/dashboard" replace />;

  return (
    <main className="max-w-6xl mx-auto px-4 md:px-6 pt-10 pb-32">
      <div className="mb-10">
        <div className="inline-flex items-center gap-1 px-3 py-1 bg-[#dcfce7] text-[#006b3f] rounded-full mb-3">
          <span className="material-symbols-outlined text-sm">sell</span>
          <span className="text-[10px] md:text-xs font-black uppercase tracking-widest">Taxonomy</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-[#0f172a] tracking-tight mb-1 font-headline">
          Manage Categories
        </h1>
        <p className="text-outline text-sm md:text-base">
          Add, edit, or remove blog categories.
        </p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-[0px_8px_24px_-4px_rgba(0,0,0,0.02)] border border-surface-container-low mb-8">
        <div className="flex flex-col md:flex-row gap-4 max-w-2xl">
          <input 
            type="text" 
            placeholder="New Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
            className="flex-1 px-5 py-3 rounded-xl bg-surface border border-surface-container-low focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-[#191c1d] font-bold shadow-sm"
          />
          <button 
            onClick={handleAddCategory}
            className="bg-[#0f172a] hover:bg-[#1e293b] text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform shadow-sm whitespace-nowrap text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add Category
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-20 text-center">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-on-surface-variant font-bold">Loading Categories...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((cat, index) => (
            <div key={cat.id || index} className="bg-white p-5 rounded-2xl border border-surface-container-low shadow-[0px_4px_16px_-4px_rgba(0,0,0,0.02)] hover:shadow-md hover:border-primary/30 transition-all group flex items-center justify-between">
              <span className="font-extrabold text-[#191c1d] text-base truncate pr-2">{cat.name}</span>
              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handleEdit(cat.id, cat.name)}
                  title="Edit Category"
                  className="text-outline hover:text-primary p-2 rounded-lg hover:bg-primary/5 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
                <button 
                  onClick={() => handleDelete(cat.id, cat.name)}
                  title="Delete Category"
                  className="text-outline hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            </div>
          ))}

          {categories.length === 0 && !isLoading && (
            <div className="col-span-full py-16 text-center text-on-surface-variant bg-surface-container-low rounded-3xl border-2 border-dashed border-surface-container">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">sell</span>
              <p className="font-bold text-lg">No Categories Found</p>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
