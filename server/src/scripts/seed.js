// Adds demo accounts and a demo class so the app has something to show.
import bcrypt from 'bcryptjs';
import { initDatabase, pool } from '../config/db.js';

const PASSWORD = 'Password123';

async function upsertUser({ fullName, username, email, role, district, currentGrade = null, bio = null, subjects, grades = [] }) {
  const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
  if (existing.length) return existing[0].id;
  const hash = await bcrypt.hash(PASSWORD, 10);
  const [r] = await pool.query(
    `INSERT INTO users (full_name, username, email, password_hash, role, district, current_grade, bio)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [fullName, username, email, hash, role, district, currentGrade, bio]
  );
  await pool.query('INSERT INTO user_subjects (user_id, subject) VALUES ?', [subjects.map((s) => [r.insertId, s])]);
  if (grades.length) await pool.query('INSERT INTO teacher_grades (user_id, grade) VALUES ?', [grades.map((g) => [r.insertId, g])]);
  return r.insertId;
}

await initDatabase();

const teacherId = await upsertUser({
  fullName: 'Nimal Perera',
  username: 'demo_teacher',
  email: 'teacher@demo.lk',
  role: 'teacher',
  district: 'Colombo',
  bio: '15 years of experience teaching O/L Mathematics and Science.',
  subjects: ['Mathematics', 'Science'],
  grades: ['Grade 9', 'Grade 10', 'Grade 11'],
});

const studentId = await upsertUser({
  fullName: 'Kavindi Silva',
  username: 'demo_student',
  email: 'student@demo.lk',
  role: 'student',
  district: 'Gampaha',
  currentGrade: 'Grade 10',
  subjects: ['Mathematics', 'Science', 'English'],
});

const [classes] = await pool.query('SELECT id FROM classes WHERE teacher_id = ?', [teacherId]);
if (!classes.length) {
  const [c] = await pool.query(
    `INSERT INTO classes (teacher_id, title, subject, grade, medium, description, schedule, fee)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [teacherId, 'O/L Maths Theory 2027', 'Mathematics', 'Grade 10', 'Sinhala',
      'Complete theory class covering the full Grade 10 syllabus with past paper discussions.',
      'Every Saturday 8.00 AM - 10.00 AM', 2500]
  );
  await pool.query(
    'INSERT INTO class_sessions (class_id, title, start_time, duration_minutes, meeting_link) VALUES (?, ?, ?, ?, ?)',
    [c.insertId, 'Algebra - Lesson 1', new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), 120, 'https://meet.google.com/abc-defg-hij']
  );
  await pool.query('INSERT IGNORE INTO enrollments (student_id, class_id) VALUES (?, ?)', [studentId, c.insertId]);
}

console.log('Demo data ready. Log in with:');
console.log(`  Teacher: demo_teacher / ${PASSWORD}`);
console.log(`  Student: demo_student / ${PASSWORD}`);
await pool.end();
