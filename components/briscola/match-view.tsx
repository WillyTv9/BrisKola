"use client"

import { ChevronLeftIcon, PencilIcon, Trash2Icon } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

import { HandPad, openPad, type Pad } from "@/components/briscola/hand-pad"
import { Scoreboard } from "@/components/briscola/scoreboard"
import { useStore } from "@/components/briscola/store"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty"
import {
  formatWhen,
  handAwards,
  HAND_TOTAL,
  isCappotto,
  MODE_META,
  reachedTarget,
  resultLabel,
  SCORE_META,
  scoreModeOf,
  sideLabel,
  standingLabel,
} from "@/lib/game"
import type { ScoreMode } from "@/lib/types"
import { cn } from "@/lib/utils"

export function MatchView({
  matchId,
  backLabel,
  onBack,
}: {
  matchId: string
  backLabel: string
  onBack: () => void
}) {
  const { matches, players, addHand, updateHand, deleteHand, finishMatch, reopenMatch, deleteMatch, setScoreMode } =
    useStore()
  const match = matches.find((item) => item.id === matchId)
  const [pad, setPad] = useState<Pad | null>(null)
  const [confirm, setConfirm] = useState<"finish" | "delete" | "hand" | null>(null)
  const [handToDelete, setHandToDelete] = useState<string | null>(null)
  const keyboardKick = useRef<HTMLInputElement>(null)

  // iOS apre la tastiera solo se il focus parte dal tocco: lo passiamo a un campo
  // sempre presente, poi il modulo dei punti lo riprende senza farla chiudere.
  function openHandPad(handId?: string) {
    if (!match) return
    keyboardKick.current?.focus()
    setPad(openPad(match, handId))
  }

  if (!match) {
    return (
      <div className="px-4 pt-6">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ChevronLeftIcon data-icon="inline-start" />
          {backLabel}
        </Button>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Partita non trovata</EmptyTitle>
            <EmptyDescription>Potrebbe essere stata eliminata da questo dispositivo.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    )
  }

  const live = match.status === "live"
  const mode = scoreModeOf(match)
  const reached = reachedTarget(match)

  function save(scores: Record<string, number>) {
    const sum = Object.values(scores).reduce((total, points) => total + points, 0)
    if (sum !== HAND_TOTAL) {
      toast.error(`La mano deve fare ${HAND_TOTAL}.`)
      return
    }
    if (pad?.handId) updateHand(match!.id, pad.handId, scores)
    else addHand(match!.id, scores)
    setPad(null)
  }

  return (
    <div className="flex flex-col">
      <input
        ref={keyboardKick}
        type="text"
        inputMode="numeric"
        aria-hidden
        tabIndex={-1}
        className="pointer-events-none fixed top-0 left-0 size-px opacity-0"
      />
      <div className="sticky top-0 z-20 bg-background/92 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" className="h-11 px-2" onClick={onBack}>
            <ChevronLeftIcon data-icon="inline-start" />
            {backLabel}
          </Button>
          <p className="text-sm font-medium">{MODE_META[match.mode].label}</p>
          <Button type="button" variant="ghost" className="h-11 text-destructive" onClick={() => setConfirm("delete")}>
            Elimina
          </Button>
        </div>
        <div className="mt-2">
          <Scoreboard match={match} players={players} compact={pad !== null} />
        </div>
        {pad === null ? (
          <>
        <div className="mt-2 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
          {(Object.keys(SCORE_META) as ScoreMode[]).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={mode === item}
              onClick={() => setScoreMode(match.id, item)}
              className={cn(
                "h-9 rounded-md text-xs font-medium",
                mode === item ? "bg-background text-foreground" : "text-muted-foreground",
              )}
            >
              {SCORE_META[item].label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {live ? standingLabel(match, players) : resultLabel(match, players)}
          {match.target ? ` · prima a ${match.target}` : ""}
          {reached && live ? " · obiettivo raggiunto" : ""}
        </p>
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-4 px-4 pt-4 pb-28">
        <p className="text-xs text-muted-foreground">
          {SCORE_META[mode].hint} I punti si scrivono a mano chiusa: il totale fa sempre 120.
        </p>

        {pad ? (
          <HandPad
            match={match}
            players={players}
            pad={pad}
            onChange={setPad}
            onCancel={() => setPad(null)}
            onSave={save}
          />
        ) : null}

        {match.hands.length === 0 ? (
          <Empty className="border bg-card/50">
            <EmptyHeader>
              <EmptyTitle>Nessuna mano chiusa</EmptyTitle>
              <EmptyDescription>A fine mano scrivi i punti di un lato: l&apos;altro si calcola da solo.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ol className="flex flex-col">
            {[...match.hands].reverse().map((hand, reverseIndex) => {
              const number = match.hands.length - reverseIndex
              const awards = handAwards(match, hand.scores)
              const lead = match.sides.find((side) => awards[side.id] > 0)
              const cap = isCappotto(match, hand.scores)
              return (
                <li key={hand.id} className="flex items-center gap-2 border-b border-border py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      Mano {number}
                      {cap ? <span className="ml-2 text-xs text-gold">Cappotto</span> : null}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatWhen(hand.createdAt)}
                      {lead ? ` · ${sideLabel(lead, players)} +${awards[lead.id]}` : " · pari"}
                    </p>
                  </div>
                  <p className="tbl text-sm">{match.sides.map((side) => hand.scores[side.id] ?? 0).join("–")}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    className="size-11"
                    aria-label={`Modifica mano ${number}`}
                    onClick={() => openHandPad(hand.id)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    className="size-11"
                    aria-label={`Elimina mano ${number}`}
                    onClick={() => {
                      setHandToDelete(hand.id)
                      setConfirm("hand")
                    }}
                  >
                    <Trash2Icon />
                  </Button>
                </li>
              )
            })}
          </ol>
        )}

      </div>

      {!pad ? (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-lg border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md">
          <div className="grid grid-cols-2 gap-2">
            {live ? (
              <Button type="button" className="h-12" onClick={() => openHandPad()}>
                Chiudi mano
              </Button>
            ) : (
              <Button type="button" variant="outline" className="h-12" onClick={() => reopenMatch(match.id)}>
                Riapri
              </Button>
            )}
            {live ? (
              <Button type="button" variant="outline" className="h-12" onClick={() => setConfirm("finish")}>
                Termina
              </Button>
            ) : (
              <Button type="button" variant="outline" className="h-12" onClick={onBack}>
                Storico
              </Button>
            )}
          </div>
        </div>
      ) : null}

      <AlertDialog open={confirm === "finish"} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Terminare la partita?</AlertDialogTitle>
            <AlertDialogDescription>{resultLabel(match, players)}. Resta nello storico e puoi riaprirla.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const result = finishMatch(match.id)
                if (!result.ok) toast.error(result.message)
                else {
                  toast.success("Partita chiusa.")
                  onBack()
                }
                setConfirm(null)
              }}
            >
              Termina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm === "delete"} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare la partita?</AlertDialogTitle>
            <AlertDialogDescription>Mani e punteggi spariscono da questo dispositivo.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                deleteMatch(match.id)
                setConfirm(null)
                onBack()
              }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirm === "hand"} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questa mano?</AlertDialogTitle>
            <AlertDialogDescription>Il totale si ricalcola subito.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (handToDelete) deleteHand(match.id, handToDelete)
                setHandToDelete(null)
                setConfirm(null)
              }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
