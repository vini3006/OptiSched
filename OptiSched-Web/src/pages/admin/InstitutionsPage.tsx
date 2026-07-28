import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  createInstitution,
  deleteInstitution,
  listInstitutions,
  updateInstitution,
} from "@/api/institutions";
import {
  institutionSchema,
  type InstitutionFormValues,
} from "@/lib/validations/institution-schema";
import type { Institution, InstitutionInput } from "@/types/Institution";

const INSTITUTIONS_QUERY_KEY = ["institutions"] as const;

const SUBSCRIPTION_STATUS_LABELS: Record<InstitutionInput["subscriptionStatus"], string> = {
  TRIAL: "Trial",
  ACTIVE: "Ativo",
  CANCELED: "Cancelado",
  UNPAID: "Inadimplente",
};

function toInstitutionInput(values: InstitutionFormValues): InstitutionInput {
  return {
    name: values.name,
    cnpj: values.cnpj,
    subscriptionStatus: values.subscriptionStatus,
    expiresAt: values.expiresAt ? `${values.expiresAt}T23:59:59` : null,
  };
}

export function InstitutionsPage() {
  const queryClient = useQueryClient();
  const { data: institutions, isLoading } = useQuery({
    queryKey: INSTITUTIONS_QUERY_KEY,
    queryFn: listInstitutions,
  });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
  const [deletingInstitution, setDeletingInstitution] = useState<Institution | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<InstitutionFormValues>({
    resolver: zodResolver(institutionSchema),
    defaultValues: { name: "", cnpj: "", subscriptionStatus: "TRIAL", expiresAt: "" },
  });

  const subscriptionStatus = watch("subscriptionStatus");
  const expiresAt = watch("expiresAt");

  const createMutation = useMutation({
    mutationFn: (values: InstitutionFormValues) => createInstitution(toInstitutionInput(values)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTITUTIONS_QUERY_KEY });
      closeSheet();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: InstitutionFormValues }) =>
      updateInstitution(id, toInstitutionInput(input)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTITUTIONS_QUERY_KEY });
      closeSheet();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteInstitution,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INSTITUTIONS_QUERY_KEY });
      setDeletingInstitution(null);
    },
  });

  function openCreateSheet() {
    setEditingInstitution(null);
    setFormError(null);
    reset({ name: "", cnpj: "", subscriptionStatus: "TRIAL", expiresAt: "" });
    setSheetOpen(true);
  }

  function openEditSheet(institution: Institution) {
    setEditingInstitution(institution);
    setFormError(null);
    reset({
      name: institution.name,
      cnpj: institution.cnpj,
      subscriptionStatus: institution.subscriptionStatus,
      expiresAt: institution.expiresAt ? institution.expiresAt.slice(0, 10) : "",
    });
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditingInstitution(null);
  }

  async function onSubmit(values: InstitutionFormValues) {
    setFormError(null);

    try {
      if (editingInstitution) {
        await updateMutation.mutateAsync({ id: editingInstitution.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch {
      setFormError(
        "Não foi possível salvar a instituição. Verifique os dados e tente novamente."
      );
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-primary">Instituições</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie as instituições (tenants) cadastradas na plataforma.
          </p>
        </div>
        <Button onClick={openCreateSheet} className="btn-gold">
          <Plus className="size-4" />
          Nova instituição
        </Button>
      </div>

      <div className="card-elevated mt-6 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Assinatura</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && institutions?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhuma instituição cadastrada.
                </TableCell>
              </TableRow>
            )}
            {institutions?.map((institution) => (
              <TableRow key={institution.id}>
                <TableCell className="font-medium">{institution.name}</TableCell>
                <TableCell>{institution.cnpj}</TableCell>
                <TableCell>
                  <Badge variant="outline">{institution.subscriptionStatus}</Badge>
                </TableCell>
                <TableCell>
                  {institution.expiresAt
                    ? new Date(institution.expiresAt).toLocaleDateString("pt-BR")
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => openEditSheet(institution)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeletingInstitution(institution)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editingInstitution ? "Editar instituição" : "Nova instituição"}
            </SheetTitle>
            <SheetDescription>
              {editingInstitution
                ? "Atualize os dados da instituição."
                : "Cadastre uma nova instituição (tenant) na plataforma."}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-1 flex-col">
            <div className="flex-1 px-4">
              <FieldGroup>
                <Field data-invalid={!!errors.name}>
                  <FieldLabel htmlFor="institution-name">Nome</FieldLabel>
                  <Input id="institution-name" {...register("name")} />
                  <FieldError errors={[errors.name]} />
                </Field>

                <Field data-invalid={!!errors.cnpj}>
                  <FieldLabel htmlFor="institution-cnpj">CNPJ</FieldLabel>
                  <Input
                    id="institution-cnpj"
                    placeholder="Somente números"
                    {...register("cnpj")}
                  />
                  <FieldError errors={[errors.cnpj]} />
                </Field>

                <Field data-invalid={!!errors.subscriptionStatus}>
                  <FieldLabel htmlFor="institution-status">Status da assinatura</FieldLabel>
                  <Select
                    value={subscriptionStatus}
                    onValueChange={(value) =>
                      setValue("subscriptionStatus", value as InstitutionFormValues["subscriptionStatus"])
                    }
                  >
                    <SelectTrigger id="institution-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                      {Object.entries(SUBSCRIPTION_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError errors={[errors.subscriptionStatus]} />
                </Field>

                <Field data-invalid={!!errors.expiresAt}>
                  <FieldLabel htmlFor="institution-expires-at">Expira em</FieldLabel>
                  <DatePickerField
                    id="institution-expires-at"
                    value={expiresAt ?? ""}
                    onChange={(value) => setValue("expiresAt", value)}
                    aria-invalid={!!errors.expiresAt}
                  />
                  <FieldError errors={[errors.expiresAt]} />
                </Field>

                {formError && (
                  <p role="alert" className="text-sm font-medium text-destructive">
                    {formError}
                  </p>
                )}
              </FieldGroup>
            </div>

            <SheetFooter>
              <Button type="submit" disabled={isSaving} className="btn-gold">
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deletingInstitution}
        onOpenChange={(open) => !open && setDeletingInstitution(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir instituição?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. A instituição "{deletingInstitution?.name}" será
              removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingInstitution && deleteMutation.mutate(deletingInstitution.id)}
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
