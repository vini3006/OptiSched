import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";

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
import { Switch } from "@/components/ui/switch";
import { PREFERRED_SHIFT_LABELS } from "@/lib/enum-labels";
import type { PreferredShift } from "@/types/Schedule";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { createCourse, deleteCourse, listCourses, updateCourse } from "@/api/courses";
import {
  createSubject,
  deleteSubject,
  exportSubjectsCsv,
  importSubjectsCsv,
  listSubjects,
  updateSubject,
} from "@/api/subjects";
import { CsvImportExport, type CsvColumnSpec } from "@/components/admin/CsvImportExport";
import {
  createSemester,
  deleteSemester,
  listSemesters,
  updateSemester,
} from "@/api/semesters";
import {
  createSubjectOffering,
  deleteSubjectOffering,
  exportSubjectOfferingsCsv,
  importSubjectOfferingsCsv,
  listSubjectOfferings,
  updateSubjectOffering,
} from "@/api/subject-offerings";
import { courseSchema, type CourseFormValues } from "@/lib/validations/course-schema";
import { subjectSchema, type SubjectFormValues } from "@/lib/validations/subject-schema";
import { semesterSchema, type SemesterFormValues } from "@/lib/validations/semester-schema";
import {
  subjectOfferingSchema,
  type SubjectOfferingFormValues,
} from "@/lib/validations/subject-offering-schema";
import { useAuth } from "@/hooks/UseAuth";
import { useGroupedByInstitution } from "@/hooks/useGroupedByInstitution";
import { useSelectedInstitution } from "@/hooks/UseSelectedInstitution";
import { useInstitutionMode } from "@/hooks/UseInstitutionMode";
import { DatePickerField } from "@/components/ui/date-picker";
import { ROOM_TYPE_LABELS, TERM_LABELS } from "@/lib/enum-labels";
import type { RoomType } from "@/types/Classroom";
import type { Course } from "@/types/Course";
import type { Subject } from "@/types/Subject";
import type { Semester, SemesterInput, Term } from "@/types/Semester";
import type { InstitutionType } from "@/types/Institution";
import type { SubjectOffering } from "@/types/SubjectOffering";

