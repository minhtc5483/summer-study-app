import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useStudentStore } from '../store/useStudentStore';
import type { StudentProfile } from '../store/useStudentStore';
import { api } from '../lib/api';
import { Settings, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const { token } = useAuthStore();
  const { setSelectedStudent } = useStudentStore();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api.get('/students')
        .then(res => {
          setStudents(res.data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const handleSelectStudent = (student: StudentProfile) => {
    setSelectedStudent(student);
    navigate('/kids');
  };

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-blue-50 p-8 text-center relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-0 right-[-50px] w-64 h-64 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

        <div className="relative z-10">
          <h1 className="text-5xl font-extrabold text-primary mb-12">Ôn Luyện Hè</h1>
          <div className="bg-white p-10 rounded-3xl shadow-xl max-w-md w-full">
            <h2 className="text-2xl font-bold text-slate-700 mb-6">Xin chào Phụ huynh!</h2>
            <p className="text-slate-500 mb-8">Hãy đăng nhập để thiết lập bài tập và theo dõi tiến độ của bé.</p>
            <Link to="/login" className="block w-full py-4 bg-primary text-white text-xl font-bold rounded-2xl shadow-lg hover:bg-primary-dark transition-transform hover:scale-105">
              Đăng Nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative font-sans">
      <div className="absolute top-6 right-6">
        <Link to="/parent" className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:text-white hover:bg-slate-700 transition-colors font-medium">
          <Settings size={18} />
          Cài đặt Phụ huynh
        </Link>
      </div>

      <div className="text-center mb-12 z-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4">Ai đang học vậy nhỉ?</h1>
        <p className="text-slate-400 text-lg">Chạm vào tên của con để bắt đầu</p>
      </div>

      {loading ? (
        <div className="text-white text-xl">Đang tải...</div>
      ) : (
        <div className="flex flex-wrap justify-center gap-8 z-10 max-w-4xl">
          {students.length === 0 ? (
            <div className="text-center">
              <p className="text-slate-400 mb-6">Chưa có bé nào được thêm.</p>
              <Link to="/parent/students" className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark">
                Thêm Bé Ngay
              </Link>
            </div>
          ) : (
            students.map((student) => (
              <motion.div
                key={student.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSelectStudent(student)}
                className="flex flex-col items-center cursor-pointer group w-40 md:w-48"
              >
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl overflow-hidden border-4 border-transparent group-hover:border-white transition-all bg-slate-800 flex items-center justify-center shadow-lg relative">
                  {student.avatar ? (
                    <img src={`http://localhost:3000${student.avatar}`} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">👦</span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-slate-300 group-hover:text-white mt-4 transition-colors">
                  {student.name}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-slate-400">
                    <span className="text-yellow-500 text-sm">🌟</span>
                    <span className="font-bold">{student.totalScore}</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Flame className="text-orange-500" size={14} fill="currentColor" />
                    <span className="font-bold">{student.currentStreak}</span>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
