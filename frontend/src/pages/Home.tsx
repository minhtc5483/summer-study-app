import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useStudentStore } from '../store/useStudentStore';
import type { StudentProfile } from '../store/useStudentStore';
import { useKidsAccessStore } from '../store/useKidsAccessStore';
import { api } from '../lib/api';
import { Settings, Flame, Users, Lock, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const { token } = useAuthStore();
  const { setSelectedStudent } = useStudentStore();
  const { setPinToken } = useKidsAccessStore();
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Per-student PIN prompt — only shown when the clicked student has one configured.
  const [pinStudent, setPinStudent] = useState<StudentProfile | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [submittingPin, setSubmittingPin] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchStudents = () => {
      api.get(`/public/students?_t=${Date.now()}`)
        .then(res => {
          if (isMounted) {
            setStudents(res.data);
            if (loading) setLoading(false);
          }
        })
        .catch((err) => {
          console.error('Failed to fetch public students', err);
          if (isMounted && loading) setLoading(false);
        });
    };

    fetchStudents();
    const interval = setInterval(fetchStudents, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loading]);

  const enterAsStudent = (student: StudentProfile) => {
    setSelectedStudent(student);
    navigate('/kids');
  };

  const handleSelectStudent = async (student: StudentProfile) => {
    if (student.hasPin) {
      setPinStudent(student);
      setPin('');
      setPinError('');
      return;
    }
    // No PIN configured — still need a kids-access token for every /public/* route past
    // this screen (rewards, exam list, submit, ...), just without prompting for anything.
    try {
      const res = await api.post(`/public/students/${student.id}/verify-pin`, {});
      setPinToken(res.data.accessToken);
    } catch (err) {
      console.error('Failed to obtain kids access token', err);
    }
    enterAsStudent(student);
  };

  const handleSubmitPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinStudent) return;
    setPinError('');
    setSubmittingPin(true);
    try {
      const res = await api.post(`/public/students/${pinStudent.id}/verify-pin`, { pin });
      setPinToken(res.data.accessToken);
      enterAsStudent(pinStudent);
    } catch (err) {
      setPinError('Sai mã PIN, thử lại nhé.');
    } finally {
      setSubmittingPin(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-cream to-terracotta-100 flex flex-col items-center justify-center p-6 relative font-sans overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-terracotta-100 rounded-full blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute bottom-[-50px] right-[-50px] w-64 h-64 bg-sage-100 rounded-full blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

      <div className="absolute top-6 right-6 z-20">
        {token ? (
          <Link to="/parent" className="flex items-center gap-2 px-4 py-2 bg-white text-ink-muted rounded-xl hover:text-ink hover:bg-cream-light transition-colors font-medium shadow-lg border border-cream-border">
            <Settings size={18} />
            Quản lý Phụ huynh
          </Link>
        ) : (
          <Link to="/login" className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-bold shadow-lg">
            <Users size={18} />
            Phụ Huynh
          </Link>
        )}
      </div>

      <div className="text-center mb-12 z-10">
        <h1 className="text-4xl md:text-5xl font-extrabold text-ink mb-4">Ai đang học vậy nhỉ?</h1>
        <p className="text-ink-muted text-lg">Chạm vào tên của con để bắt đầu</p>
      </div>

      {loading ? (
        <div className="text-ink text-xl">Đang tải...</div>
      ) : (
        <div className="flex flex-wrap justify-center gap-8 z-10 max-w-4xl">
          {students.length === 0 ? (
            <div className="text-center">
              <p className="text-ink-muted mb-6">Chưa có bé nào được thêm.</p>
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
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl overflow-hidden border-4 border-transparent group-hover:border-primary transition-all bg-white flex items-center justify-center shadow-xl relative">
                  {student.avatar ? (
                    <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl group-hover:scale-110 transition-transform">👦</span>
                  )}
                  {student.hasPin && (
                    <div className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-ink/80 border border-ink-muted flex items-center justify-center text-cream">
                      <Lock size={14} />
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-ink-muted group-hover:text-ink mt-4 transition-colors">
                  {student.name}
                </h3>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1 text-ink-muted">
                    <span className="text-gold-600 text-sm">🌟</span>
                    <span className="font-bold">{student.totalScore.toLocaleString('vi-VN')}</span>
                  </div>
                  <div className="flex items-center gap-1 text-ink-muted">
                    <Flame className="text-primary" size={14} fill="currentColor" />
                    <span className="font-bold">{student.currentStreak}</span>
                  </div>
                </div>

                {/* Badges Section */}
                {student.earnedBadges && student.earnedBadges.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-2 mt-3 w-full">
                    {student.earnedBadges.slice(0, 3).map((badge) => (
                      <div
                        key={badge.id}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-sm border border-cream-border ${badge.color}`}
                        title={badge.name}
                      >
                        {badge.icon}
                      </div>
                    ))}
                    {student.earnedBadges.length > 3 && (
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-cream-border text-ink-muted shadow-sm border border-cream-border">
                        +{student.earnedBadges.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      )}

      {/* Per-student PIN prompt */}
      <AnimatePresence>
        {pinStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-30 flex items-center justify-center p-6"
          >
            <motion.form
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onSubmit={handleSubmitPin}
              className="flex flex-col items-center gap-4 bg-white border border-cream-border rounded-3xl p-8 shadow-xl w-full max-w-xs relative"
            >
              <button
                type="button"
                onClick={() => setPinStudent(null)}
                className="absolute top-4 left-4 p-2 text-ink-muted hover:text-ink rounded-xl hover:bg-cream transition-colors"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-cream flex items-center justify-center mt-2">
                {pinStudent.avatar ? (
                  <img src={pinStudent.avatar} alt={pinStudent.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">👦</span>
                )}
              </div>
              <h1 className="text-xl font-bold text-ink text-center">Mã PIN của {pinStudent.name}</h1>
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full text-center text-2xl tracking-widest bg-cream text-ink border border-cream-border rounded-xl py-3 focus:outline-none focus:border-primary"
              />
              {pinError && <p className="text-danger text-sm">{pinError}</p>}
              <button
                type="submit"
                disabled={submittingPin || pin.length !== 4}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark disabled:opacity-50 shadow-lg"
              >
                {submittingPin ? 'Đang kiểm tra...' : 'Vào học'}
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
