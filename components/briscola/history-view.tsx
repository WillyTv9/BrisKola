"use client"

import { ArrowDownIcon, ArrowUpIcon, SearchIcon } from "lucide-react"
import { useMemo, useState } from "react"

import { Delta, FormStrip } from "@/components/briscola/data-bits"
import { useStore } from "@/components/briscola/store"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import { formatDay, groupStats, groupTitle, MODE_META, pairGroups, pointsOf, resultLabel, sideLabel } from "@/lib/game"
import { cn } from "@/lib/utils"

const filters = [
  { id: "coppia", label: "Coppie" },
  { id: "sfida", label: "Sfide" },
  { id: "trio", label: "In tre" },
  { id: "tutte", label: "Partite" },
] as const

type SortKey = "last" | "played" | "win" | "diff"

export function HistoryView({
  onOpen,
  onGroup,
}: {
  onOpen: (id: string) => void
  onGroup: (key: string) => void
}) {
  const { matches, players } = useStore()
  const [filter, setFilter] = useState<(typeof filters)[number]["id"]>("coppia")
  const [query, setQuery] = useState("")
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "last", dir: -1 })

  const rows = useMemo(() => {
    if (filter === "tutte") return []
    const needle = query.trim().toLocaleLowerCase("it")
    return pairGroups(matches)
      .filter((group) => group.kind === filter)
      .map((group) => ({
        group,
        title: groupTitle(group, players),
        stats: groupStats(group, players),
        last: group.matches[group.matches.length - 1]?.match.createdAt ?? 0,
      }))
      .filter((row) => row.stats.played > 0 || row.stats.live.length > 0)
      .filter((row) => needle === "" || row.title.toLocaleLowerCase("it").includes(needle))
      .sort((a, b) => {
        const va = sort.key === "last" ? a.last : sort.key === "played" ? a.stats.played : sort.key === "win" ? a.stats.winPct : a.stats.diff
        const vb = sort.key === "last" ? b.last : sort.key === "played" ? b.stats.played : sort.key === "win" ? b.stats.winPct : b.stats.diff
        return (va - vb) * sort.dir || b.last - a.last
      })
  }, [filter, matches, players, query, sort])

  const finished = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("it")
    return matches
      .filter((match) => match.status === "finished" && match.hands.length > 0)
      .filter(
        (match) =>
          needle === "" ||
          match.sides.some((side) => sideLabel(side, players).toLocaleLowerCase("it").includes(needle)),
      )
      .sort((a, b) => (b.finishedAt ?? b.createdAt) - (a.finishedAt ?? a.createdAt))
  }, [matches, players, query])

  function toggle(key: SortKey) {
    setSort((current) => (current.key === key ? { key, dir: (current.dir * -1) as 1 | -1 } : { key, dir: -1 }))
  }

  return (
    <div className="flex flex-col gap-3 px-4 pb-6">
      <header className="pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="text-lg font-semibold tracking-tight">Storico</h1>
      </header>

      <div className="flex gap-1 rounded-lg bg-secondary p-1">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
            className={cn(
              "h-9 flex-1 rounded-md text-xs font-medium",
              filter === item.id ? "bg-background text-foreground shadow-xs" : "text-muted-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <label className="flex h-11 items-center gap-2 rounded-lg bg-card px-3 ring-1 ring-foreground/10 focus-within:ring-2 focus-within:ring-primary">
        <SearchIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cerca un giocatore"
          aria-label="Cerca un giocatore"
          autoCapitalize="none"
          autoCorrect="off"
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </label>

      {filter === "tutte" ? (
        finished.length === 0 ? (
          <EmptyState text="Le partite terminate restano qui, una riga per partita." />
        ) : (
          <MatchTable
            matches={finished}
            onOpen={onOpen}
          />
        )
      ) : rows.length === 0 ? (
        <EmptyState
          text={
            query
              ? "Nessun risultato per questa ricerca."
              : "Quando chiudi una partita, la coppia o la sfida compare qui con i suoi numeri."
          }
        />
      ) : (
        <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
          <div className="tbl-head grid grid-cols-[minmax(0,1fr)_1.75rem_3.5rem_2.5rem_3.25rem] items-center gap-x-2 border-b bg-secondary/60 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            <SortHead label="Gruppo" active={sort.key === "last"} dir={sort.dir} onClick={() => toggle("last")} align="left" />
            <SortHead label="P" active={sort.key === "played"} dir={sort.dir} onClick={() => toggle("played")} />
            <SortHead label="V-P-N" active={sort.key === "win"} dir={sort.dir} onClick={() => toggle("win")} />
            <SortHead label="Δ" active={sort.key === "diff"} dir={sort.dir} onClick={() => toggle("diff")} />
            <span className="text-right">Forma</span>
          </div>
          <ul>
            {rows.map(({ group, title, stats, last }) => (
              <li key={group.key} className="border-b last:border-0">
                <button
                  type="button"
                  onClick={() => onGroup(group.key)}
                  className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_1.75rem_3.5rem_2.5rem_3.25rem] items-center gap-x-2 px-3 py-2 text-left active:bg-secondary/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{title}</span>
                    <span className="tbl block truncate text-[10px] text-muted-foreground">
                      {formatDay(last)}
                      {stats.live.length > 0 ? " · in corso" : ""}
                    </span>
                  </span>
                  <span className="tbl text-right text-[13px]">{stats.played}</span>
                  <span className="tbl text-right text-[12px]">
                    <span className="text-pos">{stats.wins}</span>
                    <span className="text-muted-foreground">-</span>
                    <span className="text-neg">{stats.losses}</span>
                    <span className="text-muted-foreground">-{stats.draws}</span>
                  </span>
                  <span className="text-right text-[13px]">
                    <Delta value={stats.diff} />
                  </span>
                  <span className="flex justify-end">
                    <FormStrip form={stats.form.slice(-5)} />
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t bg-secondary/40 px-3 py-2 text-[10px] text-muted-foreground">
            P partite · V-P-N vinte, perse, pari · Δ punti partita presi meno concessi · Forma: ultime 5
          </p>
        </section>
      )}
    </div>
  )
}

function SortHead({
  label,
  active,
  dir,
  onClick,
  align = "right",
}: {
  label: string
  active: boolean
  dir: 1 | -1
  onClick: () => void
  align?: "left" | "right"
}) {
  const Icon = dir === -1 ? ArrowDownIcon : ArrowUpIcon
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex h-7 items-center gap-0.5", align === "right" ? "justify-end" : "justify-start", active && "text-foreground")}
    >
      {label}
      {active ? <Icon aria-hidden className="size-3" /> : null}
    </button>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <Empty className="border bg-card/60">
      <EmptyHeader>
        <EmptyTitle>Ancora vuoto</EmptyTitle>
        <EmptyDescription>{text}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function MatchTable({ matches, onOpen }: { matches: ReturnType<typeof useStore>["matches"]; onOpen: (id: string) => void }) {
  const { players } = useStore()
  return (
    <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="tbl-head grid grid-cols-[3.25rem_minmax(0,1fr)_2.5rem] items-center gap-x-2 border-b bg-secondary/60 px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Data</span>
        <span>Partita</span>
        <span className="text-right">Mani</span>
      </div>
      <ul>
        {matches.map((match) => {
          const points = pointsOf(match)
          const lead = match.sides.filter((side) => points[side.id] === Math.max(...match.sides.map((s) => points[s.id] ?? 0)))
          return (
            <li key={match.id} className="border-b last:border-0">
              <button
                type="button"
                onClick={() => onOpen(match.id)}
                className="grid min-h-14 w-full grid-cols-[3.25rem_minmax(0,1fr)_2.5rem] items-center gap-x-2 px-3 py-2 text-left active:bg-secondary/60"
              >
                <span className="tbl text-[11px] text-muted-foreground">
                  {formatDay(match.finishedAt ?? match.createdAt).slice(0, 5)}
                </span>
                <span className="min-w-0">
                  <span className="flex flex-col gap-0.5">
                    {match.sides.map((side) => {
                      const winning = lead.length === 1 && lead[0].id === side.id
                      return (
                        <span key={side.id} className="flex items-baseline justify-between gap-2">
                          <span className={cn("truncate text-[13px]", winning ? "font-semibold" : "text-muted-foreground")}>
                            {sideLabel(side, players)}
                          </span>
                          <span className={cn("tbl text-[13px]", winning ? "font-semibold" : "text-muted-foreground")}>
                            {points[side.id] ?? 0}
                          </span>
                        </span>
                      )
                    })}
                  </span>
                  <span className="sr-only">{resultLabel(match, players)}</span>
                </span>
                <span className="tbl text-right text-[12px] text-muted-foreground">
                  {match.hands.length}
                  <span className="block text-[9px] uppercase">{MODE_META[match.mode].label.slice(0, 3)}</span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
