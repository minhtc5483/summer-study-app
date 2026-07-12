import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Flame, Lock, Play, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useStudentStore } from '../../store/useStudentStore';
import { api } from '../../lib/api';

interface Badge {
  id: string;
  name: string;
  description: string;
  type: string;
  requirement: number;
  icon: string;
  color: string;
  isEarned: boolean;
  progress: number;
}

interface Exam {
  id: string;
  name: string;
  topic: {
    name: string;
  };
  timeLimit: number | null;
  dueDate: string | null;
  _count: {
    questions: number;
  };
  examResults?: {
    score: number;
    createdAt: string;
  }[];
}

export default function KidsHome() {
  const { selectedStudent } = useStudentStore();
  const navigate = useNavigate();

  const [badges, setBadges] = useState<Badge[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);
  
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [loadingExams, setLoadingExams] = useState(false);

  useEffect(() => {
    if (!selectedStudent) {
      navigate('/');
      return;
    }

    // Default select first subject
    if (selectedStudent.subjects && selectedStudent.subjects.length > 0 && !selectedSubjectId) {
      setSelectedSubjectId(selectedStudent.subjects[0].id);
    }

    // Fetch Badges
    const fetchRewards = async () => {
      try {
        const response = await api.get(`/public/rewards/${selectedStudent.id}`);
        setBadges(response.data.badges);
      } catch (error) {
        console.error('Lỗi khi lấy phần thưởng', error);
      } finally {
        setLoadingBadges(false);
      }
    };

    fetchRewards();
  }, [selectedStudent, navigate]);

  // Fetch Exams when subject changes
  useEffect(() => {
    if (!selectedStudent || !selectedSubjectId) return;

    setLoadingExams(true);
    api.get(`/public/exams?subjectId=${selectedSubjectId}&studentId=${selectedStudent.id}`)
      .then(res => setExams(res.data))
      .catch(console.error)
      .finally(() => setLoadingExams(false));
  }, [selectedSubjectId, selectedStudent]);

  if (!selectedStudent) return null;

  return (
    <div className="min-h-screen bg-blue-50 relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-0 right-[-50px] w-64 h-64 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      
      {/* Global Navigation */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <Link to="/" className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm text-slate-600 hover:text-primary transition-colors font-medium text-sm">
          <span className="text-lg">🏠</span> Đổi bé
        </Link>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-4 md:p-6 pt-16 h-screen flex flex-col">
        {/* Header - Bảng Xin Chào */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-6 bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-sm shrink-0">
          <div className="flex items-center gap-4 mb-4 md:mb-0">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-400 to-indigo-500 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
              {selectedStudent.avatar ? (
                <img src={selectedStudent.avatar} alt={selectedStudent.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">👦</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Xin chào, {selectedStudent.name}!</h1>
              <p className="text-slate-500 font-medium">{selectedStudent.grade}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 bg-orange-100 px-4 py-2 rounded-2xl border border-orange-200">
              <Flame className="text-orange-500" fill="currentColor" />
              <span className="font-bold text-orange-600 text-lg">{selectedStudent.currentStreak} ngày</span>
            </div>
            <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-2xl border border-yellow-200">
              <Star className="text-yellow-500" fill="currentColor" />
              <span className="font-bold text-yellow-600 text-lg">{selectedStudent.totalScore}</span>
            </div>
            <Link to="/kids/rewards" className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white px-4 py-2 rounded-2xl shadow-md hover:scale-105 transition-transform font-bold">
              <ShoppingBag size={20} />
              Đổi Điểm Ngay
            </Link>
          </div>
        </header>

        {/* Góc Phần Thưởng */}
        <div className="bg-white/60 backdrop-blur-md rounded-3xl p-4 md:p-6 shadow-sm mb-6 shrink-0 border border-white">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="text-yellow-500 fill-yellow-500" size={24} />
            <h2 className="text-xl font-bold text-slate-800">Góc Phần Thưởng</h2>
          </div>
          
          {loadingBadges ? (
            <div className="flex justify-center p-4">
              <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x hide-scrollbar">
              {badges.map((badge) => (
                <div 
                  key={badge.id}
                  className={`flex flex-col items-center flex-shrink-0 w-28 snap-start p-3 rounded-2xl border-2 transition-all ${
                    badge.isEarned ? 'bg-gradient-to-b from-white to-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-100 grayscale-[0.8] opacity-70'
                  }`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-inner mb-2 relative ${badge.isEarned ? badge.color : 'bg-slate-200'}`}>
                    {badge.icon}
                    {!badge.isEarned && (
                      <div className="absolute -top-1 -right-1 bg-slate-400 text-white p-1 rounded-full">
                        <Lock size={10} />
                      </div>
                    )}
                  </div>
                  <h3 className={`text-xs font-bold text-center mb-1 ${badge.isEarned ? 'text-slate-800' : 'text-slate-500'}`}>{badge.name}</h3>
                  
                  {!badge.isEarned ? (
                    <div className="w-full mt-auto">
                      <div className="text-[9px] font-bold text-slate-400 text-center mb-1">
                        Cần {badge.requirement} {badge.type === 'score' ? 'điểm' : 'ngày'}
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-400 rounded-full" style={{ width: `${badge.progress}%` }}></div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-auto">
                      <span className="text-[10px] font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Đã đạt</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bố cục 2 cột: Môn học và Đề bài */}
        <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
          
          {/* Cột Trái: Danh sách Môn Học */}
          <div className="w-full md:w-1/4 flex flex-col gap-3 overflow-y-auto pr-2 pb-6">
            <h3 className="font-bold text-slate-700 ml-2 mb-1">Chọn Môn Học</h3>
            {selectedStudent.subjects && selectedStudent.subjects.length > 0 ? (
              selectedStudent.subjects.map(subject => (
                <button
                  key={subject.id}
                  onClick={() => setSelectedSubjectId(subject.id)}
                  className={`w-full text-left p-4 rounded-2xl flex items-center gap-3 transition-all ${
                    selectedSubjectId === subject.id
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105 ml-2'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border-2 border-transparent hover:border-blue-100'
                  }`}
                  style={selectedSubjectId === subject.id ? { backgroundColor: subject.color || '#2563EB' } : {}}
                >
                  <span className="text-2xl">{subject.icon || '📚'}</span>
                  <span className="font-bold">{subject.name}</span>
                  {selectedSubjectId === subject.id && (
                    <ArrowRight size={18} className="ml-auto" />
                  )}
                </button>
              ))
            ) : (
              <p className="text-sm text-slate-500 italic">Chưa có môn học nào.</p>
            )}
          </div>

          {/* Cột Phải: Danh sách Đề Bài */}
          <div className="w-full md:w-3/4 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-white p-4 md:p-6 overflow-y-auto">
            {loadingExams ? (
              <div className="flex justify-center items-center h-full">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : !selectedSubjectId ? (
              <div className="flex justify-center items-center h-full text-slate-500 font-medium">
                Vui lòng chọn một môn học ở bên trái
              </div>
            ) : exams.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-full text-slate-500">
                <div className="text-6xl mb-4">😅</div>
                <p className="text-xl font-bold text-slate-600">Chưa có đề bài nào!</p>
                <p className="mt-2 text-sm">Ba mẹ chưa tạo đề bài nào cho môn này cả.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-12">
                {(() => {
                  const pendingExams = exams.filter(e => !e.examResults || e.examResults.length === 0);
                  const completedExams = exams.filter(e => e.examResults && e.examResults.length > 0);
                  
                  pendingExams.sort((a, b) => {
                    if (a.dueDate && b.dueDate) {
                      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                    }
                    if (a.dueDate) return -1;
                    if (b.dueDate) return 1;
                    return 0;
                  });

                  const sortedExams = [...pendingExams, ...completedExams];
                  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];

                  return sortedExams.map((exam, index) => {
                    const isCompleted = exam.examResults && exam.examResults.length > 0;
                    const result = isCompleted ? exam.examResults![0] : null;
                    const bgColor = isCompleted ? '#94A3B8' : colors[index % colors.length];

                    return (
                      <Link key={exam.id} to={`/kids/quiz/${exam.id}${isCompleted ? '?mode=review' : ''}`}>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="p-5 rounded-3xl shadow-sm relative overflow-hidden text-white transition-colors"
                          style={{ backgroundColor: bgColor }}
                        >
                          <div className="relative z-10">
                            {/* Tags */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              <span className="inline-block px-2 py-1 bg-white/20 rounded-lg text-xs font-semibold backdrop-blur-sm">
                                {exam.topic.name}
                              </span>
                              {exam.timeLimit && (
                                <span className="inline-block px-2 py-1 bg-white/20 rounded-lg text-xs font-semibold backdrop-blur-sm">
                                  ⏱ {exam.timeLimit}p
                                </span>
                              )}
                              {exam.dueDate && !isCompleted && (
                                <span className="inline-block px-2 py-1 bg-red-500/80 rounded-lg text-xs font-semibold backdrop-blur-sm text-white">
                                  ⏰ {new Date(exam.dueDate).toLocaleDateString('vi-VN')}
                                </span>
                              )}
                            </div>
                            
                            <h3 className="text-xl font-bold mb-1 leading-tight">{exam.name}</h3>
                            
                            <div className="flex items-center justify-between mt-4">
                              <span className="text-sm font-medium bg-black/20 px-3 py-1.5 rounded-xl">
                                {exam._count.questions} câu hỏi
                              </span>
                              
                              <div className="flex items-center gap-2">
                                {isCompleted && (
                                  <div className="bg-white/20 backdrop-blur-sm px-3 py-1.5 rounded-xl text-white font-bold flex items-center gap-1 text-sm">
                                    <Star size={14} className="fill-yellow-300 text-yellow-300" /> {result?.score}
                                  </div>
                                )}
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-current shadow-md" style={{ color: bgColor }}>
                                  <Play size={20} className="ml-1" />
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    );
                  });
                })()}
              </div>
            )}
          </div>
          
        </div>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
