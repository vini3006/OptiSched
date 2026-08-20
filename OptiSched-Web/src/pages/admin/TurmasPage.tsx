import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";

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

import { createTurma, deleteTurma, listTurmas, updateTurma } from "@/api/turmas";
import { createSerie, deleteSerie, listSeries, updateSerie } from "@/api/series";
import { createSerieSubject, deleteSerieSubject, listSerieSubjects } from "@/api/serie-subjects";
import { listSubjects } from "@/api/subjects";
import { turmaSchema, type TurmaFormValues } from "@/lib/validations/turma-schema";
import { serieSchema, type SerieFormValues } from "@/lib/validations/serie-schema";
import {
  serieSubjectSchema,
  type SerieSubjectFormValues,
} from "@/lib/validations/serie-subject-schema";
import { useAuth } from "@/hooks/UseAuth";
import { useGroupedByInstitution } from "@/hooks/useGroupedByInstitution";
import { useSelectedInstitution } from "@/hooks/UseSelectedInstitution";
import { useInstitutionMode } from "@/hooks/UseInstitutionMode";
import { PREFERRED_SHIFT_LABELS } from "@/lib/enum-labels";
import type { PreferredShift } from "@/types/Schedule";
import type { Turma } from "@/types/Turma";
import type { Serie } from "@/types/Serie";
import {
  EmptyInstitutionNotice,
  SubjectsGroupedByInstitution,
  SubjectsTab,
  SemestersGroupedByInstitution,
  SemestersTab,
} from "@/pages/admin/AcademicStructurePage";

