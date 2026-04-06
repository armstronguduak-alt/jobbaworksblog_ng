import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface PageToggles {
  leaderboardEnabled: boolean;
  swapEnabled: boolean;
  referralsEnabled: boolean;
  earningsEnabled: boolean; // aka tasks / earn
  walletEnabled: boolean;
  promotionsEnabled: boolean;
}

const defaultToggles: PageToggles = {
  leaderboardEnabled: true,
  swapEnabled: true,
  referralsEnabled: true,
  earningsEnabled: true,
  walletEnabled: true,
  promotionsEnabled: true,
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

  return {
    pageToggles: pageToggles || defaultToggles,
    monetizationRate: monetizationRate ?? 100,
    isLoadingToggles,
    refetchToggles,
    refetchMonetizationRate
  };
}
