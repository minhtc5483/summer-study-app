import { Router } from 'express';
import { register, login, getMe, refresh } from './controllers/authController';
import { getStudents, getPublicStudents, createStudent, updateStudent, deleteStudent } from './controllers/studentController';
import { authenticate } from './middlewares/auth';
import { upload } from './middlewares/upload';

const router = Router();

// Auth routes
router.post('/auth/register', register);
router.post('/login', login); // Alias for login as per api.md
router.post('/auth/login', login);
router.post('/auth/refresh', refresh);
router.get('/auth/me', authenticate, getMe);

// Public routes
router.get('/public/students', getPublicStudents);

// Student routes
router.get('/students', authenticate, getStudents);
router.post('/students', authenticate, upload.single('avatar'), createStudent);
router.put('/students/:id', authenticate, upload.single('avatar'), updateStudent);
router.delete('/students/:id', authenticate, deleteStudent);

import { getSubjects, createSubject } from './controllers/subjectController';
import { getTopics, createTopic } from './controllers/topicController';
import { getQuestions, createQuestion, importQuestions } from './controllers/questionController';
import { saveProgress } from './controllers/progressController';
import { getExam } from './controllers/examController';
import { getStatistics } from './controllers/statisticsController';
import { exportData } from './controllers/dataController';

// Subject & Topic routes
router.get('/subjects', authenticate, getSubjects);
router.post('/subjects', authenticate, createSubject);
router.get('/topics', authenticate, getTopics);
router.post('/topics', authenticate, createTopic);

// Exam & Question routes
router.get('/exam', authenticate, getExam);
router.get('/questions', authenticate, getQuestions);
router.post('/questions', authenticate, createQuestion);

// Import / Export
router.post('/import', authenticate, importQuestions);
router.post('/export', authenticate, exportData);

// Submit (formerly progress)
router.post('/submit', authenticate, saveProgress);
router.post('/progress', authenticate, saveProgress); // keep old for backward compatibility

// Statistics
router.get('/statistics', authenticate, getStatistics);

export default router;
