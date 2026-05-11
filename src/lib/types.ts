/* ── Core Database Types ── */

export interface Profile {
  user_id: string;
  username: string;
  name: string;
  email: string;
  avatar_url: string;
  bio: string;
  phone: string;
  gender: string;
  country: string;
  country_code: string;
  is_global: boolean;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  created_at: string;
}

export interface Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image: string;
  author_user_id: string;
  category_id: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  views: number;
  likes: number;
  read_time: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  published_at: string;
  // Joined relations
  category?: Category;
  author?: Pick<Profile, 'user_id' | 'username' | 'name' | 'avatar_url'>;
}

export interface WalletBalance {
  user_id: string;
  balance: number;
  total_earnings: number;
  referral_earnings: number;
  referral_usdt_balance: number;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'article_approved' | 'article_rejected' | 'story_approved' | 'story_rejected' | 'new_follower' | 'referral_bonus' | 'system';
  title: string;
  message: string;
  is_read: boolean;
  link?: string;
  created_at: string;
}

export interface Story {
  id: string;
  title: string;
  slug: string;
  synopsis: string;
  cover_image: string;
  author_user_id: string;
  genre: string;
  status: 'draft' | 'pending' | 'approved' | 'rejected';
  views: number;
  likes: number;
  chapter_count: number;
  created_at: string;
  author?: Pick<Profile, 'user_id' | 'username' | 'name' | 'avatar_url'>;
}

export interface Chapter {
  id: string;
  story_id: string;
  chapter_number: number;
  title: string;
  content: string;
  word_count: number;
  created_at: string;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  image_url: string;
  link: string;
  is_active: boolean;
  is_share_task: boolean;
  share_reward_amount: number;
  created_at: string;
}

/* ── Settings Types ── */

export interface PageToggles {
  leaderboardEnabled: boolean;
  swapEnabled: boolean;
  referralsEnabled: boolean;
  earningsEnabled: boolean;
  walletEnabled: boolean;
  promotionsEnabled: boolean;
  blogEnabled: boolean;
  storiesEnabled: boolean;
  leaderboardPublicEnabled: boolean;
  globalRegistrationEnabled: boolean;
}

export interface ExchangeRates {
  dollarPrice: number;
  swapFee: number;
  withdrawalFee: number;
}

export interface PaymentGatewaySettings {
  gatewayType: 'manual_usdt' | 'nowpayments';
  nowpaymentsApiKey: string;
  korapayApiKey: string;
}

export interface AffiliateWithdrawalSettings {
  minWithdrawalAmount: number;
  withdrawalFeePercent: number;
  processingTimeHours: number;
  requireReferrals: boolean;
  requiredReferralCount: number;
}

export interface PlanStreakSettings {
  weeklyTotalNgn: number;
  weeklyTotalUsd: number;
  enabled: boolean;
}
