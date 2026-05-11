import type { Metadata } from "next"
import { Plus_Jakarta_Sans, Inter } from "next/font/google"
import "./globals.css"
import { AuthProvider } from "@/components/client/AuthProvider"
import { QueryProvider } from "@/components/client/QueryProvider"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-headline",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

export const metadata: Metadata = {
  title: {
    default: "JobbaWorks — Read, Earn & Grow",
    template: "%s | JobbaWorks",
  },
  description:
    "Your daily platform for professional growth and passive earnings. Read articles, complete tasks, and earn rewards.",
  metadataBase: new URL("https://jobbaworks.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "JobbaWorks",
    title: "JobbaWorks — Read, Earn & Grow",
    description:
      "Your daily platform for professional growth and passive earnings.",
  },
  twitter: {
    card: "summary_large_image",
    title: "JobbaWorks",
    description:
      "Your daily platform for professional growth and passive earnings.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${jakarta.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Material Symbols */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body bg-background text-on-background antialiased">
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
