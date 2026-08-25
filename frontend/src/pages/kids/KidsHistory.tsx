import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Trophy, Target, Clock, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { api } from '../../lib/api';
import { useStudentStore } from '../../store/useStudentStore';

export default function KidsHistory() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { selectedStudent } = useStudentStore();

  useEffect(() => {
    if (!selectedStudent) {
      navigate('/');
      return;
    }

    setLoading(true);
    api.get(`/public/students/${selectedStudent.id}/history`)
      .then(res => setHistory(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedStudent, navigate]);

  if (!selectedStudent) return null;

  return (
    <div className="min-h-screen bg-cream relative overflow-hidden font-sans">
      {/* Background decorations */}
      <div className="absolute top-[-50px] left-[-50px] w-64 h-64 bg-gold-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-0 right-[-50px] w-64 h-64 bg-terracotta-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

      <div className="relative z-10 max-w-4xl mx-auto p-4 md:p-6 pt-16 h-screen flex flex-col">
        {/* Header */}
        <header className="flex items-center gap-6 mb-8 bg-white/80 backdrop-blur-md p-6 rounded-3xl shadow-sm shrink-0">
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-ink-muted hover:bg-cream shadow-sm transition-all shrink-0"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-tr from-primary-light to-primary-dark rounded-2xl flex items-center justify-center shadow-lg text-white">
              <Trophy size={32} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-ink">Lịch Sử Điểm Của Bé</h2>
              <p className="text-ink-muted font-medium mt-1">Danh sách các bài đã thi và đổi thưởng</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-white/80 backdrop-blur-md rounded-3xl shadow-sm p-6 border-2 border-white">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="text-center text-ink-muted py-24 flex flex-col items-center">
              <div className="w-24 h-24 bg-cream-border rounded-full flex items-center justify-center mb-6">
                <Trophy size={48} className="text-ink-muted" />
              </div>
              <p className="text-2xl font-bold text-ink mb-2">Chưa có lịch sử điểm nào</p>
              <p className="text-lg text-ink-muted">Con hãy chăm chỉ làm bài để tích điểm nhé!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((item, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={item.id}
                  className="bg-white rounded-2xl p-6 shadow-sm border border-cream-border flex items-center gap-6 hover:shadow-md transition-shadow"
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                    item.type === 'EXAM' ? 'bg-sage-100 text-secondary-dark' : 'bg-gold-100 text-gold-600'
                  }`}>
                    {item.type === 'EXAM' ? <ArrowUpCircle size={32} /> : <ArrowDownCircle size={32} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-ink text-xl truncate">{item.title}</h4>
                    <div className="flex items-center gap-6 text-base text-ink-muted mt-2">
                      <span className="flex items-center gap-2">
                        <Clock size={16} />
                        {new Date(item.date).toLocaleString('vi-VN', { 
                          hour: '2-digit', minute: '2-digit', 
                          day: '2-digit', month: '2-digit', year: 'numeric' 
                        })}
                      </span>
                      {item.type === 'EXAM' && (
                        <>
                          <span className="flex items-center gap-2 text-primary-dark font-bold bg-terracotta-100 px-3 py-1 rounded-lg">
                            <Target size={16} />
                            {item.details}
                          </span>
                          {item.timeSpent !== null && item.timeSpent !== undefined && (
                            <span className="flex items-center gap-2 text-gold-600 font-bold bg-gold-100 px-3 py-1 rounded-lg">
                              <Clock size={16} />
                              {Math.floor(item.timeSpent / 60)} phút {item.timeSpent % 60} giây
                            </span>
                          )}
                        </>
                      )}
                      {item.type === 'EXCHANGE' && (
                        <span className="font-bold text-ink bg-cream-border px-3 py-1 rounded-lg">{item.details}</span>
                      )}
                    </div>
                  </div>

                  <div className={`text-4xl font-black shrink-0 ${
                    item.score > 0 ? 'text-secondary-dark' : 'text-gold-600'
                  }`}>
                    {item.score > 0 ? '+' : ''}{item.score.toLocaleString('vi-VN')}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
