import type { ReactNode } from "react";

import { DAY_OF_WEEK_LABELS } from "@/lib/enum-labels";
import type { WeeklyGridDimensions, WeeklyGridRow } from "@/lib/weekly-grid";
import type { DayOfWeek } from "@/types/TimeSlot";
import type { ScheduleEntry } from "@/types/ScheduleEntry";

type WeeklyScheduleGridProps = WeeklyGridDimensions & {
  entries: ScheduleEntry[];
  renderEntry: (entry: ScheduleEntry) => ReactNode;
  emptyMessage?: string;
};

export function WeeklyScheduleGrid({
  entries,
  days,
  rows,
  renderEntry,
  emptyMessage = "Nenhuma aula alocada.",
}: WeeklyScheduleGridProps) {
  if (rows.length === 0 || days.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  function entriesFor(day: DayOfWeek, startTime: string) {
    return entries.filter((entry) => entry.dayOfWeek === day && entry.startTime === startTime);
  }

  return (
    <div className="card-elevated overflow-x-auto rounded-2xl">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border-b border-border p-2 text-left font-medium text-muted-foreground">
              Horário
            </th>
            {days.map((day) => (
              <th
                key={day}
                className="border-b border-border p-2 text-left font-medium text-muted-foreground"
              >
                {DAY_OF_WEEK_LABELS[day]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row: WeeklyGridRow) => (
            <tr key={`${row.startTime}-${row.endTime}`}>
              <td className="border-b border-border p-2 align-top font-medium whitespace-nowrap">
                {row.startTime.slice(0, 5)} - {row.endTime.slice(0, 5)}
              </td>
              {days.map((day) => {
                const cellEntries = entriesFor(day, row.startTime);
                return (
                  <td key={day} className="min-w-40 border-b border-border p-2 align-top">
                    {cellEntries.length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {cellEntries.map((entry) => (
                          <div key={entry.id} className="rounded-lg bg-secondary p-2">
                            {renderEntry(entry)}
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
    </div>
  );
}
