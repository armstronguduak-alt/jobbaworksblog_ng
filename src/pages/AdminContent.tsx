import { Link } from 'react-router-dom';

export function AdminContent() {
  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-32">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight mb-2 font-headline">Content Moderation</h1>
          <p className="text-on-surface-variant font-medium">Review, approve, and delete articles drafted by users.</p>
        </div>
        <Link to="/admin" className="text-primary font-bold hover:underline">Back to Overview</Link>
      </div>

      <div className="bg-surface-container-lowest p-6 rounded-[1.5rem] shadow-sm">
        <h2 className="text-lg font-bold font-headline mb-4 border-b border-surface-container pb-2">Pending Articles</h2>
        <div className="text-center py-10 text-on-surface-variant bg-surface-container-low rounded-xl border-dashed border-2 border-surface-container">
          <span className="material-symbols-outlined text-4xl mb-2 opacity-50">article</span>
          <p>Unpublished articles waiting for moderation will filter here.</p>
        </div>
      </div>
    </main>
  );
}
