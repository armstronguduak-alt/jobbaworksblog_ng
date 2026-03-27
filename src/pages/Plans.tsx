import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function Plans() {
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const { data, error } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('is_active', true)
          .order('price', { ascending: true });
        
        if (!error && data) {
          setPlans(data);
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchPlans();
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-6 pt-12 pb-32 w-full">
      {/* Hero Section */}
      <section className="mb-16 text-center md:text-left max-w-3xl">
        <span className="bg-tertiary-fixed-dim/20 text-on-tertiary-fixed-variant px-4 py-1.5 rounded-full text-xs md:text-sm font-bold tracking-wider mb-6 inline-block">
          UPGRADE YOUR CAREER
        </span>
        <h2 className="text-4xl md:text-6xl font-headline font-extrabold text-on-surface leading-[1.1] tracking-tight mb-6">
          Scale your earnings with <span className="text-primary italic">Kinetic Plans.</span>
        </h2>
        <p className="text-base md:text-lg text-on-surface-variant leading-relaxed opacity-80">
          Choose the growth path that matches your ambition. Unlock higher article rates, exclusive bonuses, and unlimited potential.
        </p>
      </section>

      {/* Plans Comparison Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-on-surface-variant font-medium animate-pulse">
          Loading active plans from the database... 
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
          {plans.map((plan) => {
            const isFree = plan.price === 0;
            const isPopular = plan.id === 'pro' || plan.id === 'elite';

            return (
              <div 
                key={plan.id}
                className={`relative flex flex-col p-6 rounded-3xl shadow-sm transition-all duration-300 hover:-translate-y-2
                  ${isPopular 
                    ? 'bg-gradient-to-br from-[#006b3f] to-[#008751] text-white shadow-xl ring-4 ring-tertiary-fixed-dim/20 md:scale-105 z-10' 
                    : 'bg-surface-container-lowest text-on-surface border border-surface-container-highest/30 hover:shadow-lg'
                  }
                `}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-tertiary-fixed-dim text-on-tertiary-fixed px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase shadow-md whitespace-nowrap">
                    RECOMMENDED
                  </div>
                )}
                
                <div className={`mb-6 ${isPopular ? 'pt-2' : ''}`}>
                  <h3 className={`text-2xl font-headline font-extrabold mb-1 ${isPopular ? 'text-white' : 'text-emerald-950'}`}>
                    {plan.name}
                  </h3>
                  <p className={`text-sm ${isPopular ? 'text-white/80' : 'text-on-surface-variant'}`}>
                    {isFree ? 'Get started for free' : 'Maximize your capacity'}
                  </p>
                </div>
                
                <div className="mb-8 flex items-baseline gap-1">
                  <span className="text-4xl font-black">
                    ₦{Number(plan.price).toLocaleString()}
                  </span>
                  <span className={`text-sm font-medium ${isPopular ? 'text-white/70' : 'text-on-surface-variant'}`}>
                    /month
                  </span>
                </div>
                
                <ul className="space-y-4 mb-auto pb-8">
                  <li className="flex items-center gap-3 text-sm">
                    <span className={`material-symbols-outlined ${isPopular ? 'text-tertiary-fixed' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                    <span><strong className="font-bold">{plan.daily_read_limit}</strong> daily reads</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <span className={`material-symbols-outlined ${isPopular ? 'text-tertiary-fixed' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>task_alt</span>
                    <span><strong className="font-bold">{plan.daily_comment_limit}</strong> daily comments</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <span className={`material-symbols-outlined ${isPopular ? 'text-tertiary-fixed' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
                    <span><strong className="font-bold">₦{plan.read_reward}</strong> per article read</span>
                  </li>
                  <li className="flex items-center gap-3 text-sm">
                    <span className={`material-symbols-outlined ${isPopular ? 'text-tertiary-fixed' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>forum</span>
                    <span><strong className="font-bold">₦{plan.comment_reward}</strong> per comment</span>
                  </li>
                  {!isFree && (
                    <li className="flex items-center gap-3 text-sm font-bold">
                      <span className={`material-symbols-outlined ${isPopular ? 'text-tertiary-fixed' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                      <span>25% Referral Commission</span>
                    </li>
                  )}
                </ul>
                
                <button 
                  className={`w-full py-4 rounded-xl font-bold transition-all mt-auto active:scale-95
                    ${isPopular 
                      ? 'bg-white text-emerald-800 shadow-md hover:bg-emerald-50' 
                      : 'bg-primary text-white shadow-md hover:bg-emerald-800'
                    }
                  `}
                >
                  {isFree ? 'Current Plan' : 'Subscribe Now'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Asymmetric Value Section */}
      <section className="mt-16 md:mt-24 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-center">
        <div className="md:col-span-7 bg-surface-container-low rounded-3xl p-6 md:p-12 overflow-hidden relative">
          <div className="bg-white/40 absolute -right-20 -bottom-20 w-80 h-80 rounded-full blur-3xl hidden md:block"></div>
          <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-headline font-bold mb-8 text-on-primary-fixed-variant">Why upgrade?</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary-container rounded-2xl flex items-center justify-center text-on-primary-container">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
                </div>
                <h4 className="font-bold text-base md:text-lg">Compound Growth</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  The 10% bonus isn't just a number—it compounds your effort daily, turning small tasks into significant capital.
                </p>
              </div>
              <div className="space-y-4">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-secondary-container rounded-2xl flex items-center justify-center text-on-secondary-container">
                  <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>speed</span>
                </div>
                <h4 className="font-bold text-base md:text-lg">Unlimited Velocity</h4>
                <p className="text-sm text-on-surface-variant leading-relaxed">
                  Remove the ceiling. Read as many articles as you want and earn without restrictions on Premium.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="md:col-span-5 hidden md:block">
          <div className="rounded-2xl overflow-hidden shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
            <img 
              alt="Premium Access" 
              className="w-full aspect-square object-cover"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCAE8kqNLHrgYs_wuhNxAksUEaSFuK6qRaXpBUG0Ixel61-AmVKGUBZY_mKFli3Ml-UMRExyMl-AamMJz6ebZ6NHaHrw_-BpMEHXRQT_zMikQRLsot742DXE5ci945ahx1SaZco9A8Sj8sDz39Ny8f0NGuhY8ho8QplsxOi3z5DqORazMiwY60TmikSQT3XpBmQUe4GuMSIc9Kme6_Tbl0nA5fuZcS7zH4QY0xAmCgwMCoyehnmO4h390ZW7Nz95UMdBIue_2Jodwk" 
            />
          </div>
        </div>
      </section>
    </main>
  );
}