export function EmptyInstitutionNotice({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function useSubjectCsvColumns(): CsvColumnSpec[] {
  const { t } = useTranslation("adminAcademicStructure");
  return [
    { name: "code", description: t("subjects.csvColumns.code") },
    { name: "name", description: t("subjects.csvColumns.name") },
    { name: "workload", description: t("subjects.csvColumns.workload") },
    { name: "requiredRoomType", description: t("subjects.csvColumns.requiredRoomType") },
  ];
}

function useSubjectOfferingCsvColumns(): CsvColumnSpec[] {
  const { t } = useTranslation("adminAcademicStructure");
  return [
    { name: "courseName", description: t("offerings.csvColumns.courseName") },
    { name: "subjectCode", description: t("offerings.csvColumns.subjectCode") },
    { name: "semesterYear", description: t("offerings.csvColumns.semesterYear") },
    { name: "semesterTerm", description: t("offerings.csvColumns.semesterTerm") },
    { name: "section", description: t("offerings.csvColumns.section") },
    { name: "expectedStudents", description: t("offerings.csvColumns.expectedStudents") },
    { name: "recommendedSemester", description: t("offerings.csvColumns.recommendedSemester") },
  ];
}

export function AcademicStructurePage() {
  const { t } = useTranslation("adminAcademicStructure");
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { selectedInstitutionId } = useSelectedInstitution();

  return (
    <div>
      <h1 className="text-xl font-semibold text-primary">{t("pageTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isSuperAdmin ? t("pageSubtitleSuperAdmin") : t("pageSubtitleAdmin")}
      </p>

      <Tabs defaultValue="cursos" className="mt-6">
        <TabsList>
          <TabsTrigger value="cursos">{t("tabCursos")}</TabsTrigger>
          <TabsTrigger value="disciplinas">{t("tabDisciplinas")}</TabsTrigger>
          <TabsTrigger value="semestres">{t("tabSemestres")}</TabsTrigger>
          <TabsTrigger value="ofertas">{t("tabOfertas")}</TabsTrigger>
        </TabsList>

        <TabsContent value="cursos" className="mt-4">
          {isSuperAdmin ? (
            <CoursesGroupedByInstitution />
          ) : selectedInstitutionId ? (
            <CoursesTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text={t("selectInstitutionCourses")} />
          )}
        </TabsContent>

        <TabsContent value="disciplinas" className="mt-4">
          {isSuperAdmin ? (
            <SubjectsGroupedByInstitution />
          ) : selectedInstitutionId ? (
            <SubjectsTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text={t("selectInstitutionSubjects")} />
          )}
        </TabsContent>

        <TabsContent value="semestres" className="mt-4">
          {isSuperAdmin ? (
            <SemestersGroupedByInstitution />
          ) : selectedInstitutionId ? (
            <SemestersTab
              institutionId={selectedInstitutionId}
              institutionType={user?.institutionType ?? "UNIVERSITY"}
            />
          ) : (
            <EmptyInstitutionNotice text={t("selectInstitutionSemesters")} />
          )}
        </TabsContent>

        <TabsContent value="ofertas" className="mt-4">
          {isSuperAdmin ? (
            <OfferingsGroupedByInstitution />
          ) : selectedInstitutionId ? (
            <OfferingsGroupedByCourse institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text={t("selectInstitutionOfferings")} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cursos
// ---------------------------------------------------------------------------

function CoursesGroupedByInstitution() {
  const { t } = useTranslation("adminAcademicStructure");
  const { institutionMode } = useInstitutionMode();
  const { institutions, itemsByInstitution: coursesByInstitution, isLoading } =
    useGroupedByInstitution("courses", listCourses, institutionMode);
  const [viewingInstitutionId, setViewingInstitutionId] = useState<number | null>(null);
  const viewingInstitution = institutions.find((i) => i.id === viewingInstitutionId) ?? null;

  return (
    <div>
      <div className="card-elevated rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnInstitution")}</TableHead>
              <TableHead>{t("courses.columnHeader")}</TableHead>
              <TableHead className="text-right">{t("columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  {t("common:status.loading")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && institutions.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  {t("noInstitutions")}
                </TableCell>
              </TableRow>
            )}
            {institutions.map((institution) => {
              const count = coursesByInstitution.get(institution.id)?.length ?? 0;
              return (
                <TableRow key={institution.id}>
                  <TableCell className="font-medium">{institution.name}</TableCell>
                  <TableCell>{t("courses.count", { count })}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingInstitutionId(institution.id)}
                    >
                      {t("courses.view")}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={viewingInstitutionId !== null}
        onOpenChange={(open) => !open && setViewingInstitutionId(null)}
      >
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("courses.ofInstitution", { institution: viewingInstitution?.name })}</DialogTitle>
            <DialogDescription>{t("courses.manageInInstitution")}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto">
            {viewingInstitutionId !== null && <CoursesTab institutionId={viewingInstitutionId} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CoursesTab({ institutionId }: { institutionId: number }) {
  const { t } = useTranslation("adminAcademicStructure");
  const queryClient = useQueryClient();
  const queryKey = ["courses", institutionId] as const;

  const { data: courses, isLoading } = useQuery({
    queryKey,
    queryFn: () => listCourses(institutionId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState<Course | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: { name: "", totalSemesters: 1, allowedShift: null },
  });

  const allowedShift = watch("allowedShift");

  const createMutation = useMutation({
    mutationFn: (values: CourseFormValues) => createCourse(values, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: CourseFormValues }) =>
      updateCourse(id, input, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCourse(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleting(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setFormError(null);
    reset({ name: "", totalSemesters: 1, allowedShift: null });
    setDialogOpen(true);
  }

  function openEdit(course: Course) {
    setEditing(course);
    setFormError(null);
    reset({ name: course.name, totalSemesters: course.totalSemesters, allowedShift: course.allowedShift });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  async function onSubmit(values: CourseFormValues) {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch {
      setFormError(t("courses.saveError"));
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          {t("courses.new")}
        </Button>
      </div>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnName")}</TableHead>
              <TableHead>{t("courses.columnTotalSemesters")}</TableHead>
              <TableHead>{t("courses.restrictShiftLabel")}</TableHead>
              <TableHead className="text-right">{t("columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {t("common:status.loading")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && courses?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {t("courses.noneRegistered")}
                </TableCell>
              </TableRow>
            )}
            {courses?.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">{course.name}</TableCell>
                <TableCell>{course.totalSemesters}</TableCell>
                <TableCell>
                  {course.allowedShift ? PREFERRED_SHIFT_LABELS[course.allowedShift] : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("courses.editAriaLabel", { name: course.name })}
                    onClick={() => openEdit(course)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("courses.deleteAriaLabel", { name: course.name })}
                    onClick={() => setDeleting(course)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("courses.editDialogTitle") : t("courses.newDialogTitle")}</DialogTitle>
            <DialogDescription>
              {editing ? t("courses.editDialogDescription") : t("courses.newDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="course-name">{t("columnName")}</FieldLabel>
                <Input id="course-name" {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field data-invalid={!!errors.totalSemesters}>
                <FieldLabel htmlFor="course-total-semesters">{t("courses.columnTotalSemesters")}</FieldLabel>
                <Input
                  id="course-total-semesters"
                  type="number"
                  min={1}
                  {...register("totalSemesters", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.totalSemesters]} />
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="course-restrict-shift">{t("courses.restrictShiftLabel")}</FieldLabel>
                  <Switch
                    id="course-restrict-shift"
                    checked={allowedShift !== null}
                    onCheckedChange={(checked) => setValue("allowedShift", checked ? "MORNING" : null)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t("courses.restrictShiftDescription")}</p>
                {allowedShift !== null && (
                  <Select
                    value={allowedShift}
                    onValueChange={(value) => setValue("allowedShift", value as PreferredShift)}
                  >
                    <SelectTrigger className="mt-2 w-40">
                      <SelectValue placeholder={t("courses.shiftPlaceholder")}>
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
                )}
              </Field>
              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}
              <Button type="submit" disabled={isSaving} className="btn-gold">
                {isSaving ? t("common:actions.saving") : t("common:actions.save")}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("courses.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("courses.deleteDescription", { name: deleting?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("common:actions.deleting") : t("common:actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Disciplinas
// ---------------------------------------------------------------------------

export function SubjectsGroupedByInstitution() {
  const { t } = useTranslation("adminAcademicStructure");
  const { institutionMode } = useInstitutionMode();
  const { institutions, itemsByInstitution: subjectsByInstitution, isLoading } =
    useGroupedByInstitution("subjects", listSubjects, institutionMode);
  const [viewingInstitutionId, setViewingInstitutionId] = useState<number | null>(null);
  const viewingInstitution = institutions.find((i) => i.id === viewingInstitutionId) ?? null;

  return (
    <div>
      <div className="card-elevated rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnInstitution")}</TableHead>
              <TableHead>{t("subjects.columnHeader")}</TableHead>
              <TableHead className="text-right">{t("columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  {t("common:status.loading")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && institutions.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  {t("noInstitutions")}
                </TableCell>
              </TableRow>
            )}
            {institutions.map((institution) => {
              const count = subjectsByInstitution.get(institution.id)?.length ?? 0;
              return (
                <TableRow key={institution.id}>
                  <TableCell className="font-medium">{institution.name}</TableCell>
                  <TableCell>{t("subjects.count", { count })}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingInstitutionId(institution.id)}
                    >
                      {t("subjects.view")}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={viewingInstitutionId !== null}
        onOpenChange={(open) => !open && setViewingInstitutionId(null)}
      >
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("subjects.ofInstitution", { institution: viewingInstitution?.name })}</DialogTitle>
            <DialogDescription>{t("subjects.manageInInstitution")}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto">
            {viewingInstitutionId !== null && <SubjectsTab institutionId={viewingInstitutionId} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SubjectsTab({ institutionId }: { institutionId: number }) {
  const { t } = useTranslation("adminAcademicStructure");
  const subjectCsvColumns = useSubjectCsvColumns();
  const queryClient = useQueryClient();
  const queryKey = ["subjects", institutionId] as const;

  const { data: subjects, isLoading } = useQuery({
    queryKey,
    queryFn: () => listSubjects(institutionId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { code: "", name: "", workload: 0, requiredRoomType: null, supportsCoTeaching: false },
  });
  const requiredRoomType = watch("requiredRoomType");
  const supportsCoTeaching = watch("supportsCoTeaching");

  const createMutation = useMutation({
    mutationFn: (values: SubjectFormValues) => createSubject(values, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: SubjectFormValues }) =>
      updateSubject(id, input, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSubject(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleting(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setFormError(null);
    reset({ code: "", name: "", workload: 0, requiredRoomType: null, supportsCoTeaching: false });
    setDialogOpen(true);
  }

  function openEdit(subject: Subject) {
    setEditing(subject);
    setFormError(null);
    reset({
      code: subject.code,
      name: subject.name,
      workload: subject.workload,
      requiredRoomType: subject.requiredRoomType,
      supportsCoTeaching: subject.supportsCoTeaching,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  async function onSubmit(values: SubjectFormValues) {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch {
      setFormError(t("subjects.saveError"));
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <CsvImportExport
          onImport={(file) => importSubjectsCsv(file, institutionId)}
          onExport={() => exportSubjectsCsv(institutionId)}
          exportFilename="disciplinas.csv"
          onImported={() => queryClient.invalidateQueries({ queryKey })}
          entityLabel="disciplinas"
          columns={subjectCsvColumns}
        />
        <Button variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          {t("subjects.new")}
        </Button>
      </div>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("subjects.columnCode")}</TableHead>
              <TableHead>{t("columnName")}</TableHead>
              <TableHead>{t("subjects.columnWorkload")}</TableHead>
              <TableHead>{t("subjects.columnRequiredRoom")}</TableHead>
              <TableHead className="text-right">{t("columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t("common:status.loading")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && subjects?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {t("subjects.noneRegistered")}
                </TableCell>
              </TableRow>
            )}
            {subjects?.map((subject) => (
              <TableRow key={subject.id}>
                <TableCell className="font-medium">{subject.code}</TableCell>
                <TableCell>{subject.name}</TableCell>
                <TableCell>{t("subjects.workload", { count: subject.workload })}</TableCell>
                <TableCell>
                  {subject.requiredRoomType ? ROOM_TYPE_LABELS[subject.requiredRoomType] : t("subjects.noRoomPreference")}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("subjects.editAriaLabel", { name: subject.name })}
                    onClick={() => openEdit(subject)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("subjects.deleteAriaLabel", { name: subject.name })}
                    onClick={() => setDeleting(subject)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("subjects.editDialogTitle") : t("subjects.newDialogTitle")}</DialogTitle>
            <DialogDescription>
              {editing ? t("subjects.editDialogDescription") : t("subjects.newDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.code}>
                <FieldLabel htmlFor="subject-code">{t("subjects.columnCode")}</FieldLabel>
                <Input id="subject-code" {...register("code")} />
                <FieldError errors={[errors.code]} />
              </Field>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="subject-name">{t("columnName")}</FieldLabel>
                <Input id="subject-name" {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field data-invalid={!!errors.workload}>
                <FieldLabel htmlFor="subject-workload">{t("subjects.formWorkloadLabel")}</FieldLabel>
                <Input
                  id="subject-workload"
                  type="number"
                  min={1}
                  {...register("workload", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.workload]} />
              </Field>
              <Field data-invalid={!!errors.requiredRoomType}>
                <FieldLabel htmlFor="subject-required-room-type">{t("subjects.formRequiredRoomTypeLabel")}</FieldLabel>
                <Select
                  value={requiredRoomType ?? "NONE"}
                  onValueChange={(value) =>
                    setValue("requiredRoomType", value === "NONE" ? null : (value as RoomType))
                  }
                >
                  <SelectTrigger id="subject-required-room-type" className="w-full">
                    <SelectValue>
                      {(value: string) =>
                        value === "NONE" ? t("subjects.noRoomTypePreferenceOption") : ROOM_TYPE_LABELS[value as RoomType]
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    <SelectItem value="NONE">{t("subjects.noRoomTypePreferenceOption")}</SelectItem>
                    {Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.requiredRoomType]} />
              </Field>
              <Field>
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor="subject-co-teaching">{t("subjects.supportsCoTeachingLabel")}</FieldLabel>
                  <Switch
                    id="subject-co-teaching"
                    checked={supportsCoTeaching}
                    onCheckedChange={(checked) => setValue("supportsCoTeaching", checked)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{t("subjects.supportsCoTeachingDescription")}</p>
              </Field>
              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}
              <Button type="submit" disabled={isSaving} className="btn-gold">
                {isSaving ? t("common:actions.saving") : t("common:actions.save")}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("subjects.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("subjects.deleteDescription", { name: deleting?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("common:actions.deleting") : t("common:actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Semestres
// ---------------------------------------------------------------------------

export function SemestersGroupedByInstitution() {
  const { t } = useTranslation("adminAcademicStructure");
  const { institutionMode } = useInstitutionMode();
  const { institutions, itemsByInstitution: semestersByInstitution, isLoading } =
    useGroupedByInstitution("semesters", listSemesters, institutionMode);
  const [viewingInstitutionId, setViewingInstitutionId] = useState<number | null>(null);
  const viewingInstitution = institutions.find((i) => i.id === viewingInstitutionId) ?? null;

  return (
    <div>
      <div className="card-elevated rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnInstitution")}</TableHead>
              <TableHead>{t("semesters.columnHeader")}</TableHead>
              <TableHead className="text-right">{t("columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  {t("common:status.loading")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && institutions.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  {t("noInstitutions")}
                </TableCell>
              </TableRow>
            )}
            {institutions.map((institution) => {
              const count = semestersByInstitution.get(institution.id)?.length ?? 0;
              const isSchool = institution.type === "SCHOOL";
              return (
                <TableRow key={institution.id}>
                  <TableCell className="font-medium">{institution.name}</TableCell>
                  <TableCell>
                    {isSchool ? t("semesters.school.count", { count }) : t("semesters.count", { count })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingInstitutionId(institution.id)}
                    >
                      {isSchool ? t("semesters.school.view") : t("semesters.view")}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={viewingInstitutionId !== null}
        onOpenChange={(open) => !open && setViewingInstitutionId(null)}
      >
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {viewingInstitution?.type === "SCHOOL"
                ? t("semesters.school.ofInstitution", { institution: viewingInstitution?.name })
                : t("semesters.ofInstitution", { institution: viewingInstitution?.name })}
            </DialogTitle>
            <DialogDescription>
              {viewingInstitution?.type === "SCHOOL"
                ? t("semesters.school.manageInInstitution")
                : t("semesters.manageInInstitution")}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto">
            {viewingInstitutionId !== null && viewingInstitution && (
              <SemestersTab institutionId={viewingInstitutionId} institutionType={viewingInstitution.type} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function SemestersTab({
  institutionId,
  institutionType,
}: {
  institutionId: number;
  institutionType: InstitutionType;
}) {
  const isSchool = institutionType === "SCHOOL";
  const { t } = useTranslation("adminAcademicStructure");
  const queryClient = useQueryClient();
  const queryKey = ["semesters", institutionId] as const;

  const { data: semesters, isLoading } = useQuery({
    queryKey,
    queryFn: () => listSemesters(institutionId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Semester | null>(null);
  const [deleting, setDeleting] = useState<Semester | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SemesterFormValues>({
    resolver: zodResolver(semesterSchema),
    defaultValues: { year: new Date().getFullYear(), term: "FIRST", startDate: "", endDate: "" },
  });

  const term = watch("term");
  const startDate = watch("startDate");
  const endDate = watch("endDate");

  function toSemesterInput(values: SemesterFormValues): SemesterInput {
    return {
      year: values.year,
      term: isSchool ? "FIRST" : values.term,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
    };
  }

  const createMutation = useMutation({
    mutationFn: (values: SemesterFormValues) => createSemester(toSemesterInput(values), institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: SemesterFormValues }) =>
      updateSemester(id, toSemesterInput(input), institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSemester(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleting(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setFormError(null);
    reset({ year: new Date().getFullYear(), term: "FIRST", startDate: "", endDate: "" });
    setDialogOpen(true);
  }

  function openEdit(semester: Semester) {
    setEditing(semester);
    setFormError(null);
    reset({
      year: semester.year,
      term: semester.term,
      startDate: semester.startDate ?? "",
      endDate: semester.endDate ?? "",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  async function onSubmit(values: SemesterFormValues) {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch {
      setFormError(isSchool ? t("semesters.school.saveError") : t("semesters.saveError"));
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const columnCount = isSchool ? 2 : 3;

  return (
    <div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          {isSchool ? t("semesters.school.new") : t("semesters.new")}
        </Button>
      </div>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{isSchool ? t("semesters.school.columnYear") : t("semesters.columnYear")}</TableHead>
              {!isSchool && <TableHead>{t("semesters.columnTerm")}</TableHead>}
              <TableHead className="text-right">{t("columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center text-muted-foreground">
                  {t("common:status.loading")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && semesters?.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnCount} className="text-center text-muted-foreground">
                  {isSchool ? t("semesters.school.noneRegistered") : t("semesters.noneRegistered")}
                </TableCell>
              </TableRow>
            )}
            {semesters?.map((semester) => (
              <TableRow key={semester.id}>
                <TableCell className="font-medium">{semester.year}</TableCell>
                {!isSchool && <TableCell>{TERM_LABELS[semester.term]}</TableCell>}
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      isSchool
                        ? t("semesters.school.editAriaLabel", { year: semester.year })
                        : t("semesters.editAriaLabel", { year: semester.year, term: semester.term })
                    }
                    onClick={() => openEdit(semester)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      isSchool
                        ? t("semesters.school.deleteAriaLabel", { year: semester.year })
                        : t("semesters.deleteAriaLabel", { year: semester.year, term: semester.term })
                    }
                    onClick={() => setDeleting(semester)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing
                ? isSchool
                  ? t("semesters.school.editDialogTitle")
                  : t("semesters.editDialogTitle")
                : isSchool
                  ? t("semesters.school.newDialogTitle")
                  : t("semesters.newDialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? isSchool
                  ? t("semesters.school.editDialogDescription")
                  : t("semesters.editDialogDescription")
                : isSchool
                  ? t("semesters.school.newDialogDescription")
                  : t("semesters.newDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.year}>
                <FieldLabel htmlFor="semester-year">
                  {isSchool ? t("semesters.school.columnYear") : t("semesters.columnYear")}
                </FieldLabel>
                <Input
                  id="semester-year"
                  type="number"
                  {...register("year", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.year]} />
              </Field>
              {!isSchool && (
                <Field data-invalid={!!errors.term}>
                  <FieldLabel htmlFor="semester-term">{t("semesters.columnTerm")}</FieldLabel>
                  <Select
                    value={term}
                    onValueChange={(value) => setValue("term", value as SemesterFormValues["term"])}
                  >
                    <SelectTrigger id="semester-term" className="w-full">
                      <SelectValue>{(value: Term) => TERM_LABELS[value]}</SelectValue>
                    </SelectTrigger>
                    <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                      {Object.entries(TERM_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[errors.term]} />
                </Field>
              )}
              <Field data-invalid={!!errors.startDate}>
                <FieldLabel htmlFor="semester-start-date">{t("semesters.formStartDateLabel")}</FieldLabel>
                <DatePickerField
                  id="semester-start-date"
                  value={startDate ?? ""}
                  onChange={(value) => setValue("startDate", value)}
                  aria-invalid={!!errors.startDate}
                />
                <FieldError errors={[errors.startDate]} />
              </Field>
              <Field data-invalid={!!errors.endDate}>
                <FieldLabel htmlFor="semester-end-date">{t("semesters.formEndDateLabel")}</FieldLabel>
                <p className="text-xs text-muted-foreground">{t("semesters.formEndDateHint")}</p>
                <DatePickerField
                  id="semester-end-date"
                  value={endDate ?? ""}
                  onChange={(value) => setValue("endDate", value)}
                  aria-invalid={!!errors.endDate}
                />
                <FieldError errors={[errors.endDate]} />
              </Field>
              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}
              <Button type="submit" disabled={isSaving} className="btn-gold">
                {isSaving ? t("common:actions.saving") : t("common:actions.save")}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isSchool ? t("semesters.school.deleteTitle") : t("semesters.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isSchool
                ? t("semesters.school.deleteDescription", { year: deleting?.year })
                : t("semesters.deleteDescription", {
                    year: deleting?.year,
                    term: deleting ? TERM_LABELS[deleting.term] : "",
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("common:actions.deleting") : t("common:actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ofertas de disciplina
// ---------------------------------------------------------------------------

function OfferingsGroupedByInstitution() {
  const { t } = useTranslation("adminAcademicStructure");
  const { institutionMode } = useInstitutionMode();
  const { institutions, isLoading } = useGroupedByInstitution(
    "subject-offerings",
    listSubjectOfferings,
    institutionMode
  );
  const [viewingInstitutionId, setViewingInstitutionId] = useState<number | null>(null);
  const viewingInstitution = institutions.find((i) => i.id === viewingInstitutionId) ?? null;

  return (
    <div>
      <div className="card-elevated rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnInstitution")}</TableHead>
              <TableHead className="text-right">{t("columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  {t("common:status.loading")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && institutions.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  {t("noInstitutions")}
                </TableCell>
              </TableRow>
            )}
            {institutions.map((institution) => (
              <TableRow key={institution.id}>
                <TableCell className="font-medium">{institution.name}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingInstitutionId(institution.id)}
                  >
                    {t("offerings.view")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={viewingInstitutionId !== null}
        onOpenChange={(open) => !open && setViewingInstitutionId(null)}
      >
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t("offerings.ofInstitution", { institution: viewingInstitution?.name })}</DialogTitle>
            <DialogDescription>{t("offerings.groupedByCourse")}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto">
            {viewingInstitutionId !== null && (
              <OfferingsGroupedByCourse institutionId={viewingInstitutionId} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OfferingsGroupedByCourse({ institutionId }: { institutionId: number }) {
  const { t } = useTranslation("adminAcademicStructure");
  const { data: courses, isLoading: coursesLoading } = useQuery({
    queryKey: ["courses", institutionId],
    queryFn: () => listCourses(institutionId),
  });
  const { data: offerings, isLoading: offeringsLoading } = useQuery({
    queryKey: ["subject-offerings", institutionId],
    queryFn: () => listSubjectOfferings(institutionId),
  });

  const [viewingCourseId, setViewingCourseId] = useState<number | null>(null);
  const isLoading = coursesLoading || offeringsLoading;
  const viewingCourse = courses?.find((c) => c.id === viewingCourseId) ?? null;

  if (viewingCourseId !== null) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("offerings.back")}
            onClick={() => setViewingCourseId(null)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium text-foreground">
            {t("offerings.ofCourse", { course: viewingCourse?.name })}
          </span>
        </div>
        <SubjectOfferingsTab institutionId={institutionId} courseFilter={viewingCourseId} />
      </div>
    );
  }

  return (
    <div className="card-elevated rounded-2xl">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("offerings.columnCourse")}</TableHead>
            <TableHead>{t("offerings.columnHeader")}</TableHead>
            <TableHead className="text-right">{t("columnActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                {t("common:status.loading")}
              </TableCell>
            </TableRow>
          )}
          {!isLoading && courses?.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground">
                {t("courses.noneRegistered")}
              </TableCell>
            </TableRow>
          )}
          {courses?.map((course) => {
            const count = (offerings ?? []).filter((o) => o.courseId === course.id).length;
            return (
              <TableRow key={course.id}>
                <TableCell className="font-medium">{course.name}</TableCell>
                <TableCell>{t("offerings.count", { count })}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setViewingCourseId(course.id)}
                  >
                    {t("offerings.view")}
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function SubjectOfferingsTab({
  institutionId,
  courseFilter,
}: {
  institutionId: number;
  courseFilter?: number;
}) {
  const { t } = useTranslation("adminAcademicStructure");
  const subjectOfferingCsvColumns = useSubjectOfferingCsvColumns();
  const queryClient = useQueryClient();
  const queryKey = ["subject-offerings", institutionId] as const;

  const { data: offerings, isLoading } = useQuery({
    queryKey,
    queryFn: () => listSubjectOfferings(institutionId),
  });
  const { data: courses } = useQuery({
    queryKey: ["courses", institutionId],
    queryFn: () => listCourses(institutionId),
  });
  const { data: subjects } = useQuery({
    queryKey: ["subjects", institutionId],
    queryFn: () => listSubjects(institutionId),
  });
  const { data: semesters } = useQuery({
    queryKey: ["semesters", institutionId],
    queryFn: () => listSemesters(institutionId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectOffering | null>(null);
  const [deleting, setDeleting] = useState<SubjectOffering | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SubjectOfferingFormValues>({
    resolver: zodResolver(subjectOfferingSchema),
    defaultValues: {
      courseId: 0,
      subjectId: 0,
      semesterId: 0,
      section: "",
      expectedStudents: 1,
      recommendedSemester: 1,
    },
  });

  const courseId = watch("courseId");
  const subjectId = watch("subjectId");
  const semesterId = watch("semesterId");

  const createMutation = useMutation({
    mutationFn: (values: SubjectOfferingFormValues) =>
      createSubjectOffering(values, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: SubjectOfferingFormValues }) =>
      updateSubjectOffering(id, input, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSubjectOffering(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleting(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setFormError(null);
    reset({
      courseId: courseFilter ?? 0,
      subjectId: 0,
      semesterId: 0,
      section: "",
      expectedStudents: 1,
      recommendedSemester: 1,
    });
    setDialogOpen(true);
  }

  function openEdit(offering: SubjectOffering) {
    setEditing(offering);
    setFormError(null);
    reset({
      // This tab only ever lists course-mode offerings (courseId/section/
      // recommendedSemester always set) — the ?? fallbacks just satisfy
      // SubjectOffering's now-nullable typing, which also covers turma-mode.
      courseId: offering.courseId ?? 0,
      subjectId: offering.subjectId,
      semesterId: offering.semesterId,
      section: offering.section ?? "",
      expectedStudents: offering.expectedStudents,
      recommendedSemester: offering.recommendedSemester ?? 1,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  async function onSubmit(values: SubjectOfferingFormValues) {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch {
      setFormError(t("offerings.saveError"));
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function courseName(id: number) {
    return courses?.find((c) => c.id === id)?.name ?? `#${id}`;
  }
  function subjectName(id: number) {
    return subjects?.find((s) => s.id === id)?.name ?? `#${id}`;
  }
  function semesterName(id: number) {
    const semester = semesters?.find((s) => s.id === id);
    return semester ? `${semester.year} - ${TERM_LABELS[semester.term]}` : `#${id}`;
  }

  const filteredOfferings =
    courseFilter !== undefined
      ? (offerings ?? []).filter((o) => o.courseId === courseFilter)
      : offerings;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <CsvImportExport
          onImport={(file) => importSubjectOfferingsCsv(file, institutionId)}
          onExport={() => exportSubjectOfferingsCsv(institutionId)}
          exportFilename="ofertas.csv"
          onImported={() => queryClient.invalidateQueries({ queryKey })}
          entityLabel="ofertas"
          columns={subjectOfferingCsvColumns}
        />
        <Button variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          {t("offerings.new")}
        </Button>
      </div>

      <div className="card-elevated mt-4 overflow-x-auto rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("offerings.columnCourse")}</TableHead>
              <TableHead>{t("offerings.columnSubject")}</TableHead>
              <TableHead>{t("offerings.columnSemester")}</TableHead>
              <TableHead>{t("offerings.columnSection")}</TableHead>
              <TableHead>{t("offerings.columnExpectedStudents")}</TableHead>
              <TableHead>{t("offerings.columnRecommendedSemester")}</TableHead>
              <TableHead className="text-right">{t("columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {t("common:status.loading")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filteredOfferings?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  {t("offerings.noneRegistered")}
                </TableCell>
              </TableRow>
            )}
            {filteredOfferings?.map((offering) => (
              <TableRow key={offering.id}>
                <TableCell className="font-medium">{courseName(offering.courseId ?? 0)}</TableCell>
                <TableCell>{subjectName(offering.subjectId)}</TableCell>
                <TableCell>{semesterName(offering.semesterId)}</TableCell>
                <TableCell>{offering.section}</TableCell>
                <TableCell>{offering.expectedStudents}</TableCell>
                <TableCell>{offering.recommendedSemester}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("offerings.editAriaLabel", { section: offering.section })}
                    onClick={() => openEdit(offering)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("offerings.deleteAriaLabel", { section: offering.section })}
                    onClick={() => setDeleting(offering)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("offerings.editDialogTitle") : t("offerings.newDialogTitle")}</DialogTitle>
            <DialogDescription>
              {editing
                ? t("offerings.editDialogDescription")
                : t("offerings.newDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.courseId}>
                <FieldLabel htmlFor="offering-course">{t("offerings.formCourseLabel")}</FieldLabel>
                <Select
                  value={courseId ? String(courseId) : ""}
                  onValueChange={(value) => setValue("courseId", Number(value))}
                >
                  <SelectTrigger id="offering-course" className="w-full">
                    <SelectValue placeholder={t("offerings.formCoursePlaceholder")}>
                      {(value: string) => courseName(Number(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {courses?.map((course) => (
                      <SelectItem key={course.id} value={String(course.id)}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.courseId]} />
              </Field>

              <Field data-invalid={!!errors.subjectId}>
                <FieldLabel htmlFor="offering-subject">{t("offerings.formSubjectLabel")}</FieldLabel>
                <Select
                  value={subjectId ? String(subjectId) : ""}
                  onValueChange={(value) => setValue("subjectId", Number(value))}
                >
                  <SelectTrigger id="offering-subject" className="w-full">
                    <SelectValue placeholder={t("offerings.formSubjectPlaceholder")}>
                      {(value: string) => subjectName(Number(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={String(subject.id)}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.subjectId]} />
              </Field>

              <Field data-invalid={!!errors.semesterId}>
                <FieldLabel htmlFor="offering-semester">{t("offerings.formSemesterLabel")}</FieldLabel>
                <Select
                  value={semesterId ? String(semesterId) : ""}
                  onValueChange={(value) => setValue("semesterId", Number(value))}
                >
                  <SelectTrigger id="offering-semester" className="w-full">
                    <SelectValue placeholder={t("offerings.formSemesterPlaceholder")}>
                      {(value: string) => semesterName(Number(value))}
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

              <Field data-invalid={!!errors.section}>
                <FieldLabel htmlFor="offering-section">{t("offerings.formSectionLabel")}</FieldLabel>
                <Input
                  id="offering-section"
                  placeholder={t("offerings.formSectionPlaceholder")}
                  {...register("section")}
                />
                <FieldError errors={[errors.section]} />
              </Field>

              <Field data-invalid={!!errors.expectedStudents}>
                <FieldLabel htmlFor="offering-expected-students">{t("offerings.formExpectedStudentsLabel")}</FieldLabel>
                <Input
                  id="offering-expected-students"
                  type="number"
                  min={1}
                  {...register("expectedStudents", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.expectedStudents]} />
              </Field>

              <Field data-invalid={!!errors.recommendedSemester}>
                <FieldLabel htmlFor="offering-recommended-semester">
                  {t("offerings.formRecommendedSemesterLabel")}
                </FieldLabel>
                <Input
                  id="offering-recommended-semester"
                  type="number"
                  min={1}
                  {...register("recommendedSemester", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.recommendedSemester]} />
              </Field>

              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}
              <Button type="submit" disabled={isSaving} className="btn-gold">
                {isSaving ? t("common:actions.saving") : t("common:actions.save")}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("offerings.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("offerings.deleteDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("common:actions.deleting") : t("common:actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
