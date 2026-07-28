import { DAY_OF_WEEK_ORDER } from "@/lib/enum-labels";
import type { DayOfWeek } from "@/types/TimeSlot";
import type { ScheduleEntry } from "@/types/ScheduleEntry";

export type WeeklyGridRow = { startTime: string; endTime: string };

export type WeeklyGridDimensions = {
  days: DayOfWeek[];
  rows: WeeklyGridRow[];
};

/**
 * Computa os dias/horários únicos a partir de um conjunto de referência de
 * entradas (normalmente TODAS as entradas da grade, não só as filtradas),
 * para que todos os calendários renderizados a partir dele tenham o mesmo
 * formato/tamanho, independente do filtro aplicado em cada um.
 */
export function getWeeklyGridDimensions(entries: ScheduleEntry[]): WeeklyGridDimensions {
  const rowsMap = new Map<string, WeeklyGridRow>();
  for (const entry of entries) {
    const key = `${entry.startTime}-${entry.endTime}`;
    if (!rowsMap.has(key)) {
      rowsMap.set(key, { startTime: entry.startTime, endTime: entry.endTime });
    }
  }
  const rows = [...rowsMap.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));

  const daysPresent = new Set(entries.map((entry) => entry.dayOfWeek));
  const days = DAY_OF_WEEK_ORDER.filter((day) => daysPresent.has(day));

  return { days, rows };
}
