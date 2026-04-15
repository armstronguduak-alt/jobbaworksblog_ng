import { useAuth } from '../contexts/AuthContext';

const EXCHANGE_RATE = 1500; // 1 USD = 1500 NGN

export function useCurrency() {
  const { profile } = useAuth();
  const isGlobal = profile?.is_global === true;

  const formatAmount = (amount: number | null | undefined, forceCurrency?: 'NGN' | 'USD' | 'AUTO') => {
    if (amount === null || amount === undefined) return isGlobal ? '$0.00' : '₦0';
    
    const currency = forceCurrency === 'AUTO' || forceCurrency === undefined ? (isGlobal ? 'USD' : 'NGN') : forceCurrency;
    
    if (currency === 'USD') {
      const usdAmount = amount / EXCHANGE_RATE;
      // For very small amounts like $0.03, keep two decimals
      return '$' + usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    
    // For Naira, don't force decimal unless needed
    return '₦' + amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return {
    isGlobal,
    exchangeRate: EXCHANGE_RATE,
    formatAmount,
    symbol: isGlobal ? '$' : '₦'
  };
}
