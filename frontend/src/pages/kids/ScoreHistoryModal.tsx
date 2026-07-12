import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trophy, Target, Clock, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { api } from '../../lib/api';

interface ScoreHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
}

export default function ScoreHistoryModal({ isOpen, onClose, studentId }: ScoreHistoryModalProps) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api.get(`/public/students/${studentId}/history`)
        .then(res => setHistory(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          <div className="p-6 bg-gradient-to-br from-yellow-400 to-orange-400 text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Trophy size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-black">Lịch Sử Điểm Của Bé</h2>
                <p className="text-yellow-100 font-medium text-sm mt-0.5">Danh sách các bài đã thi và đổi thưởng</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center text-slate-500 py-12">
                <Trophy size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="font-medium">Chưa có lịch sử điểm nào.</p>
                <p className="text-sm mt-1">Con hãy chăm chỉ làm bài để tích điểm nhé!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {history.map((item, index) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    key={item.id}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow"
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      item.type === 'EXAM' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-600'
                    }`}>
                      {item.type === 'EXAM' ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-800 text-lg truncate">{item.title}</h4>
                      <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock size={14} />
                          {new Date(item.date).toLocaleString('vi-VN', { 
                            hour: '2-digit', minute: '2-digit', 
                            day: '2-digit', month: '2-digit', year: 'numeric' 
                          })}
                        </span>
                        {item.type === 'EXAM' && (
                          <span className="flex items-center gap-1 text-blue-600 font-medium">
                            <Target size={14} />
                            {item.details}
                          </span>
                        )}
                        {item.type === 'EXCHANGE' && (
                          <span className="font-medium text-slate-600">{item.details}</span>
                        )}
                      </div>
                    </div>

                    <div className={`text-xl font-black shrink-0 ${
                      item.score > 0 ? 'text-green-500' : 'text-orange-500'
                    }`}>
                      {item.score > 0 ? '+' : ''}{item.score}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
