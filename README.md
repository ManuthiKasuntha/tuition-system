# TuitionHub – Online Tuition Class Management System

A full-stack web app where tuition teachers across Sri Lanka run their classes online and students find and join them.

| Part | Folder | Tech |
|---|---|---|
| Frontend | `client/` | React 19, Vite, React Router, Tailwind CSS (blue & white theme) |
| Backend | `server/` | Node.js, Express 5, JWT auth, bcrypt, Multer |
| Database | `database/` | MySQL (local server, not cloud) |

## Features

- **Sign up** in three steps: account details (name, username, email, password) → *student or teacher?* → subjects, grades/ages covered, district
- **Log in** with username *or* email; session kept with a JWT
- **Teachers:** create/edit/delete classes, schedule online sessions (Zoom/Meet/Teams link), upload lecture materials, see enrolled students
- **Students:** search classes by subject, grade, district; enroll/leave; join live sessions; download materials; recommendations for their grade
- Access control: only enrolled students see join links and materials; only the class owner can manage it

## Requirements

- Node.js 20+
- MySQL 8+ running locally

## Setup

```bash
# 1. Backend
cd server
npm install
copy .env.example .env      # then set DB_PASSWORD to your MySQL root password
npm run db:seed             # optional: creates the database, tables and demo accounts
npm run dev                 # API on http://localhost:5000/api

# 2. Frontend (new terminal)
cd client
npm install
npm run dev                 # open http://localhost:5173
```

The backend creates the `tuition_system` database and all tables automatically on start-up
(from `database/schema.sql`), so no manual SQL is needed.

Demo accounts (after `npm run db:seed`): `demo_teacher` / `Password123`, `demo_student` / `Password123`.

## Database tables

`users`, `user_subjects`, `teacher_grades`, `classes`, `class_sessions`, `materials`, `enrollments` — see `database/schema.sql`.
Uploaded files are stored on disk in `server/uploads/`; only their metadata is in MySQL.

## API

| Method | Endpoint | Who |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | public |
| GET | `/api/auth/me` | logged in |
| GET | `/api/meta` (subjects, grades, districts) | public |
| GET | `/api/classes?subject=&grade=&district=&search=` | logged in |
| GET | `/api/classes/mine`, `/api/classes/recommended` | logged in / student |
| POST / PUT / DELETE | `/api/classes`, `/api/classes/:id` | teacher (owner) |
| POST / DELETE | `/api/classes/:id/enroll` | student |
| GET | `/api/classes/:id/students` | owner |
| GET / POST | `/api/classes/:id/sessions` | members / owner |
| GET | `/api/sessions/upcoming` | logged in |
| DELETE | `/api/sessions/:id` | owner |
| GET / POST | `/api/classes/:id/materials` | members / owner |
| GET | `/api/materials/:id/download` | members |
| DELETE | `/api/materials/:id` | owner |
