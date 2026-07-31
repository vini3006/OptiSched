export type Term = "FIRST" | "SECOND";

export type Semester = {
  id: number;
  year: number;
  term: Term;
  startDate: string | null;
  endDate: string | null;
};

export type SemesterInput = {
  year: number;
  term: Term;
  startDate: string | null;
  endDate: string | null;
};
