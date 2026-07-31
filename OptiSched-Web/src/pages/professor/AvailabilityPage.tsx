import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

import { createAvailability, deleteAvailability, listAvailabilities } from "@/api/availabilities";
import { listTimeSlots } from "@/api/time-slots";
import { availabilitySchema, type AvailabilityFormValues } from "@/lib/validations/availability-schema";
import { useAuth } from "@/hooks/UseAuth";
import { DAY_OF_WEEK_LABELS, DAY_OF_WEEK_ORDER } from "@/lib/enum-labels";
import type { Availability } from "@/types/Availability";

function EmptyNotice({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }
  return fallback;
}

export function AvailabilityPage() {
  const { t } = useTranslation("professorAvailability");
  const { user } = useAuth();
  const institutionId = user?.institutionId ?? null;
  const professorId = user?.professorId ?? null;

  if (institutionId === null || professorId === null) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-primary">{t("title")}</h1>
        <div className="mt-6">
          <EmptyNotice text={t("noProfessorRecord")} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-primary">{t("title")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>

      <div className="mt-6">
        <AvailabilityContent institutionId={institutionId} professorId={professorId} />
      </div>
    </div>
  );
}

function AvailabilityContent({
  institutionId,
  professorId,
}: {
  institutionId: number;
  professorId: number;
}) {
  const { t } = useTranslation("professorAvailability");
  const queryClient = useQueryClient();
  const queryKey = ["availabilities", institutionId] as const;

  const { data: availabilities, isLoading } = useQuery({
    queryKey,
    queryFn: () => listAvailabilities(institutionId),
  });
  const { data: timeSlots } = useQuery({
    queryKey: ["time-slots", institutionId],
    queryFn: () => listTimeSlots(institutionId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
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
    defaultValues: { professorId, timeSlotId: 0 },
  });

  const timeSlotId = watch("timeSlotId");

  const createMutation = useMutation({
    mutationFn: (values: AvailabilityFormValues) => createAvailability(values, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (slotId: number) => deleteAvailability(professorId, slotId, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleting(null);
    },
    onError: (error) => {
      setDeleteError(extractErrorMessage(error, t("deleteError")));
    },
  });

  function openCreate() {
    setFormError(null);
    reset({ professorId, timeSlotId: 0 });
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
      setFormError(t("createError"));
    }
  }

  function timeSlotLabel(id: number) {
    const timeSlot = timeSlots?.find((t) => t.id === id);
    if (!timeSlot) return `#${id}`;
    return `${DAY_OF_WEEK_LABELS[timeSlot.dayOfWeek]} · ${timeSlot.startTime.slice(0, 5)} - ${timeSlot.endTime.slice(0, 5)}`;
  }

  const myAvailabilities = (availabilities ?? [])
    .filter((a) => a.professorId === professorId)
    .sort(
      (a, b) =>
        DAY_OF_WEEK_ORDER.indexOf(a.timeSlotDayOfWeek) -
          DAY_OF_WEEK_ORDER.indexOf(b.timeSlotDayOfWeek) ||
        a.timeSlotStartTime.localeCompare(b.timeSlotStartTime)
    );

  const takenTimeSlotIds = new Set(myAvailabilities.map((a) => a.timeSlotId));
  const availableTimeSlots = (timeSlots ?? []).filter((t) => !takenTimeSlotIds.has(t.id));

  return (
    <div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          {t("newAvailability")}
        </Button>
      </div>

      <div className="card-elevated mt-4 rounded-2xl">
        {isLoading ? (
          <p className="p-4 text-center text-sm text-muted-foreground">{t("common:status.loading")}</p>
        ) : myAvailabilities.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">{t("noAvailabilities")}</p>
        ) : (
          <ul className="flex flex-col gap-2 p-3">
            {myAvailabilities.map((availability) => (
              <li
                key={availability.timeSlotId}
                className="flex items-center justify-between rounded-lg bg-secondary p-2 pl-3"
              >
                <span className="text-sm">
                  {DAY_OF_WEEK_LABELS[availability.timeSlotDayOfWeek]} ·{" "}
                  {availability.timeSlotStartTime.slice(0, 5)} -{" "}
                  {availability.timeSlotEndTime.slice(0, 5)}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("deleteAriaLabel")}
                  onClick={() => openDelete(availability)}
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newDialogTitle")}</DialogTitle>
            <DialogDescription>{t("newDialogDescription")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.timeSlotId}>
                <FieldLabel htmlFor="availability-time-slot">{t("timeSlotLabel")}</FieldLabel>
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
                    {availableTimeSlots.map((timeSlot) => (
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
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
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
              onClick={() => deleting && deleteMutation.mutate(deleting.timeSlotId)}
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
