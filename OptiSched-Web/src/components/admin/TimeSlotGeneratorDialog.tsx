import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TimeSelect } from "@/components/admin/TimeSelect";
import { createTimeSlot } from "@/api/time-slots";
import { generateTimeSlots } from "@/lib/time-slot-generator";
import {
  timeSlotGeneratorSchema,
  type TimeSlotGeneratorFormValues,
} from "@/lib/validations/time-slot-generator-schema";
import { DAY_OF_WEEK_ORDER, DAY_OF_WEEK_SHORT_LABELS } from "@/lib/enum-labels";
import type { ImportResult, ImportRowError } from "@/types/ImportResult";
import type { DayOfWeek, GeneratedTimeSlotItem } from "@/types/TimeSlot";

type Step = "form" | "preview" | "result";

export function TimeSlotGeneratorDialog({
  institutionId,
  open,
  onOpenChange,
  onGenerated,
}: {
  institutionId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerated: () => void;
}) {
  const { t } = useTranslation("adminInfrastructure");
  const [step, setStep] = useState<Step>("form");
  const [preview, setPreview] = useState<GeneratedTimeSlotItem[]>([]);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    register,
    control,
    formState: { errors },
  } = useForm<TimeSlotGeneratorFormValues>({
    resolver: zodResolver(timeSlotGeneratorSchema),
    defaultValues: {
      daysOfWeek: [],
      dayStart: "",
      dayEnd: "",
      classDurationMinutes: 50,
      breaks: [],
    },
  });

  const { fields: breakFields, append: appendBreak, remove: removeBreak } = useFieldArray({
    control,
    name: "breaks",
  });

  const daysOfWeek = watch("daysOfWeek");
  const dayStart = watch("dayStart");
  const dayEnd = watch("dayEnd");
  const breaks = watch("breaks");

  const generateMutation = useMutation({
    mutationFn: async (items: GeneratedTimeSlotItem[]) => {
      const errors: ImportRowError[] = [];
      let successCount = 0;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        try {
          await createTimeSlot(item, institutionId);
          successCount++;
        } catch (error) {
          const message =
            isAxiosError(error) && typeof error.response?.data?.message === "string"
              ? error.response.data.message
              : t("generatorItemGenericError");
          errors.push({
            row: i + 1,
            message: t("generatorItemError", {
              day: DAY_OF_WEEK_SHORT_LABELS[item.dayOfWeek],
              start: item.startTime,
              end: item.endTime,
              message,
            }),
          });
        }
      }
      return { totalRows: items.length, successCount, errors };
    },
    onSuccess: (data) => {
      setResult(data);
      setStep("result");
    },
  });

  function toggleDay(day: DayOfWeek) {
    const next = daysOfWeek.includes(day)
      ? daysOfWeek.filter((d) => d !== day)
      : [...daysOfWeek, day];
    setValue("daysOfWeek", next, { shouldValidate: true });
  }

  function closeDialog() {
    onOpenChange(false);
    setStep("form");
    setPreview([]);
    setPreviewError(null);
    setResult(null);
    reset();
  }

  function onSubmitForm(values: TimeSlotGeneratorFormValues) {
    setPreviewError(null);
    const items = generateTimeSlots(values);
    if (items.length === 0) {
      setPreviewError(t("generatorNoSlotsGenerated"));
      return;
    }
    setPreview(items);
    setStep("preview");
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) closeDialog();
  }

  const previewByDay = DAY_OF_WEEK_ORDER.filter((day) =>
    preview.some((item) => item.dayOfWeek === day)
  ).map((day) => ({
    day,
    items: preview.filter((item) => item.dayOfWeek === day),
  }));

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        {step === "form" && (
          <>
            <DialogHeader>
              <DialogTitle>{t("generateTimeSlotsDialogTitle")}</DialogTitle>
              <DialogDescription>{t("generateTimeSlotsDialogDescription")}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmitForm)} noValidate>
              <FieldGroup>
                <Field data-invalid={!!errors.daysOfWeek}>
                  <FieldLabel>{t("generatorFormDaysOfWeek")}</FieldLabel>
                  <div className="flex flex-wrap gap-1.5">
                    {DAY_OF_WEEK_ORDER.map((day) => (
                      <Button
                        key={day}
                        type="button"
                        size="sm"
                        variant={daysOfWeek.includes(day) ? "default" : "outline"}
                        onClick={() => toggleDay(day)}
                      >
                        {DAY_OF_WEEK_SHORT_LABELS[day]}
                      </Button>
                    ))}
                  </div>
                  <FieldError errors={[errors.daysOfWeek]} />
                </Field>

                <Field data-invalid={!!errors.dayStart}>
                  <FieldLabel htmlFor="generator-day-start">
                    {t("generatorFormDayStart")}
                  </FieldLabel>
                  <TimeSelect
                    id="generator-day-start"
                    value={dayStart}
                    onChange={(value) => setValue("dayStart", value, { shouldValidate: true })}
                  />
                  <FieldError errors={[errors.dayStart]} />
                </Field>

                <Field data-invalid={!!errors.dayEnd}>
                  <FieldLabel htmlFor="generator-day-end">{t("generatorFormDayEnd")}</FieldLabel>
                  <TimeSelect
                    id="generator-day-end"
                    value={dayEnd}
                    onChange={(value) => setValue("dayEnd", value, { shouldValidate: true })}
                  />
                  <FieldError errors={[errors.dayEnd]} />
                </Field>

                <Field data-invalid={!!errors.classDurationMinutes}>
                  <FieldLabel htmlFor="generator-duration">
                    {t("generatorFormClassDuration")}
                  </FieldLabel>
                  <Input
                    id="generator-duration"
                    type="number"
                    min={5}
                    step={5}
                    {...register("classDurationMinutes", { valueAsNumber: true })}
                  />
                  <FieldError errors={[errors.classDurationMinutes]} />
                </Field>

                <Field data-invalid={!!errors.breaks}>
                  <FieldLabel>{t("generatorFormBreaks")}</FieldLabel>
                  {breakFields.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t("generatorFormBreaksEmpty")}</p>
                  )}
                  <div className="flex flex-col gap-2">
                    {breakFields.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-2">
                        <TimeSelect
                          value={breaks[index]?.start ?? ""}
                          onChange={(value) =>
                            setValue(`breaks.${index}.start`, value, { shouldValidate: true })
                          }
                        />
                        <span className="text-muted-foreground">–</span>
                        <TimeSelect
                          value={breaks[index]?.end ?? ""}
                          onChange={(value) =>
                            setValue(`breaks.${index}.end`, value, { shouldValidate: true })
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={t("generatorFormRemoveBreakAriaLabel")}
                          onClick={() => removeBreak(index)}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    onClick={() => appendBreak({ start: "", end: "" })}
                  >
                    <Plus className="size-4" />
                    {t("generatorFormAddBreak")}
                  </Button>
                  <FieldError errors={[errors.breaks]} />
                </Field>

                {previewError && (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {previewError}
                  </p>
                )}

                <Button type="submit" className="btn-gold">
                  {t("generatorPreviewTitle")}
                </Button>
              </FieldGroup>
            </form>
          </>
        )}

        {step === "preview" && (
          <>
            <DialogHeader>
              <DialogTitle>{t("generatorPreviewTitle")}</DialogTitle>
              <DialogDescription>
                {t("generatorPreviewCount", { count: preview.length })}
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columnDayOfWeek")}</TableHead>
                    <TableHead>{t("columnStart")}</TableHead>
                    <TableHead>{t("columnEnd")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewByDay.map(({ day, items }) =>
                    items.map((item, index) => (
                      <TableRow key={`${day}-${item.startTime}`}>
                        {index === 0 && (
                          <TableCell rowSpan={items.length} className="align-top font-medium">
                            {DAY_OF_WEEK_SHORT_LABELS[day]}
                          </TableCell>
                        )}
                        <TableCell>{item.startTime}</TableCell>
                        <TableCell>{item.endTime}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep("form")}>
                {t("generatorBack")}
              </Button>
              <Button
                type="button"
                className="btn-gold"
                disabled={generateMutation.isPending}
                onClick={() => generateMutation.mutate(preview)}
              >
                {generateMutation.isPending ? t("generatorCreating") : t("generatorConfirmCreate")}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "result" && result && (
          <>
            <DialogHeader>
              <DialogTitle>{t("generatorResultTitle")}</DialogTitle>
              <DialogDescription>
                {t("generatorResultDescription", {
                  success: result.successCount,
                  total: result.totalRows,
                })}
              </DialogDescription>
            </DialogHeader>
            {result.errors.length > 0 && (
              <div className="max-h-72 overflow-y-auto rounded-lg bg-secondary p-2">
                <ul className="flex flex-col gap-1 text-sm">
                  {result.errors.map((rowError) => (
                    <li key={rowError.row} className="text-destructive">
                      {rowError.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                className="btn-gold"
                onClick={() => {
                  if (result.successCount > 0) onGenerated();
                  closeDialog();
                }}
              >
                {t("generatorClose")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
