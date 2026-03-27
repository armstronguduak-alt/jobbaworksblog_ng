import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Navigation } from '../components/Navigation';
import { MobileMenu } from '../components/MobileMenu';
import { Footer } from '../components/Footer';

export function MainLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased flex flex-col font-body">
      <Navigation 
        onMenuToggle={() => setIsMenuOpen(!isMenuOpen)} 
        isMenuOpen={isMenuOpen} 
      />
      <MobileMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)} 
      />
      
      {/* 
        FAB Suppression: None for this main dashboard screen 
      */}
      <button className="fixed bottom-10 right-10 md:bottom-12 md:right-12 bg-primary text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40">
        <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>add</span>
      </button>

      {/* Main page content goes here */}
      <div className="flex-grow flex flex-col items-center w-full">
        <Outlet />
      </div>

      <Footer />
    </div>
  );
}
