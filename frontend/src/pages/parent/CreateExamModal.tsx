import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { X, CheckSquare, Square, Shuffle, Users } from 'lucide-react';

interface Question {
  id: string;
  type: string;
  content: string; // JSON string
  level: number;
  points: number;
}

interface Student {
  id: string;
  name: string;
  avatar: string | null;
}

interface CreateExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  topicId: string;
  topicName: string;
  onSuccess: () => void;
}

export default function CreateExamModal({ isOpen, onClose, topicId, topicName, onSuccess }: CreateExamModalProps) {
  const [examName, setExamName] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (isOpen && topicId) {
      setFetching(true);
      Promise.all([
        api.get(`/questions?topicId=${topicId}`),
        api.get('/students') // Fetch all students
      ]).then(([qRes, sRes]) => {
          setQuestions(qRes.data);
          setStudents(sRes.data);
          setSelectedIds(new Set());
          setSelectedStudentIds(new Set());
          setExamName('');
        })
        .catch(console.error)
        .finally(() => setFetching(false));
    }
  }, [isOpen, topicId]);

  if (!isOpen) return null;

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const toggleStudent = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const selectRandom = (count: number) => {
    const shuffled = [...questions].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, count).map(q => q.id);
    setSelectedIds(new Set(selected));
  };

  const handleSave = async () => {
    if (!examName.trim()) {
      alert('Vui lòng nhập tên đề thi');
      return;
    }
    if (selectedIds.size === 0) {
      alert('Vui lòng chọn ít nhất 1 câu hỏi');
      return;
    }

    setLoading(true);
    try {
      await api.post('/exams', {
        topicId,
        name: examName,
        questionIds: Array.from(selectedIds),
        studentIds: Array.from(selectedStudentIds),
        timeLimit: timeLimit
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to create exam', error);
      alert('Có lỗi xảy ra khi tạo đề thi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Tạo Đề Thi Mới</h3>
            <p className="text-sm text-slate-500 mt-1">Chủ đề: <span className="font-semibold text-primary">{topicName}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-2">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col md:flex-row gap-6 flex-1 overflow-hidden">
          {/* Cột trái: Cài đặt đề thi & Học sinh */}
          <div className="w-full md:w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tên Đề Bài</label>
              <input
                type="text"
                value={examName}
                onChange={e => setExamName(e.target.value)}
                placeholder="Ví dụ: Ôn tập cuối tuần 1"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Giới hạn thời gian</label>
              <select 
                value={timeLimit === null ? '' : timeLimit.toString()} 
                onChange={e => setTimeLimit(e.target.value === '' ? null : parseInt(e.target.value))}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary shadow-sm bg-white"
              >
                <option value="">Không giới hạn</option>
                <option value="5">5 phút</option>
                <option value="10">10 phút</option>
                <option value="15">15 phút</option>
                <option value="30">30 phút</option>
              </select>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Users size={16} /> Giao bài cho bé
                </label>
                <span className="text-xs font-semibold px-2 py-1 bg-white border border-slate-200 rounded text-slate-500">
                  Đã chọn {selectedStudentIds.size}
                </span>
              </div>
              
              {students.length === 0 ? (
                <p className="text-sm text-slate-500 italic">Chưa có học sinh nào trong hệ thống.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {students.map(student => (
                    <div 
                      key={student.id} 
                      onClick={() => toggleStudent(student.id)}
                      className={`flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-colors border ${selectedStudentIds.has(student.id) ? 'bg-white border-primary shadow-sm' : 'border-transparent hover:bg-slate-100'}`}
                    >
                      <div className="text-primary shrink-0">
                        {selectedStudentIds.has(student.id) ? <CheckSquare size={20} /> : <Square size={20} className="text-slate-300" />}
                      </div>
                      <img 
                        src={student.avatar ? `http://localhost:3000${student.avatar}` : 'https://ui-avatars.com/api/?name=' + student.name} 
                        className="w-8 h-8 rounded-full object-cover"
                        alt={student.name}
                      />
                      <span className="font-semibold text-slate-700 text-sm">{student.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cột phải: Chọn câu hỏi */}
          <div className="w-full md:w-2/3 flex flex-col min-h-0 border-l border-slate-100 pl-6">
            <div className="flex justify-between items-center mb-4 shrink-0">
              <div>
                <h4 className="font-bold text-slate-700">Ngân hàng câu hỏi ({questions.length} câu)</h4>
                <p className="text-sm text-slate-500">Đã chọn: {selectedIds.size} câu</p>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => selectRandom(5)}
                  className="px-3 py-1.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors font-medium text-sm flex items-center gap-1"
                >
                  <Shuffle size={14} /> Chọn 5
                </button>
                <button 
                  onClick={() => selectRandom(10)}
                  className="px-3 py-1.5 bg-purple-50 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors font-medium text-sm flex items-center gap-1"
                >
                  <Shuffle size={14} /> Chọn 10
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl bg-slate-50 p-2 space-y-2">
              {fetching ? (
                <p className="text-center py-8 text-slate-500">Đang tải câu hỏi...</p>
              ) : questions.length === 0 ? (
                <p className="text-center py-8 text-slate-500">Chưa có câu hỏi nào. Hãy nhập CSV!</p>
              ) : (
                questions.map(q => {
                  let text = 'N/A';
                  try {
                    const parsed = JSON.parse(q.content);
                    text = parsed.text || 'N/A';
                  } catch (e) {}

                  const isSelected = selectedIds.has(q.id);

                  return (
                    <div 
                      key={q.id}
                      onClick={() => toggleSelection(q.id)}
                      className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border ${
                        isSelected ? 'bg-white border-primary shadow-sm' : 'bg-white border-transparent hover:border-slate-300'
                      }`}
                    >
                      <div className="text-primary shrink-0">
                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} className="text-slate-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 text-sm truncate">{text}</p>
                      </div>
                      <div className="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-500 shrink-0">
                        Mức {q.level}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-4 bg-white shrink-0">
          <button onClick={onClose} className="px-6 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors">
            Hủy
          </button>
          <button 
            onClick={handleSave}
            disabled={loading || selectedIds.size === 0 || !examName.trim()}
            className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : 'Lưu Đề Thi & Giao Bài'}
          </button>
        </div>
      </div>
    </div>
  );
}
