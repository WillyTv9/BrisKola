import type { Match, Mode, Player, ScoreMode, Side } from "@/lib/types"

export const HAND_TOTAL = 120
export const APP_NAME = "BrisKola"

export const MODE_META: Record<Mode, { label: string; hint: string; seats: number[] }> = {
  "1v1": { label: "Singolo", hint: "1 contro 1", seats: [1, 1] },
  "2v2": { label: "Coppie", hint: "2 contro 2", seats: [2, 2] },
  "1v1v1": { label: "In tre", hint: "1 contro 1 contro 1", seats: [1, 1, 1] },
}

export const SCORE_META: Record<ScoreMode, { label: string; hint: string }> = {
  mani: {
    label: "A mani",
    hint: "Chi vince la mano prende 1. Il cappotto vale 2.",
  },
  carte: {
    label: "A carte",
    hint: "Si sommano i punti carta di ogni mano.",
  },
}

export function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export function sideTitle(mode: Mode, index: number) {
  if (mode === "2v2") return index === 0 ? "Coppia A" : "Coppia B"
  if (mode === "1v1") return index === 0 ? "In casa" : "Ospiti"
  return `Posto ${index + 1}`
}

export function sideLabel(side: Side, players: Player[]) {
  return side.players
    .map((seat) => players.find((player) => player.id === seat.id)?.name ?? seat.name)
    .join(" · ")
}

export function scoreModeOf(match: Match): ScoreMode {
  return match.scoreMode ?? "carte"
}

export function totals(match: Match) {
  const score: Record<string, number> = {}
  for (const side of match.sides) score[side.id] = 0
  for (const hand of match.hands) {
    for (const side of match.sides) score[side.id] += hand.scores[side.id] ?? 0
  }
  return score
}

export function handAwards(match: Match, scores: Record<string, number>) {
  const awards: Record<string, number> = {}
  for (const side of match.sides) awards[side.id] = 0
  const values = match.sides.map((side) => scores[side.id] ?? 0)
  const max = Math.max(...values)
  const leaders = match.sides.filter((side) => (scores[side.id] ?? 0) === max)
  if (leaders.length !== 1) return awards
  const winner = leaders[0]
  const cappotto = (scores[winner.id] ?? 0) === HAND_TOTAL && values.every((points) => points === HAND_TOTAL || points === 0)
  awards[winner.id] = cappotto ? 2 : 1
  return awards
}

export function isCappotto(match: Match, scores: Record<string, number>) {
  return match.sides.some((side) => handAwards(match, scores)[side.id] === 2)
}

export function matchAwards(match: Match) {
  const score: Record<string, number> = {}
  for (const side of match.sides) score[side.id] = 0
  for (const hand of match.hands) {
    const awards = handAwards(match, hand.scores)
    for (const side of match.sides) score[side.id] += awards[side.id] ?? 0
  }
  return score
}

export function pointsOf(match: Match) {
  return scoreModeOf(match) === "mani" ? matchAwards(match) : totals(match)
}

export function leaders(match: Match) {
  if (match.hands.length === 0) return []
  const score = pointsOf(match)
  const max = Math.max(...match.sides.map((side) => score[side.id] ?? 0))
  if (max === 0 && scoreModeOf(match) === "mani") return []
  return match.sides.filter((side) => (score[side.id] ?? 0) === max).map((side) => side.id)
}

export function handLeaders(match: Match, scores: Record<string, number>) {
  const max = Math.max(...match.sides.map((side) => scores[side.id] ?? 0))
  return match.sides.filter((side) => (scores[side.id] ?? 0) === max).map((side) => side.id)
}

export function reachedTarget(match: Match) {
  if (match.target === null) return false
  const score = pointsOf(match)
  return match.sides.some((side) => (score[side.id] ?? 0) >= match.target!)
}

export function standingLabel(match: Match, players: Player[]) {
  const lead = leaders(match)
  if (lead.length === 0) return match.hands.length === 0 ? "In attesa della prima mano" : "Punteggio pari"
  if (lead.length > 1) return "Punteggio pari"
  const side = match.sides.find((item) => item.id === lead[0])
  return side ? `In testa ${sideLabel(side, players)}` : "In testa"
}

export function resultLabel(match: Match, players: Player[]) {
  const lead = leaders(match)
  if (lead.length === 0) return match.hands.length === 0 ? "Nessuna mano" : "Pareggio"
  if (lead.length > 1) return "Pareggio"
  const side = match.sides.find((item) => item.id === lead[0])
  return side ? `Vince ${sideLabel(side, players)}` : "Vince"
}

export function playerRecord(playerId: string, matches: Match[]) {
  let played = 0
  let wins = 0
  let points = 0
  for (const match of matches) {
    if (match.status !== "finished" || match.hands.length === 0) continue
    const side = match.sides.find((item) => item.players.some((seat) => seat.id === playerId))
    if (!side) continue
    played += 1
    points += pointsOf(match)[side.id] ?? 0
    const lead = leaders(match)
    if (lead.length === 1 && lead[0] === side.id) wins += 1
  }
  return { played, wins, points }
}

