"use client"

import { useEffect, useRef } from "react"

import { Button } from "@/components/ui/button"
import { handAwards, HAND_TOTAL, sideLabel } from "@/lib/game"
import type { Match, Player } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Inserimento punti a mano chiusa.
 * Si usa il tastierino numerico nativo del telefono: ogni lato ha il suo campo.
 * Una mano vale sempre 120: quando hai scritto tutti i lati tranne uno, l'ultimo si calcola da solo.
 */
export type Pad = {
  handId?: string
  /** testo digitato per lato */
  raw: Record<string, string>
  /** ordine in cui i lati sono stati toccati (l'ultimo è il più recente) */
  order: string[]
}

export function openPad(match: Match, handId?: string): Pad {
  const hand = match.hands.find((item) => item.id === handId)
  if (!hand) return { raw: {}, order: [] }
  const typed = match.sides.slice(0, match.sides.length - 1)
  const raw: Record<string, string> = {}
  for (const side of typed) raw[side.id] = String(hand.scores[side.id] ?? 0)
  return { handId, raw, order: typed.map((side) => side.id) }
}

type Resolved = {
  /** punti per lato, null se ancora ignoti */
  scores: Record<string, number | null>
  /** lato calcolato in automatico (se c'è) */
  autoId: string | null
  /** somma dei lati digitati sopra 120 */
  over: boolean
  complete: boolean
}

export function resolvePad(pad: Pad, match: Match): Resolved {
  const count = match.sides.length
  const typedIds = pad.order.filter((id, index) => pad.order.indexOf(id) === index).slice(-(count - 1))
  const scores: Record<string, number | null> = {}
  for (const side of match.sides) scores[side.id] = null
  for (const id of typedIds) {
    const raw = pad.raw[id] ?? ""
    scores[id] = raw === "" ? null : Number(raw)
  }
  const typedAll = typedIds.length === count - 1 && typedIds.every((id) => scores[id] !== null)
  const sum = typedIds.reduce((total, id) => total + (scores[id] ?? 0), 0)
  const autoSide = match.sides.find((side) => !typedIds.includes(side.id))
  let autoId: string | null = null
  let over = sum > HAND_TOTAL
  if (typedAll && autoSide && !over) {
    scores[autoSide.id] = HAND_TOTAL - sum
    autoId = autoSide.id
  }
  const complete = match.sides.every((side) => scores[side.id] !== null)
  return { scores, autoId, over, complete }
}

export function HandPad({
  match,
  players,
  pad,
  onChange,
  onCancel,
  onSave,
}: {
  match: Match
  players: Player[]
  pad: Pad
  onChange: (pad: Pad) => void
  onCancel: () => void
  onSave: (scores: Record<string, number>) => void
}) {
  const resolved = resolvePad(pad, match)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})
  const formRef = useRef<HTMLFormElement>(null)

  // Appena si apre, il primo campo prende il focus: la tastiera numerica resta su.
  useEffect(() => {
    const first = match.sides[0]
    if (first) inputs.current[first.id]?.focus()
    formRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function valueOf(sideId: string) {
    const typed = resolved.scores[sideId]
    if (sideId === resolved.autoId) return typed === null ? "" : String(typed)
    return pad.raw[sideId] ?? ""
  }

  function type(sideId: string, text: string) {
    const digits = text.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 3)
    if (digits !== "" && Number(digits) > HAND_TOTAL) return
    onChange({
      ...pad,
      raw: { ...pad.raw, [sideId]: digits },
      order: [...pad.order.filter((id) => id !== sideId), sideId],
    })
  }

  const awards = resolved.complete
    ? handAwards(match, Object.fromEntries(match.sides.map((side) => [side.id, resolved.scores[side.id] ?? 0])))
    : null
  const winner = awards ? match.sides.find((side) => (awards[side.id] ?? 0) > 0) : undefined
  const cappotto = winner ? awards![winner.id] === 2 : false

  let hint = "Scrivi i punti di un lato: l'altro si calcola da solo."
  if (match.sides.length === 3) hint = "Scrivi i punti di due lati: il terzo si calcola da solo."
  if (resolved.over) hint = `I punti superano ${HAND_TOTAL}. Correggi un valore.`
  else if (resolved.complete && winner)
    hint = cappotto
      ? `Cappotto per ${sideLabel(winner, players)}: vale 2.`
      : `Mano a ${sideLabel(winner, players)}: vale 1.`
  else if (resolved.complete) hint = "Mano pari: nessun punto assegnato."

  return (
    <form
      ref={formRef}
      className="hand-form flex flex-col gap-3 rounded-xl bg-card p-3 ring-1 ring-foreground/10"
      onSubmit={(event) => {
        event.preventDefault()
        if (!resolved.complete) return
        const next: Record<string, number> = {}
        for (const side of match.sides) next[side.id] = resolved.scores[side.id] ?? 0
        onSave(next)
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">{pad.handId ? "Correggi mano" : `Chiudi mano ${match.hands.length + 1}`}</h2>
        <span className="text-xs text-gold">Totale {HAND_TOTAL}</span>
      </div>

      <div className="flex flex-col gap-2">
        {match.sides.map((side) => {
          const auto = side.id === resolved.autoId
          return (
            <label
              key={side.id}
              className={cn(
                "flex items-center gap-3 rounded-lg bg-background px-3 py-2 ring-1 ring-foreground/10 focus-within:ring-2 focus-within:ring-primary",
                auto && "bg-secondary/70",
              )}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{sideLabel(side, players)}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {auto ? "Calcolato" : "Punti carta"}
                </span>
              </span>
              <input
                ref={(node) => {
                  inputs.current[side.id] = node
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                enterKeyHint="done"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                aria-label={`Punti di ${sideLabel(side, players)}`}
                placeholder="–"
                value={valueOf(side.id)}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => type(side.id, event.target.value)}
                className={cn(
                  "tbl h-12 w-24 rounded-md bg-transparent text-right text-3xl font-semibold outline-none placeholder:text-muted-foreground/50",
                  auto && "text-muted-foreground",
                )}
              />
            </label>
          )
        })}
      </div>

      <p className={cn("text-xs", resolved.over ? "text-destructive" : "text-muted-foreground")} aria-live="polite">
        {hint}
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-12" onClick={onCancel}>
          Annulla
        </Button>
        <Button type="submit" className="h-12" disabled={!resolved.complete}>
          Salva mano
        </Button>
      </div>
    </form>
  )
}
