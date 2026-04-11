import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SetPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SetPinModal({ isOpen, onClose, onSuccess }: SetPinModalProps) {
  const { user } = useAuth();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (pin.length !== 4 || !/^\d+$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }
    
    setIsLoading(true);
    setError('');

    try {
      // Store PIN inside user metadata to avoid requiring immediate database migrations
      const { error: updateError } = await supabase.auth.updateUser({
        data: { withdrawal_pin: pin }
      });

      if (updateError) throw updateError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to set PIN');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface rounded-3xl p-6 w-full max-w-sm shadow-xl border border-surface-container relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-on-surface-variant hover:text-error transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
        
        <h3 className="text-xl font-headline font-bold text-emerald-950 mb-1">
          Set Withdrawal PIN
        </h3>
        <p className="text-xs text-on-surface-variant mb-6">Create a 4-digit PIN to secure your withdrawals.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">New 4-Digit PIN</label>
            <input 
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="••••"
              className="w-full bg-surface-container py-3 px-4 rounded-xl text-on-surface font-black text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent focus:border-primary/30"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Confirm PIN</label>
            <input 
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              required
              placeholder="••••"
              className="w-full bg-surface-container py-3 px-4 rounded-xl text-on-surface font-black text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent focus:border-primary/30"
            />
          </div>

          {error && <p className="text-error text-center text-sm font-semibold">{error}</p>}

          <button 
            type="submit"
            disabled={isLoading || pin.length < 4 || confirmPin.length < 4}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold mt-2 hover:bg-emerald-800 transition-colors active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save PIN'}
          </button>
        </form>
      </div>
    </div>
  );
}
