import { Link, useLocation } from 'react-router-dom';

export function FeatureDisabled() {
  const location = useLocation();
  const path = location.pathname.split('/')[1] || 'This feature';
  const displayPath = path.charAt(0).toUpperCase() + path.slice(1).replace('-', ' ');

  return (
    <div className="flex-grow flex flex-col items-center justify-center min-h-[60vh] px-4 text-center bg-surface w-full">
      <div className="w-20 h-20 rounded-3xl bg-surface-container-high flex items-center justify-center mb-6 mx-auto shadow-sm">
        <span className="material-symbols-outlined text-outline text-4xl">block</span>
      </div>
      <h2 className="text-2xl md:text-3xl font-black text-on-surface mb-3 font-headline">{displayPath} page is currently unavailable</h2>
      <p className="text-on-surface-variant max-w-md leading-relaxed text-sm md:text-base mb-8">
        The admin has temporarily disabled this feature. Please explore other sections or check back later.
      </p>
      <div className="flex gap-4">
        <Link to="/" className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-emerald-800 transition-colors">
          Go Home
        </Link>
        <Link to="/dashboard" className="px-6 py-3 bg-surface-container text-on-surface font-bold rounded-xl border border-surface-container-high hover:bg-surface-variant transition-colors">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
