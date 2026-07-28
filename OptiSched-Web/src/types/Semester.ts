export type Term = "FIRST" | "SECOND";

export type Semester = {
  id: number;
  year: number;
  term: Term;
};

export type SemesterInput = {
  year: number;
  term: Term;
};
