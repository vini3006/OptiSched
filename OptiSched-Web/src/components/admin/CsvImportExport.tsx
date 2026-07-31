import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import type { ImportResult } from "@/types/ImportResult";

export type CsvColumnSpec = {
  name: string;
  description: string;
};

type CsvImportExportProps = {
  onImport: (file: File) => Promise<ImportResult>;
  onExport: () => Promise<Blob>;
  exportFilename: string;
  onImported: () => void;
  /** Name of the entity being imported, used in the format dialog title (ex.: "professores"). */
  entityLabel: string;
  /** Column-by-column description of the CSV shape expected for this entity. */
  columns: CsvColumnSpec[];
};

/**
 * "Importar CSV" + "Exportar CSV" pair reused across the bulk-editable admin
 * entities (usuários/professores, disciplinas, ofertas, salas). Clicking
 * "Importar CSV" first shows a card with the expected column format for that
 * entity; only after confirming ("Prosseguir") does the file picker open.
 */
export function CsvImportExport({
  onImport,
  onExport,
  exportFilename,
  onImported,
  entityLabel,
  columns,
}: CsvImportExportProps) {
  const { t } = useTranslation("csvImportExport");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formatDialogOpen, setFormatDialogOpen] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const importMutation = useMutation({
    mutationFn: onImport,
    onSuccess: (data) => {
      setResult(data);
      onImported();
    },
    onError: () => setError(t("importError")),
  });

  async function handleExportClick() {
    setError(null);
    try {
      const blob = await onExport();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = exportFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setError(t("exportError"));
    }
  }

  function handleProceed() {
    setFormatDialogOpen(false);
    fileInputRef.current?.click();
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    importMutation.mutate(file);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={() => setFormatDialogOpen(true)}
          disabled={importMutation.isPending}
        >
          <Upload className="size-4" />
          {importMutation.isPending ? t("importing") : t("common:actions.importCsv")}
        </Button>
        <Button variant="outline" size="sm" type="button" onClick={handleExportClick}>
          <Download className="size-4" />
          {t("common:actions.exportCsv")}
        </Button>
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Dialog open={formatDialogOpen} onOpenChange={setFormatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("formatDialogTitle", { entity: entityLabel })}</DialogTitle>
            <DialogDescription>{t("formatDialogDescription")}</DialogDescription>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("columnHeader")}</TableHead>
                <TableHead>{t("descriptionHeader")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.map((column) => (
                <TableRow key={column.name}>
                  <TableCell className="font-mono text-xs font-medium">{column.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{column.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button type="button" className="btn-gold" onClick={handleProceed}>
              {t("common:actions.proceed")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!result} onOpenChange={(open) => !open && setResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("resultDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("resultDialogDescription", { success: result?.successCount, total: result?.totalRows })}
            </DialogDescription>
          </DialogHeader>
          {result && result.errors.length > 0 && (
            <div className="max-h-72 overflow-y-auto rounded-lg bg-secondary p-2">
              <ul className="flex flex-col gap-1 text-sm">
                {result.errors.map((rowError) => (
                  <li key={rowError.row} className="text-destructive">
                    {t("rowError", { row: rowError.row, message: rowError.message })}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
