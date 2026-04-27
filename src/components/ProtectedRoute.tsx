import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute() {
  const { user, profile, isLoading, signOut } = useAuth();

  // Show spinner while Supabase is restoring session from storage
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <p className="text-sm text-on-surface-variant font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // If no user after loading, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is flagged
  if (profile?.status === 'flagged') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fffbfa] p-4 font-body">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-red-100 p-8 text-center space-y-6">
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="material-symbols-outlined text-[40px]">gpp_bad</span>
          </div>
          <h1 className="text-2xl font-black font-headline text-[#191c1d] tracking-tight">Account Suspended</h1>
          <p className="text-[#49454f] text-sm leading-relaxed">
            Your account has been flagged by our administration team. This usually happens when an account goes against our community rules, terms of service, or is under review for suspicious activity.
          </p>
          <div className="bg-surface-container-lowest p-4 rounded-xl text-left">
            <p className="text-xs text-on-surface-variant font-medium">
              If you believe this is a mistake, please contact support to appeal your account status.
            </p>
          </div>
          <button 
            onClick={() => signOut()} 
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors mt-4"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  // Authenticated and not flagged — render the protected page
  return <Outlet />;
}
