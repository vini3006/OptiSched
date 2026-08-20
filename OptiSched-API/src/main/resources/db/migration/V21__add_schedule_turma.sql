ALTER TABLE schedule ADD COLUMN turma_id BIGINT;
ALTER TABLE schedule ADD CONSTRAINT fk_schedule_turma
    FOREIGN KEY (turma_id) REFERENCES turma(id);
CREATE INDEX idx_schedule_turma ON schedule(turma_id);
