import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface NonNigerianPlan {
  id: string;
  price: number;
  usdReadReward?: number;
  usdCommentReward?: number;
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
  globalRegistrationEnabled: boolean;
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
  globalRegistrationEnabled: true,
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

export interface PlanStreakSettings {
  weeklyTotalNgn: number;
  weeklyTotalUsd: number;
  enabled: boolean;
}

const defaultStreakSettings: Record<string, PlanStreakSettings> = {
  free:      { weeklyTotalNgn: 320,   weeklyTotalUsd: 1,   enabled: true },
  starter:   { weeklyTotalNgn: 833,   weeklyTotalUsd: 3,   enabled: true },
  pro:       { weeklyTotalNgn: 2500,  weeklyTotalUsd: 7,   enabled: true },
  elite:     { weeklyTotalNgn: 5000,  weeklyTotalUsd: 15,  enabled: true },
  vip:       { weeklyTotalNgn: 10000, weeklyTotalUsd: 30,  enabled: true },
  executive: { weeklyTotalNgn: 20000, weeklyTotalUsd: 60,  enabled: true },
  platinum:  { weeklyTotalNgn: 40000, weeklyTotalUsd: 125, enabled: true },
};

export interface PaymentGatewaySettings {
  gatewayType: 'manual_usdt' | 'nowpayments';
  nowpaymentsApiKey: string;
  korapayApiKey: string;
}

const defaultPaymentGatewaySettings: PaymentGatewaySettings = {
  gatewayType: 'manual_usdt',
  nowpaymentsApiKey: '',
  korapayApiKey: 'pk_live_SrX8jJfmtdHtbf4HUueSQjMi8Hm7qUGZ5o9LQWP4',
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

  const { data: referralSettings, refetch: refetchReferralSettings } = useQuery({
    queryKey: ['systemSettings', 'referral_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'referral_settings')
        .maybeSingle();
      
      if (error || !data) return { nigerianReferralPercent: 25, crossReferralRewards: {
        free: 0, starter: 0.50, pro: 1.50, elite: 3.00, vip: 5.00, executive: 7.00, platinum: 10.00
      }, swapEnabledForNigerians: true };
      return data.value as any;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: streakSettings, refetch: refetchStreakSettings } = useQuery({
    queryKey: ['systemSettings', 'streak_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'streak_settings')
        .maybeSingle();
      
      if (error || !data) return defaultStreakSettings;
      return { ...defaultStreakSettings, ...(data.value as Record<string, PlanStreakSettings>) };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: platformLockdown, refetch: refetchPlatformLockdown } = useQuery({
    queryKey: ['systemSettings', 'platform_lockdown'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'platform_lockdown')
        .maybeSingle();
      
      if (error || !data) return { locked: false };
      return data.value as { locked: boolean };
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: paymentGatewaySettings, refetch: refetchPaymentGatewaySettings } = useQuery({
    queryKey: ['systemSettings', 'payment_gateway_settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'payment_gateway_settings')
        .maybeSingle();
      
      if (error || !data) return defaultPaymentGatewaySettings;
      return { ...defaultPaymentGatewaySettings, ...(data.value as Partial<PaymentGatewaySettings>) } as PaymentGatewaySettings;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    pageToggles: pageToggles || defaultToggles,
    usdtAddresses: usdtAddresses || ["TRxxxxxxxxx1", "TRxxxxxxxxx2", "TRxxxxxxxxx3", "TRxxxxxxxxx4", "TRxxxxxxxxx5"],
    nonNigerianPlans: nonNigerianPlans || {},
    monetizationRate: monetizationRate ?? 100,
    exchangeRates: exchangeRates || defaultExchangeRates,
    referralSettings: referralSettings || { nigerianReferralPercent: 25, crossReferralRewards: {
      free: 0, starter: 0.50, pro: 1.50, elite: 3.00, vip: 5.00, executive: 7.00, platinum: 10.00
    }, swapEnabledForNigerians: true },
    streakSettings: streakSettings || defaultStreakSettings,
    platformLockdown: platformLockdown || { locked: false },
    paymentGatewaySettings: paymentGatewaySettings || defaultPaymentGatewaySettings,
    isLoadingToggles,
    refetchToggles,
    refetchUsdtAddresses,
    refetchNonNigerianPlans,
    refetchMonetizationRate,
    refetchExchangeRates,
    refetchReferralSettings,
    refetchStreakSettings,
    refetchPlatformLockdown,
    refetchPaymentGatewaySettings
  };
}
