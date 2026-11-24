import { isAvatarId } from "@/lib/avatars"
import type { AppState, Hand, Match, Mode, Player, Prefs, ScoreMode, Side } from "@/lib/types"

const STORAGE_KEY = "briscola.tavolo.v1"

const DEFAULT_PREFS: Prefs = { scoreMode: "mani", target: null }

const EMPTY: AppState = { players: [], matches: [], prefs: DEFAULT_PREFS }

const MODES = new Set<Mode>(["1v1", "2v2", "1v1v1"])
const SCORE_MODES = new Set<ScoreMode>(["mani", "carte"])

export function loadState(): { state: AppState; unavailable: boolean } {
  if (typeof window === "undefined") return { state: EMPTY, unavailable: false }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { state: EMPTY, unavailable: false }
    const parsed = parseBackup(raw)
    return { state: parsed ?? EMPTY, unavailable: false }
  } catch {
    return { state: EMPTY, unavailable: true }
  }
}

export function saveState(state: AppState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function parseBackup(raw: string): AppState | null {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (!data || typeof data !== "object") return null
  const record = data as { players?: unknown; matches?: unknown; prefs?: unknown }
  if (!Array.isArray(record.players) || !Array.isArray(record.matches)) return null

  const players = record.players.map(cleanPlayer).filter((player): player is Player => player !== null)
  const ids = new Set(players.map((player) => player.id))
  const matches = record.matches
    .map((match) => cleanMatch(match, ids))
    .filter((match): match is Match => match !== null)

  return { players, matches, prefs: cleanPrefs(record.prefs) }
}

function cleanPrefs(value: unknown): Prefs {
  if (!value || typeof value !== "object") return DEFAULT_PREFS
  const prefs = value as Partial<Prefs>
  const scoreMode = prefs.scoreMode === "carte" || prefs.scoreMode === "mani" ? prefs.scoreMode : DEFAULT_PREFS.scoreMode
  const target =
    typeof prefs.target === "number" && Number.isInteger(prefs.target) && prefs.target > 0
      ? Math.min(9999, prefs.target)
      : null
  return { scoreMode, target }
}

function cleanPlayer(value: unknown): Player | null {
  if (!value || typeof value !== "object") return null
  const player = value as Partial<Player>
  if (typeof player.id !== "string" || typeof player.name !== "string") return null
  const name = player.name.trim().replace(/\s+/g, " ")
  if (!name || name.length > 24) return null
  return {
    id: player.id,
    name,
    createdAt: typeof player.createdAt === "number" ? player.createdAt : Date.now(),
    avatar: typeof player.avatar === "string" && isAvatarId(player.avatar) ? player.avatar : undefined,
  }
}

function cleanMatch(value: unknown, playerIds: Set<string>): Match | null {
  if (!value || typeof value !== "object") return null
  const match = value as Partial<Match>
  if (typeof match.id !== "string" || typeof match.mode !== "string" || !MODES.has(match.mode)) return null
  if (!Array.isArray(match.sides) || !Array.isArray(match.hands)) return null
  const expected = match.mode === "1v1v1" ? 3 : 2
  if (match.sides.length !== expected) return null

  const sides = match.sides.map(cleanSide).filter((side): side is Side => side !== null)
  if (sides.length !== expected) return null
  if (match.mode === "2v2" && sides.some((side) => side.players.length !== 2)) return null
  if (match.mode !== "2v2" && sides.some((side) => side.players.length !== 1)) return null

  const sideIds = new Set(sides.map((side) => side.id))
  const hands = match.hands.map((hand) => cleanHand(hand, sideIds)).filter((hand): hand is Hand => hand !== null)
  const target = typeof match.target === "number" && match.target > 0 ? Math.round(match.target) : null
  const scoreMode =
    typeof match.scoreMode === "string" && SCORE_MODES.has(match.scoreMode) ? match.scoreMode : undefined

  return {
    id: match.id,
    mode: match.mode,
    status: match.status === "finished" ? "finished" : "live",
    createdAt: typeof match.createdAt === "number" ? match.createdAt : Date.now(),
    finishedAt: typeof match.finishedAt === "number" ? match.finishedAt : undefined,
    target,
    scoreMode,
    sides: sides.map((side) => ({
      ...side,
      players: side.players.map((seat) => ({
        ...seat,
        name: seat.name || (playerIds.has(seat.id) ? seat.name : "Giocatore"),
      })),
    })),
    hands,
  }
}

function cleanSide(value: unknown): Side | null {
  if (!value || typeof value !== "object") return null
  const side = value as Partial<Side>
  if (typeof side.id !== "string" || !Array.isArray(side.players)) return null
  const players = side.players
    .map((seat) => {
      if (!seat || typeof seat !== "object") return null
      const item = seat as { id?: unknown; name?: unknown }
      if (typeof item.id !== "string" || typeof item.name !== "string") return null
      return { id: item.id, name: item.name.trim() || "Giocatore" }
    })
    .filter((seat): seat is Side["players"][number] => seat !== null)
  if (players.length === 0) return null
  return { id: side.id, players }
}

function cleanHand(value: unknown, sideIds: Set<string>): Hand | null {
  if (!value || typeof value !== "object") return null
  const hand = value as Partial<Hand>
  if (typeof hand.id !== "string" || !hand.scores || typeof hand.scores !== "object") return null
  const scores: Record<string, number> = {}
  for (const sideId of sideIds) {
    const points = (hand.scores as Record<string, unknown>)[sideId]
    if (typeof points !== "number" || !Number.isInteger(points) || points < 0 || points > 120) return null
    scores[sideId] = points
  }
  return {
    id: hand.id,
    createdAt: typeof hand.createdAt === "number" ? hand.createdAt : Date.now(),
    scores,
  }
}
