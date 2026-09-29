import { pool } from '../config/db.js';
import { ApiError } from '../utils/ApiError.js';

/** Works out whether the logged-in user owns or is enrolled in the class. */
export async function resolveAccess(user, cls) {
  const isOwner = user.role === 'teacher' && cls.teacher_id === user.id;
  let isEnrolled = false;
  if (user.role === 'student') {
    const [rows] = await pool.query(
      'SELECT 1 FROM enrollments WHERE student_id = ? AND class_id = ?',
      [user.id, cls.id]
    );
    isEnrolled = rows.length > 0;
  }
  return { isOwner, isEnrolled, isMember: isOwner || isEnrolled };
}

/** Loads the class in :id into req.cls and the user's access into req.access. */
export async function loadClass(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) throw new ApiError(404, 'Class not found');
  const [rows] = await pool.query('SELECT * FROM classes WHERE id = ?', [id]);
  if (!rows.length) throw new ApiError(404, 'Class not found');
  req.cls = rows[0];
  req.access = await resolveAccess(req.user, req.cls);
  next();
}

export function requireOwner(req, res, next) {
  if (!req.access.isOwner) throw new ApiError(403, 'Only the teacher of this class can do this');
  next();
}

export function requireMember(req, res, next) {
  if (!req.access.isMember) throw new ApiError(403, 'Enroll in this class to access this');
  next();
}
