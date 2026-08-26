ALTER TABLE institution ADD COLUMN is_demo BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX idx_institution_is_demo_expires_at ON institution (is_demo, expires_at);
