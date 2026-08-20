CREATE TABLE turma (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    shift VARCHAR(20),
    expected_students INTEGER NOT NULL CHECK (expected_students > 0),
    semester_id BIGINT NOT NULL REFERENCES semester(id),
    institution_id BIGINT NOT NULL REFERENCES institution(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_turma_per_institution_semester UNIQUE (institution_id, semester_id, name)
);

CREATE INDEX idx_turma_institution ON turma(institution_id);
CREATE INDEX idx_turma_semester ON turma(semester_id);
