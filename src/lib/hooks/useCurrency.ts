import { useAuth } from '@/components/client/AuthProvider'

const EXCHANGE_RATE = 1500 // 1 USD = 1500 NGN

export function useCurrency() {
  const { user } = useAuth()
  
  // Need to know if user is global. If useAuth doesn't provide it, 
  // we default to true to be safe, or wait for profile to load.
  // Assuming profile info is fetched or passed. For now we assume local.
  // In AuthProvider we need to expose the profile or check user metadata.
  const isGlobal = user?.user_metadata?.is_global === true

  const formatAmount = (amount: number | null | undefined, forceCurrency?: 'NGN' | 'USD' | 'AUTO') => {
    if (amount === null || amount === undefined) return isGlobal ? '$0.00' : '₦0'
    
    const currency = forceCurrency === 'AUTO' || forceCurrency === undefined ? (isGlobal ? 'USD' : 'NGN') : forceCurrency
    
    if (currency === 'USD') {
      const usdAmount = amount / EXCHANGE_RATE
      return '$' + usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }
    
    return '₦' + amount.toLocaleString(undefined, { maximumFractionDigits: 2 })
  }

  return {
    isGlobal,
    exchangeRate: EXCHANGE_RATE,
    formatAmount,
    symbol: isGlobal ? '$' : '₦'
  }
}
