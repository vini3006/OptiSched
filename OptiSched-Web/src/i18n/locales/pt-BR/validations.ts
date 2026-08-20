export default {
  availability: {
    professorRequired: "Selecione um professor.",
    timeSlotRequired: "Selecione um horário.",
  },
  classroom: {
    numberRequired: "Informe o número da sala.",
    capacityInvalid: "Informe uma capacidade válida.",
  },
  course: {
    nameRequired: "Informe o nome do curso.",
    totalSemestersRequired: "Informe o total de semestres do curso.",
  },
  generateSchedule: {
    semesterRequired: "Selecione um semestre.",
  },
  forgotPassword: {
    emailRequired: "Informe seu e-mail.",
    emailInvalid: "Informe um e-mail válido.",
  },
  institution: {
    nameRequired: "Informe o nome da instituição.",
    cnpjRequired: "Informe o CNPJ.",
    cnpjInvalid: "O CNPJ deve conter exatamente 14 números, sem pontuação.",
  },
  login: {
    emailRequired: "Informe seu e-mail.",
    emailInvalid: "Informe um e-mail válido.",
    passwordRequired: "Informe sua senha.",
  },
  professorQualification: {
    professorRequired: "Selecione um professor.",
    subjectRequired: "Selecione uma disciplina.",
  },
  professor: {
    positiveNumberInvalid: "Informe um número válido.",
    nameRequired: "Informe o nome do professor.",
  },
  resetPassword: {
    newPasswordMinLength: "A senha deve ter pelo menos 8 caracteres.",
    confirmPasswordRequired: "Confirme sua nova senha.",
    passwordsDontMatch: "As senhas não coincidem.",
  },
  scheduleEntry: {
    professorRequired: "Selecione um professor.",
    classroomRequired: "Selecione uma sala.",
    timeSlotRequired: "Selecione um horário.",
  },
  semester: {
    endDateAfterStartDate: "A data de término deve ser depois da data de início.",
  },
  serie: {
    nameRequired: "Informe o nome da série.",
  },
  serieSubject: {
    serieRequired: "Selecione uma série.",
    subjectRequired: "Selecione uma disciplina.",
    weeklyWorkloadInvalid: "Informe uma carga horária semanal válida.",
  },
  subjectOffering: {
    courseRequired: "Selecione um curso.",
    subjectRequired: "Selecione uma disciplina.",
    semesterRequired: "Selecione um semestre.",
    sectionRequired: "Informe a turma/seção.",
    expectedStudentsInvalid: "Informe um número de alunos válido.",
    recommendedSemesterMin: "Informe o período recomendado (mínimo 1).",
  },
  subject: {
    codeRequired: "Informe o código da disciplina.",
    nameRequired: "Informe o nome da disciplina.",
    workloadInvalid: "Informe uma carga horária válida.",
  },
  timeSlot: {
    startTimeRequired: "Informe o horário de início.",
    endTimeRequired: "Informe o horário de término.",
  },
  turma: {
    nameRequired: "Informe o nome da turma.",
    expectedStudentsInvalid: "Informe um número de alunos válido.",
    serieRequired: "Selecione uma série.",
    yearInvalid: "Informe um ano válido.",
  },
  timeSlotGenerator: {
    daysOfWeekRequired: "Selecione ao menos um dia da semana.",
    dayStartRequired: "Informe o horário de início das aulas.",
    dayEndRequired: "Informe o horário de término das aulas.",
    dayEndAfterStart: "O horário de término deve ser depois do horário de início.",
    classDurationRequired: "Informe a duração de cada aula.",
    classDurationMin: "A duração da aula deve ser de pelo menos 5 minutos.",
    breakStartRequired: "Informe o início do intervalo.",
    breakEndRequired: "Informe o término do intervalo.",
    breakEndAfterStart: "O término do intervalo deve ser depois do início.",
    breakWithinDay: "Os intervalos devem estar dentro do horário de aulas.",
  },
  user: {
    nameRequired: "Informe o nome.",
    emailRequired: "Informe o e-mail.",
    emailInvalid: "Informe um e-mail válido.",
    passwordMinLength: "A senha deve ter pelo menos 8 caracteres.",
  },
} as const;
