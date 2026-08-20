CREATE TABLE serie (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    "order" INTEGER,
    institution_id BIGINT NOT NULL REFERENCES institution(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_serie_per_institution UNIQUE (institution_id, name)
);

CREATE INDEX idx_serie_institution ON serie(institution_id);
