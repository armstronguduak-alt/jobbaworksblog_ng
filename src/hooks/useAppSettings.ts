import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface NonNigerianPlan {
  id: string;
  price: number;
}


export interface PageToggles {
  leaderboardEnabled: boolean;
  swapEnabled: boolean;
  referralsEnabled: boolean;
  earningsEnabled: boolean; // aka tasks / earn
  walletEnabled: boolean;
  promotionsEnabled: boolean;
  blogEnabled: boolean;
  storiesEnabled: boolean;
  leaderboardPublicEnabled: boolean;
}

const defaultToggles: PageToggles = {
  leaderboardEnabled: true,
  swapEnabled: true,
  referralsEnabled: true,
  earningsEnabled: true,
  walletEnabled: true,
  promotionsEnabled: true,
  blogEnabled: true,
  storiesEnabled: true,
  leaderboardPublicEnabled: true,
};

export interface ExchangeRates {
  dollarPrice: number;
  swapFee: number;
  withdrawalFee: number;
}

const defaultExchangeRates: ExchangeRates = {
  dollarPrice: 1500,
  swapFee: 5,
  withdrawalFee: 5,
};

export function useAppSettings() {
  const { data: pageToggles, isLoading: isLoadingToggles, refetch: refetchToggles } = useQuery({
    queryKey: ['systemSettings', 'page_toggles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'page_toggles')
        .maybeSingle();
      
      if (error || !data) return defaultToggles;
      return { ...defaultToggles, ...(data.value as Partial<PageToggles>) } as PageToggles;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  const { data: usdtAddresses, refetch: refetchUsdtAddresses } = useQuery({
    queryKey: ['systemSettings', 'usdt_addresses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'usdt_addresses')
        .maybeSingle();
      
      if (error || !data) return ["TRxxxxxxxxx1"];
      return data.value as string[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: nonNigerianPlans, refetch: refetchNonNigerianPlans } = useQuery({
    queryKey: ['systemSettings', 'non_nigerian_plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'non_nigerian_plans')
        .maybeSingle();
      
      if (error || !data) return {};
      return data.value as Record<string, NonNigerianPlan>;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: monetizationRate, refetch: refetchMonetizationRate } = useQuery({
    queryKey: ['systemSettings', 'monetization_rate'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'monetization_rate')
        .maybeSingle();
      
      if (error || !data) return 100;
      return Number((data.value as Record<string, any>)?.rate || 100);
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: exchangeRates, refetch: refetchExchangeRates } = useQuery({
    queryKey: ['systemSettings', 'exchange_rates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'exchange_rates')
        .maybeSingle();
      
      if (error || !data) return defaultExchangeRates;
      return { ...defaultExchangeRates, ...(data.value as Partial<ExchangeRates>) } as ExchangeRates;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    pageToggles: pageToggles || defaultToggles,
    usdtAddresses: usdtAddresses || ["TRxxxxxxxxx1", "TRxxxxxxxxx2", "TRxxxxxxxxx3", "TRxxxxxxxxx4", "TRxxxxxxxxx5"],
    nonNigerianPlans: nonNigerianPlans || {},
    monetizationRate: monetizationRate ?? 100,
    exchangeRates: exchangeRates || defaultExchangeRates,
    isLoadingToggles,
    refetchToggles,
    refetchUsdtAddresses,
    refetchNonNigerianPlans,
    refetchMonetizationRate,
    refetchExchangeRates
  };
}
