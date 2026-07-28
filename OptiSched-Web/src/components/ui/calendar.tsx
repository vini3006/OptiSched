import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type CalendarProps = {
  selected?: Date;
  month: Date;
  onMonthChange: (month: Date) => void;
  onSelect: (date: Date) => void;
};

export function Calendar({ selected, month, onMonthChange, onSelect }: CalendarProps) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();

  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const today = new Date();

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = month.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className="w-72">
      <div className="flex items-center justify-between px-1 pb-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium text-foreground capitalize">{monthLabel}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="flex h-8 items-center justify-center text-xs font-medium text-muted-foreground"
          >
            {label}
          </div>
        ))}

        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`blank-${index}`} />;
          }

          const date = new Date(year, monthIndex, day);
          const isSelected = selected && isSameDay(date, selected);
          const isToday = isSameDay(date, today);

          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect(date)}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors hover:bg-secondary",
                isToday && !isSelected && "font-semibold text-accent-foreground ring-1 ring-inset ring-accent",
                isSelected && "btn-gold font-semibold hover:brightness-100"
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
