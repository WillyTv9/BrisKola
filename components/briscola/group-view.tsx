"use client"

import { ChevronLeftIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { Delta, FormStrip, OutcomeChip } from "@/components/briscola/data-bits"
import { PlayerAvatar } from "@/components/briscola/player-avatar"
import { SeriesChart } from "@/components/briscola/series-chart"
import { useStore } from "@/components/briscola/store"
import { Button } from "@/components/ui/button"
import { formatDay, formatWhen, groupStats, groupTitle, pairGroups, scoreModeOf, sideLabel } from "@/lib/game"
import type { GroupRow, Outcome } from "@/lib/game"
import { cn } from "@/lib/utils"

const RESULT_FILTERS: { id: "tutte" | Outcome; label: string }[] = [
  { id: "tutte", label: "Tutte" },
  { id: "V", label: "Vinte" },
  { id: "P", label: "Perse" },
  { id: "N", label: "Pari" },
]

export function GroupView({
  groupKey,
  onBack,
  onOpen,
}: {
  groupKey: string
  onBack: () => void
  onOpen: (id: string) => void
}) {
  const { matches, players } = useStore()
  const group = useMemo(() => pairGroups(matches).find((item) => item.key === groupKey), [matches, groupKey])
  const stats = useMemo(() => (group ? groupStats(group, players) : null), [group, players])
  const [resultFilter, setResultFilter] = useState<"tutte" | Outcome>("tutte")
  const [newestFirst, setNewestFirst] = useState(true)
  const [open, setOpen] = useState<string | null>(null)

  if (!group || !stats) {
    return (
      <div className="px-4 pt-6">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ChevronLeftIcon data-icon="inline-start" />
          Storico
        </Button>
        <p className="mt-6 text-sm text-muted-foreground">Questo gruppo non ha più partite.</p>
      </div>
    )
  }

  const members = group.memberIds.map(
    (id) => players.find((player) => player.id === id) ?? { id, name: "Giocatore", createdAt: 0 },
  )
  const coppia = group.kind === "coppia"
  const visible = stats.rows
    .filter((row) => resultFilter === "tutte" || row.outcome === resultFilter)
    .sort((a, b) => (newestFirst ? b.n - a.n : a.n - b.n))
  const streakText = stats.streak
    ? `${stats.streak.length}${stats.streak.outcome}`
    : "–"

  const kpis: { label: string; value: React.ReactNode }[] = [
    { label: "Partite", value: stats.played },
    {
      label: "V-P-N",
      value: (
        <>
          <span className="text-pos">{stats.wins}</span>-<span className="text-neg">{stats.losses}</span>-{stats.draws}
        </>
      ),
    },
    { label: "Vinte", value: `${stats.winPct}%` },
    { label: "Δ punti", value: <Delta value={stats.diff} /> },
    {
      label: "Serie",
      value: (
        <span className={cn(stats.streak?.outcome === "V" && "text-pos", stats.streak?.outcome === "P" && "text-neg")}>
          {streakText}
        </span>
      ),
    },
    { label: "Miglior serie V", value: stats.bestWinStreak },
    { label: "Mani vinte", value: `${stats.pointsFor}–${stats.pointsAgainst}` },
    { label: "Carte", value: `${stats.cardsFor}–${stats.cardsAgainst}` },
    { label: "Mani", value: stats.handsPlayed },
  ]

  return (
    <div className="flex flex-col gap-4 px-4 pb-8">
      <header className="sticky top-0 z-20 -mx-4 border-b bg-background/92 px-2 pt-[max(0.25rem,env(safe-area-inset-top))] pb-2 backdrop-blur-md">
        <Button type="button" variant="ghost" className="h-11" onClick={onBack}>
          <ChevronLeftIcon data-icon="inline-start" />
          Storico
        </Button>
        <div className="flex items-center gap-2 px-3">
          <span className="flex -space-x-2">
            {members.map((member) => (
              <PlayerAvatar key={member.id} player={member} className="size-9 ring-2 ring-background" />
            ))}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{groupTitle(group, players)}</h1>
            <p className="text-xs text-muted-foreground">
              {coppia ? "Coppia" : group.kind === "sfida" ? "Sfida" : "Tavolo in tre"} · {stats.played}{" "}
              {stats.played === 1 ? "partita chiusa" : "partite chiuse"}
            </p>
          </div>
        </div>
      </header>

      {stats.live.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          {stats.live.map((match) => (
            <button
              key={match.id}
              type="button"
              onClick={() => onOpen(match.id)}
              className="flex items-center justify-between rounded-lg bg-card px-3 py-2.5 text-left text-sm ring-1 ring-gold/60"
            >
              <span className="flex items-center gap-2">
                <span className="live-dot size-2 rounded-full bg-gold" aria-hidden />
                Partita in corso · {match.hands.length} {match.hands.length === 1 ? "mano" : "mani"}
              </span>
              <span className="text-xs text-muted-foreground">Apri</span>
            </button>
          ))}
        </section>
      ) : null}

      {stats.played === 0 ? (
        <p className="text-sm text-muted-foreground">Nessuna partita chiusa per questo gruppo.</p>
      ) : (
        <>
          <section className="grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-border ring-1 ring-foreground/10">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="bg-card px-3 py-2.5">
                <p className="tbl-head text-[10px] uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
                <p className="tbl whitespace-nowrap text-base font-semibold leading-tight">{kpi.value}</p>
              </div>
            ))}
          </section>

          <section className="flex flex-col gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium">Andamento</h2>
              <FormStrip form={stats.rows.slice(-20).map((row) => row.outcome)} size="md" />
            </div>
            <SeriesChart rows={stats.rows} />
            <p className="text-[10px] text-muted-foreground">
              Δ = mani vinte da {coppia ? "questa coppia" : members[0]?.name} meno il migliore degli avversari. Barre verdi: vinte, rosse: perse.
            </p>
          </section>

          {coppia && stats.opponents.length > 0 ? (
            <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
              <h2 className="border-b bg-secondary/60 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Contro chi
              </h2>
              <ul>
                {stats.opponents.map((opponent) => (
                  <li
                    key={opponent.key}
                    className="grid grid-cols-[minmax(0,1fr)_1.75rem_3.5rem_2.5rem] items-center gap-x-2 border-b px-3 py-2.5 last:border-0"
                  >
                    <span className="truncate text-[13px]">{opponent.names.join(" · ")}</span>
                    <span className="tbl text-right text-[13px]">{opponent.played}</span>
                    <span className="tbl text-right text-[12px]">
                      <span className="text-pos">{opponent.wins}</span>-<span className="text-neg">{opponent.losses}</span>-
                      {opponent.draws}
                    </span>
                    <span className="text-right text-[13px]">
                      <Delta value={opponent.diff} />
                    </span>
                  </li>
                ))}
              </ul>
              <p className="border-t bg-secondary/40 px-3 py-2 text-[10px] text-muted-foreground">
                Partite, V-P-N e Δ contro ogni coppia avversaria.
              </p>
            </section>
          ) : null}

          <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
            <div className="flex items-center justify-between gap-2 border-b bg-secondary/60 px-2 py-1.5">
              <div className="flex gap-1">
                {RESULT_FILTERS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={resultFilter === item.id}
                    onClick={() => setResultFilter(item.id)}
                    className={cn(
                      "h-8 rounded-md px-2.5 text-[11px] font-medium",
                      resultFilter === item.id ? "bg-background text-foreground shadow-xs" : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setNewestFirst((value) => !value)}
                className="h-8 rounded-md px-2 text-[11px] font-medium text-muted-foreground"
              >
                {newestFirst ? "Recenti ↓" : "Vecchie ↑"}
              </button>
            </div>

            <div className="tbl-head grid grid-cols-[1.75rem_3rem_1.5rem_minmax(0,1fr)_2.25rem_2.5rem] items-center gap-x-2 border-b px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              <span>#</span>
              <span>Data</span>
              <span />
              <span>{coppia ? "Punti (noi–loro)" : `Punti (${members.map((m) => m.name.split(" ")[0]).join("–")})`}</span>
              <span className="text-right">Δ</span>
              <span className="text-right">Σ</span>
            </div>

            {visible.length === 0 ? (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">Nessuna partita con questo filtro.</p>
            ) : (
              <ul>
                {visible.map((row) => (
                  <MatchRow
                    key={row.match.id + row.ownSideId}
                    row={row}
                    coppia={coppia}
                    expanded={open === row.match.id}
                    onToggle={() => setOpen(open === row.match.id ? null : row.match.id)}
                    onOpen={() => onOpen(row.match.id)}
                  />
                ))}
              </ul>
            )}
            <p className="border-t bg-secondary/40 px-3 py-2 text-[10px] text-muted-foreground">
              Tocca una riga per vedere le mani. Σ è il Δ cumulato. La c accanto al punteggio indica una partita contata a carte (il Δ conta sempre le mani vinte).
            </p>
          </section>
        </>
      )}
    </div>
  )
}

