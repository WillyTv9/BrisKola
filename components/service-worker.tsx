"use client"

import { useEffect } from "react"

// Registra il service worker: dopo la prima apertura l'app si carica anche senza rete.
// Chiede anche al browser di non cancellare i dati salvati.
export function ServiceWorker() {
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
    if ("serviceWorker" in navigator && window.isSecureContext) {
      navigator.serviceWorker.register(`${base}/sw.js`, { scope: `${base}/` }).catch(() => {})
    }
    navigator.storage?.persist?.().catch(() => {})
  }, [])
  return null
}
