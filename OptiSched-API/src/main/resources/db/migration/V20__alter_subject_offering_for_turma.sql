ALTER TABLE subject_offering ALTER COLUMN course_id DROP NOT NULL;
ALTER TABLE subject_offering ALTER COLUMN section DROP NOT NULL;

ALTER TABLE subject_offering ADD COLUMN turma_id BIGINT REFERENCES turma(id);
CREATE INDEX idx_subject_offering_turma ON subject_offering(turma_id);

ALTER TABLE subject_offering ADD CONSTRAINT chk_subject_offering_course_xor_turma
    CHECK ((course_id IS NOT NULL AND turma_id IS NULL) OR (course_id IS NULL AND turma_id IS NOT NULL));

ALTER TABLE subject_offering DROP CONSTRAINT unique_subject_offering_per_institution;

CREATE UNIQUE INDEX unique_subject_offering_university
    ON subject_offering (institution_id, course_id, subject_id, semester_id, section)
    WHERE course_id IS NOT NULL;

CREATE UNIQUE INDEX unique_subject_offering_school
    ON subject_offering (institution_id, turma_id, subject_id, semester_id)
    WHERE turma_id IS NOT NULL;
