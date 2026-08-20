export type SerieSubject = {
  serieId: number;
  serieName: string;
  subjectId: number;
  subjectCode: string;
  subjectName: string;
  weeklyWorkload: number;
};

export type SerieSubjectInput = {
  serieId: number;
  subjectId: number;
  weeklyWorkload: number;
};
