import { DAY_OF_WEEK_ORDER } from "@/lib/enum-labels";
import type { GeneratedTimeSlotItem, TimeSlotGenerationConfig } from "@/types/TimeSlot";

function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function fromMinutes(totalMinutes: number): string {
  const hours = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const minutes = String(totalMinutes % 60).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Walks the day in fixed-size steps of `classDurationMinutes` starting at
 * `dayStart`, dropping any step that overlaps a break — a break that isn't a
 * multiple of the class duration just eats into the following slot(s).
 */
export function generateTimeSlots(config: TimeSlotGenerationConfig): GeneratedTimeSlotItem[] {
  const dayStartMinutes = toMinutes(config.dayStart);
  const dayEndMinutes = toMinutes(config.dayEnd);
  const breaksInMinutes = config.breaks.map((b) => ({
    start: toMinutes(b.start),
    end: toMinutes(b.end),
  }));

  const orderedDays = DAY_OF_WEEK_ORDER.filter((day) => config.daysOfWeek.includes(day));
  const items: GeneratedTimeSlotItem[] = [];

  for (const day of orderedDays) {
    for (
      let cursor = dayStartMinutes;
      cursor + config.classDurationMinutes <= dayEndMinutes;
      cursor += config.classDurationMinutes
    ) {
      const slotEnd = cursor + config.classDurationMinutes;
      const overlapsBreak = breaksInMinutes.some((b) => b.start < slotEnd && b.end > cursor);
      if (overlapsBreak) continue;

      items.push({
        dayOfWeek: day,
        startTime: fromMinutes(cursor),
        endTime: fromMinutes(slotEnd),
      });
    }
  }

  return items;
}
