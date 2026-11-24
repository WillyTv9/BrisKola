"use client"

import { PlusIcon } from "lucide-react"

import { PlayerAvatar } from "@/components/briscola/player-avatar"
import { Scoreboard } from "@/components/briscola/scoreboard"
import { useStore } from "@/components/briscola/store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { asset } from "@/lib/utils"
import { formatWhen, MODE_META, playerRecord, resultLabel, standingLabel } from "@/lib/game"

export function HomeView({
  onNew,
  onOpen,
}: {
  onNew: () => void
  onOpen: (id: string) => void
}) {
  const { players, matches } = useStore()
  const live = matches.filter((match) => match.status === "live")
  const finished = matches.filter((match) => match.status === "finished")
  const ranking = players
    .map((player) => ({ player, ...playerRecord(player.id, matches) }))
    .filter((row) => row.played > 0)
    .sort((a, b) => b.wins - a.wins || b.points - a.points || a.player.name.localeCompare(b.player.name, "it"))

  return (
    <div className="flex flex-col gap-6 px-4 pb-6">
      <header className="flex items-center gap-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <img src={asset("/icon-192.png")} alt="" className="size-11 rounded-[0.8rem] shadow-sm ring-1 ring-foreground/10" />
        <div>
          <h1 className="text-xl font-semibold leading-none tracking-tight">
            Bris<span className="text-primary">Kola</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">I punti della briscola</p>
        </div>
      </header>

      <Button type="button" className="h-12" onClick={onNew}>
        <PlusIcon data-icon="inline-start" />
        Nuova partita
      </Button>

      {live.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">In corso</h2>
          {live.map((match) => (
            <Card key={match.id} size="sm">
              <button type="button" onClick={() => onOpen(match.id)} className="flex flex-col gap-3 px-4 text-left">
                <span className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2 text-sm font-medium">
                    <span className="live-dot size-2 rounded-full bg-gold" aria-hidden />
                    {MODE_META[match.mode].label}
                  </span>
                  <Badge variant="secondary">{MODE_META[match.mode].hint}</Badge>
                </span>
                <Scoreboard match={match} players={players} compact />
                <span className="text-xs text-muted-foreground">
                  {standingLabel(match, players)} · {match.hands.length} {match.hands.length === 1 ? "mano" : "mani"}
                </span>
              </button>
            </Card>
          ))}
        </section>
      ) : (
        <Empty className="border bg-card/60">
          <EmptyHeader>
            <EmptyTitle>Nessuna partita aperta</EmptyTitle>
            <EmptyDescription>Chiudi ogni mano scrivendo i punti: il totale fa sempre 120.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {ranking.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Classifica</h2>
          <Card size="sm">
            <ol className="flex flex-col px-4">
              {ranking.slice(0, 5).map((row, index) => (
                <li key={row.player.id} className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-4 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
                    <PlayerAvatar player={row.player} className="size-7" />
                    <span className="truncate text-sm font-medium">{row.player.name}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {row.wins} vinte · {row.played} giocate
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </section>
      ) : null}

      {finished.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">Ultime chiuse</h2>
          <ul className="flex flex-col gap-2">
            {finished.slice(0, 3).map((match) => (
              <li key={match.id}>
                <button
                  type="button"
                  onClick={() => onOpen(match.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl bg-card px-4 py-3 text-left ring-1 ring-foreground/10"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{resultLabel(match, players)}</span>
                    <span className="text-xs text-muted-foreground">
                      {MODE_META[match.mode].label} · {formatWhen(match.finishedAt ?? match.createdAt)}
                    </span>
                  </span>
                  <Badge variant="outline">{match.hands.length}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-xs text-muted-foreground">Su iPhone: Safari, Condividi, Aggiungi a Home. I dati restano sul telefono.</p>
      )}
    </div>
  )
}
