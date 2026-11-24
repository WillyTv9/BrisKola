"use client"

import { useRef, useState } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"

import { PlayerAvatar } from "@/components/briscola/player-avatar"
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { AVATARS } from "@/lib/avatars"
import { APP_NAME, isEnterSubmit, playerRecord, SCORE_META } from "@/lib/game"
import type { ScoreMode } from "@/lib/types"
import { cn } from "@/lib/utils"

export function SettingsView() {
  const { players, matches, prefs, addPlayer, renamePlayer, setAvatar, removePlayer, setPrefs, importBackup, clearAll } =
    useStore()
  const { theme, setTheme } = useTheme()
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [confirmClear, setConfirmClear] = useState(false)
  const [avatarFor, setAvatarFor] = useState<string | null>(null)
  const [target, setTarget] = useState(prefs.target ? String(prefs.target) : "")
  const fileRef = useRef<HTMLInputElement>(null)

  function submitNew() {
    const result = addPlayer(name)
    if (!result.ok) {
      setError(result.message)
      return
    }
    setName("")
    setError("")
    setAvatarFor(result.id)
  }

  async function exportData() {
    const payload = JSON.stringify({ players, matches, prefs }, null, 2)
    const file = new File([payload], "briskola.json", { type: "application/json" })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: APP_NAME })
        return
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") return
    }
    const url = URL.createObjectURL(file)
    const link = document.createElement("a")
    link.href = url
    link.download = "briskola.json"
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex flex-col gap-6 px-4 pb-8">
      <header className="pt-[max(0.75rem,env(safe-area-inset-top))]">
        <h1 className="text-lg font-semibold tracking-tight">Impostazioni</h1>
        <p className="text-xs text-muted-foreground">Giocatori, conteggio e dati di questo telefono.</p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-medium">Giocatori</h2>
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            submitNew()
          }}
        >
          <Field className="min-w-0 flex-1" data-invalid={error ? true : undefined}>
            <FieldLabel htmlFor="player-name" className="sr-only">
              Nome giocatore
            </FieldLabel>
            <Input
              id="player-name"
              value={name}
              className="h-11"
              placeholder="Aggiungi un nome"
              autoCapitalize="words"
              autoComplete="name"
              aria-invalid={error ? true : undefined}
              onChange={(event) => {
                setName(event.target.value)
                setError("")
              }}
              onKeyDown={(event) => {
                if (!isEnterSubmit(event)) return
                event.preventDefault()
                submitNew()
              }}
            />
            {error ? <FieldError>{error}</FieldError> : null}
          </Field>
          <Button type="submit" className="h-11">
            Aggiungi
          </Button>
        </form>
        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground">I nomi restano su questo telefono e si riusano a ogni partita.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {players.map((player) => {
              const record = playerRecord(player.id, matches)
              const isEditing = editing === player.id
              return (
                <li key={player.id} className="flex items-center gap-3 rounded-xl bg-card px-3 py-3 ring-1 ring-foreground/10">
                  <button type="button" aria-label={`Cambia avatar di ${player.name}`} onClick={() => setAvatarFor(player.id)}>
                    <PlayerAvatar player={player} />
                  </button>
                  <div className="min-w-0 flex-1">
                    {isEditing ? (
                      <Input
                        value={draft}
                        className="h-11"
                        aria-label={`Nuovo nome di ${player.name}`}
                        autoFocus
                        onChange={(event) => setDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (!isEnterSubmit(event)) return
                          event.preventDefault()
                          const result = renamePlayer(player.id, draft)
                          if (!result.ok) toast.error(result.message)
                          else setEditing(null)
                        }}
                        onBlur={() => {
                          const result = renamePlayer(player.id, draft)
                          if (!result.ok) toast.error(result.message)
                          setEditing(null)
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="block w-full truncate text-left text-sm font-medium"
                        onClick={() => {
                          setEditing(player.id)
                          setDraft(player.name)
                        }}
                      >
                        {player.name}
                      </button>
                    )}
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {record.wins} vittorie · {record.played} partite
                    </p>
                  </div>
                  <Button type="button" variant="ghost" className="h-11 px-2 text-destructive" onClick={() => setPendingDelete(player.id)}>
                    Elimina
                  </Button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="text-sm font-medium">Conteggio</h2>
        <p className="text-sm text-muted-foreground">
          A mani il tabellone segna 1 per mano vinta e 2 per il cappotto. A carte somma i 120. Il blocco completa sempre l&apos;altro lato.
        </p>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
          {(Object.keys(SCORE_META) as ScoreMode[]).map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={prefs.scoreMode === item}
              onClick={() => setPrefs({ scoreMode: item })}
              className={cn(
                "h-10 rounded-md text-xs font-medium",
                prefs.scoreMode === item ? "bg-background text-foreground" : "text-muted-foreground",
              )}
            >
              {SCORE_META[item].label}
            </button>
          ))}
        </div>
        <Field>
          <FieldLabel htmlFor="default-target">Prima a, di default</FieldLabel>
          <Input
            id="default-target"
            inputMode="numeric"
            className="h-11"
            placeholder="Nessun limite"
            value={target}
            onChange={(event) => {
              const next = event.target.value.replace(/\D/g, "").slice(0, 4)
              setTarget(next)
              setPrefs({ target: next === "" ? null : Number(next) })
            }}
          />
        </Field>
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="text-sm font-medium">Aspetto</h2>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1">
          {[
            ["system", "Sistema"],
            ["light", "Chiaro"],
            ["dark", "Scuro"],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
              className={cn(
                "h-10 rounded-md text-xs font-medium",
                theme === value ? "bg-background text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="text-sm font-medium">Su iPhone</h2>
        <ol className="list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
          <li>Apri BrisKola da Safari.</li>
          <li>Condividi, poi Aggiungi a Home.</li>
          <li>Da ora aprila sempre dall&apos;icona: funziona anche senza rete e i dati restano solo su questo telefono.</li>
        </ol>
        <p className="text-xs text-muted-foreground">Ogni tanto premi Esporta qui sotto: è il tuo backup.</p>
      </section>

      <section className="flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="text-sm font-medium">Dati sul dispositivo</h2>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" className="h-11" onClick={exportData}>
            Esporta
          </Button>
          <Button type="button" variant="outline" className="h-11" onClick={() => fileRef.current?.click()}>
            Importa
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={async (event) => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (!file) return
            const result = importBackup(await file.text())
            if (!result.ok) toast.error(result.message)
            else toast.success("Backup importato.")
          }}
        />
        <Button type="button" variant="ghost" className="h-11 text-destructive" onClick={() => setConfirmClear(true)}>
          Cancella partite e giocatori
        </Button>
      </section>

      <Dialog open={avatarFor !== null} onOpenChange={(open) => !open && setAvatarFor(null)}>
        <DialogContent className="max-w-[min(100%,22rem)]">
          <DialogHeader>
            <DialogTitle>Scegli un avatar</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-4 gap-2">
            {AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                type="button"
                aria-label={avatar.label}
                className="overflow-hidden rounded-full ring-1 ring-foreground/15"
                onClick={() => {
                  if (avatarFor) setAvatar(avatarFor, avatar.id)
                  setAvatarFor(null)
                }}
              >
                <img src={avatar.src} alt="" className="aspect-square w-full object-cover" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il giocatore?</AlertDialogTitle>
            <AlertDialogDescription>Lo storico già chiuso tiene il nome. Non si può togliere chi è in una partita aperta.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (!pendingDelete) return
                const result = removePlayer(pendingDelete)
                if (!result.ok) toast.error(result.message)
                setPendingDelete(null)
              }}
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancellare tutti i dati?</AlertDialogTitle>
            <AlertDialogDescription>Partite e giocatori di questo dispositivo vengono rimossi. Le preferenze restano.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                clearAll()
                setConfirmClear(false)
                toast.success("Dati cancellati.")
              }}
            >
              Cancella
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
