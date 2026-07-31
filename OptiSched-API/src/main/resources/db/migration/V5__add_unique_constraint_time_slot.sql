ALTER TABLE time_slot ADD CONSTRAINT unique_time_slot_per_institution
    UNIQUE (institution_id, day_of_week, start_time, end_time);
