import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Lock, Unlock } from "lucide-react";

import { DAY_OF_WEEK_LABELS } from "@/lib/enum-labels";
import { cn } from "@/lib/utils";
import { toneForSubject, type WeeklyGridDimensions, type WeeklyGridRow } from "@/lib/weekly-grid";
import type { DayOfWeek } from "@/types/TimeSlot";
import type { ScheduleEntry } from "@/types/ScheduleEntry";

type WeeklyScheduleGridProps = WeeklyGridDimensions & {
  entries: ScheduleEntry[];
  renderEntry: (entry: ScheduleEntry) => ReactNode;
  emptyMessage?: string;
  onEntryClick?: (entry: ScheduleEntry) => void;
  draggable?: boolean;
  onEntryDrop?: (entryId: number, day: DayOfWeek, startTime: string) => void;
  onToggleLock?: (entry: ScheduleEntry) => void;
};

type DragState = {
  entryId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  isDragging: boolean;
};

type HoverCell = { day: DayOfWeek; startTime: string };

const DRAG_THRESHOLD_PX = 5;

export function WeeklyScheduleGrid({
  entries,
  days,
  rows,
  renderEntry,
  emptyMessage,
  onEntryClick,
  draggable = false,
  onEntryDrop,
  onToggleLock,
}: WeeklyScheduleGridProps) {
  const { t } = useTranslation("weeklyScheduleGrid");
  const effectiveEmptyMessage = emptyMessage ?? t("emptyMessage");
  const [drag, setDrag] = useState<DragState | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverCell, setHoverCell] = useState<HoverCell | null>(null);

  const dragRef = useRef(drag);
  useLayoutEffect(() => {
    dragRef.current = drag;
  }, [drag]);
  const entriesRef = useRef(entries);
  useLayoutEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  useEffect(() => {
    if (!drag) return;

    function findCellAt(x: number, y: number): HoverCell | null {
      const target = document.elementFromPoint(x, y);
      const cell = target instanceof Element ? target.closest<HTMLElement>("[data-cell-day]") : null;
      if (!cell?.dataset.cellDay || !cell.dataset.cellStartTime) return null;
      return { day: cell.dataset.cellDay as DayOfWeek, startTime: cell.dataset.cellStartTime };
    }

    function handlePointerMove(event: PointerEvent) {
      const current = dragRef.current;
      if (!current) return;

      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;

      if (!current.isDragging && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
        setDrag({ ...current, isDragging: true });
      }

      setPointerPos({ x: event.clientX, y: event.clientY });
      setHoverCell(findCellAt(event.clientX, event.clientY));
    }

    function handlePointerUp(event: PointerEvent) {
      const current = dragRef.current;
      setDrag(null);
      setPointerPos(null);
      setHoverCell(null);

      if (!current) return;

      if (current.isDragging) {
        const cell = findCellAt(event.clientX, event.clientY);
        if (cell) {
          onEntryDrop?.(current.entryId, cell.day, cell.startTime);
        }
      } else {
        const entry = entriesRef.current.find((e) => e.id === current.entryId);
        if (entry) onEntryClick?.(entry);
      }
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  if (rows.length === 0 || days.length === 0) {
    return <p className="text-sm text-muted-foreground">{effectiveEmptyMessage}</p>;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>, entry: ScheduleEntry) {
    if (!draggable) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    setDrag({
      entryId: entry.id,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      isDragging: false,
    });
  }

  // Enquanto arrasta sobre uma célula já ocupada, mostra a troca acontecendo
  // ao vivo (a aula de baixo "sobe" pro lugar de onde a arrastada saiu) — só
  // vira de verdade quando o usuário soltar.
  function getDisplayEntries(): ScheduleEntry[] {
    if (!drag?.isDragging || !hoverCell) return entries;

    const draggedEntry = entries.find((e) => e.id === drag.entryId);
    if (!draggedEntry) return entries;

    const isSameCell =
      draggedEntry.dayOfWeek === hoverCell.day && draggedEntry.startTime === hoverCell.startTime;
    if (isSameCell) return entries;

    const hoverEntry = entries.find(
      (e) => e.id !== drag.entryId && e.dayOfWeek === hoverCell.day && e.startTime === hoverCell.startTime
    );

    const displayed: ScheduleEntry[] = [];
    for (const e of entries) {
      if (e.id === drag.entryId) continue; // segue o mouse como card flutuante
      if (hoverEntry && e.id === hoverEntry.id) {
        displayed.push({
          ...e,
          dayOfWeek: draggedEntry.dayOfWeek,
          startTime: draggedEntry.startTime,
          endTime: draggedEntry.endTime,
        });
        continue;
      }
      displayed.push(e);
    }
    return displayed;
  }

  const displayEntries = getDisplayEntries();

  function entriesFor(day: DayOfWeek, startTime: string) {
    return displayEntries.filter((entry) => entry.dayOfWeek === day && entry.startTime === startTime);
  }

  const draggedEntry = drag?.isDragging ? entries.find((e) => e.id === drag.entryId) : undefined;

  return (
    <div className="card-elevated overflow-x-auto rounded-2xl">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border p-2 text-left text-xs font-medium text-muted-foreground">
              {t("columnTime")}
            </th>
            {days.map((day) => (
              <th
                key={day}
                className="border-b-2 border-b-accent p-2 text-left font-display font-semibold text-foreground"
              >
                {DAY_OF_WEEK_LABELS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: WeeklyGridRow) => (
            <tr key={`${row.startTime}-${row.endTime}`}>
              <td className="border-b border-border p-2 align-top text-xs whitespace-nowrap text-muted-foreground">
                {row.startTime.slice(0, 5)} - {row.endTime.slice(0, 5)}
              </td>
              {days.map((day) => {
                const cellEntries = entriesFor(day, row.startTime);
                const isHovered =
                  drag?.isDragging && hoverCell?.day === day && hoverCell.startTime === row.startTime;
                return (
                  <td
                    key={day}
                    data-cell-day={day}
                    data-cell-start-time={row.startTime}
                    className={cn(
                      "min-w-40 border-b border-border p-2 align-top transition-colors",
                      isHovered && "bg-primary/10 ring-2 ring-inset ring-primary/50"
                    )}
                  >
                    {cellEntries.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {cellEntries.map((entry) => (
                          <div
                            key={entry.id}
                            className={cn(
                              "relative rounded-xl p-2.5 transition-[filter]",
                              toneForSubject(entry.subjectId),
                              onEntryClick && "cursor-pointer hover:brightness-95",
                              draggable && "cursor-grab active:cursor-grabbing",
                              entry.locked && "ring-2 ring-inset ring-primary/60"
                            )}
                            onPointerDown={(event) => handlePointerDown(event, entry)}
                          >
                            {onToggleLock && (
                              <button
                                type="button"
                                title={entry.locked ? t("lockAriaLabelLocked") : t("lockAriaLabelUnlocked")}
                                aria-label={entry.locked ? t("lockAriaLabelLocked") : t("lockAriaLabelUnlocked")}
                                aria-pressed={entry.locked}
                                className="absolute top-1.5 right-1.5 z-10 rounded bg-secondary/80 p-0.5 text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                                onPointerDown={(event) => event.stopPropagation()}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  onToggleLock(entry);
                                }}
                              >
                                {entry.locked ? (
                                  <Lock className="size-3.5 text-primary" />
                                ) : (
                                  <Unlock className="size-3.5" />
                                )}
                              </button>
                            )}
                            <div className={cn(onToggleLock && "pr-5")}>{renderEntry(entry)}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {draggedEntry && pointerPos && (
        <div
          className={cn(
            "pointer-events-none fixed z-50 min-w-40 scale-105 rounded-xl p-2.5 opacity-90 shadow-lg",
            toneForSubject(draggedEntry.subjectId)
          )}
          style={{ left: pointerPos.x - drag!.offsetX, top: pointerPos.y - drag!.offsetY }}
        >
          {renderEntry(draggedEntry)}
        </div>
      )}
    </div>
  );
}
