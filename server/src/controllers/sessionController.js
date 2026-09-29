import { pool } from '../config/db.js';
import { resolveAccess } from '../middleware/classAccess.js';
import { ApiError } from '../utils/ApiError.js';

function formatSession(row, showLink = true) {
  return {
    id: row.id,
    classId: row.class_id,
    classTitle: row.class_title,
    subject: row.subject,
    title: row.title,
    startTime: row.start_time,
    durationMinutes: row.duration_minutes,
    meetingLink: showLink ? row.meeting_link : null,
  };
}

export async function listClassSessions(req, res) {
  const [rows] = await pool.query(
    'SELECT * FROM class_sessions WHERE class_id = ? ORDER BY start_time DESC',
    [req.cls.id]
  );
  // Everyone can see the timetable; only the teacher and enrolled students get the join link
  res.json({ sessions: rows.map((r) => formatSession(r, req.access.isMember)) });
}

export async function createSession(req, res) {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  const startTime = new Date(req.body?.startTime);
  const durationMinutes = Number(req.body?.durationMinutes ?? 60);
  const meetingLink = typeof req.body?.meetingLink === 'string' ? req.body.meetingLink.trim() : '';

  const errors = {};
  if (title.length < 3 || title.length > 120) errors.title = 'Title must be 3-120 characters';
  if (Number.isNaN(startTime.getTime())) errors.startTime = 'Choose a date and time';
  else if (startTime.getTime() < Date.now() - 5 * 60 * 1000) errors.startTime = 'The session must be in the future';
  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 600) {
    errors.durationMinutes = 'Duration must be 15-600 minutes';
  }
  let validLink = false;
  try {
    validLink = ['http:', 'https:'].includes(new URL(meetingLink).protocol);
  } catch { /* invalid URL */ }
  if (!validLink || meetingLink.length > 500) errors.meetingLink = 'Enter a valid meeting link (https://...)';
  if (Object.keys(errors).length) throw new ApiError(400, 'Please fix the highlighted fields', errors);

  const [result] = await pool.query(
    'INSERT INTO class_sessions (class_id, title, start_time, duration_minutes, meeting_link) VALUES (?, ?, ?, ?, ?)',
    [req.cls.id, title, startTime, durationMinutes, meetingLink]
  );
  const [rows] = await pool.query('SELECT * FROM class_sessions WHERE id = ?', [result.insertId]);
  res.status(201).json({ session: formatSession(rows[0]) });
}

/** Sessions that have not ended yet, across the user's own or enrolled classes. */
export async function upcomingSessions(req, res) {
  const scope =
    req.user.role === 'teacher'
      ? 'c.teacher_id = ?'
      : 'c.id IN (SELECT class_id FROM enrollments WHERE student_id = ?)';
  const [rows] = await pool.query(
    `SELECT s.*, c.title AS class_title, c.subject
     FROM class_sessions s JOIN classes c ON c.id = s.class_id
     WHERE ${scope} AND DATE_ADD(s.start_time, INTERVAL s.duration_minutes MINUTE) > UTC_TIMESTAMP()
     ORDER BY s.start_time ASC LIMIT 20`,
    [req.user.id]
  );
  res.json({ sessions: rows.map((r) => formatSession(r)) });
}

export async function deleteSession(req, res) {
  const [rows] = await pool.query(
    'SELECT c.* FROM class_sessions s JOIN classes c ON c.id = s.class_id WHERE s.id = ?',
    [Number(req.params.sessionId)]
  );
  if (!rows.length) throw new ApiError(404, 'Session not found');
  const { isOwner } = await resolveAccess(req.user, rows[0]);
  if (!isOwner) throw new ApiError(403, 'Only the teacher of this class can do this');
  await pool.query('DELETE FROM class_sessions WHERE id = ?', [Number(req.params.sessionId)]);
  res.status(204).end();
}