export function sideKey(side: Side) {
  return [...side.players.map((seat) => seat.id)].sort().join("+")
}

export type PairGroup = {
  key: string
  kind: "coppia" | "sfida" | "trio"
  memberIds: string[]
  matches: { match: Match; ownSideId: string }[]
}

export function pairGroups(matches: Match[]): PairGroup[] {
  const groups = new Map<string, PairGroup>()

  function ensure(key: string, kind: PairGroup["kind"], memberIds: string[]) {
    const existing = groups.get(key)
    if (existing) return existing
    const created: PairGroup = { key, kind, memberIds, matches: [] }
    groups.set(key, created)
    return created
  }

  for (const match of matches) {
    if (match.mode === "2v2") {
      for (const side of match.sides) {
        const ids = [...side.players.map((seat) => seat.id)].sort()
        const group = ensure(`coppia:${ids.join("+")}`, "coppia", ids)
        group.matches.push({ match, ownSideId: side.id })
      }
      continue
    }
    if (match.mode === "1v1") {
      const ids = match.sides.flatMap((side) => side.players.map((seat) => seat.id)).sort()
      const group = ensure(`sfida:${ids.join("|")}`, "sfida", ids)
      const own = match.sides.find((side) => side.players.some((seat) => seat.id === ids[0])) ?? match.sides[0]
      if (own) group.matches.push({ match, ownSideId: own.id })
      continue
    }
    const ids = match.sides.flatMap((side) => side.players.map((seat) => seat.id)).sort()
    const group = ensure(`trio:${ids.join("|")}`, "trio", ids)
    const own = match.sides.find((side) => side.players.some((seat) => seat.id === ids[0])) ?? match.sides[0]
    if (own) group.matches.push({ match, ownSideId: own.id })
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      matches: [...group.matches].sort((a, b) => a.match.createdAt - b.match.createdAt),
    }))
    .sort((a, b) => {
      const aLast = a.matches[a.matches.length - 1]?.match.createdAt ?? 0
      const bLast = b.matches[b.matches.length - 1]?.match.createdAt ?? 0
      return bLast - aLast
    })
}

export function groupTitle(group: PairGroup, players: Player[]) {
  const names = group.memberIds.map((id) => players.find((player) => player.id === id)?.name ?? "Giocatore")
  if (group.kind === "sfida") return names.join(" contro ")
  return names.join(" · ")
}

export function coupleSeries(group: PairGroup) {
  let taken = 0
  let conceded = 0
  const points: { taken: number; conceded: number; at: number }[] = []
  let wins = 0
  let losses = 0
  let draws = 0
  let cards = 0
  let cardsAgainst = 0

  for (const entry of group.matches) {
    const awards = matchAwards(entry.match)
    const cardsNow = totals(entry.match)
    const own = awards[entry.ownSideId] ?? 0
    const against = entry.match.sides
      .filter((side) => side.id !== entry.ownSideId)
      .reduce((sum, side) => sum + (awards[side.id] ?? 0), 0)
    taken += own
    conceded += against
    cards += cardsNow[entry.ownSideId] ?? 0
    cardsAgainst += entry.match.sides
      .filter((side) => side.id !== entry.ownSideId)
      .reduce((sum, side) => sum + (cardsNow[side.id] ?? 0), 0)
    points.push({ taken, conceded, at: entry.match.finishedAt ?? entry.match.createdAt })

    if (entry.match.status !== "finished" || entry.match.hands.length === 0) continue
    const lead = leaders(entry.match)
    if (lead.length === 1 && lead[0] === entry.ownSideId) wins += 1
    else if (lead.length === 1) losses += 1
    else draws += 1
  }

  return { points, wins, losses, draws, taken, conceded, cards, cardsAgainst }
}

export type Outcome = "V" | "P" | "N"

export type GroupRow = {
  match: Match
  ownSideId: string
  /** numero progressivo nel gruppo (1 = la prima giocata) */
  n: number
  outcome: Outcome
  /** punteggio (nella modalità della partita) nell'ordine: proprio lato, poi gli altri */
  scores: number[]
  /** punti partita del proprio lato meno il migliore degli altri */
  diff: number
  /** differenza cumulata fino a questa partita */
  cum: number
  /** punti carta: proprio lato, poi gli altri */
  cards: number[]
  opponents: string[]
  opponentKey: string
  carteMode: boolean
}

export type GroupStats = {
  rows: GroupRow[]
  live: Match[]
  played: number
  wins: number
  losses: number
  draws: number
  winPct: number
  pointsFor: number
  pointsAgainst: number
  diff: number
  cardsFor: number
  cardsAgainst: number
  handsPlayed: number
  streak: { outcome: Outcome; length: number } | null
  bestWinStreak: number
  form: Outcome[]
  opponents: { key: string; names: string[]; played: number; wins: number; losses: number; draws: number; diff: number }[]
}

