-- LearnHub initial learning and authentication schema.
-- This migration is intentionally checked in but is not executed by the frontend project.

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'learner' CHECK (role IN ('learner', 'admin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_not_blank CHECK (length(btrim(email)) > 0),
  CONSTRAINT users_display_name_not_blank CHECK (length(btrim(display_name)) > 0)
);

CREATE UNIQUE INDEX users_email_lower_unique ON users (lower(email));

CREATE TABLE courses (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  summary text NOT NULL,
  category text NOT NULL,
  instructor_name text NOT NULL,
  cover_image_url text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT courses_slug_not_blank CHECK (length(btrim(slug)) > 0),
  CONSTRAINT courses_title_not_blank CHECK (length(btrim(title)) > 0)
);

CREATE INDEX courses_published_created_at_index
  ON courses (created_at DESC)
  WHERE status = 'published';

CREATE TABLE chapters (
  id uuid PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position > 0),
  title text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chapters_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT chapters_course_position_unique UNIQUE (course_id, position)
);

CREATE INDEX chapters_course_position_index ON chapters (course_id, position);

CREATE TABLE lessons (
  id uuid PRIMARY KEY,
  chapter_id uuid NOT NULL REFERENCES chapters (id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position > 0),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  duration_seconds integer NOT NULL CHECK (duration_seconds >= 0),
  content_type text NOT NULL DEFAULT 'video' CHECK (content_type IN ('video')),
  video_url text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lessons_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT lessons_video_url_not_blank CHECK (length(btrim(video_url)) > 0),
  CONSTRAINT lessons_chapter_position_unique UNIQUE (chapter_id, position)
);

CREATE INDEX lessons_chapter_position_index ON lessons (chapter_id, position);

CREATE TABLE lesson_resources (
  id uuid PRIMARY KEY,
  lesson_id uuid NOT NULL REFERENCES lessons (id) ON DELETE CASCADE,
  position integer NOT NULL CHECK (position > 0),
  title text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('code', 'document', 'exercise')),
  download_url text NOT NULL,
  size_bytes bigint NOT NULL CHECK (size_bytes >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lesson_resources_title_not_blank CHECK (length(btrim(title)) > 0),
  CONSTRAINT lesson_resources_download_url_not_blank CHECK (length(btrim(download_url)) > 0),
  CONSTRAINT lesson_resources_lesson_position_unique UNIQUE (lesson_id, position)
);

CREATE INDEX lesson_resources_lesson_position_index
  ON lesson_resources (lesson_id, position);

CREATE TABLE enrollments (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES courses (id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT enrollments_user_course_unique UNIQUE (user_id, course_id)
);

CREATE INDEX enrollments_user_enrolled_at_index
  ON enrollments (user_id, enrolled_at DESC);

CREATE TABLE lesson_progress (
  user_id uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  lesson_id uuid NOT NULL REFERENCES lessons (id) ON DELETE CASCADE,
  position_seconds integer NOT NULL DEFAULT 0 CHECK (position_seconds >= 0),
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE INDEX lesson_progress_user_updated_at_index
  ON lesson_progress (user_id, updated_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER courses_set_updated_at
BEFORE UPDATE ON courses
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER chapters_set_updated_at
BEFORE UPDATE ON chapters
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER lessons_set_updated_at
BEFORE UPDATE ON lessons
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER lesson_resources_set_updated_at
BEFORE UPDATE ON lesson_resources
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
