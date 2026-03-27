import { useState, useRef, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu, X, Search } from 'lucide-react';
import { Footer } from '../components/Footer';

export function BlogLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, profile, signOut } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased flex flex-col font-body">
      
      {/* Blog Navigation */}
      <header className="bg-white/95 backdrop-blur-md sticky top-0 z-50 border-b border-surface-container shadow-sm">
        <div className="flex justify-between items-center w-full px-4 md:px-6 py-3 md:py-4 max-w-7xl mx-auto">
          
          <div className="flex items-center gap-3 md:gap-4">
            <button 
              className="md:hidden text-emerald-950 p-2 bg-emerald-50 rounded-xl"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="JobbaWorks Logo" className="w-8 h-8 md:w-10 md:h-10 rounded-lg object-contain bg-primary" />
              <span className="text-xl md:text-2xl font-black text-emerald-950 font-headline tracking-tighter">JobbaWorks</span>
            </Link>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-emerald-700 font-bold font-headline">Home</Link>
            <Link to="/plans" className="text-on-surface-variant hover:text-emerald-700 font-semibold transition-colors text-sm">Plans</Link>
            <Link to="#" className="text-emerald-600 font-bold text-sm bg-emerald-50 px-3 py-1.5 rounded-full">Community</Link>
            <Link to="/articles" className="text-on-surface-variant hover:text-emerald-700 font-semibold transition-colors text-sm">Business</Link>
            <Link to="/articles" className="text-on-surface-variant hover:text-emerald-700 font-semibold transition-colors text-sm">Design</Link>
            <Link to="/articles" className="text-on-surface-variant hover:text-emerald-700 font-semibold transition-colors text-sm">Education</Link>
            <button className="text-on-surface-variant hover:text-emerald-700 font-semibold transition-colors text-sm">More</button>
          </nav>
          
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center bg-surface-container-low px-4 py-2 rounded-full w-64 border border-surface-container focus-within:border-emerald-300 focus-within:ring-2 focus-within:ring-emerald-100 transition-all">
              <Search size={16} className="text-on-surface-variant mr-2" />
              <input 
                type="text" 
                placeholder="Search articles..." 
                className="bg-transparent border-none outline-none text-sm w-full text-on-surface placeholder:text-on-surface-variant font-medium" 
              />
            </div>
            
            {user ? (
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm focus:border-emerald-200 transition-all ml-2"
                >
                  <img src={profile?.avatar_url || "https://api.dicebear.com/7.x/notionists/svg?seed=Felix"} alt="Avatar" className="w-full h-full object-cover" />
                </button>
                
                {isProfileOpen && (
                  <div className="absolute top-full right-0 mt-3 w-56 bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-surface-container p-2 transform origin-top-right transition-all">
                    <div className="p-3 border-b border-surface-container mb-2">
                      <p className="font-bold text-emerald-950 font-headline truncate">{profile?.full_name || 'Williams Damsey'}</p>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Pro Plan</p>
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
              <div className="flex gap-2 ml-2">
                <Link to="/login" className="text-sm font-bold text-emerald-800 px-4 py-2 hover:bg-emerald-50 rounded-full transition-colors hidden md:block">Login</Link>
                <Link to="/signup" className="text-sm font-bold text-white bg-primary px-4 py-2 hover:bg-emerald-800 rounded-full shadow-md transition-colors">Sign Up</Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile search - only shows when menu is open or on small screens below nav */}
        <div className="lg:hidden px-4 pb-4">
          <div className="flex items-center bg-surface-container px-4 py-2.5 rounded-full border border-surface-container">
            <Search size={18} className="text-on-surface-variant mr-2" />
            <input 
              type="text" 
              placeholder="Search articles..." 
              className="bg-transparent border-none outline-none text-sm w-full text-on-surface" 
            />
          </div>
        </div>
        
        {/* Mobile Navigation Dropdown */}
        {isMenuOpen && (
          <nav className="md:hidden bg-white border-t border-surface-container px-4 py-4 flex flex-col gap-2">
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="font-bold text-emerald-700 px-4 py-3 bg-emerald-50 rounded-xl">Home</Link>
            <Link to="/plans" onClick={() => setIsMenuOpen(false)} className="font-semibold text-emerald-950 px-4 py-3 hover:bg-surface-container rounded-xl">Plans</Link>
            <Link to="/articles" onClick={() => setIsMenuOpen(false)} className="font-semibold text-emerald-950 px-4 py-3 hover:bg-surface-container rounded-xl">Business</Link>
            <Link to="/articles" onClick={() => setIsMenuOpen(false)} className="font-semibold text-emerald-950 px-4 py-3 hover:bg-surface-container rounded-xl">Design</Link>
            <Link to="/articles" onClick={() => setIsMenuOpen(false)} className="font-semibold text-emerald-950 px-4 py-3 hover:bg-surface-container rounded-xl">Education</Link>
          </nav>
        )}
      </header>

      {/* Main page content goes here */}
      <div className="flex-grow flex flex-col w-full bg-[#f8faf9]">
        <Outlet />
      </div>

      <Footer />
    </div>
  );
}
