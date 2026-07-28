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

import { createCourse, deleteCourse, listCourses, updateCourse } from "@/api/courses";
import { createSubject, deleteSubject, listSubjects, updateSubject } from "@/api/subjects";
import {
  createSemester,
  deleteSemester,
  listSemesters,
  updateSemester,
} from "@/api/semesters";
import {
  createSubjectOffering,
  deleteSubjectOffering,
  listSubjectOfferings,
  updateSubjectOffering,
} from "@/api/subject-offerings";
import { courseSchema, type CourseFormValues } from "@/lib/validations/course-schema";
import { subjectSchema, type SubjectFormValues } from "@/lib/validations/subject-schema";
import { semesterSchema, type SemesterFormValues } from "@/lib/validations/semester-schema";
import {
  subjectOfferingSchema,
  type SubjectOfferingFormValues,
} from "@/lib/validations/subject-offering-schema";
import { useSelectedInstitution } from "@/hooks/UseSelectedInstitution";
import { TERM_LABELS } from "@/lib/enum-labels";
import type { Course } from "@/types/Course";
import type { Subject } from "@/types/Subject";
import type { Semester, Term } from "@/types/Semester";
import type { SubjectOffering } from "@/types/SubjectOffering";

function EmptyInstitutionNotice({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

export function AcademicStructurePage() {
  const { selectedInstitutionId } = useSelectedInstitution();

  return (
    <div>
      <h1 className="text-xl font-semibold text-primary">Estrutura Acadêmica</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Gerencie cursos, disciplinas, semestres e as ofertas de disciplina da instituição
        selecionada.
      </p>

      <Tabs defaultValue="cursos" className="mt-6">
        <TabsList>
          <TabsTrigger value="cursos">Cursos</TabsTrigger>
          <TabsTrigger value="disciplinas">Disciplinas</TabsTrigger>
          <TabsTrigger value="semestres">Semestres</TabsTrigger>
          <TabsTrigger value="ofertas">Ofertas</TabsTrigger>
        </TabsList>

        <TabsContent value="cursos" className="mt-4">
          {selectedInstitutionId ? (
            <CoursesTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text="Selecione uma instituição para ver os cursos." />
          )}
        </TabsContent>

        <TabsContent value="disciplinas" className="mt-4">
          {selectedInstitutionId ? (
            <SubjectsTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text="Selecione uma instituição para ver as disciplinas." />
          )}
        </TabsContent>

        <TabsContent value="semestres" className="mt-4">
          {selectedInstitutionId ? (
            <SemestersTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text="Selecione uma instituição para ver os semestres." />
          )}
        </TabsContent>

        <TabsContent value="ofertas" className="mt-4">
          {selectedInstitutionId ? (
            <SubjectOfferingsTab institutionId={selectedInstitutionId} />
          ) : (
            <EmptyInstitutionNotice text="Selecione uma instituição para ver as ofertas de disciplina." />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cursos
// ---------------------------------------------------------------------------

function CoursesTab({ institutionId }: { institutionId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ["courses", institutionId] as const;

  const { data: courses, isLoading } = useQuery({
    queryKey,
    queryFn: () => listCourses(institutionId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [deleting, setDeleting] = useState<Course | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: { name: "", totalSemesters: 1 },
  });

  const createMutation = useMutation({
    mutationFn: (values: CourseFormValues) => createCourse(values, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: CourseFormValues }) =>
      updateCourse(id, input, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteCourse(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleting(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setFormError(null);
    reset({ name: "", totalSemesters: 1 });
    setDialogOpen(true);
  }

  function openEdit(course: Course) {
    setEditing(course);
    setFormError(null);
    reset({ name: course.name, totalSemesters: course.totalSemesters });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  async function onSubmit(values: CourseFormValues) {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch {
      setFormError("Não foi possível salvar o curso. Tente novamente.");
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          Novo curso
        </Button>
      </div>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Total de semestres</TableHead>
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
            {!isLoading && courses?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhum curso cadastrado.
                </TableCell>
              </TableRow>
            )}
            {courses?.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">{course.name}</TableCell>
                <TableCell>{course.totalSemesters}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(course)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(course)}>
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
            <DialogTitle>{editing ? "Editar curso" : "Novo curso"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados do curso." : "Cadastre um novo curso."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="course-name">Nome</FieldLabel>
                <Input id="course-name" {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field data-invalid={!!errors.totalSemesters}>
                <FieldLabel htmlFor="course-total-semesters">Total de semestres</FieldLabel>
                <Input
                  id="course-total-semesters"
                  type="number"
                  min={1}
                  {...register("totalSemesters", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.totalSemesters]} />
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
            <AlertDialogTitle>Excluir curso?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O curso "{deleting?.name}" será removido
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
// Disciplinas
// ---------------------------------------------------------------------------

function SubjectsTab({ institutionId }: { institutionId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ["subjects", institutionId] as const;

  const { data: subjects, isLoading } = useQuery({
    queryKey,
    queryFn: () => listSubjects(institutionId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { code: "", name: "", workload: 0 },
  });

  const createMutation = useMutation({
    mutationFn: (values: SubjectFormValues) => createSubject(values, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: SubjectFormValues }) =>
      updateSubject(id, input, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSubject(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleting(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setFormError(null);
    reset({ code: "", name: "", workload: 0 });
    setDialogOpen(true);
  }

  function openEdit(subject: Subject) {
    setEditing(subject);
    setFormError(null);
    reset({ code: subject.code, name: subject.name, workload: subject.workload });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  async function onSubmit(values: SubjectFormValues) {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch {
      setFormError("Não foi possível salvar a disciplina. Tente novamente.");
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          Nova disciplina
        </Button>
      </div>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Carga horária</TableHead>
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
            {!isLoading && subjects?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Nenhuma disciplina cadastrada.
                </TableCell>
              </TableRow>
            )}
            {subjects?.map((subject) => (
              <TableRow key={subject.id}>
                <TableCell className="font-medium">{subject.code}</TableCell>
                <TableCell>{subject.name}</TableCell>
                <TableCell>
                  {subject.workload} {subject.workload === 1 ? "tempo" : "tempos"} de aula
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(subject)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(subject)}>
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
            <DialogTitle>{editing ? "Editar disciplina" : "Nova disciplina"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados da disciplina." : "Cadastre uma nova disciplina."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.code}>
                <FieldLabel htmlFor="subject-code">Código</FieldLabel>
                <Input id="subject-code" {...register("code")} />
                <FieldError errors={[errors.code]} />
              </Field>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="subject-name">Nome</FieldLabel>
                <Input id="subject-name" {...register("name")} />
                <FieldError errors={[errors.name]} />
              </Field>
              <Field data-invalid={!!errors.workload}>
                <FieldLabel htmlFor="subject-workload">Carga Horária (Tempos de aula)</FieldLabel>
                <Input
                  id="subject-workload"
                  type="number"
                  min={1}
                  {...register("workload", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.workload]} />
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
            <AlertDialogTitle>Excluir disciplina?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. A disciplina "{deleting?.name}" será removida
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
// Semestres
// ---------------------------------------------------------------------------

function SemestersTab({ institutionId }: { institutionId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ["semesters", institutionId] as const;

  const { data: semesters, isLoading } = useQuery({
    queryKey,
    queryFn: () => listSemesters(institutionId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Semester | null>(null);
  const [deleting, setDeleting] = useState<Semester | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SemesterFormValues>({
    resolver: zodResolver(semesterSchema),
    defaultValues: { year: new Date().getFullYear(), term: "FIRST" },
  });

  const term = watch("term");

  const createMutation = useMutation({
    mutationFn: (values: SemesterFormValues) => createSemester(values, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: SemesterFormValues }) =>
      updateSemester(id, input, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSemester(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleting(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setFormError(null);
    reset({ year: new Date().getFullYear(), term: "FIRST" });
    setDialogOpen(true);
  }

  function openEdit(semester: Semester) {
    setEditing(semester);
    setFormError(null);
    reset({ year: semester.year, term: semester.term });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  async function onSubmit(values: SemesterFormValues) {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch {
      setFormError("Não foi possível salvar o semestre. Tente novamente.");
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          Novo semestre
        </Button>
      </div>

      <div className="card-elevated mt-4 rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ano</TableHead>
              <TableHead>Período</TableHead>
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
            {!isLoading && semesters?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  Nenhum semestre cadastrado.
                </TableCell>
              </TableRow>
            )}
            {semesters?.map((semester) => (
              <TableRow key={semester.id}>
                <TableCell className="font-medium">{semester.year}</TableCell>
                <TableCell>{TERM_LABELS[semester.term]}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(semester)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(semester)}>
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
            <DialogTitle>{editing ? "Editar semestre" : "Novo semestre"}</DialogTitle>
            <DialogDescription>
              {editing ? "Atualize os dados do semestre." : "Cadastre um novo semestre letivo."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.year}>
                <FieldLabel htmlFor="semester-year">Ano</FieldLabel>
                <Input
                  id="semester-year"
                  type="number"
                  {...register("year", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.year]} />
              </Field>
              <Field data-invalid={!!errors.term}>
                <FieldLabel htmlFor="semester-term">Período</FieldLabel>
                <Select
                  value={term}
                  onValueChange={(value) => setValue("term", value as SemesterFormValues["term"])}
                >
                  <SelectTrigger id="semester-term" className="w-full">
                    <SelectValue>{(value: Term) => TERM_LABELS[value]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {Object.entries(TERM_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.term]} />
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
            <AlertDialogTitle>Excluir semestre?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O semestre "{deleting?.year} -{" "}
              {deleting && TERM_LABELS[deleting.term]}" será removido permanentemente.
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
// Ofertas de disciplina
// ---------------------------------------------------------------------------

function SubjectOfferingsTab({ institutionId }: { institutionId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ["subject-offerings", institutionId] as const;

  const { data: offerings, isLoading } = useQuery({
    queryKey,
    queryFn: () => listSubjectOfferings(institutionId),
  });
  const { data: courses } = useQuery({
    queryKey: ["courses", institutionId],
    queryFn: () => listCourses(institutionId),
  });
  const { data: subjects } = useQuery({
    queryKey: ["subjects", institutionId],
    queryFn: () => listSubjects(institutionId),
  });
  const { data: semesters } = useQuery({
    queryKey: ["semesters", institutionId],
    queryFn: () => listSemesters(institutionId),
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SubjectOffering | null>(null);
  const [deleting, setDeleting] = useState<SubjectOffering | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SubjectOfferingFormValues>({
    resolver: zodResolver(subjectOfferingSchema),
    defaultValues: {
      courseId: 0,
      subjectId: 0,
      semesterId: 0,
      section: "",
      expectedStudents: 1,
      recommendedSemester: 1,
    },
  });

  const courseId = watch("courseId");
  const subjectId = watch("subjectId");
  const semesterId = watch("semesterId");

  const createMutation = useMutation({
    mutationFn: (values: SubjectOfferingFormValues) =>
      createSubjectOffering(values, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: SubjectOfferingFormValues }) =>
      updateSubjectOffering(id, input, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      closeDialog();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteSubjectOffering(id, institutionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setDeleting(null);
    },
  });

  function openCreate() {
    setEditing(null);
    setFormError(null);
    reset({
      courseId: 0,
      subjectId: 0,
      semesterId: 0,
      section: "",
      expectedStudents: 1,
      recommendedSemester: 1,
    });
    setDialogOpen(true);
  }

  function openEdit(offering: SubjectOffering) {
    setEditing(offering);
    setFormError(null);
    reset({
      courseId: offering.courseId,
      subjectId: offering.subjectId,
      semesterId: offering.semesterId,
      section: offering.section,
      expectedStudents: offering.expectedStudents,
      recommendedSemester: offering.recommendedSemester,
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditing(null);
  }

  async function onSubmit(values: SubjectOfferingFormValues) {
    setFormError(null);
    try {
      if (editing) {
        await updateMutation.mutateAsync({ id: editing.id, input: values });
      } else {
        await createMutation.mutateAsync(values);
      }
    } catch {
      setFormError("Não foi possível salvar a oferta. Tente novamente.");
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  function courseName(id: number) {
    return courses?.find((c) => c.id === id)?.name ?? `#${id}`;
  }
  function subjectName(id: number) {
    return subjects?.find((s) => s.id === id)?.name ?? `#${id}`;
  }
  function semesterName(id: number) {
    const semester = semesters?.find((s) => s.id === id);
    return semester ? `${semester.year} - ${TERM_LABELS[semester.term]}` : `#${id}`;
  }

  return (
    <div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={openCreate}>
          <Plus className="size-4" />
          Nova oferta
        </Button>
      </div>

      <div className="card-elevated mt-4 overflow-x-auto rounded-2xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Curso</TableHead>
              <TableHead>Disciplina</TableHead>
              <TableHead>Semestre</TableHead>
              <TableHead>Turma</TableHead>
              <TableHead>Alunos previstos</TableHead>
              <TableHead>Período recomendado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && offerings?.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhuma oferta cadastrada.
                </TableCell>
              </TableRow>
            )}
            {offerings?.map((offering) => (
              <TableRow key={offering.id}>
                <TableCell className="font-medium">{courseName(offering.courseId)}</TableCell>
                <TableCell>{subjectName(offering.subjectId)}</TableCell>
                <TableCell>{semesterName(offering.semesterId)}</TableCell>
                <TableCell>{offering.section}</TableCell>
                <TableCell>{offering.expectedStudents}</TableCell>
                <TableCell>{offering.recommendedSemester}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" onClick={() => openEdit(offering)}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(offering)}>
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
            <DialogTitle>{editing ? "Editar oferta" : "Nova oferta"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Atualize os dados da oferta de disciplina."
                : "Vincula uma disciplina a um curso e semestre."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              <Field data-invalid={!!errors.courseId}>
                <FieldLabel htmlFor="offering-course">Curso</FieldLabel>
                <Select
                  value={courseId ? String(courseId) : ""}
                  onValueChange={(value) => setValue("courseId", Number(value))}
                >
                  <SelectTrigger id="offering-course" className="w-full">
                    <SelectValue placeholder="Selecione um curso">
                      {(value: string) => courseName(Number(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {courses?.map((course) => (
                      <SelectItem key={course.id} value={String(course.id)}>
                        {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.courseId]} />
              </Field>

              <Field data-invalid={!!errors.subjectId}>
                <FieldLabel htmlFor="offering-subject">Disciplina</FieldLabel>
                <Select
                  value={subjectId ? String(subjectId) : ""}
                  onValueChange={(value) => setValue("subjectId", Number(value))}
                >
                  <SelectTrigger id="offering-subject" className="w-full">
                    <SelectValue placeholder="Selecione uma disciplina">
                      {(value: string) => subjectName(Number(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={String(subject.id)}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.subjectId]} />
              </Field>

              <Field data-invalid={!!errors.semesterId}>
                <FieldLabel htmlFor="offering-semester">Semestre</FieldLabel>
                <Select
                  value={semesterId ? String(semesterId) : ""}
                  onValueChange={(value) => setValue("semesterId", Number(value))}
                >
                  <SelectTrigger id="offering-semester" className="w-full">
                    <SelectValue placeholder="Selecione um semestre">
                      {(value: string) => semesterName(Number(value))}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent side="bottom" align="start" alignItemWithTrigger={false}>
                    {semesters?.map((semester) => (
                      <SelectItem key={semester.id} value={String(semester.id)}>
                        {semester.year} - {TERM_LABELS[semester.term]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldError errors={[errors.semesterId]} />
              </Field>

              <Field data-invalid={!!errors.section}>
                <FieldLabel htmlFor="offering-section">Turma</FieldLabel>
                <Input id="offering-section" placeholder="Ex: A, B, Noturno" {...register("section")} />
                <FieldError errors={[errors.section]} />
              </Field>

              <Field data-invalid={!!errors.expectedStudents}>
                <FieldLabel htmlFor="offering-expected-students">Alunos previstos</FieldLabel>
                <Input
                  id="offering-expected-students"
                  type="number"
                  min={1}
                  {...register("expectedStudents", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.expectedStudents]} />
              </Field>

              <Field data-invalid={!!errors.recommendedSemester}>
                <FieldLabel htmlFor="offering-recommended-semester">
                  Período recomendado
                </FieldLabel>
                <Input
                  id="offering-recommended-semester"
                  type="number"
                  min={1}
                  {...register("recommendedSemester", { valueAsNumber: true })}
                />
                <FieldError errors={[errors.recommendedSemester]} />
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
            <AlertDialogTitle>Excluir oferta?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. A oferta será removida permanentemente.
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
