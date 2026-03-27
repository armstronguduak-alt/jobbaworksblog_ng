import { Link } from 'react-router-dom';

export function AdminUsers() {
  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-32">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">User Management</h1>
          <p className="text-on-surface-variant font-medium">View, edit, and moderate all platform users.</p>
        </div>
        <Link to="/admin" className="text-primary font-bold hover:underline">Back to Overview</Link>
      </div>

      <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-6 border-b border-surface-container pb-4">
          <input 
            type="text" 
            placeholder="Search users..." 
            className="w-full max-w-sm px-4 py-2 bg-surface-container-low rounded-xl text-sm"
          />
        </div>
        
        <div className="text-center py-10 text-on-surface-variant">
          <span className="material-symbols-outlined text-4xl mb-2 opacity-50">group</span>
          <p>User list will be populated from Supabase here.</p>
        </div>
      </div>
    </main>
  );
}
