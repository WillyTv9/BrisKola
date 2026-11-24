import { avatarFor } from "@/lib/avatars"
import type { Player } from "@/lib/types"
import { cn } from "@/lib/utils"

export function PlayerAvatar({
  player,
  className,
}: {
  player: Pick<Player, "id" | "name" | "avatar">
  className?: string
}) {
  const avatar = avatarFor(player.id, player.avatar)
  return (
    <img
      src={avatar.src}
      alt=""
      className={cn("size-9 shrink-0 rounded-full object-cover ring-1 ring-foreground/15", className)}
    />
  )
}
