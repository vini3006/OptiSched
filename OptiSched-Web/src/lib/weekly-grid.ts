import { DAY_OF_WEEK_ORDER, WEEKDAY_ORDER } from "@/lib/enum-labels";
import type { DayOfWeek, TimeSlot } from "@/types/TimeSlot";
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

/**
 * Computa as dimensões de um calendário fixo de segunda a sexta, com as
 * linhas de horário vindas do catálogo de TimeSlots da instituição (não das
 * entries do professor) — assim os dias sem aula continuam aparecendo,
 * em vez de somem do calendário, o que ajudaria o professor a se perder.
 */
export function getFullWeekGridDimensions(timeSlots: TimeSlot[]): WeeklyGridDimensions {
  const rowsMap = new Map<string, WeeklyGridRow>();
  for (const timeSlot of timeSlots) {
    if (!WEEKDAY_ORDER.includes(timeSlot.dayOfWeek)) continue;
    const key = `${timeSlot.startTime}-${timeSlot.endTime}`;
    if (!rowsMap.has(key)) {
      rowsMap.set(key, { startTime: timeSlot.startTime, endTime: timeSlot.endTime });
    }
  }
  const rows = [...rowsMap.values()].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return { days: WEEKDAY_ORDER, rows };
}

/**
 * Tons pastel usados nos blocos de aula da grade, no estilo dos
 * compromissos coloridos do mockup da landing page — cada disciplina
 * sempre cai no mesmo tom (hash determinístico em subjectId), o que ajuda
 * a escanear a grade visualmente sem precisar trocar as cores de texto já
 * usadas em cada renderEntry (os tons são todos claros o bastante para o
 * texto escuro padrão continuar legível).
 */
const ENTRY_TONE_CLASSES = [
  "bg-primary/10 border-l-4 border-l-primary",
  "bg-accent/15 border-l-4 border-l-accent",
  "bg-olive-deep/10 border-l-4 border-l-olive-deep",
  "bg-secondary border-l-4 border-l-border",
] as const;

export function toneForSubject(subjectId: number): string {
  return ENTRY_TONE_CLASSES[subjectId % ENTRY_TONE_CLASSES.length];
}
