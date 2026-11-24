import type { GroupRow } from "@/lib/game"
import { signed } from "@/lib/game"

const W = 320

/** Δ per partita (barre) e Δ cumulato (linea) su una sola riga temporale: leggibile anche con 30+ partite. */
export function SeriesChart({ rows }: { rows: GroupRow[] }) {
  if (rows.length === 0) return null
  const barH = 64
  const lineH = 72
  const padX = 4
  const n = rows.length
  const slot = (W - padX * 2) / n
  const barW = Math.max(2, Math.min(14, slot - 2))

  const maxAbs = Math.max(1, ...rows.map((row) => Math.abs(row.diff)))
  const mid = barH / 2

  const cums = rows.map((row) => row.cum)
  const lo = Math.min(0, ...cums)
  const hi = Math.max(0, ...cums)
  const span = Math.max(1, hi - lo)
  const y = (value: number) => 4 + (1 - (value - lo) / span) * (lineH - 8)
  const x = (index: number) => padX + slot * index + slot / 2
  const path = rows.map((row, index) => `${index === 0 ? "M" : "L"}${x(index).toFixed(1)} ${y(row.cum).toFixed(1)}`).join(" ")
  const last = rows[rows.length - 1]

  return (
    <div className="flex flex-col gap-3">
      <figure className="flex flex-col gap-1">
        <figcaption className="flex items-baseline justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>Δ per partita</span>
          <span className="tbl normal-case">±{maxAbs}</span>
        </figcaption>
        <svg viewBox={`0 0 ${W} ${barH}`} className="h-16 w-full" role="img" aria-label="Differenza punti per ogni partita">
          <line x1="0" x2={W} y1={mid} y2={mid} className="stroke-border" strokeWidth="1" />
          {rows.map((row, index) => {
            const h = (Math.abs(row.diff) / maxAbs) * (mid - 3)
            const up = row.diff >= 0
            return (
              <rect
                key={row.match.id + row.ownSideId}
                x={x(index) - barW / 2}
                y={row.diff === 0 ? mid - 1 : up ? mid - h : mid}
                width={barW}
                height={row.diff === 0 ? 2 : Math.max(2, h)}
                rx="1"
                className={row.diff > 0 ? "fill-pos" : row.diff < 0 ? "fill-neg" : "fill-muted-foreground/50"}
              />
            )
          })}
        </svg>
      </figure>
      <figure className="flex flex-col gap-1">
        <figcaption className="flex items-baseline justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
          <span>Δ cumulato</span>
          <span className="tbl normal-case text-foreground">{signed(last.cum)}</span>
        </figcaption>
        <svg viewBox={`0 0 ${W} ${lineH}`} className="h-[4.5rem] w-full" role="img" aria-label="Differenza punti cumulata">
          <line x1="0" x2={W} y1={y(0)} y2={y(0)} className="stroke-border" strokeWidth="1" strokeDasharray="3 3" />
          <path d={path} fill="none" className="stroke-primary" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(n - 1)} cy={y(last.cum)} r="3" className="fill-primary" />
        </svg>
        <p className="flex justify-between text-[10px] text-muted-foreground">
          <span>Partita 1</span>
          <span>Partita {n}</span>
        </p>
      </figure>
    </div>
  )
}
