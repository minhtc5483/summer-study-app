import { Router } from 'express';
import { register, login, getMe, refresh } from './controllers/authController';
import { verifyFamilyPin } from './controllers/kidsAccessController';
import { getStudents, getPublicStudents, getStudentHistory, createStudent, updateStudent, deleteStudent } from './controllers/studentController';
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

// Kids family-PIN gate: no auth needed to submit the PIN, but rate-limited against brute force
router.post('/public/verify-pin', authRateLimit, verifyFamilyPin);

// Student routes
router.get('/students', authenticate, getStudents);
router.post('/students', authenticate, upload.single('avatar'), createStudent);
router.put('/students/:id', authenticate, upload.single('avatar'), updateStudent);
router.delete('/students/:id', authenticate, deleteStudent);

import { getSubjects, createSubject, updateSubject, deleteSubject } from './controllers/subjectController';
import { getTopics, createTopic } from './controllers/topicController';
import { getGrades, createGrade, deleteGrade } from './controllers/gradeController';
import { getQuestions, createQuestion, importQuestions, importPDF } from './controllers/questionController';
import { saveProgress, savePublicProgress } from './controllers/progressController';
import { getStatistics, getStudentDetailedStats } from './controllers/statisticsController';
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
router.get('/exams', authenticate, getExams);
router.get('/exams/:id', authenticate, getExamById);
router.post('/exams', authenticate, createExam);
router.post('/exams/quick-create', authenticate, quickCreateExam);
router.put('/exams/:id', authenticate, updateExam);
router.delete('/exams/:id', authenticate, deleteExam);

// AI Schedules
router.post('/exams/ai-schedules', authenticate, createAiSchedule);
router.get('/exams/ai-schedules', authenticate, getAiSchedules);
router.delete('/exams/ai-schedules/:id', authenticate, deleteAiSchedule);
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
router.get('/statistics/students/:studentId/details', authenticate, getStudentDetailedStats);

// Rewards & Point Exchange
router.get('/rewards/:studentId', authenticate, getRewards);

import { getExchanges, fulfillExchange } from './controllers/pointExchangeController';
router.get('/point-exchanges', authenticate, getExchanges);
router.put('/point-exchanges/:id/fulfill', authenticate, fulfillExchange);

// Public routes (Kids App) — protected by the family PIN (see requireKidsAccess), not by parent login
router.get('/public/students', requireKidsAccess, getPublicStudents);
router.get('/public/students/:studentId/history', requireKidsAccess, getStudentHistory);
router.get('/public/exams', requireKidsAccess, getExams);
router.get('/public/exams/:id', requireKidsAccess, getExamById);
router.post('/public/submit', requireKidsAccess, savePublicProgress);
router.get('/public/rewards/:studentId', requireKidsAccess, getRewards);
router.post('/public/exchange-points', requireKidsAccess, exchangePoints);

export default router;
