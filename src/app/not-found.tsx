import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
      <div className="w-20 h-20 rounded-3xl bg-surface-container-high flex items-center justify-center mb-6 mx-auto shadow-sm">
        <span className="material-symbols-outlined text-outline text-4xl">search_off</span>
      </div>
      <h1 className="text-3xl md:text-4xl font-black text-on-surface mb-3 font-headline">
        Page not found
      </h1>
      <p className="text-on-surface-variant max-w-md leading-relaxed text-sm md:text-base mb-8">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="flex gap-4">
        <Link
          href="/"
          className="px-6 py-3 bg-primary text-white font-bold rounded-xl shadow-md hover:bg-emerald-800 transition-colors"
        >
          Go Home
        </Link>
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-surface-container text-on-surface font-bold rounded-xl border border-surface-container-high hover:bg-surface-variant transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  )
}
