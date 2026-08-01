import type { PreferredShift } from "./Schedule";

export type Course = {
  id: number;
  name: string;
  totalSemesters: number;
  allowedShift: PreferredShift | null;
};

export type CourseInput = {
  name: string;
  totalSemesters: number;
  allowedShift: PreferredShift | null;
};
