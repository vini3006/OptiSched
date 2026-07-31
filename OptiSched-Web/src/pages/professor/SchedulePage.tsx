import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { WeeklyScheduleGrid } from "@/components/admin/WeeklyScheduleGrid";
import { MobileDaySchedule } from "@/components/admin/MobileDaySchedule";
import { getFullWeekGridDimensions } from "@/lib/weekly-grid";
import { buildIcsContent } from "@/lib/ics";
import { fetchActiveSchedule } from "@/api/schedules";
import { listScheduleEntries } from "@/api/schedule-entries";
import { listTimeSlots } from "@/api/time-slots";
import { listSemesters } from "@/api/semesters";
import { useAuth } from "@/hooks/UseAuth";

function EmptyNotice({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

export function SchedulePage() {
  const { t } = useTranslation("professorSchedule");
  const { user } = useAuth();
  const institutionId = user?.institutionId ?? null;
  const professorId = user?.professorId ?? null;

  const { data: activeSchedule, isLoading: isLoadingSchedule } = useQuery({
    queryKey: ["schedule-active", institutionId],
    queryFn: () => fetchActiveSchedule(institutionId as number),
    enabled: institutionId !== null,
  });

  const scheduleId = activeSchedule?.id ?? null;

  const { data: entries, isLoading: isLoadingEntries } = useQuery({
    queryKey: ["schedule-entries", scheduleId, institutionId],
    queryFn: () => listScheduleEntries(scheduleId as number, institutionId as number),
    enabled: scheduleId !== null && institutionId !== null,
  });

  const { data: timeSlots } = useQuery({
    queryKey: ["time-slots", institutionId],
    queryFn: () => listTimeSlots(institutionId as number),
    enabled: institutionId !== null,
  });

  const { data: semesters } = useQuery({
    queryKey: ["semesters", institutionId],
    queryFn: () => listSemesters(institutionId as number),
    enabled: institutionId !== null,
  });

  const semester = semesters?.find((s) => s.id === activeSchedule?.semesterId) ?? null;

  const myEntries = useMemo(
    () => (entries ?? []).filter((entry) => entry.professorId === professorId),
    [entries, professorId]
  );
  const dimensions = useMemo(() => getFullWeekGridDimensions(timeSlots ?? []), [timeSlots]);

  function handleExport() {
    if (!semester?.startDate || !semester?.endDate || myEntries.length === 0) return;

    const content = buildIcsContent(myEntries, semester.startDate, semester.endDate);
    const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "meu-horario.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const canExport = !!semester?.startDate && !!semester?.endDate && myEntries.length > 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-primary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        {!isLoadingSchedule && activeSchedule && !isLoadingEntries && myEntries.length > 0 && (
          <Button variant="outline" onClick={handleExport} disabled={!canExport}>
            <Download className="size-4" />
            {t("exportButton")}
          </Button>
        )}
      </div>

      {!isLoadingSchedule && activeSchedule && !isLoadingEntries && myEntries.length > 0 && !canExport && (
        <p className="mt-2 text-sm text-muted-foreground">{t("exportDateNotice")}</p>
      )}

      <div className="mt-6">
        {isLoadingSchedule && <EmptyNotice text={t("common:status.loading")} />}
        {!isLoadingSchedule && !activeSchedule && <EmptyNotice text={t("noActiveSchedule")} />}
        {!isLoadingSchedule && activeSchedule && isLoadingEntries && (
          <EmptyNotice text={t("common:status.loading")} />
        )}
        {!isLoadingSchedule && activeSchedule && !isLoadingEntries && (
          <>
            <div className="md:hidden">
              <MobileDaySchedule
                entries={myEntries}
                days={dimensions.days}
                emptyMessage={t("noEntries")}
                renderEntry={(entry) => (
                  <>
                    <p className="font-medium text-foreground">{entry.subjectName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("entryCourseSection", { course: entry.courseName, section: entry.section })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("entryClassroom", { classroom: entry.classroomNumber })}
                    </p>
                  </>
                )}
              />
            </div>
            <div className="hidden md:block">
              <WeeklyScheduleGrid
                entries={myEntries}
                days={dimensions.days}
                rows={dimensions.rows}
                emptyMessage={t("noEntries")}
                renderEntry={(entry) => (
                  <>
                    <p className="font-medium text-foreground">{entry.subjectName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("entryCourseSection", { course: entry.courseName, section: entry.section })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("entryClassroom", { classroom: entry.classroomNumber })}
                    </p>
                  </>
                )}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
