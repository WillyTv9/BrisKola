"use client"

import { ChevronLeftIcon } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"

import { useStore } from "@/components/briscola/store"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { isEnterSubmit, MODE_META, SCORE_META, sideTitle } from "@/lib/game"
import type { Mode, ScoreMode } from "@/lib/types"
import { cn } from "@/lib/utils"

type Seat = { sideIndex: number; playerId: string | null; name: string | null }

function seatsFor(mode: Mode, previous: Seat[] = []): Seat[] {
  const next = MODE_META[mode].seats.flatMap((count, sideIndex) =>
    Array.from({ length: count }, () => ({ sideIndex, playerId: null as string | null, name: null as string | null })),
  )
  previous
    .filter((seat) => seat.playerId && seat.name)
    .forEach((seat, index) => {
      if (next[index]) next[index] = { ...next[index], playerId: seat.playerId, name: seat.name }
    })
  return next
}

export function NewMatchView({
  onBack,
  onCreated,
}: {
  onBack: () => void
  onCreated: (id: string) => void
}) {
  const { players, addPlayer, createMatch, prefs } = useStore()
  const [mode, setMode] = useState<Mode>("1v1")
  const [scoreMode, setScoreMode] = useState<ScoreMode>(prefs.scoreMode)
  const [seats, setSeats] = useState<Seat[]>(() => seatsFor("1v1"))
  const [active, setActive] = useState(0)
  const [name, setName] = useState("")
  const [nameError, setNameError] = useState("")
  const [target, setTarget] = useState(prefs.target ? String(prefs.target) : "")

  const grouped = useMemo(() => {
    const groups = new Map<number, { seat: Seat; index: number }[]>()
    seats.forEach((seat, index) => {
      const list = groups.get(seat.sideIndex) ?? []
      list.push({ seat, index })
      groups.set(seat.sideIndex, list)
    })
    return [...groups.entries()]
  }, [seats])

  function chooseMode(next: Mode) {
    setMode(next)
    const filled = seatsFor(next, seats)
    setSeats(filled)
    setActive(Math.max(0, filled.findIndex((seat) => !seat.playerId)))
  }

  function assign(playerId: string, playerName: string) {
    if (seats.some((seat) => seat.playerId === playerId)) {
      toast.error("Già seduto in questa partita.")
      return
    }
    setSeats((current) =>
      current.map((seat, index) => (index === active ? { ...seat, playerId, name: playerName } : seat)),
    )
    const nextEmpty = seats.findIndex((seat, index) => index !== active && !seat.playerId)
    if (nextEmpty >= 0) setActive(nextEmpty)
  }

  function addAndSeat() {
    const clean = name.trim().replace(/\s+/g, " ")
    const result = addPlayer(clean)
    if (!result.ok) {
      setNameError(result.message)
      return
    }
    setName("")
    setNameError("")
    assign(result.id, clean)
  }

  function start() {
    if (seats.some((seat) => !seat.playerId)) {
      toast.error("Riempi tutti i posti.")
      return
    }
    const targetValue = target.trim() === "" ? null : Number(target)
    if (targetValue !== null && (!Number.isInteger(targetValue) || targetValue < 1 || targetValue > 9999)) {
      toast.error("L'obiettivo deve essere un numero intero.")
      return
    }
    const id = createMatch({
      mode,
      scoreMode,
      target: targetValue,
      sides: grouped.map(([, group]) =>
        group.map(({ seat }) => ({
          id: seat.playerId ?? "",
          name: seat.name ?? "Giocatore",
        })),
      ),
    })
    onCreated(id)
  }

  return (
    <div className="flex flex-col gap-5 px-4 pb-8">
      <header className="sticky top-0 z-20 -mx-4 flex items-center gap-1 bg-background/90 px-2 pt-[max(0.25rem,env(safe-area-inset-top))] pb-2 backdrop-blur-md">
        <Button type="button" variant="ghost" className="h-11" onClick={onBack}>
          <ChevronLeftIcon data-icon="inline-start" />
          Tavolo
        </Button>
        <h1 className="text-base font-semibold">Nuova partita</h1>
      </header>

      <FieldGroup>
        <Field>
          <FieldLabel>Tipo</FieldLabel>
          <ToggleGroup
            aria-label="Tipo di partita"
            value={[mode]}
            onValueChange={(value) => {
              const next = value[0]
              if (next === "1v1" || next === "2v2" || next === "1v1v1") chooseMode(next)
            }}
            variant="outline"
            className="grid w-full grid-cols-3"
          >
            {(Object.keys(MODE_META) as Mode[]).map((item) => (
              <ToggleGroupItem key={item} value={item} className="h-11 aria-pressed:ring-2 aria-pressed:ring-primary">
                {MODE_META[item].label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldDescription>{MODE_META[mode].hint}. Una mano vale sempre 120 punti carta.</FieldDescription>
        </Field>
        <Field>
          <FieldLabel>Come si conta</FieldLabel>
          <ToggleGroup
            aria-label="Come si conta"
            value={[scoreMode]}
            onValueChange={(value) => {
              const next = value[0]
              if (next === "mani" || next === "carte") setScoreMode(next)
            }}
            variant="outline"
            className="grid w-full grid-cols-2"
          >
            {(Object.keys(SCORE_META) as ScoreMode[]).map((item) => (
              <ToggleGroupItem key={item} value={item} className="h-11">
                {SCORE_META[item].label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <FieldDescription>{SCORE_META[scoreMode].hint}</FieldDescription>
        </Field>
      </FieldGroup>

      <div className="flex flex-col gap-3">
        {grouped.map(([sideIndex, group]) => (
          <div key={sideIndex} className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground">{sideTitle(mode, sideIndex)}</p>
            <div className={cn("grid gap-2", group.length > 1 && "grid-cols-2")}>
              {group.map(({ seat, index }) => {
                const selected = active === index
                return (
                  <button
                    key={index}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      if (seat.playerId && selected) {
                        setSeats((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, playerId: null, name: null } : item,
                          ),
                        )
                        return
                      }
                      setActive(index)
                    }}
                    className={cn(
                      "flex h-14 min-w-0 items-center rounded-xl bg-card px-3 text-left ring-1 ring-foreground/10",
                      selected && "ring-2 ring-primary",
                    )}
                  >
                    <span className="truncate text-sm font-medium">{seat.name ?? "Scegli"}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <p className="text-xs text-muted-foreground">Tocca un posto, poi un giocatore. Tocca di nuovo per liberarlo.</p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Giocatori</p>
        {players.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {players.map((player) => {
              const used = seats.some((seat) => seat.playerId === player.id)
              return (
                <Button
                  key={player.id}
                  type="button"
                  variant={used ? "secondary" : "outline"}
                  className="h-11"
                  disabled={used}
                  onClick={() => assign(player.id, player.name)}
                >
                  {player.name}
                </Button>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aggiungi almeno i nomi del tavolo.</p>
        )}
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            addAndSeat()
          }}
        >
          <Field className="min-w-0 flex-1" data-invalid={nameError ? true : undefined}>
            <FieldLabel htmlFor="new-player" className="sr-only">
              Nuovo giocatore
            </FieldLabel>
            <Input
              id="new-player"
              value={name}
              className="h-11"
              placeholder="Nuovo nome"
              autoCapitalize="words"
              autoComplete="name"
              aria-invalid={nameError ? true : undefined}
              onChange={(event) => {
                setName(event.target.value)
                setNameError("")
              }}
              onKeyDown={(event) => {
                if (!isEnterSubmit(event)) return
                event.preventDefault()
                addAndSeat()
              }}
            />
            {nameError ? <FieldError>{nameError}</FieldError> : null}
          </Field>
          <Button type="submit" variant="secondary" className="h-11">
            Aggiungi
          </Button>
        </form>
      </div>

      <Field>
        <FieldLabel htmlFor="target">Prima a</FieldLabel>
        <Input
          id="target"
          inputMode="numeric"
          className="h-11"
          placeholder="Nessun limite"
          value={target}
          onChange={(event) => setTarget(event.target.value.replace(/\D/g, "").slice(0, 4))}
        />
        <FieldDescription>Facoltativo. Il tavolo non si chiude da solo.</FieldDescription>
      </Field>

      <Button type="button" className="h-12" onClick={start}>
        Apri il tavolo
      </Button>
    </div>
  )
}
