import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DAY_OF_WEEK_LABELS, DAY_OF_WEEK_SHORT_LABELS } from "@/lib/enum-labels";
import type { DayOfWeek } from "@/types/TimeSlot";
import type { ScheduleEntry } from "@/types/ScheduleEntry";

type MobileDayScheduleProps = {
  days: DayOfWeek[];
  entries: ScheduleEntry[];
  renderEntry: (entry: ScheduleEntry) => ReactNode;
  emptyMessage?: string;
};

const JS_DAY_INDEX_TO_DAY_OF_WEEK: DayOfWeek[] = [
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

/**
 * Alternativa à grade semanal completa para telas estreitas: abas por dia da
 * semana, cada uma listando as aulas daquele dia em ordem cronológica. Reaproveita
 * os mesmos `entries`/`renderEntry` já carregados pela grade — só troca a
 * apresentação, sem nenhuma chamada de API própria.
 */
export function MobileDaySchedule({
  days,
  entries,
  renderEntry,
  emptyMessage,
}: MobileDayScheduleProps) {
  const { t } = useTranslation("weeklyScheduleGrid");
  const effectiveEmptyMessage = emptyMessage ?? t("emptyMessage");

  if (days.length === 0) {
    return <p className="text-sm text-muted-foreground">{effectiveEmptyMessage}</p>;
  }

  const today = JS_DAY_INDEX_TO_DAY_OF_WEEK[new Date().getDay()];
  const defaultDay = days.includes(today) ? today : days[0];

  return (
    <Tabs defaultValue={defaultDay}>
      <TabsList className="w-full">
        {days.map((day) => (
          <TabsTrigger key={day} value={day} className="flex-1">
            {DAY_OF_WEEK_SHORT_LABELS[day]}
          </TabsTrigger>
        ))}
      </TabsList>

      {days.map((day) => {
        const dayEntries = entries
          .filter((entry) => entry.dayOfWeek === day)
          .sort((a, b) => a.startTime.localeCompare(b.startTime));

        return (
          <TabsContent key={day} value={day} className="mt-3">
            <h2 className="mb-2 text-sm font-medium text-foreground">{DAY_OF_WEEK_LABELS[day]}</h2>
            {dayEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noClassesThisDay")}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {dayEntries.map((entry) => (
                  <li key={entry.id} className="card-elevated rounded-2xl p-3">
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      {entry.startTime.slice(0, 5)} - {entry.endTime.slice(0, 5)}
                    </p>
                    {renderEntry(entry)}
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
