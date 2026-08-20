import type { ScheduleEntry } from "@/types/ScheduleEntry";
import type { DayOfWeek } from "@/types/TimeSlot";
import { parseISODateString } from "@/lib/date";

// iCalendar (RFC 5545) BYDAY codes, and JS Date#getDay() index (0 = Sunday)
// for computing the first occurrence of each weekday.
const BYDAY: Record<DayOfWeek, string> = {
  SUNDAY: "SU",
  MONDAY: "MO",
  TUESDAY: "TU",
  WEDNESDAY: "WE",
  THURSDAY: "TH",
  FRIDAY: "FR",
  SATURDAY: "SA",
};

const WEEKDAY_INDEX: Record<DayOfWeek, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function firstOccurrenceOnOrAfter(start: Date, targetDay: DayOfWeek): Date {
  const result = new Date(start);
  const diffDays = (WEEKDAY_INDEX[targetDay] - start.getDay() + 7) % 7;
  result.setDate(result.getDate() + diffDays);
  return result;
}

/**
 * Formats a wall-clock date/time as a "floating" iCalendar DATE-TIME (no
 * timezone suffix) — the system doesn't track an institution timezone
 * anywhere, so every event is emitted in whatever local time the values
 * represent, matching how the schedule itself is displayed in the app.
 */
function formatFloatingDateTime(date: Date, hours: number, minutes: number): string {
  return (
    `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}` +
    `T${pad(hours)}${pad(minutes)}00`
  );
}

function formatUtcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

function formatUntilDate(date: Date): string {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T235959Z`;
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function parseTime(value: string): { hours: number; minutes: number } {
  const [hours, minutes] = value.split(":").map(Number);
  return { hours, minutes };
}

/**
 * Builds a VCALENDAR document with one recurring VEVENT per schedule entry:
 * the first occurrence lands on the entry's weekday on/after semesterStart,
 * then repeats weekly (RRULE) until semesterEnd.
 */
export function buildIcsContent(
  entries: ScheduleEntry[],
  semesterStart: string,
  semesterEnd: string
): string {
  const start = parseISODateString(semesterStart);
  const end = parseISODateString(semesterEnd);

  if (!start || !end) {
    throw new Error("Invalid semester date range.");
  }

  const until = formatUntilDate(end);
  const now = new Date();

  const lines: string[] = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//OptiSched//Schedule Export//PT-BR"];

  entries.forEach((entry, index) => {
    const entryStart = parseTime(entry.startTime);
    const entryEnd = parseTime(entry.endTime);
    const firstDate = firstOccurrenceOnOrAfter(start, entry.dayOfWeek);

    lines.push(
      "BEGIN:VEVENT",
      `UID:optisched-entry-${entry.id}-${index}@optisched`,
      `DTSTAMP:${formatUtcStamp(now)}`,
      `DTSTART:${formatFloatingDateTime(firstDate, entryStart.hours, entryStart.minutes)}`,
      `DTEND:${formatFloatingDateTime(firstDate, entryEnd.hours, entryEnd.minutes)}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[entry.dayOfWeek]};UNTIL=${until}`,
      `SUMMARY:${escapeIcsText(`${entry.subjectName} — ${entry.courseName ?? entry.turmaName ?? ""}`)}`,
      `LOCATION:${escapeIcsText(`Sala ${entry.classroomNumber}`)}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}
