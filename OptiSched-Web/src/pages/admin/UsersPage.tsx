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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { listInstitutions } from "@/api/institutions";
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
import type { ManagedUser } from "@/types/User";

const INSTITUTIONS_QUERY_KEY = ["institutions"] as const;

type CreateDialog = "admin" | "professor" | "super-admin" | null;

export function UsersPage() {
  const { data: institutions } = useQuery({
    queryKey: INSTITUTIONS_QUERY_KEY,
    queryFn: listInstitutions,
  });

  const [institutionId, setInstitutionId] = useState<number | null>(null);
  const [openDialog, setOpenDialog] = useState<CreateDialog>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-primary">Usuários</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie contas de Super Admin, Admin e Professor, e gerencie os usuários de cada
            instituição.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
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

      <div className="mt-4 flex items-center gap-3">
        <span className="text-sm font-medium text-foreground">Instituição:</span>
        <Select
          value={institutionId !== null ? String(institutionId) : ""}
          onValueChange={(value) => setInstitutionId(value ? Number(value) : null)}
        >
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecione uma instituição">
              {(value: string) =>
                institutions?.find((institution) => String(institution.id) === value)?.name ??
                value
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
            {institutions?.map((institution) => (
              <SelectItem key={institution.id} value={String(institution.id)}>
                {institution.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        {institutionId ? (
          <UsersTable institutionId={institutionId} />
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

function UsersTable({ institutionId }: { institutionId: number }) {
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
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setDeletingUser(user)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
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
