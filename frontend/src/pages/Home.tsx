import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useStudentStore } from '../store/useStudentStore';
import type { StudentProfile } from '../store/useStudentStore';
import { api } from '../lib/api';
import { Settings, Flame, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  const { token } = useAuthStore();
  const { setSelectedStudent } = useStudentStore();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch all students unconditionally
    api.get('/public/students')
      .then(res => {
        setStudents(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch public students', err);
        setLoading(false);
      });
  }, []);

  const handleSelectStudent = (student: StudentProfile) => {
    setSelectedStudent(student);
    navigate('/kids');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 relative font-sans overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-indigo-900 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-[-50px] right-[-50px] w-64 h-64 bg-purple-900 rounded-full mix-blend-screen filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="absolute top-6 right-6 z-20">
        {token ? (
          <Link to="/parent" className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:text-white hover:bg-slate-700 transition-colors font-medium shadow-lg border border-slate-700">
            <Settings size={18} />
            Quản lý Phụ huynh
          </Link>
        ) : (
          <Link to="/login" className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-bold shadow-lg border border-blue-600">
            <Users size={18} />
            Phụ Huynh
          </Link>
        )}
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
              {token ? (
                <Link to="/parent/students" className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark shadow-lg">
                  Thêm Bé Ngay
                </Link>
              ) : (
                <Link to="/login" className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark shadow-lg">
                  Đăng nhập để Thêm Bé
                </Link>
              )}
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
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl overflow-hidden border-4 border-transparent group-hover:border-primary transition-all bg-slate-800 flex items-center justify-center shadow-xl relative">
                  {student.avatar ? (
                    <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl group-hover:scale-110 transition-transform">👦</span>
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
