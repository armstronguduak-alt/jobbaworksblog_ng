import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface TwoFactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function TwoFactorModal({ isOpen, onClose, onSuccess }: TwoFactorModalProps) {
  const [totpData, setTotpData] = useState<any>(null);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      startEnrollment();
    } else {
      setTotpData(null);
      setCode('');
      setError('');
    }
  }, [isOpen]);

  const startEnrollment = async () => {
    setIsLoading(true);
    setError('');
    
    // First check if already enrolled
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const existingTotp = factors?.all.find(f => f.factorType === 'totp' && f.status === 'verified');
    
    if (existingTotp) {
      setError('2FA is already enabled on this account.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setTotpData(data);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize 2FA setup');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!totpData) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId: totpData.id });
      if (challenge.error) throw challenge.error;
      
      const verify = await supabase.auth.mfa.verify({
        factorId: totpData.id,
        challengeId: challenge.data.id,
        code: code
      });
      
      if (verify.error) throw verify.error;
      
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-3xl p-6 w-full max-w-sm shadow-xl border border-surface-container relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-error transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        
        <h3 className="text-xl font-headline font-bold text-emerald-950 mb-1">Set Up 2FA</h3>
        <p className="text-xs text-on-surface-variant mb-6">Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.).</p>
        
        {isLoading && !totpData ? (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          </div>
        ) : error && !totpData ? (
          <div className="bg-error-container text-on-error-container p-3 rounded-xl text-sm font-semibold text-center mb-4">
            {error}
          </div>
        ) : totpData ? (
          <div className="space-y-6">
            <div 
              className="bg-white p-4 rounded-xl flex justify-center items-center overflow-hidden border border-surface-container shadow-sm mx-auto w-[200px]"
              dangerouslySetInnerHTML={{ __html: totpData.totp.qr_code }}
            />
            
            <div className="space-y-2">
               <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">
                 Enter 6-digit Code
               </label>
               <input 
                 type="text"
                 maxLength={6}
                 value={code}
                 onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                 className="w-full bg-surface-container py-3 px-4 text-center tracking-[0.5em] rounded-xl text-xl text-on-surface font-black focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent focus:border-primary/30"
                 placeholder="000000"
               />
               {error && <p className="text-error text-xs font-semibold text-center mt-2">{error}</p>}
            </div>

            <button 
              onClick={verifyCode}
              disabled={code.length !== 6 || isLoading}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold mt-2 hover:bg-emerald-800 transition-colors active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Verify & Enable'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
