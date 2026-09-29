import { Router } from 'express';
import * as auth from '../controllers/authController.js';
import * as classes from '../controllers/classController.js';
import * as materials from '../controllers/materialController.js';
import * as sessions from '../controllers/sessionController.js';
import { DISTRICTS, GRADES, MEDIUMS, SUBJECTS } from '../constants.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { loadClass, requireMember, requireOwner } from '../middleware/classAccess.js';
import { upload } from '../middleware/upload.js';

const router = Router();
const teacher = requireRole('teacher');
const student = requireRole('student');

// Public
router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.get('/meta', (req, res) => res.json({ subjects: SUBJECTS, grades: GRADES, districts: DISTRICTS, mediums: MEDIUMS }));
router.post('/auth/register', auth.register);
router.post('/auth/login', auth.login);

// Everything below needs a logged-in user
router.use(requireAuth);
router.get('/auth/me', auth.me);

router.get('/classes', classes.listClasses);
router.get('/classes/mine', classes.myClasses);
router.get('/classes/recommended', student, classes.recommendedClasses);
router.post('/classes', teacher, classes.createClass);
router.get('/classes/:id', loadClass, classes.getClass);
router.put('/classes/:id', teacher, loadClass, requireOwner, classes.updateClass);
router.delete('/classes/:id', teacher, loadClass, requireOwner, classes.deleteClass);

router.post('/classes/:id/enroll', student, loadClass, classes.enroll);
router.delete('/classes/:id/enroll', student, loadClass, classes.unenroll);
router.get('/classes/:id/students', teacher, loadClass, requireOwner, classes.listStudents);

router.get('/classes/:id/sessions', loadClass, sessions.listClassSessions);
router.post('/classes/:id/sessions', teacher, loadClass, requireOwner, sessions.createSession);
router.get('/sessions/upcoming', sessions.upcomingSessions);
router.delete('/sessions/:sessionId', teacher, sessions.deleteSession);

router.get('/classes/:id/materials', loadClass, requireMember, materials.listMaterials);
// Ownership is checked before multer so non-owners never write files to disk
router.post('/classes/:id/materials', teacher, loadClass, requireOwner, upload.single('file'), materials.createMaterial);
router.get('/materials/:materialId/download', materials.downloadMaterial);
router.delete('/materials/:materialId', teacher, materials.deleteMaterial);

export default router;
