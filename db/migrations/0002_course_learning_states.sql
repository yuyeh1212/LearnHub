-- Stores the current lesson separately from per-lesson playback progress.
-- Apply only after 0001_learning_core.sql.

CREATE TABLE course_learning_states (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  current_lesson_id uuid REFERENCES lessons (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_id)
);

CREATE INDEX course_learning_states_user_updated_at_index
  ON course_learning_states (user_id, updated_at DESC);

CREATE TRIGGER lesson_progress_set_updated_at
BEFORE UPDATE ON lesson_progress
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER course_learning_states_set_updated_at
BEFORE UPDATE ON course_learning_states
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
