import { useState } from "react";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateBR, parseISODateString, toISODateString } from "@/lib/date";
import { cn } from "@/lib/utils";

type DatePickerFieldProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  "aria-invalid"?: boolean;
};

export function DatePickerField({
  id,
  value,
  onChange,
  placeholder = "Selecione uma data",
  ...props
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISODateString(value) : undefined;
  const [viewMonth, setViewMonth] = useState(() => selected ?? new Date());

  function openDialog() {
    setViewMonth(selected ?? new Date());
    setOpen(true);
  }

  function handleSelect(date: Date) {
    onChange(toISODateString(date));
    setOpen(false);
  }

  return (
    <>
      <button
        id={id}
        type="button"
        onClick={openDialog}
        aria-invalid={props["aria-invalid"]}
        className={cn(
          "flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-2.5 py-1 text-left text-base transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
        )}
      >
        <span className={cn(!value && "text-muted-foreground")}>
          {value ? formatDateBR(value) : placeholder}
        </span>
        <CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-fit">
          <DialogHeader>
            <DialogTitle>Selecione a data</DialogTitle>
          </DialogHeader>
          <Calendar
            selected={selected}
            month={viewMonth}
            onMonthChange={setViewMonth}
            onSelect={handleSelect}
          />
          {value && (
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
              >
                Limpar
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
