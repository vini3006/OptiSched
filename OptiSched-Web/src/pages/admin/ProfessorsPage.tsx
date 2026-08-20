import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
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

import { deleteProfessor, listProfessors, updateProfessor } from "@/api/professors";
import { CsvImportExport, type CsvColumnSpec } from "@/components/admin/CsvImportExport";
import { listSubjects } from "@/api/subjects";
import { listTimeSlots } from "@/api/time-slots";
import {
  createQualification,
  deleteQualification,
  exportQualificationsCsv,
  importQualificationsCsv,
  listQualifications,
} from "@/api/professor-qualifications";
import { createAvailability, deleteAvailability, listAvailabilities } from "@/api/availabilities";
import { professorSchema, type ProfessorFormValues } from "@/lib/validations/professor-schema";
import {
  professorQualificationSchema,
  type ProfessorQualificationFormValues,
} from "@/lib/validations/professor-qualification-schema";
import {
  availabilitySchema,
  type AvailabilityFormValues,
} from "@/lib/validations/availability-schema";
import { useAuth } from "@/hooks/UseAuth";
import { useGroupedByInstitution } from "@/hooks/useGroupedByInstitution";
import { useSelectedInstitution } from "@/hooks/UseSelectedInstitution";
import { useInstitutionMode } from "@/hooks/UseInstitutionMode";
import { DAY_OF_WEEK_LABELS, DAY_OF_WEEK_ORDER } from "@/lib/enum-labels";
import type { Professor } from "@/types/Professor";
import type { ProfessorQualification } from "@/types/ProfessorQualification";
import type { Availability } from "@/types/Availability";

