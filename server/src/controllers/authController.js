import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';
import { DISTRICTS, GRADE_VALUES, ROLES, SUBJECTS } from '../constants.js';
import { signToken } from '../middleware/auth.js';
import { ApiError } from '../utils/ApiError.js';

const USERNAME_RE = /^[a-zA-Z0-9_]{3,30}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Compared against when the user does not exist, so both paths take the same time
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

const str = (value) => (typeof value === 'string' ? value.trim() : '');
const uniqueList = (value) => (Array.isArray(value) ? [...new Set(value.map(str).filter(Boolean))] : []);

function validateRegistration(body) {
  const errors = {};
  const data = {
    fullName: str(body.fullName),
    username: str(body.username),
    email: str(body.email).toLowerCase(),
    password: typeof body.password === 'string' ? body.password : '',
    role: str(body.role),
    district: str(body.district),
    subjects: uniqueList(body.subjects),
    grades: uniqueList(body.grades),
    currentGrade: str(body.currentGrade),
    bio: str(body.bio),
  };

  if (data.fullName.length < 2 || data.fullName.length > 100) errors.fullName = 'Enter your full name (2-100 characters)';
  if (!USERNAME_RE.test(data.username)) errors.username = 'Username must be 3-30 characters: letters, numbers or _';
  if (!EMAIL_RE.test(data.email) || data.email.length > 120) errors.email = 'Enter a valid email address';
  if (data.password.length < 8 || !/[A-Za-z]/.test(data.password) || !/\d/.test(data.password)) {
    errors.password = 'Password must be at least 8 characters and include a letter and a number';
  } else if (data.password.length > 72) {
    errors.password = 'Password must be 72 characters or fewer';
  }
  if (!ROLES.includes(data.role)) errors.role = 'Choose whether you are a student or a teacher';
  if (!DISTRICTS.includes(data.district)) errors.district = 'Choose your district';
  if (!data.subjects.length || data.subjects.some((s) => !SUBJECTS.includes(s))) {
    errors.subjects = data.role === 'teacher' ? 'Choose the subjects you teach' : 'Choose at least one subject';
  }

  if (data.role === 'teacher') {
    if (!data.grades.length || data.grades.some((g) => !GRADE_VALUES.includes(g))) {
      errors.grades = 'Choose the grades (age groups) you teach';
    }
    if (data.bio.length > 1000) errors.bio = 'Bio must be 1000 characters or fewer';
    data.currentGrade = null;
  } else if (data.role === 'student') {
    if (!GRADE_VALUES.includes(data.currentGrade)) errors.currentGrade = 'Choose your current grade';
    data.grades = [];
    data.bio = null;
  }

  return { errors, data };
}

/** Returns the public profile of a user, or null. Never includes the password hash. */
export async function findUserById(id) {
  const [rows] = await pool.query(
    `SELECT id, full_name, username, email, role, district, current_grade, bio, created_at
     FROM users WHERE id = ?`,
    [id]
  );
  if (!rows.length) return null;
  const u = rows[0];
  const [[subjects], [grades]] = await Promise.all([
    pool.query('SELECT subject FROM user_subjects WHERE user_id = ? ORDER BY subject', [id]),
    pool.query('SELECT grade FROM teacher_grades WHERE user_id = ?', [id]),
  ]);
  return {
    id: u.id,
    fullName: u.full_name,
    username: u.username,
    email: u.email,
    role: u.role,
    district: u.district,
    currentGrade: u.current_grade,
    bio: u.bio,
    subjects: subjects.map((r) => r.subject),
    grades: grades
      .map((r) => r.grade)
      .sort((a, b) => GRADE_VALUES.indexOf(a) - GRADE_VALUES.indexOf(b)),
    createdAt: u.created_at,
  };
}

export async function register(req, res) {
  const { errors, data } = validateRegistration(req.body ?? {});
  if (Object.keys(errors).length) throw new ApiError(400, 'Please fix the highlighted fields', errors);

  const [taken] = await pool.query('SELECT username, email FROM users WHERE username = ? OR email = ?', [
    data.username,
    data.email,
  ]);
  if (taken.length) {
    const conflict = {};
    for (const row of taken) {
      if (row.username.toLowerCase() === data.username.toLowerCase()) conflict.username = 'This username is already taken';
      if (row.email.toLowerCase() === data.email) conflict.email = 'An account with this email already exists';
    }
    throw new ApiError(409, 'That username or email is already in use', conflict);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);
  const conn = await pool.getConnection();
  let userId;
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO users (full_name, username, email, password_hash, role, district, current_grade, bio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.fullName, data.username, data.email, passwordHash, data.role, data.district, data.currentGrade, data.bio || null]
    );
    userId = result.insertId;
    await conn.query('INSERT INTO user_subjects (user_id, subject) VALUES ?', [data.subjects.map((s) => [userId, s])]);
    if (data.grades.length) {
      await conn.query('INSERT INTO teacher_grades (user_id, grade) VALUES ?', [data.grades.map((g) => [userId, g])]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    if (err.code === 'ER_DUP_ENTRY') throw new ApiError(409, 'That username or email is already in use');
    throw err;
  } finally {
    conn.release();
  }

  const user = await findUserById(userId);
  res.status(201).json({ token: signToken(user), user });
}

export async function login(req, res) {
  const identifier = str(req.body?.identifier);
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!identifier || !password) {
    throw new ApiError(400, 'Enter your username or email and your password');
  }

  const [rows] = await pool.query(
    'SELECT id, password_hash FROM users WHERE username = ? OR email = ? LIMIT 1',
    [identifier, identifier.toLowerCase()]
  );
  const match = await bcrypt.compare(password, rows[0]?.password_hash ?? DUMMY_HASH);
  if (!rows.length || !match) throw new ApiError(401, 'Incorrect username/email or password');

  const user = await findUserById(rows[0].id);
  res.json({ token: signToken(user), user });
}

export async function me(req, res) {
  const user = await findUserById(req.user.id);
  if (!user) throw new ApiError(401, 'Your account no longer exists. Please sign up again');
  res.json({ user });
}
