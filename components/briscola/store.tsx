"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"

import { createId } from "@/lib/game"
import { isAvatarId } from "@/lib/avatars"
import { loadState, parseBackup, saveState } from "@/lib/storage"
import type { AppState, Hand, Match, Mode, Player, Prefs, ScoreMode, SidePlayer } from "@/lib/types"

type Result = { ok: true } | { ok: false; message: string }

type Store = {
  ready: boolean
  unavailable: boolean
  players: Player[]
  matches: Match[]
  prefs: Prefs
  addPlayer: (name: string) => { ok: true; id: string } | { ok: false; message: string }
  renamePlayer: (id: string, name: string) => Result
  setAvatar: (id: string, avatar: string) => void
  removePlayer: (id: string) => Result
  setPrefs: (prefs: Partial<Prefs>) => void
  createMatch: (input: { mode: Mode; sides: SidePlayer[][]; target: number | null; scoreMode: ScoreMode }) => string
  setScoreMode: (matchId: string, scoreMode: ScoreMode) => void
  addHand: (matchId: string, scores: Record<string, number>) => void
  updateHand: (matchId: string, handId: string, scores: Record<string, number>) => void
  deleteHand: (matchId: string, handId: string) => void
  finishMatch: (matchId: string) => Result
  reopenMatch: (matchId: string) => void
  deleteMatch: (matchId: string) => void
  importBackup: (raw: string) => Result
  clearAll: () => void
}

const StoreContext = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({ players: [], matches: [], prefs: { scoreMode: "mani", target: null } })
  const [ready, setReady] = useState(false)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    const loaded = loadState()
    setState(loaded.state)
    setUnavailable(loaded.unavailable)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready || unavailable) return
    try {
      saveState(state)
    } catch {
      setUnavailable(true)
      toast.error("Impossibile salvare su questo dispositivo.")
    }
  }, [state, ready, unavailable])

  const store = useMemo<Store>(() => {
    return {
      ready,
      unavailable,
      players: state.players,
      matches: state.matches,
      prefs: state.prefs,
      addPlayer(name) {
        const clean = name.trim().replace(/\s+/g, " ")
        if (clean.length < 1 || clean.length > 24) {
          return { ok: false, message: "Usa un nome tra 1 e 24 caratteri." }
        }
        const taken = state.players.some(
          (player) => player.name.toLocaleLowerCase("it") === clean.toLocaleLowerCase("it"),
        )
        if (taken) return { ok: false, message: "Questo nome è già in tavola." }
        const player: Player = { id: createId(), name: clean, createdAt: Date.now() }
        setState((current) => ({ ...current, players: [...current.players, player] }))
        return { ok: true, id: player.id }
      },
      renamePlayer(id, name) {
        const clean = name.trim().replace(/\s+/g, " ")
        if (clean.length < 1 || clean.length > 24) {
          return { ok: false, message: "Usa un nome tra 1 e 24 caratteri." }
        }
        const taken = state.players.some(
          (player) => player.id !== id && player.name.toLocaleLowerCase("it") === clean.toLocaleLowerCase("it"),
        )
        if (taken) return { ok: false, message: "Questo nome è già in tavola." }
        setState((current) => ({
          ...current,
          players: current.players.map((player) => (player.id === id ? { ...player, name: clean } : player)),
          matches: current.matches.map((match) => ({
            ...match,
            sides: match.sides.map((side) => ({
              ...side,
              players: side.players.map((seat) => (seat.id === id ? { ...seat, name: clean } : seat)),
            })),
          })),
        }))
        return { ok: true }
      },
      setAvatar(id, avatar) {
        if (!isAvatarId(avatar)) return
        setState((current) => ({
          ...current,
          players: current.players.map((player) => (player.id === id ? { ...player, avatar } : player)),
        }))
      },
      removePlayer(id) {
        const live = state.matches.some(
          (match) => match.status === "live" && match.sides.some((side) => side.players.some((seat) => seat.id === id)),
        )
        if (live) return { ok: false, message: "È in una partita in corso. Terminala prima." }
        setState((current) => ({
          ...current,
          players: current.players.filter((player) => player.id !== id),
        }))
        return { ok: true }
      },
      setPrefs(prefs) {
        setState((current) => ({ ...current, prefs: { ...current.prefs, ...prefs } }))
      },
      createMatch(input) {
        const match: Match = {
          id: createId(),
          mode: input.mode,
          status: "live",
          createdAt: Date.now(),
          target: input.target,
          scoreMode: input.scoreMode,
          sides: input.sides.map((players) => ({ id: createId(), players })),
          hands: [],
        }
        setState((current) => ({ ...current, matches: [match, ...current.matches] }))
        return match.id
      },
      setScoreMode(matchId, scoreMode) {
        setState((current) => ({
          ...current,
          matches: current.matches.map((match) => (match.id === matchId ? { ...match, scoreMode } : match)),
        }))
      },
      addHand(matchId, scores) {
        const hand: Hand = { id: createId(), createdAt: Date.now(), scores }
        setState((current) => ({
          ...current,
          matches: current.matches.map((match) =>
            match.id === matchId && match.status === "live" ? { ...match, hands: [...match.hands, hand] } : match,
          ),
        }))
      },
      updateHand(matchId, handId, scores) {
        setState((current) => ({
          ...current,
          matches: current.matches.map((match) =>
            match.id === matchId
              ? { ...match, hands: match.hands.map((hand) => (hand.id === handId ? { ...hand, scores } : hand)) }
              : match,
          ),
        }))
      },
      deleteHand(matchId, handId) {
        setState((current) => ({
          ...current,
          matches: current.matches.map((match) =>
            match.id === matchId ? { ...match, hands: match.hands.filter((hand) => hand.id !== handId) } : match,
          ),
        }))
      },
      finishMatch(matchId) {
        const match = state.matches.find((item) => item.id === matchId)
        if (!match || match.hands.length === 0) {
          return { ok: false, message: "Aggiungi almeno una mano, oppure elimina la partita." }
        }
        setState((current) => ({
          ...current,
          matches: current.matches.map((item) =>
            item.id === matchId ? { ...item, status: "finished", finishedAt: Date.now() } : item,
          ),
        }))
        return { ok: true }
      },
      reopenMatch(matchId) {
        setState((current) => ({
          ...current,
          matches: current.matches.map((item) =>
            item.id === matchId ? { ...item, status: "live", finishedAt: undefined } : item,
          ),
        }))
      },
      deleteMatch(matchId) {
        setState((current) => ({
          ...current,
          matches: current.matches.filter((item) => item.id !== matchId),
        }))
      },
      importBackup(raw) {
        const parsed = parseBackup(raw)
        if (!parsed) return { ok: false, message: "File non riconosciuto." }
        setState(parsed)
        return { ok: true }
      },
      clearAll() {
        setState((current) => ({ players: [], matches: [], prefs: current.prefs }))
      },
    }
  }, [ready, unavailable, state])

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

export function useStore() {
  const store = useContext(StoreContext)
  if (!store) throw new Error("useStore must be used within StoreProvider")
  return store
}
