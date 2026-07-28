import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import {
  createUserSchema,
  type CreateUserFormValues,
} from "@/lib/validations/user-schema";
import { useAuth } from "@/hooks/UseAuth";
import { useGroupedByInstitution } from "@/hooks/useGroupedByInstitution";
import { useSelectedInstitution } from "@/hooks/UseSelectedInstitution";
import type { ManagedUser } from "@/types/User";

type CreateDialog = "admin" | "professor" | "super-admin" | null;

export function UsersPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { selectedInstitutionId: institutionId } = useSelectedInstitution();
  const [openDialog, setOpenDialog] = useState<CreateDialog>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-primary">Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isSuperAdmin
              ? "Crie contas de Super Admin, Admin e Professor, e gerencie os usuários de cada instituição."
              : "Crie contas de Professor e gerencie os usuários da sua instituição."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isSuperAdmin && (
            <>
              <Button variant="outline" onClick={() => setOpenDialog("super-admin")}>
                <Plus className="size-4" />
                Novo Super Admin
              </Button>
              <Button
                variant="outline"
                onClick={() => setOpenDialog("admin")}
                disabled={!institutionId}
              >
                <Plus className="size-4" />
                Novo Admin
              </Button>
            </>
          )}
          <Button
            variant="outline"
            onClick={() => setOpenDialog("professor")}
            disabled={!institutionId}
          >
            <Plus className="size-4" />
            Novo Professor
          </Button>
        </div>
      </div>

      <div className="mt-6">
        {isSuperAdmin ? (
          <UsersGroupedByInstitution />
        ) : institutionId ? (
          <UsersTable institutionId={institutionId} isSuperAdmin={isSuperAdmin} />
        ) : (
          <p className="text-sm text-muted-foreground">
            Selecione uma instituição para ver seus usuários.
          </p>
        )}
      </div>

      <Dialog
        open={openDialog === "admin"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Admin</DialogTitle>
            <DialogDescription>
              Cria uma conta de Admin para a instituição selecionada.
            </DialogDescription>
          </DialogHeader>
          {institutionId && (
            <CreateUserForm
              submitLabel="Criar Admin"
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
            <DialogTitle>Novo Professor</DialogTitle>
            <DialogDescription>
              Cria uma conta de Professor para a instituição selecionada.
            </DialogDescription>
          </DialogHeader>
          {institutionId && (
            <CreateUserForm
              submitLabel="Criar Professor"
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
            <DialogTitle>Novo Super Admin</DialogTitle>
            <DialogDescription>
              Cria uma nova conta com acesso total à plataforma.
            </DialogDescription>
          </DialogHeader>
          <CreateUserForm
            submitLabel="Criar Super Admin"
            onSubmit={createSuperAdmin}
            onCreated={() => setOpenDialog(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UsersGroupedByInstitution() {
  const queryClient = useQueryClient();
  const { institutions, itemsByInstitution: usersByInstitution, isLoading } =
    useGroupedByInstitution("users", listUsers);

  const [viewingInstitutionId, setViewingInstitutionId] = useState<number | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);

  const deleteMutation = useMutation({
    mutationFn: ({ userId, institutionId }: { userId: number; institutionId: number }) =>
      deleteUser(userId, institutionId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["users", variables.institutionId] });
      setDeletingUser(null);
    },
  });

  const viewingInstitution = institutions.find((i) => i.id === viewingInstitutionId) ?? null;
  const viewingUsers =
    viewingInstitutionId !== null ? (usersByInstitution.get(viewingInstitutionId) ?? []) : [];

  return (
    <div>
      <div className="card-elevated rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Instituição</TableHead>
              <TableHead>Usuários</TableHead>
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
            {!isLoading && institutions.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhuma instituição cadastrada.
                </TableCell>
              </TableRow>
            )}
            {institutions.map((institution) => {
              const count = usersByInstitution.get(institution.id)?.length ?? 0;
              return (
                <TableRow key={institution.id}>
                  <TableCell className="font-medium">{institution.name}</TableCell>
                  <TableCell>
                    {count} {count === 1 ? "usuário" : "usuários"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingInstitutionId(institution.id)}
                    >
                      Ver usuários
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
            <DialogTitle>Usuários de {viewingInstitution?.name}</DialogTitle>
            <DialogDescription>Todos os usuários dessa instituição.</DialogDescription>
          </DialogHeader>
          {viewingUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário nessa instituição.</p>
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
                      onClick={() => setDeletingUser(user)}
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
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O usuário "{deletingUser?.name}" perderá o
              acesso imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingUser &&
                viewingInstitutionId !== null &&
                deleteMutation.mutate({ userId: deletingUser.id, institutionId: viewingInstitutionId })
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

function UsersTable({
  institutionId,
  isSuperAdmin,
}: {
  institutionId: number;
  isSuperAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const usersQueryKey = ["users", institutionId] as const;

  const { data: users, isLoading } = useQuery({
    queryKey: usersQueryKey,
    queryFn: () => listUsers(institutionId),
  });

  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (userId: number) => deleteUser(userId, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersQueryKey });
      setDeletingUser(null);
    },
  });

  return (
    <>
      <div className="card-elevated rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Papel</TableHead>
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
            {!isLoading && users?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhum usuário nessa instituição.
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
                      onClick={() => setDeletingUser(user)}
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
            <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O usuário "{deletingUser?.name}" perderá o
              acesso imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingUser && deleteMutation.mutate(deletingUser.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
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
      setFormError("Não foi possível criar o usuário. Verifique os dados e tente novamente.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={!!errors.name}>
          <FieldLabel htmlFor="user-name">Nome</FieldLabel>
          <Input id="user-name" {...register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>

        <Field data-invalid={!!errors.email}>
          <FieldLabel htmlFor="user-email">E-mail</FieldLabel>
          <Input id="user-email" type="email" {...register("email")} />
          <FieldError errors={[errors.email]} />
        </Field>

        <Field data-invalid={!!errors.password}>
          <FieldLabel htmlFor="user-password">Senha</FieldLabel>
          <Input id="user-password" type="password" {...register("password")} />
          <FieldError errors={[errors.password]} />
        </Field>

        {formError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {formError}
          </p>
        )}

        <Button type="submit" disabled={mutation.isPending} className="btn-gold">
          {mutation.isPending ? "Criando..." : submitLabel}
        </Button>
      </FieldGroup>
    </form>
  );
}
