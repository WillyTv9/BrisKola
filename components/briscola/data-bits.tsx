import { signed } from "@/lib/game"
import type { Outcome } from "@/lib/game"
import { cn } from "@/lib/utils"

const OUTCOME_STYLE: Record<Outcome, string> = {
  V: "bg-pos/15 text-pos",
  P: "bg-neg/15 text-neg",
  N: "bg-muted text-muted-foreground",
}

export function OutcomeChip({ outcome, className }: { outcome: Outcome; className?: string }) {
  return (
    <span
      className={cn(
        "tbl inline-flex size-5 items-center justify-center rounded-[5px] text-[11px] font-bold",
        OUTCOME_STYLE[outcome],
        className,
      )}
      aria-label={outcome === "V" ? "Vinta" : outcome === "P" ? "Persa" : "Pari"}
    >
      {outcome}
    </span>
  )
}

export function FormStrip({ form, size = "sm" }: { form: Outcome[]; size?: "sm" | "md" }) {
  if (form.length === 0) return <span className="text-xs text-muted-foreground">–</span>
  return (
    <span className="inline-flex gap-[3px]" role="img" aria-label={`Ultimi risultati: ${form.join(" ")}`}>
      {form.map((outcome, index) => (
        <span
          key={index}
          className={cn(
            "rounded-[2px]",
            size === "sm" ? "h-3.5 w-1.5" : "h-5 w-2",
            outcome === "V" ? "bg-pos" : outcome === "P" ? "bg-neg" : "bg-muted-foreground/40",
          )}
        />
      ))}
    </span>
  )
}

export function Delta({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("tbl", value > 0 && "text-pos", value < 0 && "text-neg", value === 0 && "text-muted-foreground", className)}>
      {signed(value)}
    </span>
  )
}
