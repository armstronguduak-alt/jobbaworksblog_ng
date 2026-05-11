import { DashboardClient } from '@/components/client/dashboard/DashboardClient'
import { fetchReferralSettings, fetchStreakSettings } from '@/lib/data/settings'

export const metadata = {
  title: 'Dashboard - JobbaWorks',
  description: 'View your JobbaWorks earnings, streaks, and account statistics.',
}

export default async function DashboardPage() {
  const [referralSettings, streakSettings] = await Promise.all([
    fetchReferralSettings(),
    fetchStreakSettings()
  ])

  return (
    <DashboardClient 
      referralSettings={referralSettings} 
      streakSettings={streakSettings} 
    />
  )
}
