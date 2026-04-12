import { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Search } from 'lucide-react';
import { Footer } from '../components/Footer';
import { supabase } from '../lib/supabase';

export function BlogLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const { user, profile, signOut } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Hide search bar on individual article pages
  const isArticlePage = location.pathname.startsWith('/article/');

  useEffect(() => {
    supabase.from('categories').select('id, name, slug').order('name').then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased flex flex-col font-body">
      
      {/* Blog Navigation */}
      <header className="bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-surface-container shadow-sm">
        <div className="flex justify-between items-center w-full px-4 md:px-6 py-2.5 md:py-3 max-w-7xl mx-auto">
          
          <div className="flex items-center gap-2 md:gap-4">
            <button 
              className="lg:hidden text-emerald-950 p-1.5 bg-emerald-50 rounded-xl"
              onClick={() => setIsMenuOpen(true)}
            >
              <Menu size={18} />
            </button>
            
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="JobbaWorks Logo" className="w-7 h-7 md:w-9 md:h-9 rounded-lg object-contain bg-primary" />
              <span className="text-lg md:text-2xl font-black text-emerald-950 font-headline tracking-tighter">JobbaWorks</span>
            </Link>
          </div>
          
          <nav className="hidden lg:flex items-center gap-4 xl:gap-6">
            <Link to="/" className="text-emerald-700 font-bold font-headline text-sm">Home</Link>
            <Link to="/plans" className="text-on-surface-variant hover:text-emerald-700 font-semibold transition-colors text-sm">Plans</Link>
            {categories.slice(0, 5).map(cat => (
              <Link key={cat.id} to={`/category/${cat.slug}`} className="text-on-surface-variant hover:text-emerald-700 font-semibold transition-colors text-sm">
                {cat.name}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center gap-2">
            {!isArticlePage && (
              <div className="hidden lg:flex items-center bg-surface-container-low px-3 py-1.5 rounded-full w-56 border border-surface-container focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
                <Search size={15} className="text-on-surface-variant mr-2" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
                    }
                  }}
                  placeholder="Search articles..." 
                  className="bg-transparent border-none outline-none text-sm w-full text-on-surface placeholder:text-on-surface-variant font-medium" 
                />
              </div>
            )}
            
            {user ? (
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden border-2 border-white shadow-sm focus:border-emerald-200 transition-all ml-1"
                >
                  <img src={profile?.avatar_url || "https://api.dicebear.com/7.x/notionists/svg?seed=Felix"} alt="Avatar" className="w-full h-full object-cover" />
                </button>
                
                {isProfileOpen && (
                  <div className="absolute top-full right-0 mt-3 w-56 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-surface-container p-2 transform origin-top-right transition-all">
                    <div className="p-3 border-b border-surface-container mb-2">
                      <p className="font-bold text-emerald-950 font-headline truncate">{profile?.name || 'User'}</p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Member</p>
                    </div>
                    <Link to="/dashboard" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-950 font-medium transition-colors">
                      <span className="material-symbols-outlined text-[18px]">person</span>
                      Dashboard
                    </Link>
                    <Link to="/plans" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-emerald-950 font-medium transition-colors">
                      <span className="material-symbols-outlined text-[18px]">credit_card</span>
                      Plans
                    </Link>
                    <button onClick={() => { signOut(); setIsProfileOpen(false); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold transition-colors mt-1">
                      <span className="material-symbols-outlined text-[18px]">logout</span>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2 ml-1">
                <Link to="/login" className="text-sm font-bold text-emerald-800 px-3 py-1.5 hover:bg-emerald-50 rounded-full transition-colors hidden md:block">Login</Link>
                <Link to="/signup" className="text-sm font-bold text-white bg-primary px-3 py-1.5 hover:bg-emerald-800 rounded-full shadow-md transition-colors hidden md:block">Sign Up</Link>
                <Link to="/login" className="text-sm font-bold text-white bg-primary px-3 py-1.5 hover:bg-emerald-800 rounded-full shadow-md transition-colors md:hidden">Sign In</Link>
              </div>
            )}
          </div>
        </div>

        {/* Search bar below header — only on non-article pages on mobile */}
        {!isArticlePage && (
          <div className="lg:hidden px-4 pb-2.5">
            <div className="flex items-center bg-surface-container px-3 py-2 rounded-full border border-surface-container">
              <Search size={15} className="text-on-surface-variant mr-2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    navigate(`/?search=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                placeholder="Search articles..." 
                className="bg-transparent border-none outline-none text-sm w-full text-on-surface" 
              />
            </div>
          </div>
        )}
      </header>

      {/* Overlay backdrop for slide-in drawer */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Left Slide-In Drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-[280px] bg-white shadow-2xl flex flex-col
        transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] lg:hidden
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-container bg-emerald-50">
          <Link to="/" className="flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
            <img src="/logo.png" alt="JobbaWorks Logo" className="w-7 h-7 rounded-lg object-contain bg-primary" />
            <span className="text-lg font-black text-emerald-950 font-headline tracking-tighter">JobbaWorks</span>
          </Link>
          <button onClick={() => setIsMenuOpen(false)} className="p-1.5 text-emerald-950 bg-white rounded-xl shadow-sm">
            <X size={18} />
          </button>
        </div>

        {/* Drawer Body */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-0.5">
          {/* All Feeds */}
          <Link
            to="/"
            onClick={() => setIsMenuOpen(false)}
            className={`font-bold px-4 py-3 rounded-xl flex items-center gap-3 transition-colors ${
              location.pathname === '/' ? 'bg-emerald-50 text-emerald-700' : 'text-emerald-950 hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">home</span>
            All Feeds
          </Link>

          {/* Category Divider */}
          <p className="px-4 pt-4 pb-1 text-[10px] font-black uppercase tracking-widest text-outline">Categories</p>

          {/* Dynamic Categories */}
          {categories.map(cat => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              onClick={() => setIsMenuOpen(false)}
              className={`font-semibold px-4 py-2.5 rounded-xl flex items-center gap-3 transition-colors ${
                location.pathname === `/category/${cat.slug}` ? 'bg-emerald-50 text-emerald-700' : 'text-emerald-950 hover:bg-surface-container'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
              {cat.name}
            </Link>
          ))}

          {/* Plans divider */}
          <div className="mt-4 pt-3 border-t border-surface-container">
            <Link
              to="/plans"
              onClick={() => setIsMenuOpen(false)}
              className="font-bold px-4 py-3 rounded-xl flex items-center gap-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md"
            >
              <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
              View Plans & Pricing
            </Link>
          </div>
        </nav>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-surface-container">
          {user ? (
            <div className="space-y-2">
              <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-surface-container text-on-surface font-semibold transition-colors">
                <span className="material-symbols-outlined text-[18px]">dashboard</span>
                Dashboard
              </Link>
              <button onClick={() => { signOut(); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold transition-colors">
                <span className="material-symbols-outlined text-[18px]">logout</span>
                Logout
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Link to="/login" onClick={() => setIsMenuOpen(false)} className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-bold shadow-md">
                <span className="material-symbols-outlined text-[18px]">login</span>
                Sign In
              </Link>
              <Link to="/signup" onClick={() => setIsMenuOpen(false)} className="w-full flex items-center justify-center gap-2 border border-surface-container py-3 rounded-xl font-bold text-emerald-950">
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Create Free Account
              </Link>
            </div>
          )}
        </div>
      </aside>

      {/* Main page content goes here */}
      <div className="flex-grow flex flex-col w-full bg-[#f8faf9]">
        <Outlet />
      </div>

      <Footer />
    </div>
  );
}
