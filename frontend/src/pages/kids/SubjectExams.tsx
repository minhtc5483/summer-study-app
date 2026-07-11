import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useStudentStore } from '../../store/useStudentStore';
import { api } from '../../lib/api';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Play } from 'lucide-react';

interface Exam {
  id: string;
  name: string;
  topic: {
    name: string;
  };
  _count: {
    questions: number;
  };
}

export default function SubjectExams() {
  const { subjectId } = useParams();
  const navigate = useNavigate();
  const { selectedStudent } = useStudentStore();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedStudent) {
      navigate('/');
      return;
    }

    api.get(`/public/exams?subjectId=${subjectId}&studentId=${selectedStudent.id}`)
      .then(res => setExams(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [subjectId, selectedStudent, navigate]);

  return (
    <div className="min-h-screen p-6 md:p-12 relative overflow-hidden">
      {/* Mây bay nền */}
      <div className="absolute top-10 left-10 w-32 h-16 bg-white rounded-full opacity-60 blur-xl animate-pulse"></div>
      <div className="absolute top-40 right-20 w-48 h-24 bg-white rounded-full opacity-40 blur-xl animate-pulse delay-1000"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center mb-8">
          <button 
            onClick={() => navigate('/kids')}
            className="w-12 h-12 bg-white/50 backdrop-blur-md rounded-full flex items-center justify-center text-slate-700 hover:bg-white shadow-sm transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-4xl font-extrabold text-slate-800 ml-6 drop-shadow-sm">Chọn đề bài để làm nhé! 🚀</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-16 h-16 border-4 border-white border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        ) : exams.length === 0 ? (
          <div className="text-center py-20 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-300">
            <div className="text-6xl mb-4">😅</div>
            <p className="text-2xl font-bold text-slate-600">Chưa có đề bài nào!</p>
            <p className="text-slate-500 mt-2 text-lg">Ba mẹ chưa tạo đề bài nào cho môn này cả.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map((exam, index) => {
              const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
              const bgColor = colors[index % colors.length];

              return (
                <Link key={exam.id} to={`/kids/quiz/${exam.id}`}>
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className="p-6 rounded-3xl shadow-lg relative overflow-hidden text-white"
                    style={{ backgroundColor: bgColor }}
                  >
                    {/* Họa tiết */}
                    <div className="absolute -right-6 -bottom-6 opacity-20">
                      <Star size={120} />
                    </div>
                    
                    <div className="relative z-10">
                      <span className="inline-block px-3 py-1 bg-white/20 rounded-lg text-sm font-semibold mb-3 backdrop-blur-sm">
                        Chủ đề: {exam.topic.name}
                      </span>
                      <h3 className="text-2xl font-bold mb-2">{exam.name}</h3>
                      <div className="flex items-center justify-between mt-6">
                        <span className="text-lg font-medium bg-black/20 px-4 py-2 rounded-xl">
                          {exam._count.questions} câu hỏi
                        </span>
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-current shadow-lg" style={{ color: bgColor }}>
                          <Play size={24} className="ml-1" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
