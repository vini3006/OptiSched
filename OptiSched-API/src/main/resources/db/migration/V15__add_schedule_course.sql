ALTER TABLE schedule ADD COLUMN course_id BIGINT;
ALTER TABLE schedule ADD CONSTRAINT fk_schedule_course
    FOREIGN KEY (course_id) REFERENCES course(id);
CREATE INDEX idx_schedule_course ON schedule(course_id);
