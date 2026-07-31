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
  exportClassroomsCsv,
  importClassroomsCsv,
  listClassrooms,
  updateClassroom,
} from "@/api/classrooms";
import { CsvImportExport, type CsvColumnSpec } from "@/components/admin/CsvImportExport";
import {
  createTimeSlot,
  deleteTimeSlot,
  exportTimeSlotsCsv,
  importTimeSlotsCsv,
  listTimeSlots,
} from "@/api/time-slots";
import { classroomSchema, type ClassroomFormValues } from "@/lib/validations/classroom-schema";
import { timeSlotSchema, type TimeSlotFormValues } from "@/lib/validations/time-slot-schema";
import { useAuth } from "@/hooks/UseAuth";
import { useGroupedByInstitution } from "@/hooks/useGroupedByInstitution";
import { useSelectedInstitution } from "@/hooks/UseSelectedInstitution";
import { DAY_OF_WEEK_LABELS, DAY_OF_WEEK_ORDER, ROOM_TYPE_LABELS } from "@/lib/enum-labels";
import type { Classroom, RoomType } from "@/types/Classroom";
import type { DayOfWeek, TimeSlot } from "@/types/TimeSlot";

function EmptyInstitutionNotice({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

function useClassroomCsvColumns(): CsvColumnSpec[] {
  const { t } = useTranslation("adminInfrastructure");
  return [
    { name: "number", description: t("classroomCsvColumns.number") },
    { name: "capacity", description: t("classroomCsvColumns.capacity") },
    { name: "type", description: t("classroomCsvColumns.type") },
  ];
}

function useTimeSlotCsvColumns(): CsvColumnSpec[] {
  const { t } = useTranslation("adminInfrastructure");
  return [
    { name: "dayOfWeek", description: t("timeSlotCsvColumns.dayOfWeek") },
    { name: "startTime", description: t("timeSlotCsvColumns.startTime") },
    { name: "endTime", description: t("timeSlotCsvColumns.endTime") },
  ];
}

function TimeSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation("adminInfrastructure");
  const [hour, minute] = value ? value.split(":") : ["", ""];

  return (
    <div className="flex items-center gap-2">
      <Select value={hour} onValueChange={(newHour) => onChange(`${newHour}:${minute || "00"}`)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={t("hourPlaceholder")} />
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
          <SelectValue placeholder={t("minutePlaceholder")} />
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
  const { t } = useTranslation("adminInfrastructure");
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { selectedInstitutionId } = useSelectedInstitution();

  return (
    <div>
      <h1 className="text-xl font-semibold text-primary">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {isSuperAdmin ? t("subtitleSuperAdmin") : t("subtitleAdmin")}
      </p>

      <Tabs defaultValue="salas" className="mt-6">
        <TabsList>
          <TabsTrigger value="salas">{t("tabSalas")}</TabsTrigger>
          <TabsTrigger value="horarios">{t("tabHorarios")}</TabsTrigger>
        </TabsList>

        <TabsContent value="salas" className="mt-4">
          {isSuperAdmin ? (
            <ClassroomsGroupedByInstitution />
          ) : selectedInstitutionId ? (
            <ClassroomsTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text={t("selectInstitutionClassrooms")} />
          )}
        </TabsContent>

        <TabsContent value="horarios" className="mt-4">
          {isSuperAdmin ? (
            <TimeSlotsGroupedByInstitution />
          ) : selectedInstitutionId ? (
            <TimeSlotsGroupedByDay institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text={t("selectInstitutionTimeSlots")} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Salas
// ---------------------------------------------------------------------------

function ClassroomsGroupedByInstitution() {
  const { t } = useTranslation("adminInfrastructure");
  const {
    institutions,
    itemsByInstitution: classroomsByInstitution,
    isLoading,
  } = useGroupedByInstitution("classrooms", listClassrooms);
  const [viewingInstitutionId, setViewingInstitutionId] = useState<number | null>(null);
  const viewingInstitution = institutions.find((i) => i.id === viewingInstitutionId) ?? null;

  return (
    <div>
      <div className="card-elevated rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnInstitution")}</TableHead>
              <TableHead>{t("columnClassrooms")}</TableHead>
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
              const count = classroomsByInstitution.get(institution.id)?.length ?? 0;
              return (
                <TableRow key={institution.id}>
                  <TableCell className="font-medium">{institution.name}</TableCell>
                  <TableCell>{t("classroomCount", { count })}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingInstitutionId(institution.id)}
                    >
                      {t("viewClassrooms")}
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
            <DialogTitle>{t("classroomsOfInstitution", { institution: viewingInstitution?.name })}</DialogTitle>
            <DialogDescription>{t("manageClassroomsDescription")}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto">
            {viewingInstitutionId !== null && (
              <ClassroomsTab institutionId={viewingInstitutionId} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ClassroomsTab({ institutionId }: { institutionId: number }) {
  const { t } = useTranslation("adminInfrastructure");
  const classroomCsvColumns = useClassroomCsvColumns();
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
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClassroomFormValues>({
    resolver: zodResolver(classroomSchema),
    defaultValues: { number: "", capacity: 1, type: "COMMON" },
  });
  const classroomType = watch("type");

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
    reset({ number: "", capacity: 1, type: "COMMON" });
    setDialogOpen(true);
  }

  function openEdit(classroom: Classroom) {
    setEditing(classroom);
    setFormError(null);
    reset({
      number: classroom.number,
      capacity: classroom.capacity,
      type: classroom.type,
    });
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
      setFormError(t("saveClassroomError"));
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <CsvImportExport
          onImport={(file) => importClassroomsCsv(file, institutionId)}
          onExport={() => exportClassroomsCsv(institutionId)}
          exportFilename="salas.csv"
          onImported={() => queryClient.invalidateQueries({ queryKey })}
          entityLabel="salas"
          columns={classroomCsvColumns}
        />
        <Button variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          {t("newClassroom")}
        </Button>
      </div>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnNumber")}</TableHead>
              <TableHead>{t("columnCapacity")}</TableHead>
              <TableHead>{t("columnType")}</TableHead>
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
            {!isLoading && classrooms?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {t("noClassroomsRegistered")}
                </TableCell>
              </TableRow>
            )}
            {classrooms?.map((classroom) => (
              <TableRow key={classroom.id}>
                <TableCell className="font-medium">{classroom.number}</TableCell>
                <TableCell>{t("capacitySeats", { count: classroom.capacity })}</TableCell>
                <TableCell>{ROOM_TYPE_LABELS[classroom.type]}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("editClassroomAriaLabel", { number: classroom.number })}
                    onClick={() => openEdit(classroom)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={t("deleteClassroomAriaLabel", { number: classroom.number })}
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
            <DialogTitle>{editing ? t("editClassroomDialogTitle") : t("newClassroomDialogTitle")}</DialogTitle>
            <DialogDescription>
              {editing ? t("editClassroomDialogDescription") : t("newClassroomDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.number}>
                <FieldLabel htmlFor="classroom-number">{t("formNumber")}</FieldLabel>
                <Input id="classroom-number" {...register("number")} />
                <FieldError errors={[errors.number]} />
              </Field>
              <Field data-invalid={!!errors.capacity}>
                <FieldLabel htmlFor="classroom-capacity">{t("formCapacity")}</FieldLabel>
                <Input
                  id="classroom-capacity"
                  type="number"
                  min={1}
                  {...register("capacity", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.capacity]} />
              </Field>
              <Field data-invalid={!!errors.type}>
                <FieldLabel htmlFor="classroom-type">{t("formType")}</FieldLabel>
                <Select
                  value={classroomType}
                  onValueChange={(value) => setValue("type", value as RoomType)}
                >
                  <SelectTrigger id="classroom-type" className="w-full">
                    <SelectValue>{(value: RoomType) => ROOM_TYPE_LABELS[value]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {Object.entries(ROOM_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.type]} />
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
            <AlertDialogTitle>{t("deleteClassroomTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteClassroomDescription", { number: deleting?.number })}
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
// Horários
// ---------------------------------------------------------------------------

function TimeSlotsGroupedByInstitution() {
  const { t } = useTranslation("adminInfrastructure");
  const { institutions, isLoading } = useGroupedByInstitution("time-slots", listTimeSlots);
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
                    {t("viewTimeSlots")}
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
        <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("timeSlotsOfInstitution", { institution: viewingInstitution?.name })}</DialogTitle>
            <DialogDescription>{t("timeSlotsByDayDescription")}</DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto">
            {viewingInstitutionId !== null && (
              <TimeSlotsGroupedByDay institutionId={viewingInstitutionId} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TimeSlotsGroupedByDay({ institutionId }: { institutionId: number }) {
  const { t } = useTranslation("adminInfrastructure");
  const timeSlotCsvColumns = useTimeSlotCsvColumns();
  const queryClient = useQueryClient();
  const queryKey = ["time-slots", institutionId] as const;

  const { data: timeSlots, isLoading } = useQuery({
    queryKey,
    queryFn: () => listTimeSlots(institutionId),
  });

  const [viewingDay, setViewingDay] = useState<DayOfWeek | null>(null);

  const daysPresent = DAY_OF_WEEK_ORDER.filter((day) =>
    (timeSlots ?? []).some((t) => t.dayOfWeek === day),
  );

  if (viewingDay !== null) {
    return (
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t("common:actions.back")}
            onClick={() => setViewingDay(null)}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <span className="text-sm font-medium text-foreground">
            {t("timeSlotsOfDay", { day: DAY_OF_WEEK_LABELS[viewingDay] })}
          </span>
        </div>
        <TimeSlotsTab institutionId={institutionId} dayFilter={viewingDay} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-end">
        <CsvImportExport
          onImport={(file) => importTimeSlotsCsv(file, institutionId)}
          onExport={() => exportTimeSlotsCsv(institutionId)}
          exportFilename="horarios.csv"
          onImported={() => queryClient.invalidateQueries({ queryKey })}
          entityLabel="horários"
          columns={timeSlotCsvColumns}
        />
      </div>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnDayOfWeek")}</TableHead>
              <TableHead>{t("columnTimeSlots")}</TableHead>
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
            {!isLoading && daysPresent.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  {t("noTimeSlotsRegistered")}
                </TableCell>
              </TableRow>
            )}
            {daysPresent.map((day) => {
              const count = (timeSlots ?? []).filter((t) => t.dayOfWeek === day).length;
              return (
                <TableRow key={day}>
                  <TableCell className="font-medium">{DAY_OF_WEEK_LABELS[day]}</TableCell>
                  <TableCell>{t("timeSlotCount", { count })}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setViewingDay(day)}>
                      {t("viewTimeSlots")}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TimeSlotsTab({
  institutionId,
  dayFilter,
}: {
  institutionId: number;
  dayFilter?: DayOfWeek;
}) {
  const { t } = useTranslation("adminInfrastructure");
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
    reset({ dayOfWeek: dayFilter ?? "MONDAY", startTime: "", endTime: "" });
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
      setFormError(t("saveTimeSlotError"));
    }
  }

  const sortedTimeSlots = (timeSlots ?? [])
    .filter((timeSlot) => dayFilter === undefined || timeSlot.dayOfWeek === dayFilter)
    .sort((a, b) => {
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
          {t("newTimeSlot")}
        </Button>
      </div>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnDayOfWeek")}</TableHead>
              <TableHead>{t("columnStart")}</TableHead>
              <TableHead>{t("columnEnd")}</TableHead>
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
            {!isLoading && sortedTimeSlots.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {t("noTimeSlotsRegistered")}
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
                    aria-label={t("deleteTimeSlotAriaLabel", {
                      day: DAY_OF_WEEK_LABELS[timeSlot.dayOfWeek],
                      time: timeSlot.startTime.slice(0, 5),
                    })}
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
            <DialogTitle>{t("newTimeSlotDialogTitle")}</DialogTitle>
            <DialogDescription>{t("newTimeSlotDialogDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.dayOfWeek}>
                <FieldLabel htmlFor="time-slot-day">{t("formDayOfWeek")}</FieldLabel>
                <Select
                  value={dayOfWeek}
                  onValueChange={(value) =>
                    setValue("dayOfWeek", value as TimeSlotFormValues["dayOfWeek"])
                  }
                >
                  <SelectTrigger id="time-slot-day" className="w-full">
                    <SelectValue>{(value: DayOfWeek) => DAY_OF_WEEK_LABELS[value]}</SelectValue>
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
                <FieldLabel htmlFor="time-slot-start">{t("formStart")}</FieldLabel>
                <TimeSelect
                  id="time-slot-start"
                  value={startTime}
                  onChange={(value) => setValue("startTime", value)}
                />
                <FieldError errors={[errors.startTime]} />
              </Field>

              <Field data-invalid={!!errors.endTime}>
                <FieldLabel htmlFor="time-slot-end">{t("formEnd")}</FieldLabel>
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
                {createMutation.isPending ? t("common:actions.saving") : t("common:actions.save")}
              </Button>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTimeSlotTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteTimeSlotDescription")}</AlertDialogDescription>
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