export function groupStats(group: PairGroup, players: Player[]): GroupStats {
  const rows: GroupRow[] = []
  const live: Match[] = []
  const finished = group.matches.filter((entry) => {
    if (entry.match.status === "live") {
      live.push(entry.match)
      return false
    }
    return entry.match.hands.length > 0
  })

  let cum = 0
  let wins = 0
  let losses = 0
  let draws = 0
  let pointsFor = 0
  let pointsAgainst = 0
  let cardsFor = 0
  let cardsAgainst = 0
  let handsPlayed = 0
  const opponentMap = new Map<string, GroupStats["opponents"][number]>()

  finished.forEach((entry, index) => {
    const { match, ownSideId } = entry
    const points = pointsOf(match)
    const cards = totals(match)
    const own = match.sides.find((side) => side.id === ownSideId)!
    const others = match.sides.filter((side) => side.id !== ownSideId)
    // per sfide e tavoli in tre gli altri seguono l'ordine dei membri del gruppo
    const order = (side: Side) => group.memberIds.indexOf(side.players[0]?.id ?? "")
    if (group.kind !== "coppia") others.sort((a, b) => order(a) - order(b))

    const ownPts = points[ownSideId] ?? 0
    const otherPts = others.map((side) => points[side.id] ?? 0)
    // Δ e totali usano sempre i punti partita (mani vinte): confrontabili anche se
    // qualche partita è stata contata a carte.
    const awards = matchAwards(match)
    const ownAward = awards[ownSideId] ?? 0
    const otherAwards = others.map((side) => awards[side.id] ?? 0)
    const diff = ownAward - Math.max(...otherAwards)
    const lead = leaders(match)
    const outcome: Outcome = lead.length === 1 ? (lead[0] === ownSideId ? "V" : "P") : "N"
    cum += diff
    if (outcome === "V") wins += 1
    else if (outcome === "P") losses += 1
    else draws += 1
    pointsFor += ownAward
    pointsAgainst += otherAwards.reduce((a, b) => a + b, 0)
    cardsFor += cards[ownSideId] ?? 0
    cardsAgainst += others.reduce((sum, side) => sum + (cards[side.id] ?? 0), 0)
    handsPlayed += match.hands.length

    const opponents = others.map((side) => sideLabel(side, players))
    const opponentKey = others.map(sideKey).join("|")
    rows.push({
      match,
      ownSideId,
      n: index + 1,
      outcome,
      scores: [ownPts, ...otherPts],
      diff,
      cum,
      cards: [cards[ownSideId] ?? 0, ...others.map((side) => cards[side.id] ?? 0)],
      opponents,
      opponentKey,
      carteMode: scoreModeOf(match) === "carte",
    })

    if (group.kind === "coppia") {
      const current = opponentMap.get(opponentKey) ?? {
        key: opponentKey,
        names: opponents,
        played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        diff: 0,
      }
      current.played += 1
      current.diff += diff
      if (outcome === "V") current.wins += 1
      else if (outcome === "P") current.losses += 1
      else current.draws += 1
      opponentMap.set(opponentKey, current)
    }
  })

  let streak: GroupStats["streak"] = null
  for (let i = rows.length - 1; i >= 0; i--) {
    if (!streak) streak = { outcome: rows[i].outcome, length: 1 }
    else if (streak.outcome === rows[i].outcome) streak.length += 1
    else break
  }
  let bestWinStreak = 0
  let run = 0
  for (const row of rows) {
    run = row.outcome === "V" ? run + 1 : 0
    bestWinStreak = Math.max(bestWinStreak, run)
  }

  const decided = rows.length
  return {
    rows,
    live,
    played: decided,
    wins,
    losses,
    draws,
    winPct: decided === 0 ? 0 : Math.round((wins / decided) * 100),
    pointsFor,
    pointsAgainst,
    diff: cum,
    cardsFor,
    cardsAgainst,
    handsPlayed,
    streak,
    bestWinStreak,
    form: rows.slice(-10).map((row) => row.outcome),
    opponents: [...opponentMap.values()].sort((a, b) => b.played - a.played || b.diff - a.diff),
  }
}

export function formatDay(timestamp: number) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "2-digit" }).format(timestamp)
}

export function formatDayShort(timestamp: number) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit" }).format(timestamp)
}

export function signed(value: number) {
  return value > 0 ? `+${value}` : value < 0 ? `−${Math.abs(value)}` : "0"
}

export function formatWhen(timestamp: number) {
  return new Intl.DateTimeFormat("it-IT", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp)
}

export function isEnterSubmit(event: {
  key: string
  keyCode: number
  nativeEvent: { isComposing: boolean }
}) {
  return event.key === "Enter" && !event.nativeEvent.isComposing && event.keyCode !== 229
}
