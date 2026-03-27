import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="w-full py-10 border-t border-primary/20 bg-primary z-10 relative mt-auto">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-10">
          {/* Column 1: Brand & Description */}
          <div className="col-span-1 md:col-span-6 lg:col-span-4 flex flex-col items-start gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="JobbaWorks Logo" className="w-8 h-8 rounded-lg object-contain bg-white" />
              <span className="text-2xl font-black text-white font-headline tracking-tight">JobbaWorks</span>
            </Link>
            <p className="text-white/80 text-sm font-medium pr-4 leading-relaxed">
              The premier platform for professional growth and daily rewards. Engage with top-tier content and get paid for your attention.
            </p>
          </div>

          <div className="col-span-1 md:col-span-6 lg:col-span-8 grid grid-cols-2 lg:grid-cols-3 gap-8 md:justify-items-end">
            {/* Column 2: Explore */}
            <div className="flex flex-col gap-3 lg:justify-self-center">
              <h3 className="font-bold font-headline text-white mb-2 tracking-wide uppercase text-xs">Explore</h3>
              <Link to="/articles" className="text-white/70 hover:text-white transition-colors text-sm font-medium">Technology</Link>
              <Link to="/plans" className="text-white/70 hover:text-white transition-colors text-sm font-medium">Plans</Link>
              <Link to="/promotional" className="text-white/70 hover:text-white transition-colors text-sm font-medium">Promotional</Link>
            </div>

            {/* Column 3: Network */}
            <div className="flex flex-col gap-3 lg:justify-self-center">
              <h3 className="font-bold font-headline text-white mb-2 tracking-wide uppercase text-xs">Network</h3>
              <Link to="#" className="text-white/70 hover:text-white transition-colors text-sm font-medium">Privacy Policy</Link>
              <Link to="#" className="text-white/70 hover:text-white transition-colors text-sm font-medium">Terms of Service</Link>
            </div>

            {/* Column 4: Invisible Spacer or extra padding for large screens if needed */}
            <div className="hidden lg:block"></div>
          </div>
        </div>

        {/* Bottom Banner */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-white/50 text-xs font-body pt-8 border-t border-white/10">
          <p>© 2024 JobbaWorks. All Rights Reserved.</p>
          <div className="flex gap-6">
            <Link to="#" className="font-semibold hover:text-white transition-colors">Security</Link>
            <Link to="#" className="font-semibold hover:text-white transition-colors">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
