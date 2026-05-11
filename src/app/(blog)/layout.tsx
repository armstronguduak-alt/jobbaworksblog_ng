import { createClient } from '@/lib/supabase/server'
import { BlogHeader } from '@/components/client/BlogHeader'
import { Footer } from '@/components/server/Footer'

export default async function BlogLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch categories server-side — cached, no useEffect
  const supabase = await createClient()
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  // Fetch page toggles server-side
  const { data: toggleData } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', 'page_toggles')
    .maybeSingle()

  const pageToggles = toggleData?.value as any || { blogEnabled: true, storiesEnabled: true }

  return (
    <div className="min-h-screen bg-surface text-on-surface antialiased flex flex-col font-body">
      {/* Client island: interactive header (search, menu, profile) */}
      <BlogHeader
        categories={categories || []}
        storiesEnabled={pageToggles.storiesEnabled !== false}
      />

      {/* Server-rendered content area */}
      {pageToggles.blogEnabled === false ? (
        <div className="flex-grow flex flex-col items-center justify-center min-h-[60vh] px-4 text-center bg-[#f8faf9]">
          <div className="w-20 h-20 rounded-3xl bg-amber-100 flex items-center justify-center mb-6 mx-auto">
            <span className="material-symbols-outlined text-amber-500 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>construction</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3">Blog Under Maintenance</h2>
          <p className="text-slate-500 max-w-md leading-relaxed text-sm mb-6">
            Our blog is temporarily unavailable while we make improvements. Please check back soon!
          </p>
        </div>
      ) : (
        <div className="flex-grow flex flex-col w-full bg-[#f8faf9]">
          {children}
        </div>
      )}

      {/* Server-rendered footer — zero client JS */}
      <Footer />
    </div>
  )
}
