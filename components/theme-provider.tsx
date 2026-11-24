"use client"

import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import { useEffect } from "react"

function ThemeColor() {
  const { resolvedTheme } = useTheme()

  useEffect(() => {
    const color = resolvedTheme === "dark" ? "#1c1a17" : "#f3efe6"
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.setAttribute("content", color)
    })
  }, [resolvedTheme])

  return null
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeColor />
      {children}
    </NextThemesProvider>
  )
}
