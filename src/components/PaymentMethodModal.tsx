import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingMethod?: any;
}

export function PaymentMethodModal({ isOpen, onClose, onSuccess, existingMethod }: PaymentMethodModalProps) {
  const { user } = useAuth();
  const [method, setMethod] = useState<'opay' | 'usdt_trc20' | 'minipay'>(existingMethod?.method || 'minipay');
  const [accountName, setAccountName] = useState(existingMethod?.account_name || '');
  const [accountNumber, setAccountNumber] = useState(existingMethod?.account_number || '');
  const [walletAddress, setWalletAddress] = useState(existingMethod?.wallet_address || '');
  const [minipayUid, setMinipayUid] = useState(existingMethod?.minipay_uid || '');
  const [isDefault, setIsDefault] = useState(existingMethod?.is_default || false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    setError('');

    // Ensure only one is_default per user
    if (isDefault) {
      const { error: resetError } = await supabase
        .from('payout_methods')
        .update({ is_default: false })
        .eq('user_id', user.id);
      
      if (resetError) console.error("Could not reset default method");
    }

    const payload = {
      user_id: user.id,
      method,
      account_name: method === 'opay' ? accountName : null,
      account_number: method === 'opay' ? accountNumber : null,
      wallet_address: method === 'usdt_trc20' ? walletAddress : null,
      minipay_uid: method === 'minipay' ? minipayUid : null,
      is_default: isDefault,
    };

    try {
      const { error: upsertError } = await supabase
        .from('payout_methods')
        .upsert(payload, { onConflict: 'user_id, method' });

      if (upsertError) throw upsertError;

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save payment method');
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
          {existingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
        </h3>
        <p className="text-xs text-on-surface-variant mb-6">Set up exactly where you want to receive your earnings.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Payout Network</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full bg-surface-container py-3 px-4 rounded-xl text-on-surface font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border border-transparent focus:border-primary/30"
            >
              <option value="minipay">MiniPay</option>
              <option value="opay" disabled>OPay (NGN) - Coming Soon</option>
              <option value="usdt_trc20" disabled>USDT (TRC-20) - Coming Soon</option>
            </select>
          </div>

          {method === 'opay' && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Account Number</label>
                <input 
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  required
                  placeholder="e.g. 08123456789"
                  className="w-full bg-surface-container py-3 px-4 rounded-xl text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Account Name</label>
                <input 
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  required
                  placeholder="e.g. John Doe"
                  className="w-full bg-surface-container py-3 px-4 rounded-xl text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
              </div>
            </>
          )}

          {method === 'usdt_trc20' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">Wallet Address (TRC-20)</label>
              <input 
                type="text"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                required
                placeholder="T..."
                className="w-full bg-surface-container py-3 px-4 rounded-xl text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          )}

          {method === 'minipay' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider pl-1">MiniPay Phone or UID</label>
              <input 
                type="text"
                value={minipayUid}
                onChange={(e) => setMinipayUid(e.target.value)}
                required
                placeholder="MiniPay ID"
                className="w-full bg-surface-container py-3 px-4 rounded-xl text-on-surface font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <label className="text-sm font-bold text-on-surface">Set as default method</label>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)} 
              />
              <div className="w-11 h-6 bg-surface-container-highest rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {error && <p className="text-error text-sm font-semibold">{error}</p>}

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-3 rounded-xl font-bold mt-2 hover:bg-emerald-800 transition-colors active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Save Payment Detail'}
          </button>
        </form>
      </div>
    </div>
  );
}