export function TurmasPage() {
  const { t } = useTranslation("adminTurmas");
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { selectedInstitutionId } = useSelectedInstitution();

  return (
    <div>
      <h1 className="text-xl font-semibold text-primary">{t("pageTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isSuperAdmin ? t("pageSubtitleSuperAdmin") : t("pageSubtitleAdmin")}
      </p>

      <Tabs defaultValue="series" className="mt-6">
        <TabsList>
          <TabsTrigger value="series">{t("tabSeries")}</TabsTrigger>
          <TabsTrigger value="turmas">{t("tabTurmas")}</TabsTrigger>
          <TabsTrigger value="disciplinas">{t("tabDisciplinas")}</TabsTrigger>
          <TabsTrigger value="semestres">{t("tabSemestres")}</TabsTrigger>
        </TabsList>

        <TabsContent value="series" className="mt-4">
          {isSuperAdmin ? (
            <SeriesGroupedByInstitution />
          ) : selectedInstitutionId ? (
            <SeriesTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text={t("selectInstitutionSeries")} />
          )}
        </TabsContent>

        <TabsContent value="turmas" className="mt-4">
          {isSuperAdmin ? (
            <TurmasGroupedByInstitution />
          ) : selectedInstitutionId ? (
            <TurmasTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text={t("selectInstitutionTurmas")} />
          )}
        </TabsContent>

        {/* Disciplinas/Semestres são idênticas ao modo universidade (não são
            específicas de curso nem de turma) — reaproveitadas direto de
            AcademicStructurePage em vez de duplicadas. */}
        <TabsContent value="disciplinas" className="mt-4">
          {isSuperAdmin ? (
            <SubjectsGroupedByInstitution />
          ) : selectedInstitutionId ? (
            <SubjectsTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text={t("adminAcademicStructure:selectInstitutionSubjects")} />
          )}
        </TabsContent>

        <TabsContent value="semestres" className="mt-4">
          {isSuperAdmin ? (
            <SemestersGroupedByInstitution />
          ) : selectedInstitutionId ? (
            <SemestersTab
              institutionId={selectedInstitutionId}
              institutionType={user?.institutionType ?? "SCHOOL"}
            />
          ) : (
            <EmptyInstitutionNotice text={t("adminAcademicStructure:selectInstitutionSemesters")} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Séries + currículo
// ---------------------------------------------------------------------------

function SeriesGroupedByInstitution() {
  const { t } = useTranslation("adminTurmas");
  const { institutionMode } = useInstitutionMode();
  const { institutions, itemsByInstitution: seriesByInstitution, isLoading } =
    useGroupedByInstitution("series", listSeries, institutionMode);
  const [viewingInstitutionId, setViewingInstitutionId] = useState<number | null>(null);
  const viewingInstitution = institutions.find((i) => i.id === viewingInstitutionId) ?? null;

  return (
    <div>
      <div className="card-elevated rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnInstitution")}</TableHead>
              <TableHead>{t("series.columnHeader")}</TableHead>
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
              const count = seriesByInstitution.get(institution.id)?.length ?? 0;
              return (
                <TableRow key={institution.id}>
                  <TableCell className="font-medium">{institution.name}</TableCell>
                  <TableCell>{t("series.count", { count })}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingInstitutionId(institution.id)}
                    >
                      {t("series.view")}
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
            <DialogTitle>{t("series.ofInstitution", { institution: viewingInstitution?.name })}</DialogTitle>
            <DialogDescription>{t("series.manageInInstitution")}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto">
            {viewingInstitutionId !== null && <SeriesTab institutionId={viewingInstitutionId} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SeriesTab({ institutionId }: { institutionId: number }) {
  const { t } = useTranslation("adminTurmas");
  const queryClient = useQueryClient();
  const queryKey = ["series", institutionId] as const;
  const curriculumQueryKey = ["serie-subjects", institutionId] as const;

  const { data: series, isLoading } = useQuery({
    queryKey,
    queryFn: () => listSeries(institutionId),
  });
  const { data: curriculum } = useQuery({
    queryKey: curriculumQueryKey,
    queryFn: () => listSerieSubjects(institutionId),
  });
  const { data: subjects } = useQuery({
    queryKey: ["subjects", institutionId],
    queryFn: () => listSubjects(institutionId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Serie | null>(null);
  const [deleting, setDeleting] = useState<Serie | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SerieFormValues>({
    resolver: zodResolver(serieSchema),
    defaultValues: { name: "", order: null },
  });

  const createMutation = useMutation({
    mutationFn: (values: SerieFormValues) => createSerie(values, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: SerieFormValues }) =>
      updateSerie(id, input, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSerie(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleting(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setFormError(null);
    reset({ name: "", order: null });
    setDialogOpen(true);
  }

  function openEdit(serie: Serie) {
    setEditing(serie);
    setFormError(null);
    reset({ name: serie.name, order: serie.order });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  async function onSubmit(values: SerieFormValues) {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch {
      setFormError(t("series.saveError"));
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  // -------------------- currículo (drill-down) --------------------

  const [viewingSerieId, setViewingSerieId] = useState<number | null>(null);
  const viewingSerie = series?.find((s) => s.id === viewingSerieId) ?? null;
  const viewingCurriculum = (curriculum ?? []).filter((c) => c.serieId === viewingSerieId);
  const [curriculumFormError, setCurriculumFormError] = useState<string | null>(null);

  const {
    handleSubmit: handleSubmitCurriculum,
    reset: resetCurriculum,
    watch: watchCurriculum,
    setValue: setCurriculumValue,
    register: registerCurriculum,
    formState: { errors: curriculumErrors },
  } = useForm<SerieSubjectFormValues>({
    resolver: zodResolver(serieSubjectSchema),
    defaultValues: { serieId: 0, subjectId: 0, weeklyWorkload: 1 },
  });

  const curriculumSubjectId = watchCurriculum("subjectId");

  const addCurriculumMutation = useMutation({
    mutationFn: (values: SerieSubjectFormValues) => createSerieSubject(values, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: curriculumQueryKey });
      resetCurriculum({ serieId: viewingSerieId ?? 0, subjectId: 0, weeklyWorkload: 1 });
    },
  });

  const removeCurriculumMutation = useMutation({
    mutationFn: ({ serieId, subjectId }: { serieId: number; subjectId: number }) =>
      deleteSerieSubject(serieId, subjectId, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: curriculumQueryKey });
    },
  });

  function openCurriculum(serie: Serie) {
    setViewingSerieId(serie.id);
    setCurriculumFormError(null);
    resetCurriculum({ serieId: serie.id, subjectId: 0, weeklyWorkload: 1 });
  }

  async function onSubmitCurriculum(values: SerieSubjectFormValues) {
    setCurriculumFormError(null);
    try {
      await addCurriculumMutation.mutateAsync(values);
    } catch {
      setCurriculumFormError(t("curriculum.saveError"));
    }
  }

  function subjectName(id: number) {
    return subjects?.find((s) => s.id === id)?.name ?? `#${id}`;
  }

  const availableSubjects = (subjects ?? []).filter(
    (subject) => !viewingCurriculum.some((c) => c.subjectId === subject.id)
  );

  return (
    <div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          {t("series.new")}
        </Button>
      </div>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnName")}</TableHead>
              <TableHead>{t("series.columnOrder")}</TableHead>
              <TableHead>{t("series.columnCurriculum")}</TableHead>
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
            {!isLoading && series?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {t("series.noneRegistered")}
                </TableCell>
              </TableRow>
            )}
            {series?.map((serie) => {
              const count = (curriculum ?? []).filter((c) => c.serieId === serie.id).length;
              return (
                <TableRow key={serie.id}>
                  <TableCell className="font-medium">{serie.name}</TableCell>
                  <TableCell>{serie.order ?? "—"}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => openCurriculum(serie)}>
                      {t("series.curriculumCount", { count })}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("series.editAriaLabel", { name: serie.name })}
                      onClick={() => openEdit(serie)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("series.deleteAriaLabel", { name: serie.name })}
                      onClick={() => setDeleting(serie)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? t("series.editDialogTitle") : t("series.newDialogTitle")}</DialogTitle>
            <DialogDescription>
              {editing ? t("series.editDialogDescription") : t("series.newDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="serie-name">{t("columnName")}</FieldLabel>
                <Input id="serie-name" {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>

              <Field data-invalid={!!errors.order}>
                <FieldLabel htmlFor="serie-order">{t("series.formOrderLabel")}</FieldLabel>
                <Input
                  id="serie-order"
                  type="number"
                  {...register("order", {
                    setValueAs: (value) => (value === "" ? null : Number(value)),
                  })}
                />
                <FieldError errors={[errors.order]} />
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
            <AlertDialogTitle>{t("series.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("series.deleteDescription", { name: deleting?.name })}
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

      <Dialog
        open={viewingSerieId !== null}
        onOpenChange={(open) => !open && setViewingSerieId(null)}
      >
        <DialogContent className="flex max-h-[85vh] flex-col">
          <DialogHeader>
            <DialogTitle>{t("curriculum.ofSerie", { serie: viewingSerie?.name })}</DialogTitle>
            <DialogDescription>{t("curriculum.description")}</DialogDescription>
          </DialogHeader>

          {viewingCurriculum.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("curriculum.noneRegistered")}</p>
          ) : (
            <ul className="flex flex-col gap-2 overflow-y-auto">
              {viewingCurriculum.map((entry) => (
                <li
                  key={`${entry.serieId}-${entry.subjectId}`}
                  className="flex items-center justify-between rounded-lg bg-secondary p-2 pl-3"
                >
                  <span className="text-sm">
                    {entry.subjectCode} - {entry.subjectName} (
                    {t("curriculum.weeklyWorkload", { count: entry.weeklyWorkload })})
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("curriculum.deleteAriaLabel", { subject: entry.subjectCode })}
                    onClick={() =>
                      removeCurriculumMutation.mutate({
                        serieId: entry.serieId,
                        subjectId: entry.subjectId,
                      })
                    }
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleSubmitCurriculum(onSubmitCurriculum)} noValidate className="mt-2">
            <FieldGroup>
              <Field data-invalid={!!curriculumErrors.subjectId}>
                <FieldLabel htmlFor="curriculum-subject">{t("curriculum.formSubjectLabel")}</FieldLabel>
                <Select
                  value={curriculumSubjectId ? String(curriculumSubjectId) : ""}
                  onValueChange={(value) => setCurriculumValue("subjectId", Number(value))}
                >
                  <SelectTrigger id="curriculum-subject" className="w-full">
                    <SelectValue placeholder={t("curriculum.formSubjectPlaceholder")}>
                      {(value: string) => subjectName(Number(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {availableSubjects.map((subject) => (
                      <SelectItem key={subject.id} value={String(subject.id)}>
                        {subject.code} - {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[curriculumErrors.subjectId]} />
              </Field>

              <Field data-invalid={!!curriculumErrors.weeklyWorkload}>
                <FieldLabel htmlFor="curriculum-weekly-workload">
                  {t("curriculum.formWeeklyWorkloadLabel")}
                </FieldLabel>
                <Input
                  id="curriculum-weekly-workload"
                  type="number"
                  min={1}
                  {...registerCurriculum("weeklyWorkload", { valueAsNumber: true })}
                />
                <FieldError errors={[curriculumErrors.weeklyWorkload]} />
              </Field>

              {curriculumFormError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {curriculumFormError}
                </p>
              )}
              <Button
                type="submit"
                variant="outline"
                disabled={addCurriculumMutation.isPending}
              >
                <Plus className="size-4" />
                {addCurriculumMutation.isPending
                  ? t("common:actions.saving")
                  : t("curriculum.add")}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Turmas
// ---------------------------------------------------------------------------

function TurmasGroupedByInstitution() {
  const { t } = useTranslation("adminTurmas");
  const { institutionMode } = useInstitutionMode();
  const { institutions, itemsByInstitution: turmasByInstitution, isLoading } =
    useGroupedByInstitution("turmas", listTurmas, institutionMode);
  const [viewingInstitutionId, setViewingInstitutionId] = useState<number | null>(null);
  const viewingInstitution = institutions.find((i) => i.id === viewingInstitutionId) ?? null;

  return (
    <div>
      <div className="card-elevated rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnInstitution")}</TableHead>
              <TableHead>{t("turmas.columnHeader")}</TableHead>
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
              const count = turmasByInstitution.get(institution.id)?.length ?? 0;
              return (
                <TableRow key={institution.id}>
                  <TableCell className="font-medium">{institution.name}</TableCell>
                  <TableCell>{t("turmas.count", { count })}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingInstitutionId(institution.id)}
                    >
                      {t("turmas.view")}
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
            <DialogTitle>{t("turmas.ofInstitution", { institution: viewingInstitution?.name })}</DialogTitle>
            <DialogDescription>{t("turmas.manageInInstitution")}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto">
            {viewingInstitutionId !== null && <TurmasTab institutionId={viewingInstitutionId} />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TurmasTab({ institutionId }: { institutionId: number }) {
  const { t } = useTranslation("adminTurmas");
  const queryClient = useQueryClient();
  const queryKey = ["turmas", institutionId] as const;

  const { data: turmas, isLoading } = useQuery({
    queryKey,
    queryFn: () => listTurmas(institutionId),
  });
  const { data: series } = useQuery({
    queryKey: ["series", institutionId],
    queryFn: () => listSeries(institutionId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Turma | null>(null);
  const [deleting, setDeleting] = useState<Turma | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TurmaFormValues>({
    resolver: zodResolver(turmaSchema),
    defaultValues: { name: "", shift: null, expectedStudents: 1, serieId: 0, year: new Date().getFullYear() },
  });

  const shift = watch("shift");
  const serieId = watch("serieId");

  const createMutation = useMutation({
    mutationFn: (values: TurmaFormValues) => createTurma(values, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: TurmaFormValues }) =>
      updateTurma(id, input, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTurma(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleting(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setFormError(null);
    reset({ name: "", shift: null, expectedStudents: 1, serieId: 0, year: new Date().getFullYear() });
    setDialogOpen(true);
  }

  function openEdit(turma: Turma) {
    setEditing(turma);
    setFormError(null);
    reset({
      name: turma.name,
      shift: turma.shift,
      expectedStudents: turma.expectedStudents,
      serieId: turma.serieId,
      year: turma.year,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  async function onSubmit(values: TurmaFormValues) {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch {
      setFormError(t("turmas.saveError"));
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function serieName(id: number) {
    return series?.find((s) => s.id === id)?.name ?? `#${id}`;
  }

  return (
    <div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          {t("turmas.new")}
        </Button>
      </div>

      <div className="card-elevated mt-4 overflow-x-auto rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnName")}</TableHead>
              <TableHead>{t("turmas.columnShift")}</TableHead>
              <TableHead>{t("turmas.columnExpectedStudents")}</TableHead>
              <TableHead>{t("turmas.columnSerie")}</TableHead>
              <TableHead>{t("turmas.columnYear")}</TableHead>
              <TableHead className="text-right">{t("columnActions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t("common:status.loading")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && turmas?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t("turmas.noneRegistered")}
                </TableCell>
              </TableRow>
            )}
            {turmas?.map((turma) => (
              <TableRow key={turma.id}>
                <TableCell className="font-medium">{turma.name}</TableCell>
                <TableCell>
                  {turma.shift ? PREFERRED_SHIFT_LABELS[turma.shift] : t("turmas.noShiftPreference")}
                </TableCell>
                <TableCell>{turma.expectedStudents}</TableCell>
                <TableCell>{serieName(turma.serieId)}</TableCell>
                <TableCell>{turma.year}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("turmas.editAriaLabel", { name: turma.name })}
                    onClick={() => openEdit(turma)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("turmas.deleteAriaLabel", { name: turma.name })}
                    onClick={() => setDeleting(turma)}
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
            <DialogTitle>{editing ? t("turmas.editDialogTitle") : t("turmas.newDialogTitle")}</DialogTitle>
            <DialogDescription>
              {editing ? t("turmas.editDialogDescription") : t("turmas.newDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="turma-name">{t("columnName")}</FieldLabel>
                <Input id="turma-name" {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>

              <Field data-invalid={!!errors.shift}>
                <FieldLabel htmlFor="turma-shift">{t("turmas.formShiftLabel")}</FieldLabel>
                <Select
                  value={shift ?? "NONE"}
                  onValueChange={(value) =>
                    setValue("shift", value === "NONE" ? null : (value as PreferredShift))
                  }
                >
                  <SelectTrigger id="turma-shift" className="w-full">
                    <SelectValue>
                      {(value: string) =>
                        value === "NONE" ? t("turmas.noShiftPreference") : PREFERRED_SHIFT_LABELS[value as PreferredShift]
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    <SelectItem value="NONE">{t("turmas.noShiftPreference")}</SelectItem>
                    {Object.entries(PREFERRED_SHIFT_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.shift]} />
              </Field>

              <Field data-invalid={!!errors.expectedStudents}>
                <FieldLabel htmlFor="turma-expected-students">{t("turmas.formExpectedStudentsLabel")}</FieldLabel>
                <Input
                  id="turma-expected-students"
                  type="number"
                  min={1}
                  {...register("expectedStudents", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.expectedStudents]} />
              </Field>

              <Field data-invalid={!!errors.serieId}>
                <FieldLabel htmlFor="turma-serie">{t("turmas.formSerieLabel")}</FieldLabel>
                <Select
                  value={serieId ? String(serieId) : ""}
                  onValueChange={(value) => setValue("serieId", Number(value))}
                >
                  <SelectTrigger id="turma-serie" className="w-full">
                    <SelectValue placeholder={t("turmas.formSeriePlaceholder")}>
                      {(value: string) => serieName(Number(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {series?.map((serie) => (
                      <SelectItem key={serie.id} value={String(serie.id)}>
                        {serie.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.serieId]} />
              </Field>

              <Field data-invalid={!!errors.year}>
                <FieldLabel htmlFor="turma-year">{t("turmas.formYearLabel")}</FieldLabel>
                <Input
                  id="turma-year"
                  type="number"
                  {...register("year", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.year]} />
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
            <AlertDialogTitle>{t("turmas.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("turmas.deleteDescription", { name: deleting?.name })}
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
