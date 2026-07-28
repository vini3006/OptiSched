import { useState } from "react";
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

import { deleteProfessor, listProfessors, updateProfessor } from "@/api/professors";
import { listSubjects } from "@/api/subjects";
import { listTimeSlots } from "@/api/time-slots";
import {
  createQualification,
  deleteQualification,
  listQualifications,
} from "@/api/professor-qualifications";
import {
  createAvailability,
  deleteAvailability,
  listAvailabilities,
} from "@/api/availabilities";
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
import { useSelectedInstitution } from "@/hooks/UseSelectedInstitution";
import { DAY_OF_WEEK_LABELS, DAY_OF_WEEK_ORDER } from "@/lib/enum-labels";
import type { Professor } from "@/types/Professor";
import type { ProfessorQualification } from "@/types/ProfessorQualification";
import type { Availability } from "@/types/Availability";

function EmptyInstitutionNotice({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

export function ProfessorsPage() {
  const { selectedInstitutionId } = useSelectedInstitution();

  return (
    <div>
      <h1 className="text-xl font-semibold text-primary">Professores</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gerencie os professores, suas qualificações e disponibilidade de horário.
      </p>

      <Tabs defaultValue="professores" className="mt-6">
        <TabsList>
          <TabsTrigger value="professores">Professores</TabsTrigger>
          <TabsTrigger value="qualificacoes">Qualificações</TabsTrigger>
          <TabsTrigger value="disponibilidade">Disponibilidade</TabsTrigger>
        </TabsList>

        <TabsContent value="professores" className="mt-4">
          {selectedInstitutionId ? (
            <ProfessorsTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text="Selecione uma instituição para ver os professores." />
          )}
        </TabsContent>

        <TabsContent value="qualificacoes" className="mt-4">
          {selectedInstitutionId ? (
            <QualificationsTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text="Selecione uma instituição para ver as qualificações." />
          )}
        </TabsContent>

        <TabsContent value="disponibilidade" className="mt-4">
          {selectedInstitutionId ? (
            <AvailabilityTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text="Selecione uma instituição para ver a disponibilidade." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Professores
// ---------------------------------------------------------------------------

function ProfessorsTab({ institutionId }: { institutionId: number }) {
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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfessorFormValues>({
    resolver: zodResolver(professorSchema),
    defaultValues: { name: "" },
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
  });

  function openEdit(professor: Professor) {
    setEditing(professor);
    setFormError(null);
    reset({ name: professor.name });
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
      setFormError("Não foi possível salvar o professor. Tente novamente.");
    }
  }

  return (
    <div>
      <p className="text-sm text-muted-foreground">
        Professores são criados na tela de Usuários (aba "Novo Professor"). Aqui você pode
        renomear ou remover um professor existente.
      </p>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && professors?.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-muted-foreground">
                  Nenhum professor cadastrado.
                </TableCell>
              </TableRow>
            )}
            {professors?.map((professor) => (
              <TableRow key={professor.id}>
                <TableCell className="font-medium">{professor.name}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(professor)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleting(professor)}
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
            <DialogTitle>Editar professor</DialogTitle>
            <DialogDescription>Atualize o nome do professor.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="professor-name">Nome</FieldLabel>
                <Input id="professor-name" {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>
              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}
              <Button type="submit" disabled={updateMutation.isPending} className="btn-gold">
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir professor?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O professor "{deleting?.name}" perderá o acesso
              e será removido permanentemente, junto com suas qualificações e disponibilidade.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleting && deleteMutation.mutate(deleting.id)}
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
// Qualificações
// ---------------------------------------------------------------------------

function QualificationsTab({ institutionId }: { institutionId: number }) {
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
  });

  function openCreate() {
    setFormError(null);
    reset({ professorId: 0, subjectId: 0 });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
  }

  async function onSubmit(values: ProfessorQualificationFormValues) {
    setFormError(null);
    try {
      await createMutation.mutateAsync(values);
    } catch {
      setFormError("Não foi possível salvar a qualificação. Tente novamente.");
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
    (q) => q.professorId === viewingProfessorId
  );

  return (
    <div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          Nova qualificação
        </Button>
      </div>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Professor</TableHead>
              <TableHead>Qualificações</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && professors?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhum professor cadastrado.
                </TableCell>
              </TableRow>
            )}
            {professors?.map((professor) => {
              const count = (qualifications ?? []).filter(
                (q) => q.professorId === professor.id
              ).length;
              return (
                <TableRow key={professor.id}>
                  <TableCell className="font-medium">{professor.name}</TableCell>
                  <TableCell>
                    {count} {count === 1 ? "qualificação" : "qualificações"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingProfessorId(professor.id)}
                    >
                      Ver qualificações
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
            <DialogTitle>Qualificações de {viewingProfessor?.name}</DialogTitle>
            <DialogDescription>
              Disciplinas que este professor está habilitado a lecionar.
            </DialogDescription>
          </DialogHeader>
          {viewingQualifications.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma qualificação cadastrada.</p>
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
                    onClick={() => setDeleting(qualification)}
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
            <DialogTitle>Nova qualificação</DialogTitle>
            <DialogDescription>
              Habilita um professor a lecionar uma disciplina.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.professorId}>
                <FieldLabel htmlFor="qualification-professor">Professor</FieldLabel>
                <Select
                  value={professorId ? String(professorId) : ""}
                  onValueChange={(value) => setValue("professorId", Number(value))}
                >
                  <SelectTrigger id="qualification-professor" className="w-full">
                    <SelectValue placeholder="Selecione um professor">
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
                <FieldLabel htmlFor="qualification-subject">Disciplina</FieldLabel>
                <Select
                  value={subjectId ? String(subjectId) : ""}
                  onValueChange={(value) => setValue("subjectId", Number(value))}
                >
                  <SelectTrigger id="qualification-subject" className="w-full">
                    <SelectValue placeholder="Selecione uma disciplina">
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
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir qualificação?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. "{deleting?.professorName}" não poderá mais
              lecionar "{deleting?.subjectName}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
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
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
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
  });

  function openCreate() {
    setFormError(null);
    reset({ professorId: 0, timeSlotId: 0 });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
  }

  async function onSubmit(values: AvailabilityFormValues) {
    setFormError(null);
    try {
      await createMutation.mutateAsync(values);
    } catch {
      setFormError("Não foi possível salvar a disponibilidade. Tente novamente.");
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
        a.timeSlotStartTime.localeCompare(b.timeSlotStartTime)
    );

  return (
    <div>
      {canManageAvailability ? (
        <div className="flex justify-end">
          <Button variant="outline" onClick={openCreate}>
            <Plus className="size-4" />
            Nova disponibilidade
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          A disponibilidade é gerenciada pelo próprio professor.
        </p>
      )}

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Professor</TableHead>
              <TableHead>Disponibilidade</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && professors?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhum professor cadastrado.
                </TableCell>
              </TableRow>
            )}
            {professors?.map((professor) => {
              const count = (availabilities ?? []).filter(
                (a) => a.professorId === professor.id
              ).length;
              return (
                <TableRow key={professor.id}>
                  <TableCell className="font-medium">{professor.name}</TableCell>
                  <TableCell>
                    {count} {count === 1 ? "horário" : "horários"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingProfessorId(professor.id)}
                    >
                      Ver disponibilidade
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
            <DialogTitle>Disponibilidade de {viewingProfessor?.name}</DialogTitle>
            <DialogDescription>Horários em que este professor está disponível.</DialogDescription>
          </DialogHeader>
          {viewingAvailabilities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma disponibilidade cadastrada.</p>
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
                      onClick={() => setDeleting(availability)}
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
            <DialogTitle>Nova disponibilidade</DialogTitle>
            <DialogDescription>
              Marca um horário em que o professor está disponível para lecionar.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.professorId}>
                <FieldLabel htmlFor="availability-professor">Professor</FieldLabel>
                <Select
                  value={professorId ? String(professorId) : ""}
                  onValueChange={(value) => setValue("professorId", Number(value))}
                >
                  <SelectTrigger id="availability-professor" className="w-full">
                    <SelectValue placeholder="Selecione um professor">
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
                <FieldLabel htmlFor="availability-time-slot">Horário</FieldLabel>
                <Select
                  value={timeSlotId ? String(timeSlotId) : ""}
                  onValueChange={(value) => setValue("timeSlotId", Number(value))}
                >
                  <SelectTrigger id="availability-time-slot" className="w-full">
                    <SelectValue placeholder="Selecione um horário">
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
                {createMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir disponibilidade?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
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
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
