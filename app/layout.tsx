import type { Metadata, Viewport } from "next"

import { Toaster } from "@/components/ui/sonner"
import { ServiceWorker } from "@/components/service-worker"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

export const metadata: Metadata = {
  title: "BrisKola",
  description: "Tieni i punti delle partite di briscola. Singolo, coppie o in tre. I dati restano sul telefono.",
  applicationName: "BrisKola",
  manifest: `${base}/manifest.webmanifest`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BrisKola",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: `${base}/icon-32.png`, type: "image/png", sizes: "32x32" }],
    apple: `${base}/apple-icon.png`,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3efe6" },
    { media: "(prefers-color-scheme: dark)", color: "#1c1a17" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="it" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ThemeProvider>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
        <ServiceWorker />
      </body>
    </html>
  )
}
