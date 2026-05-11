import { createClient } from '@/lib/supabase/server'
import type { PageToggles, ExchangeRates, PaymentGatewaySettings, AffiliateWithdrawalSettings, PlanStreakSettings } from '@/lib/types'

/* ── Default Values ── */

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
}

const defaultExchangeRates: ExchangeRates = {
  dollarPrice: 1500,
  swapFee: 5,
  withdrawalFee: 5,
}

const defaultPaymentGateway: PaymentGatewaySettings = {
  gatewayType: 'manual_usdt',
  nowpaymentsApiKey: '',
  korapayApiKey: '',
}

const defaultAffiliateWithdrawal: AffiliateWithdrawalSettings = {
  minWithdrawalAmount: 20,
  withdrawalFeePercent: 5,
  processingTimeHours: 48,
  requireReferrals: false,
  requiredReferralCount: 0,
}

const defaultStreakSettings: Record<string, PlanStreakSettings> = {
  free:      { weeklyTotalNgn: 320,   weeklyTotalUsd: 1,   enabled: true },
  starter:   { weeklyTotalNgn: 833,   weeklyTotalUsd: 3,   enabled: true },
  pro:       { weeklyTotalNgn: 2500,  weeklyTotalUsd: 7,   enabled: true },
  elite:     { weeklyTotalNgn: 5000,  weeklyTotalUsd: 15,  enabled: true },
  vip:       { weeklyTotalNgn: 10000, weeklyTotalUsd: 30,  enabled: true },
  executive: { weeklyTotalNgn: 20000, weeklyTotalUsd: 60,  enabled: true },
  platinum:  { weeklyTotalNgn: 40000, weeklyTotalUsd: 125, enabled: true },
}

/* ── Fetch Helpers ── */

async function fetchSetting<T>(key: string, fallback: T): Promise<T> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .maybeSingle()

  if (error || !data) return fallback
  return { ...fallback, ...(data.value as Partial<T>) } as T
}

/* ── Public API ── */

export async function fetchPageToggles(): Promise<PageToggles> {
  return fetchSetting('page_toggles', defaultToggles)
}

export async function fetchExchangeRates(): Promise<ExchangeRates> {
  return fetchSetting('exchange_rates', defaultExchangeRates)
}

export async function fetchPaymentGateway(): Promise<PaymentGatewaySettings> {
  return fetchSetting('payment_gateway_settings', defaultPaymentGateway)
}

export async function fetchAffiliateWithdrawal(): Promise<AffiliateWithdrawalSettings> {
  return fetchSetting('affiliate_withdrawal_settings', defaultAffiliateWithdrawal)
}

export async function fetchStreakSettings(): Promise<Record<string, PlanStreakSettings>> {
  return fetchSetting('streak_settings', defaultStreakSettings)
}

export async function fetchReferralSettings() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'referral_settings')
    .maybeSingle()

  if (error || !data) return {
    nigerianReferralPercent: 25,
    crossReferralRewards: {
      free: 0, starter: 0.50, pro: 1.50, elite: 3.00, vip: 5.00, executive: 7.00, platinum: 10.00
    },
    swapEnabledForNigerians: true
  }
  return data.value as any
}

export async function fetchUsdtAddresses(): Promise<string[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'usdt_addresses')
    .maybeSingle()

  if (error || !data) return ['TRxxxxxxxxx1']
  return data.value as string[]
}

export async function fetchMonetizationRate(): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'monetization_rate')
    .maybeSingle()

  if (error || !data) return 100
  return Number((data.value as Record<string, any>)?.rate || 100)
}
