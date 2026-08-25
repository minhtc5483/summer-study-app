import { Router } from 'express';
import { register, login, getMe, refresh } from './controllers/authController';
import { verifyFamilyPin, verifyStudentPin } from './controllers/kidsAccessController';
import { getStudents, getPublicStudents, getStudentHistory, createStudent, updateStudent, deleteStudent, setStudentPin } from './controllers/studentController';
import { authenticate } from './middlewares/auth';
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

// Legacy family-wide PIN gate — kept for backward compatibility, no longer used by the
// "who's studying" screen (see /public/students/:studentId/verify-pin below).
router.post('/public/verify-pin', authRateLimit, verifyFamilyPin);
// Per-student PIN, set by the parent in Settings. Rate-limited: it's only a 4-digit code.
router.post('/public/students/:studentId/verify-pin', authRateLimit, verifyStudentPin);

// Student routes
router.get('/students', authenticate, getStudents);
router.post('/students', authenticate, upload.single('avatar'), createStudent);
router.put('/students/:id', authenticate, upload.single('avatar'), updateStudent);
router.put('/students/:id/pin', authenticate, setStudentPin);
router.delete('/students/:id', authenticate, deleteStudent);

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
router.get('/notifications', authenticate, getNotifications);
router.put('/notifications/:id/read', authenticate, markAsRead);

// Grade routes
router.get('/grades', authenticate, getGrades);
router.post('/grades', authenticate, createGrade);
router.delete('/grades/:id', authenticate, deleteGrade);

// Subject & Topic routes
router.get('/subjects', authenticate, getSubjects);
router.post('/subjects', authenticate, createSubject);
router.put('/subjects/:id', authenticate, updateSubject);
router.delete('/subjects/:id', authenticate, deleteSubject);
router.get('/topics', authenticate, getTopics);
router.post('/topics', authenticate, createTopic);

import { getExams, getExamById, createExam, updateExam, deleteExam, quickCreateExam } from './controllers/examController';
import { createAiSchedule, getAiSchedules, deleteAiSchedule } from './controllers/aiScheduleController';

// Exam & Question routes
// NOTE: literal paths like /exams/ai-schedules and /exams/quick-create MUST be registered
// before the generic /exams/:id routes below — Express matches routes in registration
// order, and /exams/:id would otherwise swallow them first (treating "ai-schedules" or
// "quick-create" as the :id) and 404. This previously broke GET /exams/ai-schedules
// specifically, which silently zeroed out the whole parent Overview page since it's
// fetched in the same Promise.all as the stats that page actually needs.
router.get('/exams', authenticate, getExams);
router.post('/exams', authenticate, createExam);
router.post('/exams/quick-create', authenticate, quickCreateExam);

// AI Schedules
router.post('/exams/ai-schedules', authenticate, createAiSchedule);
router.get('/exams/ai-schedules', authenticate, getAiSchedules);
router.delete('/exams/ai-schedules/:id', authenticate, deleteAiSchedule);

router.get('/exams/:id', authenticate, getExamById);
router.put('/exams/:id', authenticate, updateExam);
router.delete('/exams/:id', authenticate, deleteExam);

router.get('/questions', authenticate, getQuestions);
router.post('/questions', authenticate, createQuestion);

// Import / Export
router.post('/import', authenticate, importQuestions);
router.post('/import-pdf', authenticate, upload.single('file'), importPDF);
router.post('/export', authenticate, exportData);

// Submit (formerly progress)
router.post('/submit', authenticate, saveProgress);
router.post('/progress', authenticate, saveProgress); // keep old for backward compatibility

// Statistics
router.get('/statistics', authenticate, getStatistics);
router.get('/statistics/activity-log', authenticate, getActivityLog);
router.get('/statistics/students/:studentId/details', authenticate, getStudentDetailedStats);

// Rewards & Point Exchange
router.get('/rewards/:studentId', authenticate, getRewards);

import { getExchanges, fulfillExchange } from './controllers/pointExchangeController';
router.get('/point-exchanges', authenticate, getExchanges);
router.put('/point-exchanges/:id/fulfill', authenticate, fulfillExchange);

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

import { getQuestionSpeech, prefetchQuestionSpeech } from './controllers/ttsController';
router.get('/public/tts/questions/:questionId', requireKidsAccess, getQuestionSpeech);
// Called as soon as a question is shown, to hide Gemini's ~5-6s generation time behind
// however long the kid spends reading/answering, instead of behind a tap on the speaker.
router.post('/public/tts/questions/:questionId/prefetch', requireKidsAccess, prefetchQuestionSpeech);

export default router;
