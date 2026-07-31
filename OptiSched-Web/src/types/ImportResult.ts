export type ImportRowError = {
  row: number;
  message: string;
};

export type ImportResult = {
  totalRows: number;
  successCount: number;
  errors: ImportRowError[];
};