function EmptyInstitutionNotice({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function useQualificationCsvColumns(): CsvColumnSpec[] {
  const { t } = useTranslation("adminProfessors");
  return [
    { name: "professorEmail", description: t("qualificationCsvColumns.professorEmail") },
    { name: "subjectCode", description: t("qualificationCsvColumns.subjectCode") },
  ];
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }
  return fallback;
}

export function ProfessorsPage() {
  const { t } = useTranslation("adminProfessors");
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { selectedInstitutionId } = useSelectedInstitution();

  return (
    <div>
      <h1 className="text-xl font-semibold text-primary">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

      <Tabs defaultValue="professores" className="mt-6">
        <TabsList>
          <TabsTrigger value="professores">{t("tabProfessores")}</TabsTrigger>
          <TabsTrigger value="qualificacoes">{t("tabQualificacoes")}</TabsTrigger>
          <TabsTrigger value="disponibilidade">{t("tabDisponibilidade")}</TabsTrigger>
        </TabsList>

        <TabsContent value="professores" className="mt-4">
          {isSuperAdmin ? (
            <ProfessorsGroupedByInstitution />
          ) : selectedInstitutionId ? (
            <ProfessorsTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text={t("selectInstitutionProfessors")} />
          )}
        </TabsContent>

        <TabsContent value="qualificacoes" className="mt-4">
          {selectedInstitutionId ? (
            <QualificationsTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text={t("selectInstitutionQualifications")} />
          )}
        </TabsContent>

        <TabsContent value="disponibilidade" className="mt-4">
          {selectedInstitutionId ? (
            <AvailabilityTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text={t("selectInstitutionAvailability")} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Professores
// ---------------------------------------------------------------------------

function ProfessorsGroupedByInstitution() {
  const { t } = useTranslation("adminProfessors");
  const queryClient = useQueryClient();
  const { institutionMode } = useInstitutionMode();
  const {
    institutions,
    itemsByInstitution: professorsByInstitution,
    isLoading,
  } = useGroupedByInstitution("professors", listProfessors, institutionMode);

  const [viewingInstitutionId, setViewingInstitutionId] = useState<number | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Professor | null>(null);
  const [deleting, setDeleting] = useState<Professor | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfessorFormValues>({
    resolver: zodResolver(professorSchema),
    defaultValues: {
      name: "",
      maxDailyTimeSlots: null,
      maxWeeklyTimeSlots: null,
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
      institutionId,
    }: {
      id: number;
      input: ProfessorFormValues;
      institutionId: number;
    }) => updateProfessor(id, input, institutionId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["professors", variables.institutionId],
      });
      closeEditDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, institutionId }: { id: number; institutionId: number }) =>
      deleteProfessor(id, institutionId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["professors", variables.institutionId],
      });
      setDeleting(null);
    },
    onError: (error) => {
      setDeleteError(extractErrorMessage(error, t("deleteProfessorError")));
    },
  });

  function openEdit(professor: Professor) {
    setEditing(professor);
    setFormError(null);
    reset({
      name: professor.name,
      maxDailyTimeSlots: professor.maxDailyTimeSlots,
      maxWeeklyTimeSlots: professor.maxWeeklyTimeSlots,
    });
    setEditDialogOpen(true);
  }

  function closeEditDialog() {
    setEditDialogOpen(false);
    setEditing(null);
  }

  async function onSubmit(values: ProfessorFormValues) {
    if (!editing || viewingInstitutionId === null) return;
    setFormError(null);
    try {
      await updateMutation.mutateAsync({
        id: editing.id,
        input: values,
        institutionId: viewingInstitutionId,
      });
    } catch {
      setFormError(t("saveProfessorError"));
    }
  }

  const viewingInstitution = institutions.find((i) => i.id === viewingInstitutionId) ?? null;
  const viewingProfessors =
    viewingInstitutionId !== null ? (professorsByInstitution.get(viewingInstitutionId) ?? []) : [];

  return (
    <div>
      <div className="card-elevated rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnInstitution")}</TableHead>
              <TableHead>{t("columnProfessors")}</TableHead>
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
              const count = professorsByInstitution.get(institution.id)?.length ?? 0;
              return (
                <TableRow key={institution.id}>
                  <TableCell className="font-medium">{institution.name}</TableCell>
                  <TableCell>{t("professorCount", { count })}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingInstitutionId(institution.id)}
                    >
                      {t("viewProfessors")}
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
        <DialogContent className="flex max-h-[85vh] flex-col">
          <DialogHeader>
            <DialogTitle>{t("professorsOfInstitution", { institution: viewingInstitution?.name })}</DialogTitle>
            <DialogDescription>{t("allProfessorsOfInstitution")}</DialogDescription>
          </DialogHeader>
          {viewingProfessors.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noProfessorsRegistered")}</p>
          ) : (
            <ul className="flex flex-col gap-2 overflow-y-auto">
              {viewingProfessors.map((professor) => (
                <li
                  key={professor.id}
                  className="flex items-center justify-between rounded-lg bg-secondary p-2 pl-3"
                >
                  <span className="text-sm">{professor.name}</span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("editProfessorAriaLabel", { name: professor.name })}
                      onClick={() => openEdit(professor)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("deleteProfessorAriaLabel", { name: professor.name })}
                      onClick={() => {
                        setDeleteError(null);
                        setDeleting(professor);
                      }}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={(open) => !open && closeEditDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("editProfessorDialogTitle")}</DialogTitle>
            <DialogDescription>{t("editProfessorDialogDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="professor-name-grouped">{t("formName")}</FieldLabel>
                <Input id="professor-name-grouped" {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field data-invalid={!!errors.maxDailyTimeSlots}>
                <FieldLabel htmlFor="professor-max-daily-grouped">{t("formMaxDaily")}</FieldLabel>
                <p className="text-xs text-muted-foreground">{t("formLeaveBlankNotice")}</p>
                <Input
                  id="professor-max-daily-grouped"
                  type="number"
                  min={1}
                  {...register("maxDailyTimeSlots", {
                    setValueAs: (v) => (v === "" ? null : Number(v)),
                  })}
                />
                <FieldError errors={[errors.maxDailyTimeSlots]} />
              </Field>
              <Field data-invalid={!!errors.maxWeeklyTimeSlots}>
                <FieldLabel htmlFor="professor-max-weekly-grouped">
                  {t("formMaxWeekly")}
                </FieldLabel>
                <p className="text-xs text-muted-foreground">{t("formLeaveBlankNotice")}</p>
                <Input
                  id="professor-max-weekly-grouped"
                  type="number"
                  min={1}
                  {...register("maxWeeklyTimeSlots", {
                    setValueAs: (v) => (v === "" ? null : Number(v)),
                  })}
                />
                <FieldError errors={[errors.maxWeeklyTimeSlots]} />
              </Field>
              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}
              <Button type="submit" disabled={updateMutation.isPending} className="btn-gold">
                {updateMutation.isPending ? t("common:actions.saving") : t("common:actions.save")}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteProfessorTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteProfessorDescription", { name: deleting?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleting &&
                viewingInstitutionId !== null &&
                deleteMutation.mutate({
                  id: deleting.id,
                  institutionId: viewingInstitutionId,
                })
              }
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

function ProfessorsTab({ institutionId }: { institutionId: number }) {
  const { t } = useTranslation("adminProfessors");
  const queryClient = useQueryClient();
  const queryKey = ["professors", institutionId] as const;

  const { data: professors, isLoading } = useQuery({
    queryKey,
    queryFn: () => listProfessors(institutionId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Professor | null>(null);
  const [deleting, setDeleting] = useState<Professor | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfessorFormValues>({
    resolver: zodResolver(professorSchema),
    defaultValues: {
      name: "",
      maxDailyTimeSlots: null,
      maxWeeklyTimeSlots: null,
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: ProfessorFormValues }) =>
      updateProfessor(id, input, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteProfessor(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleting(null);
    },
    onError: (error) => {
      setDeleteError(extractErrorMessage(error, t("deleteProfessorError")));
    },
  });

  function openDelete(professor: Professor) {
    setDeleteError(null);
    setDeleting(professor);
  }

  function openEdit(professor: Professor) {
    setEditing(professor);
    setFormError(null);
    reset({
      name: professor.name,
      maxDailyTimeSlots: professor.maxDailyTimeSlots,
      maxWeeklyTimeSlots: professor.maxWeeklyTimeSlots,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  async function onSubmit(values: ProfessorFormValues) {
    if (!editing) return;
    setFormError(null);
    try {
      await updateMutation.mutateAsync({ id: editing.id, input: values });
    } catch {
      setFormError(t("saveProfessorError"));
    }
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground">{t("professorsCreatedElsewhereNotice")}</p>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnName")}</TableHead>
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
            {!isLoading && professors?.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  {t("noProfessorsRegistered")}
                </TableCell>
              </TableRow>
            )}
            {professors?.map((professor) => (
              <TableRow key={professor.id}>
                <TableCell className="font-medium">{professor.name}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("editProfessorAriaLabel", { name: professor.name })}
                    onClick={() => openEdit(professor)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("deleteProfessorAriaLabel", { name: professor.name })}
                    onClick={() => openDelete(professor)}
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
            <DialogTitle>{t("editProfessorDialogTitle")}</DialogTitle>
            <DialogDescription>{t("editProfessorDialogDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="professor-name">{t("formName")}</FieldLabel>
                <Input id="professor-name" {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field data-invalid={!!errors.maxDailyTimeSlots}>
                <FieldLabel htmlFor="professor-max-daily">{t("formMaxDaily")}</FieldLabel>
                <p className="text-xs text-muted-foreground">{t("formLeaveBlankNotice")}</p>
                <Input
                  id="professor-max-daily"
                  type="number"
                  min={1}
                  {...register("maxDailyTimeSlots", {
                    setValueAs: (v) => (v === "" ? null : Number(v)),
                  })}
                />
                <FieldError errors={[errors.maxDailyTimeSlots]} />
              </Field>
              <Field data-invalid={!!errors.maxWeeklyTimeSlots}>
                <FieldLabel htmlFor="professor-max-weekly">{t("formMaxWeekly")}</FieldLabel>
                <p className="text-xs text-muted-foreground">{t("formLeaveBlankNotice")}</p>
                <Input
                  id="professor-max-weekly"
                  type="number"
                  min={1}
                  {...register("maxWeeklyTimeSlots", {
                    setValueAs: (v) => (v === "" ? null : Number(v)),
                  })}
                />
                <FieldError errors={[errors.maxWeeklyTimeSlots]} />
              </Field>
              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}
              <Button type="submit" disabled={updateMutation.isPending} className="btn-gold">
                {updateMutation.isPending ? t("common:actions.saving") : t("common:actions.save")}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteProfessorTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteProfessorDescription", { name: deleting?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {deleteError}
            </p>
          )}
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
// Qualificações
// ---------------------------------------------------------------------------

function QualificationsTab({ institutionId }: { institutionId: number }) {
  const { t } = useTranslation("adminProfessors");
  const qualificationCsvColumns = useQualificationCsvColumns();
  const queryClient = useQueryClient();
  const queryKey = ["qualifications", institutionId] as const;

  const { data: qualifications, isLoading } = useQuery({
    queryKey,
    queryFn: () => listQualifications(institutionId),
  });
  const { data: professors } = useQuery({
    queryKey: ["professors", institutionId],
    queryFn: () => listProfessors(institutionId),
  });
  const { data: subjects } = useQuery({
    queryKey: ["subjects", institutionId],
    queryFn: () => listSubjects(institutionId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingProfessorId, setViewingProfessorId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<ProfessorQualification | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProfessorQualificationFormValues>({
    resolver: zodResolver(professorQualificationSchema),
    defaultValues: { professorId: 0, subjectId: 0 },
  });

  const professorId = watch("professorId");
  const subjectId = watch("subjectId");

  const createMutation = useMutation({
    mutationFn: (values: ProfessorQualificationFormValues) =>
      createQualification(values, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ profId, subjId }: { profId: number; subjId: number }) =>
      deleteQualification(profId, subjId, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleting(null);
    },
    onError: (error) => {
      setDeleteError(extractErrorMessage(error, t("deleteQualificationError")));
    },
  });

  function openCreate() {
    setFormError(null);
    reset({ professorId: 0, subjectId: 0 });
    setDialogOpen(true);
  }

  function openDelete(qualification: ProfessorQualification) {
    setDeleteError(null);
    setDeleting(qualification);
  }

  function closeDialog() {
    setDialogOpen(false);
  }

  async function onSubmit(values: ProfessorQualificationFormValues) {
    setFormError(null);
    try {
      await createMutation.mutateAsync(values);
    } catch {
      setFormError(t("saveQualificationError"));
    }
  }

  function professorName(id: number) {
    return professors?.find((p) => p.id === id)?.name ?? `#${id}`;
  }
  function subjectLabel(id: number) {
    const subject = subjects?.find((s) => s.id === id);
    return subject ? `${subject.code} - ${subject.name}` : `#${id}`;
  }

  const viewingProfessor = professors?.find((p) => p.id === viewingProfessorId) ?? null;
  const viewingQualifications = (qualifications ?? []).filter(
    (q) => q.professorId === viewingProfessorId,
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <CsvImportExport
          onImport={(file) => importQualificationsCsv(file, institutionId)}
          onExport={() => exportQualificationsCsv(institutionId)}
          exportFilename="qualificacoes.csv"
          onImported={() => queryClient.invalidateQueries({ queryKey })}
          entityLabel="qualificações"
          columns={qualificationCsvColumns}
        />
        <Button variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          {t("newQualification")}
        </Button>
      </div>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("selectProfessorLabel")}</TableHead>
              <TableHead>{t("columnQualifications")}</TableHead>
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
            {!isLoading && professors?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  {t("noProfessorsRegistered")}
                </TableCell>
              </TableRow>
            )}
            {professors?.map((professor) => {
              const count = (qualifications ?? []).filter(
                (q) => q.professorId === professor.id,
              ).length;
              return (
                <TableRow key={professor.id}>
                  <TableCell className="font-medium">{professor.name}</TableCell>
                  <TableCell>{t("qualificationCount", { count })}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingProfessorId(professor.id)}
                    >
                      {t("viewQualifications")}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={viewingProfessorId !== null}
        onOpenChange={(open) => !open && setViewingProfessorId(null)}
      >
        <DialogContent className="flex max-h-[85vh] flex-col">
          <DialogHeader>
            <DialogTitle>{t("qualificationsOfProfessor", { professor: viewingProfessor?.name })}</DialogTitle>
            <DialogDescription>{t("qualificationsOfProfessorDescription")}</DialogDescription>
          </DialogHeader>
          {viewingQualifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noQualificationsRegistered")}</p>
          ) : (
            <ul className="flex flex-col gap-2 overflow-y-auto">
              {viewingQualifications.map((qualification) => (
                <li
                  key={`${qualification.professorId}-${qualification.subjectId}`}
                  className="flex items-center justify-between rounded-lg bg-secondary p-2 pl-3"
                >
                  <span className="text-sm">
                    {qualification.subjectCode} - {qualification.subjectName}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("deleteQualificationAriaLabel", { subject: qualification.subjectCode })}
                    onClick={() => openDelete(qualification)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newQualificationDialogTitle")}</DialogTitle>
            <DialogDescription>{t("newQualificationDialogDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.professorId}>
                <FieldLabel htmlFor="qualification-professor">{t("selectProfessorLabel")}</FieldLabel>
                <Select
                  value={professorId ? String(professorId) : ""}
                  onValueChange={(value) => setValue("professorId", Number(value))}
                >
                  <SelectTrigger id="qualification-professor" className="w-full">
                    <SelectValue placeholder={t("selectProfessorPlaceholder")}>
                      {(value: string) => professorName(Number(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {professors?.map((professor) => (
                      <SelectItem key={professor.id} value={String(professor.id)}>
                        {professor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.professorId]} />
              </Field>

              <Field data-invalid={!!errors.subjectId}>
                <FieldLabel htmlFor="qualification-subject">{t("selectSubjectLabel")}</FieldLabel>
                <Select
                  value={subjectId ? String(subjectId) : ""}
                  onValueChange={(value) => setValue("subjectId", Number(value))}
                >
                  <SelectTrigger id="qualification-subject" className="w-full">
                    <SelectValue placeholder={t("selectSubjectPlaceholder")}>
                      {(value: string) => subjectLabel(Number(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={String(subject.id)}>
                        {subject.code} - {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.subjectId]} />
              </Field>

              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}
              <Button type="submit" disabled={createMutation.isPending} className="btn-gold">
                {createMutation.isPending ? t("common:actions.saving") : t("common:actions.save")}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteQualificationTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteQualificationDescription", {
                professor: deleting?.professorName,
                subject: deleting?.subjectName,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleting &&
                deleteMutation.mutate({
                  profId: deleting.professorId,
                  subjId: deleting.subjectId,
                })
              }
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
// Disponibilidade
// ---------------------------------------------------------------------------

function AvailabilityTab({ institutionId }: { institutionId: number }) {
  const { t } = useTranslation("adminProfessors");
  const { user } = useAuth();
  const canManageAvailability = user?.role === "SUPER_ADMIN";

  const queryClient = useQueryClient();
  const queryKey = ["availabilities", institutionId] as const;

  const { data: availabilities, isLoading } = useQuery({
    queryKey,
    queryFn: () => listAvailabilities(institutionId),
  });
  const { data: professors } = useQuery({
    queryKey: ["professors", institutionId],
    queryFn: () => listProfessors(institutionId),
  });
  const { data: timeSlots } = useQuery({
    queryKey: ["time-slots", institutionId],
    queryFn: () => listTimeSlots(institutionId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewingProfessorId, setViewingProfessorId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<Availability | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AvailabilityFormValues>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: { professorId: 0, timeSlotId: 0 },
  });

  const professorId = watch("professorId");
  const timeSlotId = watch("timeSlotId");

  const createMutation = useMutation({
    mutationFn: (values: AvailabilityFormValues) => createAvailability(values, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ profId, slotId }: { profId: number; slotId: number }) =>
      deleteAvailability(profId, slotId, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleting(null);
    },
    onError: (error) => {
      setDeleteError(extractErrorMessage(error, t("deleteAvailabilityError")));
    },
  });

  function openCreate() {
    setFormError(null);
    reset({ professorId: 0, timeSlotId: 0 });
    setDialogOpen(true);
  }

  function openDelete(availability: Availability) {
    setDeleteError(null);
    setDeleting(availability);
  }

  function closeDialog() {
    setDialogOpen(false);
  }

  async function onSubmit(values: AvailabilityFormValues) {
    setFormError(null);
    try {
      await createMutation.mutateAsync(values);
    } catch {
      setFormError(t("saveAvailabilityError"));
    }
  }

  function professorName(id: number) {
    return professors?.find((p) => p.id === id)?.name ?? `#${id}`;
  }
  function timeSlotLabel(id: number) {
    const timeSlot = timeSlots?.find((t) => t.id === id);
    if (!timeSlot) return `#${id}`;
    return `${DAY_OF_WEEK_LABELS[timeSlot.dayOfWeek]} · ${timeSlot.startTime.slice(0, 5)} - ${timeSlot.endTime.slice(0, 5)}`;
  }

  const viewingProfessor = professors?.find((p) => p.id === viewingProfessorId) ?? null;
  const viewingAvailabilities = (availabilities ?? [])
    .filter((a) => a.professorId === viewingProfessorId)
    .sort(
      (a, b) =>
        DAY_OF_WEEK_ORDER.indexOf(a.timeSlotDayOfWeek) -
          DAY_OF_WEEK_ORDER.indexOf(b.timeSlotDayOfWeek) ||
        a.timeSlotStartTime.localeCompare(b.timeSlotStartTime),
    );

  return (
    <div>
      {canManageAvailability ? (
        <div className="flex justify-end">
          <Button variant="outline" onClick={openCreate}>
            <Plus className="size-4" />
            {t("newAvailability")}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("managedByProfessorNotice")}</p>
      )}

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("selectProfessorLabel")}</TableHead>
              <TableHead>{t("columnAvailability")}</TableHead>
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
            {!isLoading && professors?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  {t("noProfessorsRegistered")}
                </TableCell>
              </TableRow>
            )}
            {professors?.map((professor) => {
              const count = (availabilities ?? []).filter(
                (a) => a.professorId === professor.id,
              ).length;
              return (
                <TableRow key={professor.id}>
                  <TableCell className="font-medium">{professor.name}</TableCell>
                  <TableCell>{t("availabilityCount", { count })}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingProfessorId(professor.id)}
                    >
                      {t("viewAvailability")}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={viewingProfessorId !== null}
        onOpenChange={(open) => !open && setViewingProfessorId(null)}
      >
        <DialogContent className="flex max-h-[85vh] flex-col">
          <DialogHeader>
            <DialogTitle>{t("availabilityOfProfessor", { professor: viewingProfessor?.name })}</DialogTitle>
            <DialogDescription>{t("availabilityOfProfessorDescription")}</DialogDescription>
          </DialogHeader>
          {viewingAvailabilities.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noAvailabilityRegistered")}</p>
          ) : (
            <ul className="flex flex-col gap-2 overflow-y-auto">
              {viewingAvailabilities.map((availability) => (
                <li
                  key={`${availability.professorId}-${availability.timeSlotId}`}
                  className="flex items-center justify-between rounded-lg bg-secondary p-2 pl-3"
                >
                  <span className="text-sm">
                    {DAY_OF_WEEK_LABELS[availability.timeSlotDayOfWeek]} ·{" "}
                    {availability.timeSlotStartTime.slice(0, 5)} -{" "}
                    {availability.timeSlotEndTime.slice(0, 5)}
                  </span>
                  {canManageAvailability && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("deleteAvailabilityAriaLabel")}
                      onClick={() => openDelete(availability)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newAvailabilityDialogTitle")}</DialogTitle>
            <DialogDescription>{t("newAvailabilityDialogDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.professorId}>
                <FieldLabel htmlFor="availability-professor">{t("selectProfessorLabel")}</FieldLabel>
                <Select
                  value={professorId ? String(professorId) : ""}
                  onValueChange={(value) => setValue("professorId", Number(value))}
                >
                  <SelectTrigger id="availability-professor" className="w-full">
                    <SelectValue placeholder={t("selectProfessorPlaceholder")}>
                      {(value: string) => professorName(Number(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {professors?.map((professor) => (
                      <SelectItem key={professor.id} value={String(professor.id)}>
                        {professor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.professorId]} />
              </Field>

              <Field data-invalid={!!errors.timeSlotId}>
                <FieldLabel htmlFor="availability-time-slot">{t("selectTimeSlotLabel")}</FieldLabel>
                <Select
                  value={timeSlotId ? String(timeSlotId) : ""}
                  onValueChange={(value) => setValue("timeSlotId", Number(value))}
                >
                  <SelectTrigger id="availability-time-slot" className="w-full">
                    <SelectValue placeholder={t("selectTimeSlotPlaceholder")}>
                      {(value: string) => timeSlotLabel(Number(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {timeSlots?.map((timeSlot) => (
                      <SelectItem key={timeSlot.id} value={String(timeSlot.id)}>
                        {timeSlotLabel(timeSlot.id)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.timeSlotId]} />
              </Field>

              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}
              <Button type="submit" disabled={createMutation.isPending} className="btn-gold">
                {createMutation.isPending ? t("common:actions.saving") : t("common:actions.save")}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteAvailabilityTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("common:deleteConfirmIrreversible")}</AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <p role="alert" className="text-sm font-medium text-destructive">
              {deleteError}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleting &&
                deleteMutation.mutate({
                  profId: deleting.professorId,
                  slotId: deleting.timeSlotId,
                })
              }
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
