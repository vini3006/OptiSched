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

import {
  createClassroom,
  deleteClassroom,
  listClassrooms,
  updateClassroom,
} from "@/api/classrooms";
import { createTimeSlot, deleteTimeSlot, listTimeSlots } from "@/api/time-slots";
import { classroomSchema, type ClassroomFormValues } from "@/lib/validations/classroom-schema";
import { timeSlotSchema, type TimeSlotFormValues } from "@/lib/validations/time-slot-schema";
import { useSelectedInstitution } from "@/hooks/UseSelectedInstitution";
import { DAY_OF_WEEK_LABELS } from "@/lib/enum-labels";
import type { Classroom } from "@/types/Classroom";
import type { DayOfWeek, TimeSlot } from "@/types/TimeSlot";

function EmptyInstitutionNotice({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function TimeSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [hour, minute] = value ? value.split(":") : ["", ""];

  return (
    <div className="flex items-center gap-2">
      <Select value={hour} onValueChange={(newHour) => onChange(`${newHour}:${minute || "00"}`)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder="Hora" />
        </SelectTrigger>
        <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>
              {h}h
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-muted-foreground">:</span>
      <Select
        value={minute}
        onValueChange={(newMinute) => onChange(`${hour || "00"}:${newMinute}`)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>
              {m}min
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function InfrastructurePage() {
  const { selectedInstitutionId } = useSelectedInstitution();

  return (
    <div>
      <h1 className="text-xl font-semibold text-primary">Infraestrutura</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gerencie as salas e a grade de horários possíveis da instituição selecionada.
      </p>

      <Tabs defaultValue="salas" className="mt-6">
        <TabsList>
          <TabsTrigger value="salas">Salas</TabsTrigger>
          <TabsTrigger value="horarios">Horários</TabsTrigger>
        </TabsList>

        <TabsContent value="salas" className="mt-4">
          {selectedInstitutionId ? (
            <ClassroomsTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text="Selecione uma instituição para ver as salas." />
          )}
        </TabsContent>

        <TabsContent value="horarios" className="mt-4">
          {selectedInstitutionId ? (
            <TimeSlotsTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text="Selecione uma instituição para ver os horários." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Salas
// ---------------------------------------------------------------------------

function ClassroomsTab({ institutionId }: { institutionId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ["classrooms", institutionId] as const;

  const { data: classrooms, isLoading } = useQuery({
    queryKey,
    queryFn: () => listClassrooms(institutionId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Classroom | null>(null);
  const [deleting, setDeleting] = useState<Classroom | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClassroomFormValues>({
    resolver: zodResolver(classroomSchema),
    defaultValues: { number: "", capacity: 1 },
  });

  const createMutation = useMutation({
    mutationFn: (values: ClassroomFormValues) => createClassroom(values, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: ClassroomFormValues }) =>
      updateClassroom(id, input, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteClassroom(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleting(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setFormError(null);
    reset({ number: "", capacity: 1 });
    setDialogOpen(true);
  }

  function openEdit(classroom: Classroom) {
    setEditing(classroom);
    setFormError(null);
    reset({ number: classroom.number, capacity: classroom.capacity });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  async function onSubmit(values: ClassroomFormValues) {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch {
      setFormError("Não foi possível salvar a sala. Tente novamente.");
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          Nova sala
        </Button>
      </div>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Capacidade</TableHead>
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
            {!isLoading && classrooms?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhuma sala cadastrada.
                </TableCell>
              </TableRow>
            )}
            {classrooms?.map((classroom) => (
              <TableRow key={classroom.id}>
                <TableCell className="font-medium">{classroom.number}</TableCell>
                <TableCell>{classroom.capacity} lugares</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(classroom)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleting(classroom)}
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
            <DialogTitle>{editing ? "Editar sala" : "Nova sala"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados da sala." : "Cadastre uma nova sala."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.number}>
                <FieldLabel htmlFor="classroom-number">Número</FieldLabel>
                <Input id="classroom-number" {...register("number")} />
                <FieldError errors={[errors.number]} />
              </Field>
              <Field data-invalid={!!errors.capacity}>
                <FieldLabel htmlFor="classroom-capacity">Capacidade de Alunos</FieldLabel>
                <Input
                  id="classroom-capacity"
                  type="number"
                  min={1}
                  {...register("capacity", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.capacity]} />
              </Field>
              {formError && (
                <p role="alert" className="text-sm font-medium text-destructive">
                  {formError}
                </p>
              )}
              <Button type="submit" disabled={isSaving} className="btn-gold">
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir sala?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. A sala "{deleting?.number}" será removida
              permanentemente.
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
// Horários
// ---------------------------------------------------------------------------

function TimeSlotsTab({ institutionId }: { institutionId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ["time-slots", institutionId] as const;

  const { data: timeSlots, isLoading } = useQuery({
    queryKey,
    queryFn: () => listTimeSlots(institutionId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<TimeSlot | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<TimeSlotFormValues>({
    resolver: zodResolver(timeSlotSchema),
    defaultValues: { dayOfWeek: "MONDAY", startTime: "", endTime: "" },
  });

  const dayOfWeek = watch("dayOfWeek");
  const startTime = watch("startTime");
  const endTime = watch("endTime");

  const createMutation = useMutation({
    mutationFn: (values: TimeSlotFormValues) => createTimeSlot(values, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteTimeSlot(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleting(null);
    },
  });

  function openCreate() {
    setFormError(null);
    reset({ dayOfWeek: "MONDAY", startTime: "", endTime: "" });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
  }

  async function onSubmit(values: TimeSlotFormValues) {
    setFormError(null);
    try {
      await createMutation.mutateAsync(values);
    } catch {
      setFormError("Não foi possível salvar o horário. Tente novamente.");
    }
  }

  const sortedTimeSlots = [...(timeSlots ?? [])].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) {
      return a.dayOfWeek.localeCompare(b.dayOfWeek);
    }
    return a.startTime.localeCompare(b.startTime);
  });

  return (
    <div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          Novo horário
        </Button>
      </div>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Dia da semana</TableHead>
              <TableHead>Início</TableHead>
              <TableHead>Término</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && sortedTimeSlots.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhum horário cadastrado.
                </TableCell>
              </TableRow>
            )}
            {sortedTimeSlots.map((timeSlot) => (
              <TableRow key={timeSlot.id}>
                <TableCell className="font-medium">
                  {DAY_OF_WEEK_LABELS[timeSlot.dayOfWeek]}
                </TableCell>
                <TableCell>{timeSlot.startTime.slice(0, 5)}</TableCell>
                <TableCell>{timeSlot.endTime.slice(0, 5)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeleting(timeSlot)}
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
            <DialogTitle>Novo horário</DialogTitle>
            <DialogDescription>
              Cadastra um novo horário possível na grade de horários da instituição.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.dayOfWeek}>
                <FieldLabel htmlFor="time-slot-day">Dia da semana</FieldLabel>
                <Select
                  value={dayOfWeek}
                  onValueChange={(value) =>
                    setValue("dayOfWeek", value as TimeSlotFormValues["dayOfWeek"])
                  }
                >
                  <SelectTrigger id="time-slot-day" className="w-full">
                    <SelectValue>
                      {(value: DayOfWeek) => DAY_OF_WEEK_LABELS[value]}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {Object.entries(DAY_OF_WEEK_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.dayOfWeek]} />
              </Field>

              <Field data-invalid={!!errors.startTime}>
                <FieldLabel htmlFor="time-slot-start">Início</FieldLabel>
                <TimeSelect
                  id="time-slot-start"
                  value={startTime}
                  onChange={(value) => setValue("startTime", value)}
                />
                <FieldError errors={[errors.startTime]} />
              </Field>

              <Field data-invalid={!!errors.endTime}>
                <FieldLabel htmlFor="time-slot-end">Término</FieldLabel>
                <TimeSelect
                  id="time-slot-end"
                  value={endTime}
                  onChange={(value) => setValue("endTime", value)}
                />
                <FieldError errors={[errors.endTime]} />
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
            <AlertDialogTitle>Excluir horário?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O horário será removido permanentemente.
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
