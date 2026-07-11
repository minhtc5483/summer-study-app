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
          {selectedStudent.subjects && selectedStudent.subjects.length > 0 ? (
            selectedStudent.subjects.map((subject) => (
              <Link key={subject.id} to={`/kids/subject/${subject.id}`}>
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="rounded-3xl p-8 text-white shadow-xl shadow-slate-200 cursor-pointer text-center relative overflow-hidden"
                  style={{ backgroundColor: subject.color || '#3B82F6' }}
                >
                  <div className="absolute -right-10 -top-10 text-8xl opacity-20">{subject.icon || '📚'}</div>
                  <h3 className="text-5xl font-extrabold mb-4 relative z-10 uppercase drop-shadow-md">{subject.name}</h3>
                  <p className="text-white/80 text-xl font-medium relative z-10">Bấm vào để bắt đầu!</p>
                </motion.div>
              </Link>
            ))
          ) : (
            <div className="col-span-1 md:col-span-2 text-center py-12 bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-slate-300">
              <p className="text-xl text-slate-500 font-medium">Ba mẹ chưa giao môn học nào cho con cả! 🚀</p>
            </div>
          )}
        </div>

        {/* Badges Link */}
        <Link to="/kids/rewards">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-sm mb-8 flex items-center justify-between cursor-pointer border-2 border-transparent hover:border-yellow-400 transition-colors"
          >
            <div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                <Trophy className="text-yellow-500 fill-yellow-500" size={28} /> Góc Phần Thưởng
              </h3>
              <p className="text-slate-500 font-medium">Bấm vào đây để xem các huy hiệu con đã đạt được nhé!</p>
            </div>
            <div className="flex gap-2">
              <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-2xl shadow-sm tooltip">🔥</div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl shadow-sm tooltip">🌟</div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-2xl shadow-sm tooltip">👑</div>
            </div>
          </motion.div>
        </Link>
      </div>
    </div>
  );
}
