export type Mode = "1v1" | "2v2" | "1v1v1"

export type ScoreMode = "mani" | "carte"

export type Player = {
  id: string
  name: string
  createdAt: number
  avatar?: string
}

export type SidePlayer = {
  id: string
  name: string
}

export type Side = {
  id: string
  players: SidePlayer[]
}

export type Hand = {
  id: string
  createdAt: number
  scores: Record<string, number>
}

export type Match = {
  id: string
  mode: Mode
  status: "live" | "finished"
  createdAt: number
  finishedAt?: number
  target: number | null
  scoreMode?: ScoreMode
  sides: Side[]
  hands: Hand[]
}

export type Prefs = {
  scoreMode: ScoreMode
  target: number | null
}

export type AppState = {
  players: Player[]
  matches: Match[]
  prefs: Prefs
}
