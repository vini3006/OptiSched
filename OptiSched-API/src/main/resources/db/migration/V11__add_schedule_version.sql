ALTER TABLE schedule ADD COLUMN version INTEGER;

WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY semester_id, institution_id ORDER BY generated_at) AS rn
    FROM schedule
)
UPDATE schedule s
SET version = ranked.rn
FROM ranked
WHERE s.id = ranked.id;

ALTER TABLE schedule ALTER COLUMN version SET NOT NULL;
