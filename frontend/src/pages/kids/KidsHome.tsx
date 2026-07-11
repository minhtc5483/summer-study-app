import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Flame } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useStudentStore } from '../../store/useStudentStore';

export default function KidsHome() {
  const { selectedStudent } = useStudentStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedStudent) {
      navigate('/');
    }
  }, [selectedStudent, navigate]);

  if (!selectedStudent) return null;

  return (
    <div className="min-h-screen bg-blue-50 relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-yellow-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-0 right-[-50px] w-64 h-64 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-32 left-20 w-64 h-64 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>

      {/* Global Navigation */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <Link to="/" className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm text-slate-600 hover:text-primary transition-colors font-medium text-sm">
          <span className="text-lg">🏠</span> Đổi bé
        </Link>
        <Link to="/login" className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm text-slate-600 hover:text-primary transition-colors font-medium text-sm">
          <span className="text-lg">👨‍👩‍👧</span> Phụ huynh
        </Link>
      </div>

      <div className="relative z-10 max-w-4xl mx-auto p-6 pt-16">
        {/* Header */}
        <header className="flex justify-between items-center mb-12 bg-white/80 backdrop-blur-md p-4 rounded-3xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-tr from-blue-400 to-indigo-500 rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
              {selectedStudent.avatar ? (
                <img src={`http://localhost:3000${selectedStudent.avatar}`} alt={selectedStudent.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">👦</span>
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Xin chào, {selectedStudent.name}!</h1>
              <p className="text-slate-500 font-medium">Lớp {selectedStudent.grade}</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="flex items-center gap-2 bg-orange-100 px-4 py-2 rounded-2xl">
              <Flame className="text-orange-500" fill="currentColor" />
              <span className="font-bold text-orange-600 text-lg">{selectedStudent.currentStreak}</span>
            </div>
            <div className="flex items-center gap-2 bg-yellow-100 px-4 py-2 rounded-2xl">
              <Star className="text-yellow-500" fill="currentColor" />
              <span className="font-bold text-yellow-600 text-lg">{selectedStudent.totalScore}</span>
            </div>
          </div>
        </header>

        <h2 className="text-3xl font-extrabold text-center text-slate-800 mb-8 drop-shadow-sm">Hôm nay con muốn học gì?</h2>

        {/* Subjects */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <Link to="/kids/quiz/math">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-200 cursor-pointer text-center relative overflow-hidden"
            >
              <div className="absolute -right-10 -top-10 text-8xl opacity-20">🔢</div>
              <h3 className="text-5xl font-extrabold mb-4 relative z-10">TOÁN</h3>
              <p className="text-blue-100 text-xl font-medium relative z-10">Phép cộng, phép trừ...</p>
            </motion.div>
          </Link>
          
          <Link to="/kids/quiz/vietnamese">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-br from-emerald-400 to-green-500 rounded-3xl p-8 text-white shadow-xl shadow-green-200 cursor-pointer text-center relative overflow-hidden"
            >
              <div className="absolute -right-10 -top-10 text-8xl opacity-20">📖</div>
              <h3 className="text-5xl font-extrabold mb-4 relative z-10">TIẾNG VIỆT</h3>
              <p className="text-green-100 text-xl font-medium relative z-10">Chính tả, tập đọc...</p>
            </motion.div>
          </Link>
        </div>

        {/* Badges */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm mb-8">
          <h3 className="text-xl font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Trophy className="text-yellow-500" /> Huy hiệu của con
          </h3>
          <div className="flex gap-4">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-3xl shadow-sm tooltip" title="Chăm chỉ 3 ngày liên tiếp">🔥</div>
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-3xl shadow-sm tooltip" title="Làm đúng 10 câu Toán">🧮</div>
            <div className="w-16 h-16 border-2 border-dashed border-slate-300 rounded-full flex items-center justify-center text-slate-300 text-xl">?</div>
          </div>
        </div>
      </div>
    </div>
  );
}