function MatchRow({
  row,
  coppia,
  expanded,
  onToggle,
  onOpen,
}: {
  row: GroupRow
  coppia: boolean
  expanded: boolean
  onToggle: () => void
  onOpen: () => void
}) {
  const { players } = useStore()
  const { match } = row
  const others = match.sides.filter((side) => side.id !== row.ownSideId)
  const orderedOthers = coppia
    ? others
    : [...others].sort((a, b) => row.opponents.indexOf(sideLabel(a, players)) - row.opponents.indexOf(sideLabel(b, players)))

  return (
    <li className="border-b last:border-0">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className={cn(
          "grid min-h-12 w-full grid-cols-[1.75rem_3rem_1.5rem_minmax(0,1fr)_2.25rem_2.5rem] items-center gap-x-2 px-3 py-1.5 text-left active:bg-secondary/60",
          expanded && "bg-secondary/40",
        )}
      >
        <span className="tbl text-[11px] text-muted-foreground">{row.n}</span>
        <span className="tbl text-[11px] text-muted-foreground">{formatDay(match.finishedAt ?? match.createdAt).slice(0, 5)}</span>
        <OutcomeChip outcome={row.outcome} />
        <span className="min-w-0">
          <span className="tbl block text-[14px] font-semibold">
            {row.scores.join("–")}
            {row.carteMode ? <span className="ml-1 text-[10px] font-normal text-muted-foreground">c</span> : null}
          </span>
          {coppia ? (
            <span className="block truncate text-[10px] text-muted-foreground">vs {row.opponents.join(" · ")}</span>
          ) : null}
        </span>
        <span className="text-right text-[13px]">
          <Delta value={row.diff} />
        </span>
        <span className="flex items-center justify-end gap-0.5 text-[12px]">
          <Delta value={row.cum} />
        </span>
      </button>

      {expanded ? (
        <div className="bg-secondary/30 px-3 pb-3 pt-2">
          <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>
              {formatWhen(match.createdAt)} · {match.hands.length} {match.hands.length === 1 ? "mano" : "mani"} ·{" "}
              {scoreModeOf(match) === "carte" ? "a carte" : "a mani"} · carte {row.cards.join("–")}
            </span>
          </div>
          <table className="tbl w-full text-[12px]">
            <thead className="tbl-head text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="py-1 text-left font-medium">Mano</th>
                <th className="py-1 text-right font-medium">Carte</th>
                <th className="py-1 text-right font-medium">Punto</th>
              </tr>
            </thead>
            <tbody>
              {match.hands.map((hand, index) => {
                const ownCards = hand.scores[row.ownSideId] ?? 0
                const otherCards = orderedOthers.map((side) => hand.scores[side.id] ?? 0)
                const best = Math.max(...otherCards)
                const result: Outcome = ownCards > best ? "V" : ownCards < best ? "P" : "N"
                const cappotto = ownCards === 120 || best === 120
                return (
                  <tr key={hand.id} className="border-t border-border/70">
                    <td className="py-1.5 text-muted-foreground">{index + 1}</td>
                    <td className="py-1.5 text-right">{[ownCards, ...otherCards].join("–")}</td>
                    <td className="py-1.5">
                      <span className="flex items-center justify-end gap-1.5">
                        {cappotto ? <span className="text-[10px] text-gold">cappotto</span> : null}
                        <OutcomeChip outcome={result} />
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <Button type="button" variant="outline" className="mt-2 h-10 w-full" onClick={onOpen}>
            Apri partita
          </Button>
        </div>
      ) : null}
    </li>
  )
}
