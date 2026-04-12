import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full py-4 border-t border-primary/20 bg-primary z-10 relative mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="JobbaWorks Logo" className="w-6 h-6 rounded-md object-contain bg-white" />
            <span className="text-lg font-black text-white font-headline tracking-tight">JobbaWorks</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <Link to="/category/technology" className="text-white/70 hover:text-white transition-colors text-xs font-medium">Technology</Link>
            <Link to="/plans" className="text-white/70 hover:text-white transition-colors text-xs font-medium">Plans</Link>
            <Link to="/promotional" className="text-white/70 hover:text-white transition-colors text-xs font-medium">Promotional</Link>
            <Link to="/privacy-policy" className="text-white/70 hover:text-white transition-colors text-xs font-medium">Privacy</Link>
            <Link to="/terms-of-service" className="text-white/70 hover:text-white transition-colors text-xs font-medium">Terms</Link>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-white/40 text-[11px] border-t border-white/10 pt-3">
          <p>© {new Date().getFullYear()} JobbaWorks. All Rights Reserved.</p>
          <div className="flex gap-4">
            <Link to="#" className="hover:text-white transition-colors">Security</Link>
            <Link to="#" className="hover:text-white transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
