import { DashboardNavigation } from '@/components/client/dashboard/DashboardNavigation'
import { DashboardClientWrapper } from '@/components/client/dashboard/DashboardClientWrapper'
import { Footer } from '@/components/server/Footer'
import { fetchPageToggles } from '@/lib/data/settings'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pageToggles = await fetchPageToggles()

  return (
    <DashboardClientWrapper>
      <div className="min-h-screen bg-surface text-on-surface antialiased flex flex-col font-body">
        <DashboardNavigation pageToggles={pageToggles} />

        {/* Main page content */}
        <div className="flex-grow flex flex-col items-center w-full bg-surface-container-lowest">
          {children}
        </div>

        <Footer />
      </div>
    </DashboardClientWrapper>
  )
}
