import { asset } from "@/lib/utils"

export const AVATARS = [
  { id: "luna", src: asset("/avatars/luna.png"), label: "Luna" },
  { id: "corvo", src: asset("/avatars/corvo.png"), label: "Corvo" },
  { id: "rosa", src: asset("/avatars/rosa.png"), label: "Rosa" },
  { id: "volpe", src: asset("/avatars/volpe.png"), label: "Volpe" },
  { id: "spada", src: asset("/avatars/spada.png"), label: "Spada" },
  { id: "coppa", src: asset("/avatars/coppa.png"), label: "Coppa" },
  { id: "bastone", src: asset("/avatars/bastone.png"), label: "Bastone" },
  { id: "stella", src: asset("/avatars/stella.png"), label: "Stella" },
] as const

export type AvatarId = (typeof AVATARS)[number]["id"]

const IDS = new Set<string>(AVATARS.map((avatar) => avatar.id))

export function isAvatarId(value: string): value is AvatarId {
  return IDS.has(value)
}

export function avatarFor(id: string, chosen?: string) {
  if (chosen && isAvatarId(chosen)) return AVATARS.find((avatar) => avatar.id === chosen) ?? AVATARS[0]
  let hash = 0
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATARS[hash % AVATARS.length]
}
