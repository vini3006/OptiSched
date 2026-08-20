import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
  createAdmin,
  createProfessor,
  createSuperAdmin,
  deleteUser,
  listUsers,
} from "@/api/users";
import { exportProfessorsCsv, importProfessorsCsv } from "@/api/professors";
import { CsvImportExport, type CsvColumnSpec } from "@/components/admin/CsvImportExport";
import {
  createUserSchema,
  type CreateUserFormValues,
} from "@/lib/validations/user-schema";
import { useAuth } from "@/hooks/UseAuth";
import { useGroupedByInstitution } from "@/hooks/useGroupedByInstitution";
import { useSelectedInstitution } from "@/hooks/UseSelectedInstitution";
import { useInstitutionMode } from "@/hooks/UseInstitutionMode";
import type { ManagedUser } from "@/types/User";

type CreateDialog = "admin" | "professor" | "super-admin" | null;

function useProfessorCsvColumns(): CsvColumnSpec[] {
  const { t } = useTranslation("adminUsers");
  return [
    { name: "name", description: t("professorCsvColumns.name") },
    { name: "email", description: t("professorCsvColumns.email") },
    { name: "password", description: t("professorCsvColumns.password") },
    { name: "maxDailyTimeSlots", description: t("professorCsvColumns.maxDailyTimeSlots") },
    { name: "maxWeeklyTimeSlots", description: t("professorCsvColumns.maxWeeklyTimeSlots") },
  ];
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError(error) && typeof error.response?.data?.message === "string") {
    return error.response.data.message;
  }
  return fallback;
}

