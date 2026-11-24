"use client"

import { HistoryIcon, HouseIcon, SettingsIcon } from "lucide-react"
import { useState } from "react"

import { HistoryView } from "@/components/briscola/history-view"
import { HomeView } from "@/components/briscola/home-view"
import { MatchView } from "@/components/briscola/match-view"
import { NewMatchView } from "@/components/briscola/new-match-view"
import { GroupView } from "@/components/briscola/group-view"
import { SettingsView } from "@/components/briscola/settings-view"
import { StoreProvider, useStore } from "@/components/briscola/store"
import { cn } from "@/lib/utils"

type Tab = "home" | "history" | "settings"
type Route =
  | { name: Tab }
  | { name: "new" }
  | { name: "match"; id: string; from: "home" | "history" }
  | { name: "group"; key: string }

const tabs: { id: Tab; label: string; icon: typeof HouseIcon }[] = [
  { id: "home", label: "Tavolo", icon: HouseIcon },
  { id: "history", label: "Storico", icon: HistoryIcon },
  { id: "settings", label: "Impostazioni", icon: SettingsIcon },
]

function Shell() {
  const { ready, unavailable } = useStore()
  const [route, setRoute] = useState<Route>({ name: "home" })
  const showNav = route.name === "home" || route.name === "history" || route.name === "settings"

  return (
    <div className="mx-auto min-h-dvh w-full max-w-lg bg-background sm:shadow-[0_0_0_1px_var(--border)]">
      {unavailable ? (
        <p className="bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
          Questo browser non può salvare i dati. Esci dalla navigazione privata e riapri la pagina.
        </p>
      ) : null}
      {!ready ? (
        <p className="px-4 pt-16 text-sm text-muted-foreground">Apro il tavolo…</p>
      ) : route.name === "new" ? (
        <NewMatchView
          onBack={() => setRoute({ name: "home" })}
          onCreated={(id) => setRoute({ name: "match", id, from: "home" })}
        />
      ) : route.name === "group" ? (
        <GroupView
          groupKey={route.key}
          onBack={() => setRoute({ name: "history" })}
          onOpen={(id) => setRoute({ name: "match", id, from: "history" })}
        />
      ) : route.name === "match" ? (
        <MatchView
          matchId={route.id}
          backLabel={route.from === "history" ? "Storico" : "Tavolo"}
          onBack={() => setRoute({ name: route.from })}
        />
      ) : (
        <main className={cn(showNav && "pb-[calc(4.5rem+env(safe-area-inset-bottom))]")}>
          {route.name === "home" ? (
            <HomeView
              onNew={() => setRoute({ name: "new" })}
              onOpen={(id) => setRoute({ name: "match", id, from: "home" })}
            />
          ) : null}
          {route.name === "history" ? (
            <HistoryView
              onOpen={(id) => setRoute({ name: "match", id, from: "history" })}
              onGroup={(key) => setRoute({ name: "group", key })}
            />
          ) : null}
          {route.name === "settings" ? <SettingsView /> : null}
        </main>
      )}
      {showNav && ready ? (
        <nav
          aria-label="Sezioni"
          className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full max-w-lg border-t bg-background/95 px-2 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur-md"
        >
          <ul className="grid grid-cols-3">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const current = route.name === tab.id
              return (
                <li key={tab.id}>
                  <button
                    type="button"
                    aria-current={current ? "page" : undefined}
                    onClick={() => setRoute({ name: tab.id })}
                    className={cn(
                      "flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-lg text-xs",
                      current ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <Icon aria-hidden className="size-5" />
                    {tab.label}
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      ) : null}
    </div>
  )
}

export function BriscolaApp() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
