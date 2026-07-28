export type ProfessorQualification = {
  professorId: number;
  professorName: string;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
};

export type ProfessorQualificationInput = {
  professorId: number;
  subjectId: number;
};
