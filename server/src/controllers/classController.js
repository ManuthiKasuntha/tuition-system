import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../config/db.js';
import { GRADE_VALUES, MEDIUMS, SUBJECTS } from '../constants.js';
import { UPLOADS_DIR } from '../middleware/upload.js';
import { ApiError } from '../utils/ApiError.js';

// The first placeholder is always the current user's id (for is_enrolled)
const CLASS_SELECT = `
  SELECT c.*, u.full_name AS teacher_name, u.district AS teacher_district,
    (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) AS student_count,
    EXISTS (SELECT 1 FROM enrollments e WHERE e.class_id = c.id AND e.student_id = ?) AS is_enrolled
  FROM classes c
  JOIN users u ON u.id = c.teacher_id`;

export function formatClass(row) {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    teacherName: row.teacher_name,
    teacherDistrict: row.teacher_district,
    title: row.title,
    subject: row.subject,
    grade: row.grade,
    medium: row.medium,
    description: row.description,
    schedule: row.schedule,
    fee: Number(row.fee),
    studentCount: Number(row.student_count ?? 0),
    isEnrolled: Boolean(row.is_enrolled),
    createdAt: row.created_at,
  };
}

function validateClass(body) {
  const errors = {};
  const str = (v) => (typeof v === 'string' ? v.trim() : '');
  const data = {
    title: str(body.title),
    subject: str(body.subject),
    grade: str(body.grade),
    medium: str(body.medium),
    description: str(body.description),
    schedule: str(body.schedule),
    fee: body.fee === '' || body.fee == null ? 0 : Number(body.fee),
  };
  if (data.title.length < 3 || data.title.length > 120) errors.title = 'Title must be 3-120 characters';
  if (!SUBJECTS.includes(data.subject)) errors.subject = 'Choose a subject';
  if (!GRADE_VALUES.includes(data.grade)) errors.grade = 'Choose a grade';
  if (!MEDIUMS.includes(data.medium)) errors.medium = 'Choose a medium';
  if (data.description.length > 2000) errors.description = 'Description must be 2000 characters or fewer';
  if (data.schedule.length > 100) errors.schedule = 'Schedule must be 100 characters or fewer';
  if (!Number.isFinite(data.fee) || data.fee < 0 || data.fee > 1_000_000) errors.fee = 'Enter a valid fee (0 for free)';
  if (Object.keys(errors).length) throw new ApiError(400, 'Please fix the highlighted fields', errors);
  return data;
}

export async function listClasses(req, res) {
  const { subject, grade, district, search } = req.query;
  const where = [];
  const params = [req.user.id];
  if (subject) { where.push('c.subject = ?'); params.push(subject); }
  if (grade) { where.push('c.grade = ?'); params.push(grade); }
  if (district) { where.push('u.district = ?'); params.push(district); }
  if (search) {
    where.push('(c.title LIKE ? OR c.description LIKE ? OR u.full_name LIKE ?)');
    const like = `%${String(search).trim()}%`;
    params.push(like, like, like);
  }
  const [rows] = await pool.query(
    `${CLASS_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY c.created_at DESC LIMIT 100`,
    params
  );
  res.json({ classes: rows.map(formatClass) });
}

/** Teacher: classes they run. Student: classes they are enrolled in. */
export async function myClasses(req, res) {
  const sql =
    req.user.role === 'teacher'
      ? `${CLASS_SELECT} WHERE c.teacher_id = ? ORDER BY c.created_at DESC`
      : `${CLASS_SELECT} JOIN enrollments me ON me.class_id = c.id AND me.student_id = ? ORDER BY me.enrolled_at DESC`;
  const [rows] = await pool.query(sql, [req.user.id, req.user.id]);
  res.json({ classes: rows.map(formatClass) });
}

/** Student: classes matching their grade and subjects that they have not joined yet. */
export async function recommendedClasses(req, res) {
  const [rows] = await pool.query(
    `${CLASS_SELECT}
     WHERE c.grade = (SELECT current_grade FROM users WHERE id = ?)
       AND c.subject IN (SELECT subject FROM user_subjects WHERE user_id = ?)
       AND c.id NOT IN (SELECT class_id FROM enrollments WHERE student_id = ?)
     ORDER BY c.created_at DESC LIMIT 6`,
    [req.user.id, req.user.id, req.user.id, req.user.id]
  );
  res.json({ classes: rows.map(formatClass) });
}

export async function getClass(req, res) {
  const [rows] = await pool.query(`${CLASS_SELECT} WHERE c.id = ?`, [req.user.id, req.cls.id]);
  const [[teacher]] = await pool.query('SELECT full_name, bio, district FROM users WHERE id = ?', [req.cls.teacher_id]);
  res.json({
    class: {
      ...formatClass(rows[0]),
      teacherBio: teacher?.bio ?? null,
      isOwner: req.access.isOwner,
    },
  });
}

export async function createClass(req, res) {
  const d = validateClass(req.body ?? {});
  const [result] = await pool.query(
    `INSERT INTO classes (teacher_id, title, subject, grade, medium, description, schedule, fee)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [req.user.id, d.title, d.subject, d.grade, d.medium, d.description || null, d.schedule || null, d.fee]
  );
  const [rows] = await pool.query(`${CLASS_SELECT} WHERE c.id = ?`, [req.user.id, result.insertId]);
  res.status(201).json({ class: formatClass(rows[0]) });
}

export async function updateClass(req, res) {
  const d = validateClass(req.body ?? {});
  await pool.query(
    `UPDATE classes SET title = ?, subject = ?, grade = ?, medium = ?, description = ?, schedule = ?, fee = ?
     WHERE id = ?`,
    [d.title, d.subject, d.grade, d.medium, d.description || null, d.schedule || null, d.fee, req.cls.id]
  );
  const [rows] = await pool.query(`${CLASS_SELECT} WHERE c.id = ?`, [req.user.id, req.cls.id]);
  res.json({ class: formatClass(rows[0]) });
}

export async function deleteClass(req, res) {
  const [files] = await pool.query('SELECT stored_name FROM materials WHERE class_id = ?', [req.cls.id]);
  await pool.query('DELETE FROM classes WHERE id = ?', [req.cls.id]);
  await Promise.all(files.map((f) => fs.rm(path.join(UPLOADS_DIR, f.stored_name), { force: true })));
  res.status(204).end();
}

export async function enroll(req, res) {
  await pool.query('INSERT IGNORE INTO enrollments (student_id, class_id) VALUES (?, ?)', [req.user.id, req.cls.id]);
  res.status(201).json({ message: 'Enrolled successfully' });
}

export async function unenroll(req, res) {
  await pool.query('DELETE FROM enrollments WHERE student_id = ? AND class_id = ?', [req.user.id, req.cls.id]);
  res.status(204).end();
}

export async function listStudents(req, res) {
  const [rows] = await pool.query(
    `SELECT u.id, u.full_name, u.username, u.email, u.current_grade, u.district, e.enrolled_at
     FROM enrollments e JOIN users u ON u.id = e.student_id
     WHERE e.class_id = ? ORDER BY e.enrolled_at DESC`,
    [req.cls.id]
  );
  res.json({
    students: rows.map((r) => ({
      id: r.id,
      fullName: r.full_name,
      username: r.username,
      email: r.email,
      currentGrade: r.current_grade,
      district: r.district,
      enrolledAt: r.enrolled_at,
    })),
  });
}
