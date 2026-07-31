-- Swapping two ScheduleEntry rows that share a professor or classroom updates
-- one row at a time within the same transaction. Right after the first
-- UPDATE, the moved row and the not-yet-moved row briefly share the same
-- (professor, time_slot) or (classroom, time_slot) pair, even though the
-- final state (after both updates) is perfectly valid. With a plain UNIQUE
-- constraint, Postgres checks this immediately after each statement and
-- rejects the swap outright. Deferring these two constraints to transaction
-- COMMIT lets both updates land before the check runs, which is the
-- standard Postgres pattern for swapping unique key values.
--
-- Postgres only supports ALTER CONSTRAINT ... DEFERRABLE for foreign keys —
-- for a UNIQUE constraint, deferrability can only be set at creation, so the
-- existing constraint has to be dropped and re-added.
ALTER TABLE schedule_entry DROP CONSTRAINT schedule_entry_schedule_id_classroom_id_time_slot_id_key;
ALTER TABLE schedule_entry ADD CONSTRAINT schedule_entry_schedule_id_classroom_id_time_slot_id_key
    UNIQUE (schedule_id, classroom_id, time_slot_id) DEFERRABLE INITIALLY DEFERRED;

ALTER TABLE schedule_entry DROP CONSTRAINT schedule_entry_schedule_id_professor_id_time_slot_id_key;
ALTER TABLE schedule_entry ADD CONSTRAINT schedule_entry_schedule_id_professor_id_time_slot_id_key
    UNIQUE (schedule_id, professor_id, time_slot_id) DEFERRABLE INITIALLY DEFERRED;
