import { Router } from 'express';
import { register, login, getMe, refresh, getManagePinStatus, setManagePin, verifyManagePin } from './controllers/authController';
import { verifyFamilyPin, verifyStudentPin } from './controllers/kidsAccessController';
import { getStudents, getPublicStudents, getStudentHistory, createStudent, updateStudent, deleteStudent, setStudentPin } from './controllers/studentController';
import { authenticate } from './middlewares/auth';
import { requireManage } from './middlewares/manageAccess';
import { requireKidsAccess } from './middlewares/kidsAccess';
import { upload } from './middlewares/upload';
import { authRateLimit } from './middlewares/rateLimit';

const router = Router();

// Auth routes
router.post('/auth/register', authRateLimit, register);
router.post('/login', authRateLimit, login); // Alias for login as per api.md
router.post('/auth/login', authRateLimit, login);
router.post('/auth/refresh', refresh);
router.get('/auth/me', authenticate, getMe);

// Second factor for the management area. The login session never really expires (tokens sit
// in localStorage and the refresh token is rotated on every use), so on a tablet the kids
// also use, "logged in" was no longer a meaningful gate — every /parent route below now also
// needs a short-lived manage token, obtained by re-entering this PIN.
router.get('/auth/manage-pin', authenticate, getManagePinStatus);
router.put('/auth/manage-pin', authenticate, setManagePin);
router.post('/auth/manage-pin/verify', authRateLimit, authenticate, verifyManagePin);

// Legacy family-wide PIN gate — kept for backward compatibility, no longer used by the
// "who's studying" screen (see /public/students/:studentId/verify-pin below).
router.post('/public/verify-pin', authRateLimit, verifyFamilyPin);
// Per-student PIN, set by the parent in Settings. Rate-limited: it's only a 4-digit code.
router.post('/public/students/:studentId/verify-pin', authRateLimit, verifyStudentPin);

// Student routes
router.get('/students', authenticate, requireManage, getStudents);
router.post('/students', authenticate, requireManage, upload.single('avatar'), createStudent);
router.put('/students/:id', authenticate, requireManage, upload.single('avatar'), updateStudent);
router.put('/students/:id/pin', authenticate, requireManage, setStudentPin);
router.delete('/students/:id', authenticate, requireManage, deleteStudent);

import { getSubjects, createSubject, updateSubject, deleteSubject } from './controllers/subjectController';
import { getTopics, createTopic } from './controllers/topicController';
import { getGrades, createGrade, deleteGrade } from './controllers/gradeController';
import { getQuestions, createQuestion, importQuestions, importPDF } from './controllers/questionController';
import { saveProgress, savePublicProgress } from './controllers/progressController';
import { getStatistics, getStudentDetailedStats, getActivityLog } from './controllers/statisticsController';
import { exportData } from './controllers/dataController';
import { getRewards, exchangePoints } from './controllers/rewardController';
import { getNotifications, markAsRead } from './controllers/notificationController';

// Notifications
router.get('/notifications', authenticate, requireManage, getNotifications);
router.put('/notifications/:id/read', authenticate, requireManage, markAsRead);

// Grade routes
router.get('/grades', authenticate, requireManage, getGrades);
router.post('/grades', authenticate, requireManage, createGrade);
router.delete('/grades/:id', authenticate, requireManage, deleteGrade);

// Subject & Topic routes
router.get('/subjects', authenticate, requireManage, getSubjects);
router.post('/subjects', authenticate, requireManage, createSubject);
router.put('/subjects/:id', authenticate, requireManage, updateSubject);
router.delete('/subjects/:id', authenticate, requireManage, deleteSubject);
router.get('/topics', authenticate, requireManage, getTopics);
router.post('/topics', authenticate, requireManage, createTopic);

import { getExams, getExamById, createExam, updateExam, deleteExam } from './controllers/examController';
import { enqueueQuickCreateExam, getAiExamJob } from './controllers/aiExamJobController';
import { createAiSchedule, getAiSchedules, deleteAiSchedule } from './controllers/aiScheduleController';

// Exam & Question routes
// NOTE: literal paths like /exams/ai-schedules and /exams/quick-create MUST be registered
// before the generic /exams/:id routes below — Express matches routes in registration
// order, and /exams/:id would otherwise swallow them first (treating "ai-schedules" or
// "quick-create" as the :id) and 404. This previously broke GET /exams/ai-schedules
// specifically, which silently zeroed out the whole parent Overview page since it's
// fetched in the same Promise.all as the stats that page actually needs.
router.get('/exams', authenticate, requireManage, getExams);
router.post('/exams', authenticate, requireManage, createExam);
router.post('/exams/quick-create', authenticate, requireManage, enqueueQuickCreateExam);
router.get('/exams/jobs/:id', authenticate, requireManage, getAiExamJob);

// AI Schedules
router.post('/exams/ai-schedules', authenticate, requireManage, createAiSchedule);
router.get('/exams/ai-schedules', authenticate, requireManage, getAiSchedules);
router.delete('/exams/ai-schedules/:id', authenticate, requireManage, deleteAiSchedule);

router.get('/exams/:id', authenticate, requireManage, getExamById);
router.put('/exams/:id', authenticate, requireManage, updateExam);
router.delete('/exams/:id', authenticate, requireManage, deleteExam);

router.get('/questions', authenticate, requireManage, getQuestions);
router.post('/questions', authenticate, requireManage, createQuestion);

// Import / Export
router.post('/import', authenticate, requireManage, importQuestions);
router.post('/import-pdf', authenticate, requireManage, upload.single('file'), importPDF);
router.post('/export', authenticate, requireManage, exportData);

// Submit (formerly progress)
router.post('/submit', authenticate, requireManage, saveProgress);
router.post('/progress', authenticate, requireManage, saveProgress); // keep old for backward compatibility

// Statistics
router.get('/statistics', authenticate, requireManage, getStatistics);
router.get('/statistics/activity-log', authenticate, requireManage, getActivityLog);
router.get('/statistics/students/:studentId/details', authenticate, requireManage, getStudentDetailedStats);

// Rewards & Point Exchange
router.get('/rewards/:studentId', authenticate, requireManage, getRewards);

import { getExchanges, fulfillExchange } from './controllers/pointExchangeController';
router.get('/point-exchanges', authenticate, requireManage, getExchanges);
router.put('/point-exchanges/:id/fulfill', authenticate, requireManage, fulfillExchange);

// Public routes (Kids App) — protected by a kids-access token (see requireKidsAccess),
// obtained either via the legacy family PIN or a per-student PIN (see above).
// The student list itself is intentionally open (no token needed): the "who's studying"
// screen must show names/avatars *before* any PIN is entered so a kid can pick their own
// profile and be prompted for their own PIN, not the whole family's.
router.get('/public/students', getPublicStudents);
router.get('/public/students/:studentId/history', requireKidsAccess, getStudentHistory);
router.get('/public/exams', requireKidsAccess, getExams);
router.get('/public/exams/:id', requireKidsAccess, getExamById);
router.post('/public/submit', requireKidsAccess, savePublicProgress);
router.get('/public/rewards/:studentId', requireKidsAccess, getRewards);
router.post('/public/exchange-points', requireKidsAccess, exchangePoints);

export default router;
