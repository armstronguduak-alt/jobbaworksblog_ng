import { Link } from 'react-router-dom';

export function TermsOfService() {
  return (
    <div className="bg-surface font-body text-on-surface min-h-screen">
      <main className="pt-8 pb-32 px-4 max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="text-primary hover:bg-surface-container p-2 rounded-xl transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-3xl font-headline font-extrabold text-emerald-950">Terms of Service</h1>
        </div>
        
        <div className="bg-surface-container-lowest p-6 md:p-10 rounded-3xl shadow-sm space-y-6">
          <p className="text-sm text-on-surface-variant">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <section className="space-y-4">
            <h2 className="text-xl font-bold font-headline">1. Acceptance of Terms</h2>
            <p className="text-on-surface-variant leading-relaxed">
              By accessing and using this website, you accept and agree to be bound by the terms and provision of this agreement. In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable to such services.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-bold font-headline">2. Provision of Services</h2>
            <p className="text-on-surface-variant leading-relaxed">
              You agree and acknowledge that JobbaWorks is entitled to modify, improve or discontinue any of its services at its sole discretion and without notice to you even if it may result in you being prevented from accessing any information contained in it.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-bold font-headline">3. Subscription and Earnings</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Earnings calculations, read limits, and comment rewards are contingent upon your current subscription plan. Referral commissions are paid strictly in compliance with our platform policies, and fraudulent referrals or bot activity will result in immediate account termination.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold font-headline">4. Liability</h2>
            <p className="text-on-surface-variant leading-relaxed">
              Company name and its affiliates shall not be liable for any direct, indirect, incidental, consequential, special or exemplary damages arising out of or in connection with your use or inability to use the services.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
