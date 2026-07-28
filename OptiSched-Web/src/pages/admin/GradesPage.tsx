import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Plus, Power, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { deleteSchedule, generateSchedule, listSchedules, toggleScheduleStatus } from "@/api/schedules";
import { listScheduleEntries } from "@/api/schedule-entries";
import { listCourses } from "@/api/courses";
import { listSubjects } from "@/api/subjects";
import { listProfessors } from "@/api/professors";
import { listClassrooms } from "@/api/classrooms";
import { listSemesters } from "@/api/semesters";
import {
  generateScheduleSchema,
  type GenerateScheduleFormValues,
} from "@/lib/validations/generate-schedule-schema";
import { useSelectedInstitution } from "@/hooks/UseSelectedInstitution";
import { TERM_LABELS } from "@/lib/enum-labels";
import type { Schedule } from "@/types/Schedule";
import type { ScheduleEntry } from "@/types/ScheduleEntry";
import type { Semester } from "@/types/Semester";
import type { Course } from "@/types/Course";
import type { Professor } from "@/types/Professor";
import type { Classroom } from "@/types/Classroom";
import type { Subject } from "@/types/Subject";

function EmptyNotice({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function semesterLabel(semesters: Semester[] | undefined, semesterId: number) {
  const semester = semesters?.find((s) => s.id === semesterId);
  return semester ? `${semester.year} - ${TERM_LABELS[semester.term]}` : `#${semesterId}`;
}

export function GradesPage() {
  const { selectedInstitutionId } = useSelectedInstitution();

  return (
    <div>
      <h1 className="text-xl font-semibold text-primary">Grades</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gere grades horárias automaticamente e visualize o resultado por curso, professor,
        sala ou disciplina.
      </p>

      {selectedInstitutionId ? (
        <GradesContent institutionId={selectedInstitutionId} />
      ) : (
        <div className="mt-6">
          <EmptyNotice text="Selecione uma instituição para ver as grades." />
        </div>
      )}
    </div>
  );
}

function GradesContent({ institutionId }: { institutionId: number }) {
  const queryClient = useQueryClient();
  const schedulesQueryKey = ["schedules", institutionId] as const;

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

  const [scheduleId, setScheduleId] = useState<number | null>(null);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [deletingSchedule, setDeletingSchedule] = useState<Schedule | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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

  const { data: entries, isLoading: isLoadingEntries } = useQuery({
    queryKey: ["schedule-entries", scheduleId, institutionId],
    queryFn: () => listScheduleEntries(scheduleId as number, institutionId),
    enabled: scheduleId !== null,
  });

  const dimensions = useMemo(() => getWeeklyGridDimensions(entries ?? []), [entries]);

  const [courseId, setCourseId] = useState<number | null>(null);
  const [professorId, setProfessorId] = useState<number | null>(null);
  const [classroomId, setClassroomId] = useState<number | null>(null);
  const [subjectId, setSubjectId] = useState<number | null>(null);

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<GenerateScheduleFormValues>({
    resolver: zodResolver(generateScheduleSchema),
    defaultValues: { semesterId: 0 },
  });
  const generateSemesterId = watch("semesterId");

  const generateMutation = useMutation({
    mutationFn: (semesterId: number) => generateSchedule(semesterId, institutionId),
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
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSchedule(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: schedulesQueryKey });
      setScheduleId(null);
      setDeletingSchedule(null);
    },
  });

  function openGenerate() {
    setFormError(null);
    reset({ semesterId: 0 });
    setGenerateOpen(true);
  }

  async function onSubmitGenerate(values: GenerateScheduleFormValues) {
    setFormError(null);
    try {
      await generateMutation.mutateAsync(values.semesterId);
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.message) {
        setFormError(error.response.data.message);
      } else {
        setFormError("Não foi possível gerar a grade. Tente novamente.");
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
              <SelectValue placeholder="Selecione uma grade">
                {(value: string) => {
                  const schedule = sortedSchedules.find((s) => String(s.id) === value);
                  return schedule ? semesterLabel(semesters, schedule.semesterId) : value;
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
              {sortedSchedules.map((schedule) => (
                <SelectItem key={schedule.id} value={String(schedule.id)}>
                  {semesterLabel(semesters, schedule.semesterId)} ·{" "}
                  {new Date(schedule.generatedAt).toLocaleString("pt-BR")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedSchedule && (
            <>
              <Badge variant={selectedSchedule.status === "ACTIVE" ? "default" : "outline"}>
                {selectedSchedule.status === "ACTIVE" ? "Ativa" : "Inativa"}
              </Badge>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => toggleStatusMutation.mutate(selectedSchedule.id)}
                disabled={toggleStatusMutation.isPending}
                title={selectedSchedule.status === "ACTIVE" ? "Desativar" : "Ativar"}
              >
                <Power className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setDeletingSchedule(selectedSchedule)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </>
          )}
        </div>

        <Button variant="outline" onClick={openGenerate}>
          <Plus className="size-4" />
          Gerar nova grade
        </Button>
      </div>

      <div className="mt-6">
        {scheduleId === null && (
          <EmptyNotice text="Nenhuma grade gerada ainda. Clique em “Gerar nova grade” pra criar a primeira." />
        )}
        {scheduleId !== null && isLoadingEntries && <EmptyNotice text="Carregando..." />}
        {scheduleId !== null && !isLoadingEntries && (
          <Tabs defaultValue="curso">
            <TabsList>
              <TabsTrigger value="curso">Por Curso</TabsTrigger>
              <TabsTrigger value="professor">Por Professor</TabsTrigger>
              <TabsTrigger value="sala">Por Sala</TabsTrigger>
              <TabsTrigger value="disciplina">Por Disciplina</TabsTrigger>
            </TabsList>

            <TabsContent value="curso" className="mt-4">
              <ByCourseView
                entries={entries ?? []}
                courses={courses}
                dimensions={dimensions}
                courseId={courseId}
                onCourseIdChange={setCourseId}
              />
            </TabsContent>
            <TabsContent value="professor" className="mt-4">
              <ByProfessorView
                entries={entries ?? []}
                professors={professors}
                dimensions={dimensions}
                professorId={professorId}
                onProfessorIdChange={setProfessorId}
              />
            </TabsContent>
            <TabsContent value="sala" className="mt-4">
              <ByClassroomView
                entries={entries ?? []}
                classrooms={classrooms}
                dimensions={dimensions}
                classroomId={classroomId}
                onClassroomIdChange={setClassroomId}
              />
            </TabsContent>
            <TabsContent value="disciplina" className="mt-4">
              <BySubjectView
                entries={entries ?? []}
                subjects={subjects}
                dimensions={dimensions}
                subjectId={subjectId}
                onSubjectIdChange={setSubjectId}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      <Dialog open={generateOpen} onOpenChange={(open) => !open && setGenerateOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Gerar nova grade</DialogTitle>
            <DialogDescription>
              Escolha o semestre. A geração roda o otimizador e pode levar alguns segundos.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitGenerate)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.semesterId}>
                <FieldLabel htmlFor="generate-semester">Semestre</FieldLabel>
                <Select
                  value={generateSemesterId ? String(generateSemesterId) : ""}
                  onValueChange={(value) => setValue("semesterId", Number(value))}
                >
                  <SelectTrigger id="generate-semester" className="w-full">
                    <SelectValue placeholder="Selecione um semestre">
                      {(value: string) => semesterLabel(semesters, Number(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {semesters?.map((semester) => (
                      <SelectItem key={semester.id} value={String(semester.id)}>
                        {semester.year} - {TERM_LABELS[semester.term]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.semesterId]} />
              </Field>

              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}
              <Button type="submit" disabled={generateMutation.isPending} className="btn-gold">
                {generateMutation.isPending ? "Gerando..." : "Gerar grade"}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingSchedule}
        onOpenChange={(open) => !open && setDeletingSchedule(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grade?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. Todas as aulas alocadas nessa grade serão
              removidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSchedule && deleteMutation.mutate(deletingSchedule.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
}: {
  entries: ScheduleEntry[];
  courses: Course[] | undefined;
  dimensions: WeeklyGridDimensions;
  courseId: number | null;
  onCourseIdChange: (courseId: number | null) => void;
}) {
  const course = courses?.find((c) => c.id === courseId) ?? null;

  return (
    <div>
      <Field>
        <FieldLabel htmlFor="filter-course">Curso</FieldLabel>
        <Select
          value={courseId !== null ? String(courseId) : ""}
          onValueChange={(value) => onCourseIdChange(value ? Number(value) : null)}
        >
          <SelectTrigger id="filter-course" className="w-72">
            <SelectValue placeholder="Selecione um curso">
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
          <EmptyNotice text="Selecione um curso para ver os calendários por período." />
        </div>
      )}

      {course &&
        Array.from({ length: course.totalSemesters }, (_, i) => i + 1).map((period) => {
          const periodEntries = entries.filter(
            (entry) => entry.courseId === course.id && entry.recommendedSemester === period
          );
          return (
            <div key={period} className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-foreground">Período {period}</h3>
              <WeeklyScheduleGrid
                entries={periodEntries}
                days={dimensions.days}
                rows={dimensions.rows}
                emptyMessage="Nenhuma aula alocada nesse período."
                renderEntry={(entry) => (
                  <>
                    <p className="font-medium text-foreground">{entry.subjectName}</p>
                    <p className="text-xs text-muted-foreground">{entry.professorName}</p>
                    <p className="text-xs text-muted-foreground">Sala: {entry.classroomNumber}</p>
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
// Por Professor
// ---------------------------------------------------------------------------

function ByProfessorView({
  entries,
  professors,
  dimensions,
  professorId,
  onProfessorIdChange,
}: {
  entries: ScheduleEntry[];
  professors: Professor[] | undefined;
  dimensions: WeeklyGridDimensions;
  professorId: number | null;
  onProfessorIdChange: (professorId: number | null) => void;
}) {
  const filtered = entries.filter((entry) => entry.professorId === professorId);

  return (
    <div>
      <Field>
        <FieldLabel htmlFor="filter-professor">Professor</FieldLabel>
        <Select
          value={professorId !== null ? String(professorId) : ""}
          onValueChange={(value) => onProfessorIdChange(value ? Number(value) : null)}
        >
          <SelectTrigger id="filter-professor" className="w-72">
            <SelectValue placeholder="Selecione um professor">
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
          <EmptyNotice text="Selecione um professor para ver a agenda dele." />
        </div>
      ) : (
        <div className="mt-6">
          <WeeklyScheduleGrid
            entries={filtered}
            days={dimensions.days}
            rows={dimensions.rows}
            emptyMessage="Esse professor não tem aulas alocadas nessa grade."
            renderEntry={(entry) => (
              <>
                <p className="font-medium text-foreground">{entry.subjectName}</p>
                <p className="text-xs text-muted-foreground">{entry.courseName}</p>
                <p className="text-xs text-muted-foreground">Sala: {entry.classroomNumber}</p>
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
}: {
  entries: ScheduleEntry[];
  classrooms: Classroom[] | undefined;
  dimensions: WeeklyGridDimensions;
  classroomId: number | null;
  onClassroomIdChange: (classroomId: number | null) => void;
}) {
  const filtered = entries.filter((entry) => entry.classroomId === classroomId);

  return (
    <div>
      <Field>
        <FieldLabel htmlFor="filter-classroom">Sala</FieldLabel>
        <Select
          value={classroomId !== null ? String(classroomId) : ""}
          onValueChange={(value) => onClassroomIdChange(value ? Number(value) : null)}
        >
          <SelectTrigger id="filter-classroom" className="w-72">
            <SelectValue placeholder="Selecione uma sala">
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
          <EmptyNotice text="Selecione uma sala para ver a ocupação dela." />
        </div>
      ) : (
        <div className="mt-6">
          <WeeklyScheduleGrid
            entries={filtered}
            days={dimensions.days}
            rows={dimensions.rows}
            emptyMessage="Essa sala não tem aulas alocadas nessa grade."
            renderEntry={(entry) => (
              <>
                <p className="font-medium text-foreground">{entry.subjectName}</p>
                <p className="text-xs text-muted-foreground">{entry.courseName}</p>
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
}: {
  entries: ScheduleEntry[];
  subjects: Subject[] | undefined;
  dimensions: WeeklyGridDimensions;
  subjectId: number | null;
  onSubjectIdChange: (subjectId: number | null) => void;
}) {
  const filtered = entries.filter((entry) => entry.subjectId === subjectId);

  return (
    <div>
      <Field>
        <FieldLabel htmlFor="filter-subject">Disciplina</FieldLabel>
        <Select
          value={subjectId !== null ? String(subjectId) : ""}
          onValueChange={(value) => onSubjectIdChange(value ? Number(value) : null)}
        >
          <SelectTrigger id="filter-subject" className="w-72">
            <SelectValue placeholder="Selecione uma disciplina">
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
          <EmptyNotice text="Selecione uma disciplina para ver onde ela foi alocada." />
        </div>
      ) : (
        <div className="mt-6">
          <WeeklyScheduleGrid
            entries={filtered}
            days={dimensions.days}
            rows={dimensions.rows}
            emptyMessage="Essa disciplina não tem aulas alocadas nessa grade."
            renderEntry={(entry) => (
              <>
                <p className="font-medium text-foreground">
                  {entry.courseName} · Turma {entry.section}
                </p>
                <p className="text-xs text-muted-foreground">{entry.professorName}</p>
                <p className="text-xs text-muted-foreground">Sala: {entry.classroomNumber}</p>
              </>
            )}
          />
        </div>
      )}
    </div>
  );
}
