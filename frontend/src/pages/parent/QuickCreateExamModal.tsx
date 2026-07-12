import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Bot, Users, Brain, Loader2 } from 'lucide-react';

interface QuickCreateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectId: string;
  subjectName: string;
  onSuccess: () => void;
}

export default function QuickCreateExamModal({ isOpen, onClose, subjectId, subjectName, onSuccess }: QuickCreateExamModalProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [numberOfQuestions, setNumberOfQuestions] = useState(10);
  const [timeLimit, setTimeLimit] = useState(15);
  const [dueDate, setDueDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      api.get('/students').then(res => setStudents(res.data)).catch(console.error);
      setSelectedStudents([]);
      setNumberOfQuestions(10);
      setTimeLimit(15);
      setDueDate('');
      setError('');
    }
  }, [isOpen]);

  const toggleStudent = (id: string) => {
    setSelectedStudents(prev => 
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedStudents.length === 0) {
      setError('Vui lòng chọn ít nhất một học sinh');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      await api.post('/exams/quick-create', {
        subjectId,
        studentIds: selectedStudents,
        numberOfQuestions,
        timeLimit,
        dueDate: dueDate || null
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Có lỗi xảy ra khi tạo đề bằng AI');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center gap-3 shrink-0">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
            <Bot size={28} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Tạo Đề Nhanh AI</h2>
            <p className="text-blue-100 text-sm font-medium">Môn: {subjectName}</p>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-sm font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
              <Brain size={18} className="text-primary" /> Thiết lập Đề Bài
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Số lượng câu hỏi</label>
                <input 
                  type="number" 
                  min={1} 
                  max={50}
                  value={numberOfQuestions}
                  onChange={e => setNumberOfQuestions(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary font-bold text-slate-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Thời gian làm bài (Phút)</label>
                <input 
                  type="number" 
                  min={1} 
                  value={timeLimit}
                  onChange={e => setTimeLimit(Number(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary font-bold text-slate-700"
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">Hạn chót (Tùy chọn)</label>
              <input 
                type="date" 
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary font-bold text-slate-700 bg-white"
              />
            </div>

            <p className="text-xs text-slate-400 mt-2 italic">
              AI sẽ tự động chọn lọc các câu hỏi phù hợp và cân bằng nhất từ các chủ đề.
            </p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-3">
              <Users size={18} className="text-primary" /> Giao cho Học sinh
            </label>
            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
              {students.map(student => (
                <button
                  key={student.id}
                  onClick={() => toggleStudent(student.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    selectedStudents.includes(student.id)
                      ? 'border-primary bg-blue-50/50'
                      : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <img 
                    src={student.avatar ? `http://localhost:3000${student.avatar}` : 'https://ui-avatars.com/api/?name=' + student.name}
                    alt={student.name}
                    className="w-10 h-10 rounded-full object-cover bg-slate-200"
                  />
                  <div>
                    <h4 className="font-bold text-sm text-slate-700">{student.name}</h4>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                      selectedStudents.includes(student.id) ? 'bg-primary text-white' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {selectedStudents.includes(student.id) ? 'Đã chọn' : 'Bỏ qua'}
                    </span>
                  </div>
                </button>
              ))}
              {students.length === 0 && (
                <p className="text-sm text-slate-500 italic col-span-2">Chưa có học sinh nào được thêm.</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            disabled={loading}
            className="px-6 py-2.5 font-bold text-slate-500 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
          >
            Hủy
          </button>
          <button 
            onClick={handleSubmit}
            disabled={loading || selectedStudents.length === 0}
            className="px-6 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {loading ? 'AI đang soạn đề...' : 'Tạo Đề Ngay'}
          </button>
        </div>
      </div>
    </div>
  );
}
