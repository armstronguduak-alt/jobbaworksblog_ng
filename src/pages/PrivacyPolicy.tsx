import { Link } from 'react-router-dom';

export function PrivacyPolicy() {
  return (
    <div className="bg-surface font-body text-on-surface min-h-screen">
      <main className="pt-8 pb-32 px-4 max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/" className="text-primary hover:bg-surface-container p-2 rounded-xl transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <h1 className="text-3xl font-headline font-extrabold text-emerald-950">Privacy Policy</h1>
        </div>
        
        <div className="bg-surface-container-lowest p-6 md:p-10 rounded-3xl shadow-sm space-y-6">
          <p className="text-sm text-on-surface-variant">Last Updated: {new Date().toLocaleDateString()}</p>
          
          <section className="space-y-4">
            <h2 className="text-xl font-bold font-headline">1. Information We Collect</h2>
            <p className="text-on-surface-variant leading-relaxed">
              We collect information you provide directly to us when you create an account, update your profile, use the interactive features of our services, participate in our referral program, or otherwise communicate with us. This includes your name, email address, password, payment details, and whatever other information you choose to provide.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-bold font-headline">2. How We Use Information</h2>
            <p className="text-on-surface-variant leading-relaxed">
              We use the information we collect to operate, maintain, and provide the features and functionality of the Service. This includes communicating with you, processing your earnings and withdrawals, and sending you administrative communications.
            </p>
          </section>
          
          <section className="space-y-4">
            <h2 className="text-xl font-bold font-headline">3. Security</h2>
            <p className="text-on-surface-variant leading-relaxed">
              We value your trust in providing us your Personal Information, thus we are striving to use commercially acceptable means of protecting it. But remember that no method of transmission over the internet, or method of electronic storage is 100% secure and reliable, and we cannot guarantee its absolute security.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold font-headline">4. Contact Us</h2>
            <p className="text-on-surface-variant leading-relaxed">
              If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us at support@jobbaworks.com.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
