-- TuitionHub database schema (MySQL 8+)
-- The backend runs this file automatically on startup (npm run db:init does the same),
-- after creating the database named in server/.env (DB_NAME, default: tuition_system).
-- To run it by hand in MySQL Workbench:  CREATE DATABASE tuition_system; USE tuition_system;  then this file.

CREATE TABLE IF NOT EXISTS users (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  full_name      VARCHAR(100) NOT NULL,
  username       VARCHAR(30)  NOT NULL,
  email          VARCHAR(120) NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  role           ENUM('student', 'teacher') NOT NULL,
  district       VARCHAR(50)  NOT NULL,
  current_grade  VARCHAR(20)  NULL,          -- students only
  bio            TEXT         NULL,          -- teachers only
  created_at     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Subjects a teacher teaches, or a student is interested in
CREATE TABLE IF NOT EXISTS user_subjects (
  user_id  INT         NOT NULL,
  subject  VARCHAR(60) NOT NULL,
  PRIMARY KEY (user_id, subject),
  CONSTRAINT fk_user_subjects_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Grades (age groups) a teacher covers
CREATE TABLE IF NOT EXISTS teacher_grades (
  user_id  INT         NOT NULL,
  grade    VARCHAR(20) NOT NULL,
  PRIMARY KEY (user_id, grade),
  CONSTRAINT fk_teacher_grades_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS classes (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id   INT           NOT NULL,
  title        VARCHAR(120)  NOT NULL,
  subject      VARCHAR(60)   NOT NULL,
  grade        VARCHAR(20)   NOT NULL,
  medium       ENUM('Sinhala', 'Tamil', 'English') NOT NULL,
  description  TEXT          NULL,
  schedule     VARCHAR(100)  NULL,           -- e.g. "Every Saturday 8.00 AM - 10.00 AM"
  fee          DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_classes_subject_grade (subject, grade),
  CONSTRAINT fk_classes_teacher FOREIGN KEY (teacher_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Live online sessions (Zoom / Google Meet / Teams link)
CREATE TABLE IF NOT EXISTS class_sessions (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  class_id          INT          NOT NULL,
  title             VARCHAR(120) NOT NULL,
  start_time        DATETIME     NOT NULL,   -- stored in UTC
  duration_minutes  INT          NOT NULL DEFAULT 60,
  meeting_link      VARCHAR(500) NOT NULL,
  created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_sessions_start (start_time),
  CONSTRAINT fk_sessions_class FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lecture materials; files live in server/uploads, only metadata is stored here
CREATE TABLE IF NOT EXISTS materials (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  class_id     INT          NOT NULL,
  title        VARCHAR(120) NOT NULL,
  file_name    VARCHAR(255) NOT NULL,        -- original name shown to users
  stored_name  VARCHAR(255) NOT NULL,        -- random name on disk
  mime_type    VARCHAR(120) NOT NULL,
  size_bytes   INT          NOT NULL,
  uploaded_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_materials_class FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS enrollments (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  student_id   INT       NOT NULL,
  class_id     INT       NOT NULL,
  enrolled_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_enrollments (student_id, class_id),
  CONSTRAINT fk_enrollments_student FOREIGN KEY (student_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_enrollments_class FOREIGN KEY (class_id) REFERENCES classes (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