export function UsersPage() {
  const { t } = useTranslation("adminUsers");
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { selectedInstitutionId: institutionId } = useSelectedInstitution();
  const [openDialog, setOpenDialog] = useState<CreateDialog>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-primary">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSuperAdmin ? t("subtitleSuperAdmin") : t("subtitleAdmin")}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isSuperAdmin && (
            <>
              <Button variant="outline" onClick={() => setOpenDialog("super-admin")}>
                <Plus className="size-4" />
                {t("newSuperAdmin")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setOpenDialog("admin")}
                disabled={!institutionId}
              >
                <Plus className="size-4" />
                {t("newAdmin")}
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => setOpenDialog("professor")}
            disabled={!institutionId}
          >
            <Plus className="size-4" />
            {t("newProfessor")}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        {isSuperAdmin ? (
          <UsersGroupedByInstitution />
        ) : institutionId ? (
          <UsersTable institutionId={institutionId} isSuperAdmin={isSuperAdmin} />
        ) : (
          <p className="text-sm text-muted-foreground">{t("selectInstitutionNotice")}</p>
        )}
      </div>

      <Dialog
        open={openDialog === "admin"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newAdminDialogTitle")}</DialogTitle>
            <DialogDescription>{t("newAdminDialogDescription")}</DialogDescription>
          </DialogHeader>
          {institutionId && (
            <CreateUserForm
              submitLabel={t("createAdmin")}
              onSubmit={(values) => createAdmin(values, institutionId)}
              invalidateUsersFor={institutionId}
              onCreated={() => setOpenDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={openDialog === "professor"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newProfessorDialogTitle")}</DialogTitle>
            <DialogDescription>{t("newProfessorDialogDescription")}</DialogDescription>
          </DialogHeader>
          {institutionId && (
            <CreateUserForm
              submitLabel={t("createProfessor")}
              onSubmit={(values) => createProfessor(values, institutionId)}
              invalidateUsersFor={institutionId}
              onCreated={() => setOpenDialog(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={openDialog === "super-admin"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("newSuperAdminDialogTitle")}</DialogTitle>
            <DialogDescription>{t("newSuperAdminDialogDescription")}</DialogDescription>
          </DialogHeader>
          <CreateUserForm
            submitLabel={t("createSuperAdmin")}
            onSubmit={createSuperAdmin}
            onCreated={() => setOpenDialog(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UsersGroupedByInstitution() {
  const { t } = useTranslation("adminUsers");
  const professorCsvColumns = useProfessorCsvColumns();
  const queryClient = useQueryClient();
  const { institutionMode } = useInstitutionMode();
  const { institutions, itemsByInstitution: usersByInstitution, isLoading } =
    useGroupedByInstitution("users", listUsers, institutionMode);

  const [viewingInstitutionId, setViewingInstitutionId] = useState<number | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: ({ userId, institutionId }: { userId: number; institutionId: number }) =>
      deleteUser(userId, institutionId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users", variables.institutionId] });
      setDeletingUser(null);
    },
    onError: (error) => {
      setDeleteError(extractErrorMessage(error, t("deleteUserError")));
    },
  });

  function openDelete(user: ManagedUser) {
    setDeleteError(null);
    setDeletingUser(user);
  }

  const viewingInstitution = institutions.find((i) => i.id === viewingInstitutionId) ?? null;
  const viewingUsers =
    viewingInstitutionId !== null ? (usersByInstitution.get(viewingInstitutionId) ?? []) : [];

  return (
    <div>
      <div className="card-elevated rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columnInstitution")}</TableHead>
              <TableHead>{t("columnUsers")}</TableHead>
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
              const count = usersByInstitution.get(institution.id)?.length ?? 0;
              return (
                <TableRow key={institution.id}>
                  <TableCell className="font-medium">{institution.name}</TableCell>
                  <TableCell>{t("userCount", { count })}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingInstitutionId(institution.id)}
                    >
                      {t("viewUsers")}
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
            <DialogTitle>{t("usersOfInstitution", { institution: viewingInstitution?.name })}</DialogTitle>
            <DialogDescription>{t("allUsersOfInstitution")}</DialogDescription>
          </DialogHeader>
          {viewingInstitutionId !== null && (
            <CsvImportExport
              onImport={(file) => importProfessorsCsv(file, viewingInstitutionId)}
              onExport={() => exportProfessorsCsv(viewingInstitutionId)}
              exportFilename="professores.csv"
              onImported={() => {
                queryClient.invalidateQueries({ queryKey: ["users", viewingInstitutionId] });
                queryClient.invalidateQueries({ queryKey: ["professors", viewingInstitutionId] });
              }}
              entityLabel="professores"
              columns={professorCsvColumns}
            />
          )}
          {viewingUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noUsersInInstitution")}</p>
          ) : (
            <ul className="flex flex-col gap-2 overflow-y-auto">
              {viewingUsers.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between rounded-lg bg-secondary p-2 pl-3"
                >
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{user.role}</Badge>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("deleteUserAriaLabel", { name: user.name })}
                      onClick={() => openDelete(user)}
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

      <AlertDialog open={!!deletingUser} onOpenChange={(open) => !open && setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteUserTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteUserDescription", { name: deletingUser?.name })}
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
                deletingUser &&
                viewingInstitutionId !== null &&
                deleteMutation.mutate({ userId: deletingUser.id, institutionId: viewingInstitutionId })
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

function UsersTable({
  institutionId,
  isSuperAdmin,
}: {
  institutionId: number;
  isSuperAdmin: boolean;
}) {
  const { t } = useTranslation("adminUsers");
  const professorCsvColumns = useProfessorCsvColumns();
  const queryClient = useQueryClient();
  const usersQueryKey = ["users", institutionId] as const;

  const { data: users, isLoading } = useQuery({
    queryKey: usersQueryKey,
    queryFn: () => listUsers(institutionId),
  });

  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
      setDeletingUser(null);
    },
    onError: (error) => {
      setDeleteError(extractErrorMessage(error, t("deleteUserError")));
    },
  });

  function openDelete(user: ManagedUser) {
    setDeleteError(null);
    setDeletingUser(user);
  }

  return (
    <>
      <div className="flex justify-end">
        <CsvImportExport
          onImport={(file) => importProfessorsCsv(file, institutionId)}
          onExport={() => exportProfessorsCsv(institutionId)}
          exportFilename="professores.csv"
          onImported={() => {
            queryClient.invalidateQueries({ queryKey: usersQueryKey });
            queryClient.invalidateQueries({ queryKey: ["professors", institutionId] });
          }}
          entityLabel="professores"
          columns={professorCsvColumns}
        />
      </div>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("formName")}</TableHead>
              <TableHead>{t("formEmail")}</TableHead>
              <TableHead>{t("columnRole")}</TableHead>
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
            {!isLoading && users?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  {t("noUsersInInstitutionTable")}
                </TableCell>
              </TableRow>
            )}
            {users?.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="font-medium">{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline">{user.role}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  {(isSuperAdmin || user.role === "PROFESSOR") && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("deleteUserAriaLabel", { name: user.name })}
                      onClick={() => openDelete(user)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={!!deletingUser}
        onOpenChange={(open) => !open && setDeletingUser(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteUserTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteUserDescription", { name: deletingUser?.name })}
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
              onClick={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? t("common:actions.deleting") : t("common:actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function CreateUserForm({
  submitLabel,
  onSubmit: submit,
  invalidateUsersFor,
  onCreated,
}: {
  submitLabel: string;
  onSubmit: (values: CreateUserFormValues) => Promise<ManagedUser>;
  invalidateUsersFor?: number;
  onCreated: () => void;
}) {
  const { t } = useTranslation("adminUsers");
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: submit,
    onSuccess: () => {
      if (invalidateUsersFor) {
        queryClient.invalidateQueries({ queryKey: ["users", invalidateUsersFor] });
      }
      reset();
      onCreated();
    },
  });

  async function onSubmit(values: CreateUserFormValues) {
    setFormError(null);

    try {
      await mutation.mutateAsync(values);
    } catch {
      setFormError(t("createUserError"));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="user-name">{t("formName")}</FieldLabel>
          <Input id="user-name" {...register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="user-email">{t("formEmail")}</FieldLabel>
          <Input id="user-email" type="email" {...register("email")} />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="user-password">{t("formPassword")}</FieldLabel>
          <Input id="user-password" type="password" {...register("password")} />
          <FieldError errors={[errors.password]} />
        </Field>

        {formError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={mutation.isPending} className="btn-gold">
          {mutation.isPending ? t("creating") : submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
