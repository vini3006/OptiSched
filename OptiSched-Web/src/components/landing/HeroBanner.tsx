import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

type ChipTone = "muted" | "soft" | "resolving";

interface Chip {
  width: string;
  tone: ChipTone;
}

interface Row {
  day: string;
  chips: Chip[];
}

/**
 * Decorative only — an abstract weekly grid, not real data. Widths and
 * tones are hand-picked for visual rhythm; the single "resolving" chip
 * (Wed) is the signature moment: it starts as a dashed conflict outline
 * and settles into a solved block on mount, literalizing the headline's
 * "sem conflitos" claim instead of showing a generic screenshot.
 */
const ROWS: Row[] = [
  {
    day: "Seg",
    chips: [
      { width: "20%", tone: "muted" },
      { width: "14%", tone: "soft" },
      { width: "28%", tone: "muted" },
      { width: "16%", tone: "muted" },
    ],
  },
  {
    day: "Ter",
    chips: [
      { width: "16%", tone: "muted" },
      { width: "24%", tone: "muted" },
      { width: "12%", tone: "soft" },
      { width: "26%", tone: "muted" },
    ],
  },
  {
    day: "Qua",
    chips: [
      { width: "18%", tone: "muted" },
      { width: "22%", tone: "resolving" },
      { width: "20%", tone: "muted" },
    ],
  },
  {
    day: "Qui",
    chips: [
      { width: "14%", tone: "soft" },
      { width: "30%", tone: "muted" },
      { width: "18%", tone: "muted" },
      { width: "16%", tone: "muted" },
    ],
  },
  {
    day: "Sex",
    chips: [
      { width: "26%", tone: "muted" },
      { width: "18%", tone: "soft" },
      { width: "24%", tone: "muted" },
    ],
  },
];

function ScheduleChip({ width, tone }: Chip) {
  if (tone === "resolving") {
    return (
      <span className="relative h-7 shrink-0 sm:h-8" style={{ width }}>
        <span
          aria-hidden
          className="absolute inset-0 rounded-md border border-dashed border-destructive/50 duration-500 delay-700 animate-out fade-out fill-mode-forwards motion-reduce:hidden"
        />
        <span
          className="btn-gold absolute inset-0 flex items-center justify-end rounded-md pr-1 duration-500 delay-700 animate-in fade-in zoom-in-95 fill-mode-forwards motion-reduce:animate-none"
        >
          <Check className="size-3.5" strokeWidth={3} aria-hidden />
        </span>
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "h-7 shrink-0 rounded-md sm:h-8",
        tone === "soft" ? "bg-gold-soft/50" : "bg-primary/10"
      )}
      style={{ width }}
    />
  );
}

export function HeroBanner() {
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-8 rounded-[2rem] bg-accent/15 blur-3xl" />
      <div className="card-elevated relative rounded-[1.75rem] p-6 sm:p-8">
        <div className="flex flex-col gap-3.5 sm:gap-4">
          {ROWS.map((row) => (
            <div key={row.day} className="flex items-center gap-3">
              <span className="w-8 shrink-0 font-sans text-[0.65rem] font-medium uppercase tracking-wide text-muted-foreground sm:w-9">
                {row.day}
              </span>
              <div className="flex flex-1 items-center gap-1.5">
                {row.chips.map((chip, index) => (
                  <ScheduleChip key={index} {...chip} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
