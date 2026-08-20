import type { PreferredShift } from "./Schedule";

export type Turma = {
  id: number;
  name: string;
  shift: PreferredShift | null;
  expectedStudents: number;
  serieId: number;
  year: number;
};

export type TurmaInput = {
  name: string;
  shift: PreferredShift | null;
  expectedStudents: number;
  serieId: number;
  year: number;
};
