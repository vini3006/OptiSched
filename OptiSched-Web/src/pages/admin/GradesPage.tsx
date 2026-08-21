import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { GitCompare, Plus, Power, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import { WeeklyScheduleGrid } from "@/components/admin/WeeklyScheduleGrid";
import { getWeeklyGridDimensions, type WeeklyGridDimensions } from "@/lib/weekly-grid";
import {
  compareSchedules,
  deleteSchedule,
  generateSchedule,
  listSchedules,
  toggleScheduleStatus,
} from "@/api/schedules";
import {
  deleteScheduleEntry,
  listScheduleEntries,
  moveScheduleEntry,
  toggleScheduleEntryLocked,
  updateScheduleEntry,
} from "@/api/schedule-entries";
import { getInstitution } from "@/api/institutions";
import { listCourses } from "@/api/courses";
import { listTurmas } from "@/api/turmas";
import { listSubjects } from "@/api/subjects";
import { listProfessors } from "@/api/professors";
import { listClassrooms } from "@/api/classrooms";
import { listSemesters } from "@/api/semesters";
import { listTimeSlots } from "@/api/time-slots";
import {
  generateScheduleSchema,
  type GenerateScheduleFormValues,
} from "@/lib/validations/generate-schedule-schema";
import {
  scheduleEntrySchema,
  type ScheduleEntryFormValues,
} from "@/lib/validations/schedule-entry-schema";
import { useSelectedInstitution } from "@/hooks/UseSelectedInstitution";
import { DAY_OF_WEEK_LABELS, PREFERRED_SHIFT_LABELS, TERM_LABELS } from "@/lib/enum-labels";
import type { PreferredShift, Schedule } from "@/types/Schedule";
import type { ScheduleEntry } from "@/types/ScheduleEntry";
import type { Semester } from "@/types/Semester";
import type { Course } from "@/types/Course";
import type { Turma } from "@/types/Turma";
import type { Professor } from "@/types/Professor";
import type { Classroom } from "@/types/Classroom";
import type { Subject } from "@/types/Subject";
import type { DayOfWeek, TimeSlot } from "@/types/TimeSlot";

function EmptyNotice({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function semesterLabel(semesters: Semester[] | undefined, semesterId: number, isSchool: boolean) {
  const semester = semesters?.find((s) => s.id === semesterId);
  if (!semester) return `#${semesterId}`;
  return isSchool ? `${semester.year}` : `${semester.year} - ${TERM_LABELS[semester.term]}`;
}

function scheduleLabel(semesters: Semester[] | undefined, schedule: Schedule, isSchool: boolean) {
  return `${semesterLabel(semesters, schedule.semesterId, isSchool)} (Versão ${schedule.version})`;
}

function timeSlotLabel(timeSlots: TimeSlot[] | undefined, timeSlotId: number) {
  const timeSlot = timeSlots?.find((t) => t.id === timeSlotId);
  if (!timeSlot) return `#${timeSlotId}`;
  return `${DAY_OF_WEEK_LABELS[timeSlot.dayOfWeek]} · ${timeSlot.startTime.slice(0, 5)} - ${timeSlot.endTime.slice(0, 5)}`;
}

/**
 * courseName/section (UNIVERSITY mode) and turmaName (SCHOOL mode) are
 * mutually exclusive on a ScheduleEntry — this picks whichever one applies.
 */
function entryGroupLabel(
  entry: ScheduleEntry,
  t: (key: string, options?: Record<string, string | null>) => string
): string {
  if (entry.courseName !== null) {
    return t("entryClassSection", { course: entry.courseName, section: entry.section });
  }
  return entry.turmaName ?? "";
}

/**
 * O backend retorna mensagens de validação em inglês (convenção do código
 * Java) — aqui elas são traduzidas pra frases específicas em português antes
 * de aparecer pro Admin, em vez de vazar o texto cru da API.
 */
function translateScheduleEntryError(
  t: (key: string, options?: Record<string, string>) => string,
  message: string | undefined,
  isSchool: boolean
): string {
  if (!message) return t("error.generic");

  if (message.includes("swapping would place")) {
    const [, displaced, blocking] = message.match(/"([^"]+)".*"([^"]+)"/) ?? [];
    if (displaced && blocking) {
      return t(isSchool ? "error.sameTurmaSwap" : "error.sameCourseSemesterSwap", { displaced, blocking });
    }
    return t(isSchool ? "error.sameTurma" : "error.sameCourseSemester");
  }
  if (message.includes("is not qualified to teach")) {
    return t("error.notQualified");
  }
  if (message.includes("is not available")) {
    return t("error.notAvailable");
  }
  if (message.includes("does not have enough capacity")) {
    return t("error.notEnoughCapacity");
  }
  if (message.includes("is not a") && message.includes("room, which")) {
    return t("error.wrongRoomType");
  }
  if (message.includes("Classroom is already occupied") || message.includes("is already occupied at")) {
    return t("error.classroomOccupied");
  }
  if (message.includes("Professor is already assigned")) {
    return t("error.professorAlreadyAssigned");
  }
  if (message.includes("ScheduleEntry already exists")) {
    return t("error.entryAlreadyExists");
  }
  if (message.includes("occupied by different classes")) {
    return t("error.occupiedByDifferentClasses");
  }
  if (message.includes("same course and semester")) {
    return t(isSchool ? "error.sameTurma" : "error.sameCourseSemester");
  }
  if (message.includes("Could not swap")) {
    return t("error.couldNotSwap");
  }
  if (message.includes("conflicts with something already in the schedule")) {
    return t("error.conflictsWithSchedule");
  }

  return t("error.generic");
}

export function GradesPage() {
  const { t } = useTranslation("adminGrades");
  const { selectedInstitutionId } = useSelectedInstitution();

  const { data: institution } = useQuery({
    queryKey: ["institution", selectedInstitutionId],
    queryFn: () => getInstitution(selectedInstitutionId as number),
    enabled: selectedInstitutionId !== null,
  });
  const isSchool = institution?.type === "SCHOOL";

  return (
    <div>
      <h1 className="text-xl font-semibold text-primary">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isSchool ? t("subtitleSchool") : t("subtitle")}
      </p>

      {selectedInstitutionId ? (
        <GradesContent institutionId={selectedInstitutionId} />
      ) : (
        <div className="mt-6">
          <EmptyNotice text={t("selectInstitutionNotice")} />
        </div>
      )}
    </div>
  );
}

function GradesContent({ institutionId }: { institutionId: number }) {
  const { t } = useTranslation("adminGrades");
  const queryClient = useQueryClient();
  const schedulesQueryKey = ["schedules", institutionId] as const;

  const { data: institution } = useQuery({
    queryKey: ["institution", institutionId],
    queryFn: () => getInstitution(institutionId),
  });
  const isSchool = institution?.type === "SCHOOL";

  const { data: schedules } = useQuery({
    queryKey: schedulesQueryKey,
    queryFn: () => listSchedules(institutionId),
  });
  const { data: semesters } = useQuery({
    queryKey: ["semesters", institutionId],
    queryFn: () => listSemesters(institutionId),
  });
  const { data: courses } = useQuery({
    queryKey: ["courses", institutionId],
    queryFn: () => listCourses(institutionId),
  });
  const { data: turmas } = useQuery({
    queryKey: ["turmas", institutionId],
    queryFn: () => listTurmas(institutionId),
  });
  const { data: subjects } = useQuery({
    queryKey: ["subjects", institutionId],
    queryFn: () => listSubjects(institutionId),
  });
  const { data: professors } = useQuery({
    queryKey: ["professors", institutionId],
    queryFn: () => listProfessors(institutionId),
  });
  const { data: classrooms } = useQuery({
    queryKey: ["classrooms", institutionId],
    queryFn: () => listClassrooms(institutionId),
  });
  const { data: timeSlots } = useQuery({
    queryKey: ["time-slots", institutionId],
    queryFn: () => listTimeSlots(institutionId),
  });

  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [moveErrorMessage, setMoveErrorMessage] = useState<string | null>(null);

  const sortedSchedules = [...(schedules ?? [])].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );

  useEffect(() => {
    if (scheduleId === null && sortedSchedules.length > 0) {
      setScheduleId(sortedSchedules[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedSchedules.length]);

  const selectedSchedule = sortedSchedules.find((s) => s.id === scheduleId) ?? null;

  const sameSemesterSchedules = selectedSchedule
    ? sortedSchedules.filter((s) => s.semesterId === selectedSchedule.semesterId)
    : [];

  const [compareOpen, setCompareOpen] = useState(false);
  const [compareTargetId, setCompareTargetId] = useState<number | null>(null);

  const { data: comparison, isFetching: isComparing } = useQuery({
    queryKey: ["schedule-compare", selectedSchedule?.id, compareTargetId, institutionId] as const,
    queryFn: () => compareSchedules(selectedSchedule!.id, compareTargetId!, institutionId),
    enabled: compareOpen && selectedSchedule !== null && compareTargetId !== null,
  });

  function openCompare() {
    setCompareTargetId(null);
    setCompareOpen(true);
  }

  const entriesQueryKey = ["schedule-entries", scheduleId, institutionId] as const;

  const { data: entries, isLoading: isLoadingEntries } = useQuery({
    queryKey: entriesQueryKey,
    queryFn: () => listScheduleEntries(scheduleId as number, institutionId),
    enabled: scheduleId !== null,
  });

  const dimensions = useMemo(() => getWeeklyGridDimensions(entries ?? []), [entries]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [turmaId, setTurmaId] = useState<number | null>(null);
  const [professorId, setProfessorId] = useState<number | null>(null);
  const [classroomId, setClassroomId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const [editingEntry, setEditingEntry] = useState<ScheduleEntry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<ScheduleEntry | null>(null);
  const [entryFormError, setEntryFormError] = useState<string | null>(null);
  const [entryActionError, setEntryActionError] = useState<string | null>(null);

  const {
    handleSubmit: handleSubmitEntry,
    watch: watchEntry,
    setValue: setEntryValue,
    reset: resetEntryForm,
    formState: { errors: entryErrors },
  } = useForm<ScheduleEntryFormValues>({
    resolver: zodResolver(scheduleEntrySchema),
    defaultValues: { professorId: 0, classroomId: 0, timeSlotId: 0 },
  });
  const entryProfessorId = watchEntry("professorId");
  const entryClassroomId = watchEntry("classroomId");
  const entryTimeSlotId = watchEntry("timeSlotId");

  const updateEntryMutation = useMutation({
    mutationFn: (values: ScheduleEntryFormValues) =>
      updateScheduleEntry(editingEntry!.id, values, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entriesQueryKey });
      setEditingEntry(null);
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: (id: number) => deleteScheduleEntry(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entriesQueryKey });
      setDeletingEntry(null);
      setEditingEntry(null);
    },
    onError: (error) => {
      setEntryActionError(
        isAxiosError(error) && error.response?.data?.message
          ? translateScheduleEntryError(t, error.response.data.message, isSchool)
          : t("deleteEntryError")
      );
    },
  });

  const moveEntryMutation = useMutation({
    mutationFn: ({ id, timeSlotId }: { id: number; timeSlotId: number }) =>
      moveScheduleEntry(id, timeSlotId, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entriesQueryKey });
    },
    onError: (error) => {
      setMoveErrorMessage(
        isAxiosError(error) && error.response?.data?.message
          ? translateScheduleEntryError(t, error.response.data.message, isSchool)
          : t("moveEntryError")
      );
    },
  });

  function openEditEntry(entry: ScheduleEntry) {
    setEntryFormError(null);
    setEntryActionError(null);
    resetEntryForm({
      professorId: entry.professorId,
      classroomId: entry.classroomId,
      timeSlotId: entry.timeSlotId,
    });
    setEditingEntry(entry);
  }

  async function onSubmitEditEntry(values: ScheduleEntryFormValues) {
    setEntryFormError(null);
    try {
      await updateEntryMutation.mutateAsync(values);
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        setEntryFormError(translateScheduleEntryError(t, error.response.data.message, isSchool));
      } else {
        setEntryFormError(t("saveEntryChangesError"));
      }
    }
  }

  function handleEntryDrop(entryId: number, day: DayOfWeek, startTime: string) {
    const targetSlot = timeSlots?.find((t) => t.dayOfWeek === day && t.startTime === startTime);
    if (!targetSlot) return;
    setMoveErrorMessage(null);
    moveEntryMutation.mutate({ id: entryId, timeSlotId: targetSlot.id });
  }

  const toggleLockMutation = useMutation({
    mutationFn: (id: number) => toggleScheduleEntryLocked(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: entriesQueryKey });
    },
    onError: () => {
      setActionError(t("toggleLockError"));
    },
  });

  function handleToggleLock(entry: ScheduleEntry) {
    setActionError(null);
    toggleLockMutation.mutate(entry.id);
  }

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GenerateScheduleFormValues>({
    resolver: zodResolver(generateScheduleSchema),
    defaultValues: {
      semesterId: 0,
      compactSchedule: 5,
      weeklyDistribution: 5,
      subjectBlocking: 0,
      classroomStability: 5,
      preferShift: false,
      preferredShift: "MORNING",
      preferredShiftWeight: 5,
      courseId: null,
      solverTimeLimitSeconds: null,
    },
  });
  const generateSemesterId = watch("semesterId");
  const compactSchedule = watch("compactSchedule");
  const weeklyDistribution = watch("weeklyDistribution");
  const subjectBlocking = watch("subjectBlocking");
  const classroomStability = watch("classroomStability");
  const preferShift = watch("preferShift");
  const preferredShift = watch("preferredShift");
  const preferredShiftWeight = watch("preferredShiftWeight");
  const generateCourseId = watch("courseId");
  const solverTimeLimitSeconds = watch("solverTimeLimitSeconds");

  const generateMutation = useMutation({
    mutationFn: (values: GenerateScheduleFormValues) =>
      generateSchedule(
        values.semesterId,
        {
          compactSchedule: values.compactSchedule,
          weeklyDistribution: values.weeklyDistribution,
          subjectBlocking: values.subjectBlocking,
          classroomStability: values.classroomStability,
          preferredShift: values.preferShift ? values.preferredShift : null,
          preferredShiftWeight: values.preferShift ? values.preferredShiftWeight : null,
          courseId: values.courseId,
          solverTimeLimitSeconds: values.solverTimeLimitSeconds,
        },
        institutionId
      ),
    onSuccess: (schedule) => {
      queryClient.invalidateQueries({ queryKey: schedulesQueryKey });
      setScheduleId(schedule.id);
      setGenerateOpen(false);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (id: number) => toggleScheduleStatus(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulesQueryKey });
    },
    onError: (error) => {
      setActionError(
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : t("toggleStatusError")
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSchedule(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulesQueryKey });
      setScheduleId(null);
      setDeletingSchedule(null);
    },
    onError: (error) => {
      setActionError(
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : t("deleteScheduleError")
      );
    },
  });

  function openGenerate() {
    setFormError(null);
    reset({
      semesterId: 0,
      compactSchedule: 5,
      weeklyDistribution: 5,
      subjectBlocking: 0,
      classroomStability: 5,
      preferShift: false,
      preferredShift: "MORNING",
      preferredShiftWeight: 5,
      courseId: null,
      solverTimeLimitSeconds: null,
    });
    setGenerateOpen(true);
  }

  function openDeleteSchedule(schedule: Schedule) {
    setActionError(null);
    setDeletingSchedule(schedule);
  }

  async function onSubmitGenerate(values: GenerateScheduleFormValues) {
    setFormError(null);
    try {
      await generateMutation.mutateAsync(values);
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        setFormError(error.response.data.message);
      } else {
        setFormError(t("generateScheduleError"));
      }
    }
  }

  return (
    <div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select
            value={scheduleId !== null ? String(scheduleId) : ""}
            onValueChange={(value) => setScheduleId(value ? Number(value) : null)}
          >
            <SelectTrigger className="w-72">
              <SelectValue placeholder={t("selectSchedulePlaceholder")}>
                {(value: string) => {
                  const schedule = sortedSchedules.find((s) => String(s.id) === value);
                  return schedule ? scheduleLabel(semesters, schedule, isSchool) : value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
              {sortedSchedules.map((schedule) => (
                <SelectItem key={schedule.id} value={String(schedule.id)}>
                  {scheduleLabel(semesters, schedule, isSchool)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedSchedule && (
            <>
              <Badge variant={selectedSchedule.status === "ACTIVE" ? "default" : "outline"}>
                {selectedSchedule.status === "ACTIVE" ? t("statusActive") : t("statusInactive")}
              </Badge>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setActionError(null);
                  toggleStatusMutation.mutate(selectedSchedule.id);
                }}
                disabled={toggleStatusMutation.isPending}
                title={selectedSchedule.status === "ACTIVE" ? t("deactivate") : t("activate")}
                aria-label={selectedSchedule.status === "ACTIVE" ? t("deactivateGrade") : t("activateGrade")}
              >
                <Power className="size-4" />
              </Button>
              {sameSemesterSchedules.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => openCompare()}
                  title={t("compareWithAnotherVersion")}
                  aria-label={t("compareWithAnotherVersion")}
                >
                  <GitCompare className="size-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("deleteGrade")}
                onClick={() => openDeleteSchedule(selectedSchedule)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </>
          )}
        </div>

        <Button variant="outline" onClick={openGenerate}>
          <Plus className="size-4" />
          {t("generateNewGrade")}
        </Button>
      </div>

      {actionError && (
        <p role="alert" className="mt-2 text-sm font-medium text-destructive">
          {actionError}
        </p>
      )}

      <div className="mt-6">
        {scheduleId === null && <EmptyNotice text={t("noScheduleYet")} />}
        {scheduleId !== null && isLoadingEntries && <EmptyNotice text={t("common:status.loading")} />}
        {scheduleId !== null && !isLoadingEntries && (
          <Tabs defaultValue={isSchool ? "turma" : "curso"}>
            <TabsList>
              {isSchool ? (
                <TabsTrigger value="turma">{t("tabByTurma")}</TabsTrigger>
              ) : (
                <TabsTrigger value="curso">{t("tabByCourse")}</TabsTrigger>
              )}
              <TabsTrigger value="professor">{t("tabByProfessor")}</TabsTrigger>
              <TabsTrigger value="sala">{t("tabByClassroom")}</TabsTrigger>
              <TabsTrigger value="disciplina">{t("tabBySubject")}</TabsTrigger>
            </TabsList>

            {isSchool ? (
              <TabsContent value="turma" className="mt-4">
                <ByTurmaView
                  entries={entries ?? []}
                  turmas={turmas}
                  dimensions={dimensions}
                  turmaId={turmaId}
                  onTurmaIdChange={setTurmaId}
                  onEntryClick={openEditEntry}
                  onEntryDrop={handleEntryDrop}
                  onToggleLock={handleToggleLock}
                />
              </TabsContent>
            ) : (
              <TabsContent value="curso" className="mt-4">
                <ByCourseView
                  entries={entries ?? []}
                  courses={courses}
                  dimensions={dimensions}
                  courseId={courseId}
                  onCourseIdChange={setCourseId}
                  onEntryClick={openEditEntry}
                  onEntryDrop={handleEntryDrop}
                  onToggleLock={handleToggleLock}
                />
              </TabsContent>
            )}
            <TabsContent value="professor" className="mt-4">
              <ByProfessorView
                entries={entries ?? []}
                professors={professors}
                dimensions={dimensions}
                professorId={professorId}
                onProfessorIdChange={setProfessorId}
                onEntryClick={openEditEntry}
                onEntryDrop={handleEntryDrop}
                onToggleLock={handleToggleLock}
              />
            </TabsContent>
            <TabsContent value="sala" className="mt-4">
              <ByClassroomView
                entries={entries ?? []}
                classrooms={classrooms}
                dimensions={dimensions}
                classroomId={classroomId}
                onClassroomIdChange={setClassroomId}
                onEntryClick={openEditEntry}
                onEntryDrop={handleEntryDrop}
                onToggleLock={handleToggleLock}
              />
            </TabsContent>
            <TabsContent value="disciplina" className="mt-4">
              <BySubjectView
                entries={entries ?? []}
                subjects={subjects}
                dimensions={dimensions}
                subjectId={subjectId}
                onSubjectIdChange={setSubjectId}
                onEntryClick={openEditEntry}
                onEntryDrop={handleEntryDrop}
                onToggleLock={handleToggleLock}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={moveErrorMessage !== null} onOpenChange={(open) => !open && setMoveErrorMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("moveErrorTitle")}</DialogTitle>
            <DialogDescription>{moveErrorMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button className="btn-gold" />}>{t("moveErrorOkButton")}</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={generateOpen} onOpenChange={(open) => !open && setGenerateOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("generateDialogTitle")}</DialogTitle>
            <DialogDescription>
              {isSchool ? t("generateDialogDescriptionSchool") : t("generateDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitGenerate)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.semesterId}>
                <FieldLabel htmlFor="generate-semester">
                  {isSchool ? t("semesterLabelSchool") : t("semesterLabel")}
                </FieldLabel>
                <Select
                  value={generateSemesterId ? String(generateSemesterId) : ""}
                  onValueChange={(value) => setValue("semesterId", Number(value))}
                >
                  <SelectTrigger id="generate-semester" className="w-full">
                    <SelectValue
                      placeholder={
                        isSchool ? t("selectSemesterPlaceholderSchool") : t("selectSemesterPlaceholder")
                      }
                    >
                      {(value: string) => semesterLabel(semesters, Number(value), isSchool)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {semesters?.map((semester) => (
                      <SelectItem key={semester.id} value={String(semester.id)}>
                        {isSchool ? semester.year : `${semester.year} - ${TERM_LABELS[semester.term]}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.semesterId]} />
              </Field>

              {!isSchool && (
                <Field>
                  <FieldLabel htmlFor="generate-course">{t("generateCourseLabel")}</FieldLabel>
                  <p className="text-xs text-muted-foreground">{t("generateCourseDescription")}</p>
                  <Select
                    value={generateCourseId !== null ? String(generateCourseId) : "ALL"}
                    onValueChange={(value) => setValue("courseId", value === "ALL" ? null : Number(value))}
                  >
                    <SelectTrigger id="generate-course" className="mt-1 w-full">
                      <SelectValue placeholder={t("generateCourseAllOption")}>
                        {(value: string) =>
                          value === "ALL"
                            ? t("generateCourseAllOption")
                            : (courses?.find((c) => String(c.id) === value)?.name ?? value)
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                      <SelectItem value="ALL">{t("generateCourseAllOption")}</SelectItem>
                      {courses?.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              <Field>
                <FieldLabel>{t("compactScheduleLabel")}</FieldLabel>
                <p className="text-xs text-muted-foreground">{t("compactScheduleDescription")}</p>
                <div className="mt-1 flex items-center gap-3">
                  <Slider
                    value={compactSchedule}
                    onValueChange={(v) => setValue("compactSchedule", v as number)}
                    min={0}
                    max={10}
                    step={1}
                    ticks
                    className="flex-1"
                  />
                  <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">
                    {compactSchedule}
                  </span>
                </div>
              </Field>

              <Field>
                <FieldLabel>{t("weeklyDistributionLabel")}</FieldLabel>
                <p className="text-xs text-muted-foreground">{t("weeklyDistributionDescription")}</p>
                <div className="mt-1 flex items-center gap-3">
                  <Slider
                    value={weeklyDistribution}
                    onValueChange={(v) => setValue("weeklyDistribution", v as number)}
                    min={0}
                    max={10}
                    step={1}
                    ticks
                    className="flex-1"
                  />
                  <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">
                    {weeklyDistribution}
                  </span>
                </div>
              </Field>

              <Field>
                <FieldLabel>{t("subjectBlockingLabel")}</FieldLabel>
                <p className="text-xs text-muted-foreground">{t("subjectBlockingDescription")}</p>
                <div className="mt-1 flex items-center gap-3">
                  <Slider
                    value={subjectBlocking}
                    onValueChange={(v) => setValue("subjectBlocking", v as number)}
                    min={0}
                    max={10}
                    step={1}
                    ticks
                    className="flex-1"
                  />
                  <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">
                    {subjectBlocking}
                  </span>
                </div>
              </Field>

              <Field>
                <FieldLabel>{t("classroomStabilityLabel")}</FieldLabel>
                <p className="text-xs text-muted-foreground">{t("classroomStabilityDescription")}</p>
                <div className="mt-1 flex items-center gap-3">
                  <Slider
                    value={classroomStability}
                    onValueChange={(v) => setValue("classroomStability", v as number)}
                    min={0}
                    max={10}
                    step={1}
                    ticks
                    className="flex-1"
                  />
                  <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">
                    {classroomStability}
                  </span>
                </div>
              </Field>

              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="prefer-shift-toggle">{t("preferShiftLabel")}</FieldLabel>
                  <Switch
                    id="prefer-shift-toggle"
                    checked={preferShift}
                    onCheckedChange={(checked) => setValue("preferShift", checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t("preferShiftDescription")}</p>
                {preferShift && (
                  <div className="mt-2 flex items-center gap-3">
                    <Select
                      value={preferredShift}
                      onValueChange={(value) => setValue("preferredShift", value as PreferredShift)}
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue placeholder={t("shiftPlaceholder")}>
                          {(value: string) => PREFERRED_SHIFT_LABELS[value as PreferredShift]}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                        {(Object.keys(PREFERRED_SHIFT_LABELS) as PreferredShift[]).map((shift) => (
                          <SelectItem key={shift} value={shift}>
                            {PREFERRED_SHIFT_LABELS[shift]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Slider
                      value={preferredShiftWeight}
                      onValueChange={(v) => setValue("preferredShiftWeight", v as number)}
                      min={0}
                      max={10}
                      step={1}
                      ticks
                      className="flex-1"
                    />
                    <span className="w-6 text-right text-sm tabular-nums text-muted-foreground">
                      {preferredShiftWeight}
                    </span>
                  </div>
                )}
              </Field>

              <Field data-invalid={!!errors.solverTimeLimitSeconds}>
                <FieldLabel htmlFor="generate-solver-time-limit">{t("solverTimeLimitLabel")}</FieldLabel>
                <p className="text-xs text-muted-foreground">{t("solverTimeLimitDescription")}</p>
                <Input
                  id="generate-solver-time-limit"
                  type="number"
                  min={5}
                  max={300}
                  placeholder={t("solverTimeLimitPlaceholder")}
                  value={solverTimeLimitSeconds ?? ""}
                  onChange={(e) =>
                    setValue("solverTimeLimitSeconds", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
                <FieldError errors={[errors.solverTimeLimitSeconds]} />
              </Field>

              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}
              <Button type="submit" disabled={generateMutation.isPending} className="btn-gold">
                {generateMutation.isPending ? t("generating") : t("generateGrade")}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingEntry} onOpenChange={(open) => !open && setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editEntryTitle")}</DialogTitle>
            <DialogDescription>
              {editingEntry?.courseName !== null
                ? t("entryDescription", {
                    subject: editingEntry?.subjectName,
                    course: editingEntry?.courseName,
                    section: editingEntry?.section,
                  })
                : t("entryDescriptionSchool", {
                    subject: editingEntry?.subjectName,
                    turma: editingEntry?.turmaName,
                  })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEntry(onSubmitEditEntry)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!entryErrors.professorId}>
                <FieldLabel htmlFor="entry-professor">{t("professorLabel")}</FieldLabel>
                <Select
                  value={entryProfessorId ? String(entryProfessorId) : ""}
                  onValueChange={(value) => setEntryValue("professorId", Number(value))}
                >
                  <SelectTrigger id="entry-professor" className="w-full">
                    <SelectValue placeholder={t("selectProfessorPlaceholder")}>
                      {(value: string) => professors?.find((p) => String(p.id) === value)?.name ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {professors?.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[entryErrors.professorId]} />
              </Field>

              <Field data-invalid={!!entryErrors.classroomId}>
                <FieldLabel htmlFor="entry-classroom">{t("classroomLabel")}</FieldLabel>
                <Select
                  value={entryClassroomId ? String(entryClassroomId) : ""}
                  onValueChange={(value) => setEntryValue("classroomId", Number(value))}
                >
                  <SelectTrigger id="entry-classroom" className="w-full">
                    <SelectValue placeholder={t("selectClassroomPlaceholder")}>
                      {(value: string) => classrooms?.find((c) => String(c.id) === value)?.number ?? value}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {classrooms?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[entryErrors.classroomId]} />
              </Field>

              <Field data-invalid={!!entryErrors.timeSlotId}>
                <FieldLabel htmlFor="entry-time-slot">{t("timeSlotLabel")}</FieldLabel>
                <Select
                  value={entryTimeSlotId ? String(entryTimeSlotId) : ""}
                  onValueChange={(value) => setEntryValue("timeSlotId", Number(value))}
                >
                  <SelectTrigger id="entry-time-slot" className="w-full">
                    <SelectValue placeholder={t("selectTimeSlotPlaceholder")}>
                      {(value: string) => timeSlotLabel(timeSlots, Number(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {timeSlots?.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {timeSlotLabel(timeSlots, t.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[entryErrors.timeSlotId]} />
              </Field>

              {entryFormError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {entryFormError}
                </p>
              )}

              <div className="flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => editingEntry && setDeletingEntry(editingEntry)}
                >
                  <Trash2 className="size-4 text-destructive" />
                  {t("deleteClassButton")}
                </Button>
                <Button type="submit" disabled={updateEntryMutation.isPending} className="btn-gold">
                  {updateEntryMutation.isPending ? t("common:actions.saving") : t("common:actions.save")}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingEntry} onOpenChange={(open) => !open && setDeletingEntry(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteEntryTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteEntryDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          {entryActionError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {entryActionError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingEntry && deleteEntryMutation.mutate(deletingEntry.id)}
              disabled={deleteEntryMutation.isPending}
            >
              {deleteEntryMutation.isPending ? t("common:actions.deleting") : t("common:actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingSchedule}
        onOpenChange={(open) => !open && setDeletingSchedule(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteScheduleTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteScheduleDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          {actionError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {actionError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSchedule && deleteMutation.mutate(deletingSchedule.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("common:actions.deleting") : t("common:actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={compareOpen} onOpenChange={(open) => !open && setCompareOpen(false)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("compareDialogTitle")}</DialogTitle>
            <DialogDescription>
              {selectedSchedule &&
                t("comparingWith", { schedule: scheduleLabel(semesters, selectedSchedule, isSchool) })}
            </DialogDescription>
          </DialogHeader>

          <Field>
            <FieldLabel htmlFor="compare-target">{t("compareWithLabel")}</FieldLabel>
            <Select
              value={compareTargetId !== null ? String(compareTargetId) : ""}
              onValueChange={(value) => setCompareTargetId(value ? Number(value) : null)}
            >
              <SelectTrigger id="compare-target" className="w-full">
                <SelectValue placeholder={t("selectVersionPlaceholder")}>
                  {(value: string) => {
                    const schedule = sameSemesterSchedules.find((s) => String(s.id) === value);
                    return schedule ? scheduleLabel(semesters, schedule, isSchool) : value;
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                {sameSemesterSchedules
                  .filter((s) => s.id !== selectedSchedule?.id)
                  .map((schedule) => (
                    <SelectItem key={schedule.id} value={String(schedule.id)}>
                      {scheduleLabel(semesters, schedule, isSchool)}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Field>

          {compareTargetId === null && <EmptyNotice text={t("selectVersionToCompareNotice")} />}

          {compareTargetId !== null && isComparing && <EmptyNotice text={t("comparing")} />}

          {compareTargetId !== null && comparison && !isComparing && (
            <div className="mt-2 max-h-96 overflow-y-auto">
              {comparison.changed.length === 0 ? (
                <EmptyNotice text={t("noChangesNotice")} />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="pb-2">{t("columnSubjectSection")}</th>
                      <th className="pb-2">{t("columnBefore")}</th>
                      <th className="pb-2">{t("columnAfter")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.changed.map((diff) => (
                      <tr key={diff.subjectOfferingId} className="border-t border-border">
                        <td className="py-2 pr-2">
                          <p className="font-medium text-foreground">{diff.subjectName}</p>
                          <p className="text-xs text-muted-foreground">
                            {diff.courseName !== null
                              ? t("entryClassSection", {
                                  course: diff.courseName,
                                  section: diff.before[0]?.section ?? null,
                                })
                              : diff.turmaName}
                          </p>
                        </td>
                        <td className="py-2 pr-2 text-xs text-muted-foreground">
                          {diff.before.map((e) => (
                            <p key={e.id}>
                              {t("entryLine", {
                                day: DAY_OF_WEEK_LABELS[e.dayOfWeek],
                                time: e.startTime.slice(0, 5),
                                professor: e.professorName,
                                classroom: e.classroomNumber,
                              })}
                            </p>
                          ))}
                        </td>
                        <td className="py-2 text-xs text-muted-foreground">
                          {diff.after.map((e) => (
                            <p key={e.id}>
                              {t("entryLine", {
                                day: DAY_OF_WEEK_LABELS[e.dayOfWeek],
                                time: e.startTime.slice(0, 5),
                                professor: e.professorName,
                                classroom: e.classroomNumber,
                              })}
                            </p>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {comparison.onlyInA.length > 0 && (
                <p className="mt-4 text-xs text-muted-foreground">
                  {t("onlyInCurrentNotice", { count: comparison.onlyInA.length })}
                </p>
              )}
              {comparison.onlyInB.length > 0 && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("onlyInOtherNotice", { count: comparison.onlyInB.length })}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Por Curso
// ---------------------------------------------------------------------------

function ByCourseView({
  entries,
  courses,
  dimensions,
  courseId,
  onCourseIdChange,
  onEntryClick,
  onEntryDrop,
  onToggleLock,
}: {
  entries: ScheduleEntry[];
  courses: Course[] | undefined;
  dimensions: WeeklyGridDimensions;
  courseId: number | null;
  onCourseIdChange: (courseId: number | null) => void;
  onEntryClick: (entry: ScheduleEntry) => void;
  onEntryDrop: (entryId: number, day: DayOfWeek, startTime: string) => void;
  onToggleLock: (entry: ScheduleEntry) => void;
}) {
  const { t } = useTranslation("adminGrades");
  const course = courses?.find((c) => c.id === courseId) ?? null;

  return (
    <div>
      <Field>
        <FieldLabel htmlFor="filter-course">{t("filterCourseLabel")}</FieldLabel>
        <Select
          value={courseId !== null ? String(courseId) : ""}
          onValueChange={(value) => onCourseIdChange(value ? Number(value) : null)}
        >
          <SelectTrigger id="filter-course" className="w-72">
            <SelectValue placeholder={t("selectCoursePlaceholder")}>
              {(value: string) => courses?.find((c) => String(c.id) === value)?.name ?? value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
            {courses?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {!course && (
        <div className="mt-4">
          <EmptyNotice text={t("selectCourseNotice")} />
        </div>
      )}

      {course &&
        Array.from({ length: course.totalSemesters }, (_, i) => i + 1).map((period) => {
          const periodEntries = entries.filter(
            (entry) => entry.courseId === course.id && entry.recommendedSemester === period
          );
          return (
            <div key={period} className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-foreground">{t("periodLabel", { period })}</h3>
              <WeeklyScheduleGrid
                entries={periodEntries}
                days={dimensions.days}
                rows={dimensions.rows}
                emptyMessage={t("noEntriesThisPeriod")}
                onEntryClick={onEntryClick}
                onToggleLock={onToggleLock}
                draggable
                onEntryDrop={onEntryDrop}
                renderEntry={(entry) => (
                  <>
                    <p className="font-medium text-foreground">{entry.subjectName}</p>
                    <p className="text-xs text-muted-foreground">{entry.professorName}</p>
                    <p className="text-xs text-muted-foreground">{t("entryClassroom", { classroom: entry.classroomNumber })}</p>
                  </>
                )}
              />
            </div>
          );
        })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Por Turma
// ---------------------------------------------------------------------------

function ByTurmaView({
  entries,
  turmas,
  dimensions,
  turmaId,
  onTurmaIdChange,
  onEntryClick,
  onEntryDrop,
  onToggleLock,
}: {
  entries: ScheduleEntry[];
  turmas: Turma[] | undefined;
  dimensions: WeeklyGridDimensions;
  turmaId: number | null;
  onTurmaIdChange: (turmaId: number | null) => void;
  onEntryClick: (entry: ScheduleEntry) => void;
  onEntryDrop: (entryId: number, day: DayOfWeek, startTime: string) => void;
  onToggleLock: (entry: ScheduleEntry) => void;
}) {
  const { t } = useTranslation("adminGrades");
  const turma = turmas?.find((tu) => tu.id === turmaId) ?? null;
  const filtered = entries.filter((entry) => entry.turmaId === turmaId);

  return (
    <div>
      <Field>
        <FieldLabel htmlFor="filter-turma">{t("filterTurmaLabel")}</FieldLabel>
        <Select
          value={turmaId !== null ? String(turmaId) : ""}
          onValueChange={(value) => onTurmaIdChange(value ? Number(value) : null)}
        >
          <SelectTrigger id="filter-turma" className="w-72">
            <SelectValue placeholder={t("selectTurmaPlaceholder")}>
              {(value: string) => turmas?.find((tu) => String(tu.id) === value)?.name ?? value}
            </SelectValue>
          </SelectTrigger>
          <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
            {turmas?.map((tu) => (
              <SelectItem key={tu.id} value={String(tu.id)}>
                {tu.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {!turma ? (
        <div className="mt-4">
          <EmptyNotice text={t("selectTurmaNotice")} />
        </div>
      ) : (
        <div className="mt-6">
          <WeeklyScheduleGrid
            entries={filtered}
            days={dimensions.days}
            rows={dimensions.rows}
            emptyMessage={t("noEntriesThisTurma")}
            onEntryClick={onEntryClick}
            onToggleLock={onToggleLock}
            draggable
            onEntryDrop={onEntryDrop}
            renderEntry={(entry) => (
              <>
                <p className="font-medium text-foreground">{entry.subjectName}</p>
                <p className="text-xs text-muted-foreground">{entry.professorName}</p>
                <p className="text-xs text-muted-foreground">{t("entryClassroom", { classroom: entry.classroomNumber })}</p>
              </>
            )}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Por Professor
// ---------------------------------------------------------------------------

function ByProfessorView({
  entries,
  professors,
  dimensions,
  professorId,
  onProfessorIdChange,
  onEntryClick,
  onEntryDrop,
  onToggleLock,
}: {
  entries: ScheduleEntry[];
  professors: Professor[] | undefined;
  dimensions: WeeklyGridDimensions;
  professorId: number | null;
  onProfessorIdChange: (professorId: number | null) => void;
  onEntryClick: (entry: ScheduleEntry) => void;
  onEntryDrop: (entryId: number, day: DayOfWeek, startTime: string) => void;
  onToggleLock: (entry: ScheduleEntry) => void;
}) {
  const { t } = useTranslation("adminGrades");
  const filtered = entries.filter((entry) => entry.professorId === professorId);

  return (
    <div>
      <Field>
        <FieldLabel htmlFor="filter-professor">{t("filterProfessorLabel")}</FieldLabel>
        <Select
          value={professorId !== null ? String(professorId) : ""}
          onValueChange={(value) => onProfessorIdChange(value ? Number(value) : null)}
        >
          <SelectTrigger id="filter-professor" className="w-72">
            <SelectValue placeholder={t("selectProfessorPlaceholder")}>
              {(value: string) =>
                professors?.find((p) => String(p.id) === value)?.name ?? value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
            {professors?.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {professorId === null ? (
        <div className="mt-4">
          <EmptyNotice text={t("selectProfessorNotice")} />
        </div>
      ) : (
        <div className="mt-6">
          <WeeklyScheduleGrid
            entries={filtered}
            days={dimensions.days}
            rows={dimensions.rows}
            emptyMessage={t("noEntriesThisProfessor")}
            onEntryClick={onEntryClick}
            onToggleLock={onToggleLock}
            draggable
            onEntryDrop={onEntryDrop}
            renderEntry={(entry) => (
              <>
                <p className="font-medium text-foreground">{entry.subjectName}</p>
                <p className="text-xs text-muted-foreground">{entry.courseName ?? entry.turmaName}</p>
                <p className="text-xs text-muted-foreground">{t("entryClassroom", { classroom: entry.classroomNumber })}</p>
              </>
            )}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Por Sala
// ---------------------------------------------------------------------------

function ByClassroomView({
  entries,
  classrooms,
  dimensions,
  classroomId,
  onClassroomIdChange,
  onEntryClick,
  onEntryDrop,
  onToggleLock,
}: {
  entries: ScheduleEntry[];
  classrooms: Classroom[] | undefined;
  dimensions: WeeklyGridDimensions;
  classroomId: number | null;
  onClassroomIdChange: (classroomId: number | null) => void;
  onEntryClick: (entry: ScheduleEntry) => void;
  onEntryDrop: (entryId: number, day: DayOfWeek, startTime: string) => void;
  onToggleLock: (entry: ScheduleEntry) => void;
}) {
  const { t } = useTranslation("adminGrades");
  const filtered = entries.filter((entry) => entry.classroomId === classroomId);

  return (
    <div>
      <Field>
        <FieldLabel htmlFor="filter-classroom">{t("filterClassroomLabel")}</FieldLabel>
        <Select
          value={classroomId !== null ? String(classroomId) : ""}
          onValueChange={(value) => onClassroomIdChange(value ? Number(value) : null)}
        >
          <SelectTrigger id="filter-classroom" className="w-72">
            <SelectValue placeholder={t("selectClassroomPlaceholder")}>
              {(value: string) =>
                classrooms?.find((c) => String(c.id) === value)?.number ?? value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
            {classrooms?.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {classroomId === null ? (
        <div className="mt-4">
          <EmptyNotice text={t("selectClassroomNotice")} />
        </div>
      ) : (
        <div className="mt-6">
          <WeeklyScheduleGrid
            entries={filtered}
            days={dimensions.days}
            rows={dimensions.rows}
            emptyMessage={t("noEntriesThisClassroom")}
            onEntryClick={onEntryClick}
            onToggleLock={onToggleLock}
            draggable
            onEntryDrop={onEntryDrop}
            renderEntry={(entry) => (
              <>
                <p className="font-medium text-foreground">{entry.subjectName}</p>
                <p className="text-xs text-muted-foreground">{entry.courseName ?? entry.turmaName}</p>
                <p className="text-xs text-muted-foreground">{entry.professorName}</p>
              </>
            )}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Por Disciplina
// ---------------------------------------------------------------------------

function BySubjectView({
  entries,
  subjects,
  dimensions,
  subjectId,
  onSubjectIdChange,
  onEntryClick,
  onEntryDrop,
  onToggleLock,
}: {
  entries: ScheduleEntry[];
  subjects: Subject[] | undefined;
  dimensions: WeeklyGridDimensions;
  subjectId: number | null;
  onSubjectIdChange: (subjectId: number | null) => void;
  onEntryClick: (entry: ScheduleEntry) => void;
  onEntryDrop: (entryId: number, day: DayOfWeek, startTime: string) => void;
  onToggleLock: (entry: ScheduleEntry) => void;
}) {
  const { t } = useTranslation("adminGrades");
  const filtered = entries.filter((entry) => entry.subjectId === subjectId);

  return (
    <div>
      <Field>
        <FieldLabel htmlFor="filter-subject">{t("filterSubjectLabel")}</FieldLabel>
        <Select
          value={subjectId !== null ? String(subjectId) : ""}
          onValueChange={(value) => onSubjectIdChange(value ? Number(value) : null)}
        >
          <SelectTrigger id="filter-subject" className="w-72">
            <SelectValue placeholder={t("selectSubjectPlaceholder")}>
              {(value: string) => {
                const subject = subjects?.find((s) => String(s.id) === value);
                return subject ? `${subject.code} - ${subject.name}` : value;
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
            {subjects?.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.code} - {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {subjectId === null ? (
        <div className="mt-4">
          <EmptyNotice text={t("selectSubjectNotice")} />
        </div>
      ) : (
        <div className="mt-6">
          <WeeklyScheduleGrid
            entries={filtered}
            days={dimensions.days}
            rows={dimensions.rows}
            emptyMessage={t("noEntriesThisSubject")}
            onEntryClick={onEntryClick}
            onToggleLock={onToggleLock}
            draggable
            onEntryDrop={onEntryDrop}
            renderEntry={(entry) => (
              <>
                <p className="font-medium text-foreground">{entryGroupLabel(entry, t)}</p>
                <p className="text-xs text-muted-foreground">{entry.professorName}</p>
                <p className="text-xs text-muted-foreground">{t("entryClassroom", { classroom: entry.classroomNumber })}</p>
              </>
            )}
          />
        </div>
      )}
    </div>
  );
}
