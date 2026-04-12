import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full bg-[#0a1a10] relative overflow-hidden">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        {/* Top section */}
        <div className="py-8 grid grid-cols-2 md:grid-cols-4 gap-6 border-b border-white/10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img src="/logo.png" alt="JobbaWorks" className="w-7 h-7 rounded-lg object-contain bg-white/10 p-0.5" />
              <span className="text-base font-black text-white font-headline tracking-tight">JobbaWorks</span>
            </div>
            <p className="text-white/50 text-xs leading-relaxed max-w-[200px]">
              Your daily platform for professional growth and passive earnings.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-widest mb-3">Explore</h4>
            <div className="flex flex-col gap-2">
              <Link to="/" className="text-white/50 hover:text-white transition-colors text-xs">All Articles</Link>
              <Link to="/category/technology" className="text-white/50 hover:text-white transition-colors text-xs">Technology</Link>
              <Link to="/category/business" className="text-white/50 hover:text-white transition-colors text-xs">Business</Link>
              <Link to="/category/health" className="text-white/50 hover:text-white transition-colors text-xs">Health</Link>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-widest mb-3">Platform</h4>
            <div className="flex flex-col gap-2">
              <Link to="/plans" className="text-white/50 hover:text-white transition-colors text-xs">Plans & Pricing</Link>
              <Link to="/dashboard" className="text-white/50 hover:text-white transition-colors text-xs">Dashboard</Link>
              <Link to="/promotional" className="text-white/50 hover:text-white transition-colors text-xs">Promotional</Link>
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-bold text-white text-xs uppercase tracking-widest mb-3">Legal</h4>
            <div className="flex flex-col gap-2">
              <Link to="/privacy-policy" className="text-white/50 hover:text-white transition-colors text-xs">Privacy Policy</Link>
              <Link to="/terms-of-service" className="text-white/50 hover:text-white transition-colors text-xs">Terms of Service</Link>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="py-4 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-white/30 text-[11px]">© {new Date().getFullYear()} JobbaWorks. All Rights Reserved.</p>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-white/30 text-[11px]">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
