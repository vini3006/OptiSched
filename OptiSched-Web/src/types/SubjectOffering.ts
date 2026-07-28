export type SubjectOffering = {
  id: number;
  courseId: number;
  subjectId: number;
  semesterId: number;
  section: string;
  expectedStudents: number;
  recommendedSemester: number;
};

export type SubjectOfferingInput = {
  courseId: number;
  subjectId: number;
  semesterId: number;
  section: string;
  expectedStudents: number;
  recommendedSemester: number;
};
