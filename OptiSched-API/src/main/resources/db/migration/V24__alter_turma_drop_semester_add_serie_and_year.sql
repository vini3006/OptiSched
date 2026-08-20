ALTER TABLE turma DROP CONSTRAINT unique_turma_per_institution_semester;
DROP INDEX idx_turma_semester;
ALTER TABLE turma DROP CONSTRAINT turma_semester_id_fkey;
ALTER TABLE turma DROP COLUMN semester_id;

ALTER TABLE turma ADD COLUMN serie_id BIGINT NOT NULL REFERENCES serie(id);
ALTER TABLE turma ADD COLUMN year INTEGER NOT NULL;

CREATE INDEX idx_turma_serie ON turma(serie_id);
ALTER TABLE turma ADD CONSTRAINT unique_turma_per_institution_year UNIQUE (institution_id, year, name);
