CREATE TABLE serie_subject (
    serie_id BIGINT NOT NULL REFERENCES serie(id) ON DELETE CASCADE,
    subject_id BIGINT NOT NULL REFERENCES subject(id),
    weekly_workload INTEGER NOT NULL CHECK (weekly_workload > 0),
    institution_id BIGINT NOT NULL REFERENCES institution(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (serie_id, subject_id)
);

CREATE INDEX idx_serie_subject_institution ON serie_subject(institution_id);
