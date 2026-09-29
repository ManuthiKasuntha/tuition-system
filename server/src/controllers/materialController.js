import fs from 'node:fs/promises';
import path from 'node:path';
import { pool } from '../config/db.js';
import { resolveAccess } from '../middleware/classAccess.js';
import { UPLOADS_DIR } from '../middleware/upload.js';
import { ApiError } from '../utils/ApiError.js';

function formatMaterial(row) {
  return {
    id: row.id,
    classId: row.class_id,
    title: row.title,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    uploadedAt: row.uploaded_at,
  };
}

/** Loads a material with its class and checks the user may access it. */
async function loadMaterial(req, { ownerOnly }) {
  const [rows] = await pool.query(
    `SELECT m.*, c.teacher_id FROM materials m JOIN classes c ON c.id = m.class_id WHERE m.id = ?`,
    [Number(req.params.materialId)]
  );
  if (!rows.length) throw new ApiError(404, 'Material not found');
  const material = rows[0];
  const access = await resolveAccess(req.user, { id: material.class_id, teacher_id: material.teacher_id });
  if (ownerOnly && !access.isOwner) throw new ApiError(403, 'Only the teacher of this class can do this');
  if (!access.isMember) throw new ApiError(403, 'Enroll in this class to access its materials');
  return material;
}

export async function listMaterials(req, res) {
  const [rows] = await pool.query('SELECT * FROM materials WHERE class_id = ? ORDER BY uploaded_at DESC', [req.cls.id]);
  res.json({ materials: rows.map(formatMaterial) });
}

export async function createMaterial(req, res) {
  if (!req.file) throw new ApiError(400, 'Choose a file to upload', { file: 'Choose a file to upload' });
  const title = (typeof req.body?.title === 'string' ? req.body.title.trim() : '') || path.parse(req.file.originalname).name;
  if (title.length > 120) {
    await fs.rm(req.file.path, { force: true });
    throw new ApiError(400, 'Please fix the highlighted fields', { title: 'Title must be 120 characters or fewer' });
  }
  // Browsers send multipart filenames as latin1; convert so Sinhala/Tamil names survive
  const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  const [result] = await pool.query(
    'INSERT INTO materials (class_id, title, file_name, stored_name, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?, ?)',
    [req.cls.id, title, originalName, req.file.filename, req.file.mimetype, req.file.size]
  );
  const [rows] = await pool.query('SELECT * FROM materials WHERE id = ?', [result.insertId]);
  res.status(201).json({ material: formatMaterial(rows[0]) });
}

export async function downloadMaterial(req, res) {
  const material = await loadMaterial(req, { ownerOnly: false });
  res.download(path.join(UPLOADS_DIR, material.stored_name), material.file_name, (err) => {
    if (err && !res.headersSent) res.status(404).json({ message: 'File is missing on the server' });
  });
}

export async function deleteMaterial(req, res) {
  const material = await loadMaterial(req, { ownerOnly: true });
  await pool.query('DELETE FROM materials WHERE id = ?', [material.id]);
  await fs.rm(path.join(UPLOADS_DIR, material.stored_name), { force: true });
  res.status(204).end();
}
