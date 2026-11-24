import { PlayerAvatar } from "@/components/briscola/player-avatar"
import { Badge } from "@/components/ui/badge"
import { leaders, pointsOf, scoreModeOf, sideLabel, totals } from "@/lib/game"
import type { Match, Player } from "@/lib/types"
import { cn } from "@/lib/utils"

const tones = ["bg-chart-1", "bg-chart-2", "bg-chart-3"]

function Tally({ value }: { value: number }) {
  if (value <= 0 || value > 16) return null
  const blocs = Math.floor(value / 5)
  const rest = value % 5
  return (
    <span className="mt-1 flex flex-wrap gap-1.5 pl-2" aria-hidden>
      {Array.from({ length: blocs }, (_, index) => (
        <Bloc key={`b-${index}`} count={5} />
      ))}
      {rest > 0 ? <Bloc count={rest} /> : null}
    </span>
  )
}

function Bloc({ count }: { count: number }) {
  return (
    <span className="relative inline-flex h-4 items-end gap-[3px]">
      {Array.from({ length: Math.min(count, 4) }, (_, index) => (
        <span key={index} className="h-4 w-px bg-foreground/70" />
      ))}
      {count === 5 ? <span className="absolute inset-0 border-t border-foreground/70 origin-center rotate-[-62deg]" /> : null}
    </span>
  )
}

export function Scoreboard({
  match,
  players,
  compact = false,
}: {
  match: Match
  players: Player[]
  compact?: boolean
}) {
  const score = pointsOf(match)
  const cards = totals(match)
  const lead = leaders(match)
  const mani = scoreModeOf(match) === "mani"

  return (
    <div className={cn("grid gap-2", match.sides.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
      {match.sides.map((side, index) => {
        const ahead = lead.length === 1 && lead[0] === side.id
        const tied = lead.length > 1 && lead.includes(side.id)
        const people = side.players.map(
          (seat) => players.find((player) => player.id === seat.id) ?? { id: seat.id, name: seat.name, createdAt: 0 },
        )
        return (
          <div
            key={side.id}
            className={cn(
              "relative min-w-0 overflow-hidden rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10",
              ahead && "ring-gold/70",
              compact && "px-2.5 py-2.5",
            )}
          >
            <span className={cn("absolute inset-y-3 left-0 w-1 rounded-full", tones[index])} aria-hidden />
            <span className="flex min-w-0 items-center gap-1.5 pl-2">
              {people.slice(0, 2).map((person) => (
                <PlayerAvatar key={person.id} player={person} className={compact ? "size-5" : "size-6"} />
              ))}
              <span className="truncate text-xs text-muted-foreground">{sideLabel(side, players)}</span>
            </span>
            <p
              key={`${side.id}-${score[side.id]}-${match.scoreMode}`}
              className={cn(
                "score-pop pl-2 font-semibold tabular-nums tracking-tight",
                compact ? "text-2xl" : "text-4xl",
                match.sides.length === 3 && !compact && "text-3xl",
              )}
            >
              {score[side.id] ?? 0}
            </p>
            {!compact && mani ? <Tally value={score[side.id] ?? 0} /> : null}
            {!compact ? (
              <p className="mt-1 pl-2 text-[11px] tabular-nums text-muted-foreground">
                {mani ? `${cards[side.id] ?? 0} carte` : "punti carta"}
              </p>
            ) : null}
            {!compact && ahead ? (
              <Badge className="mt-1 ml-2" variant="secondary">
                In testa
              </Badge>
            ) : null}
            {!compact && tied ? (
              <Badge className="mt-1 ml-2" variant="outline">
                Pari
              </Badge>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
