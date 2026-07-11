import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { X, CheckSquare, Square, Shuffle } from 'lucide-react';

interface Question {
  id: string;
  type: string;
  content: string; // JSON string
  level: number;
  points: number;
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (isOpen && topicId) {
      setFetching(true);
      api.get(`/questions?topicId=${topicId}`)
        .then(res => {
          setQuestions(res.data);
          setSelectedIds(new Set());
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
        questionIds: Array.from(selectedIds)
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
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-50">
          <div>
            <h3 className="text-xl font-bold text-slate-800">Tạo Đề Thi Mới</h3>
            <p className="text-sm text-slate-500 mt-1">Chủ đề: <span className="font-semibold text-primary">{topicName}</span></p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 bg-white rounded-full p-2">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 flex flex-col flex-1 overflow-hidden">
          <div className="mb-6 flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Tên Đề Bài</label>
              <input
                type="text"
                value={examName}
                onChange={e => setExamName(e.target.value)}
                placeholder="Ví dụ: Ôn tập cuối tuần 1"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex items-end gap-2">
              <button 
                onClick={() => selectRandom(5)}
                className="px-4 py-2 bg-purple-50 text-purple-600 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors font-medium flex items-center gap-2"
              >
                <Shuffle size={16} /> Ngẫu nhiên 5 câu
              </button>
              <button 
                onClick={() => selectRandom(10)}
                className="px-4 py-2 bg-purple-50 text-purple-600 border border-purple-200 rounded-xl hover:bg-purple-100 transition-colors font-medium flex items-center gap-2"
              >
                <Shuffle size={16} /> Ngẫu nhiên 10 câu
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-slate-700">Ngân hàng câu hỏi ({questions.length} câu)</h4>
            <span className="text-sm text-primary font-semibold bg-blue-50 px-3 py-1 rounded-full">
              Đã chọn: {selectedIds.size} câu
            </span>
          </div>

          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-2xl bg-slate-50 p-2 space-y-2">
            {fetching ? (
              <p className="text-center py-8 text-slate-500">Đang tải câu hỏi...</p>
            ) : questions.length === 0 ? (
              <p className="text-center py-8 text-slate-500">Chưa có câu hỏi nào trong chủ đề này. Hãy nhập CSV trước!</p>
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
                    className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all border ${
                      isSelected ? 'bg-white border-primary shadow-sm' : 'bg-white border-transparent hover:border-slate-300'
                    }`}
                  >
                    <div className="text-primary">
                      {isSelected ? <CheckSquare size={24} /> : <Square size={24} className="text-slate-300" />}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800">{text}</p>
                    </div>
                    <div className="text-sm font-medium px-3 py-1 rounded-full bg-slate-100 text-slate-500">
                      Độ khó: {q.level}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-end gap-4 bg-slate-50">
          <button onClick={onClose} className="px-6 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-white font-medium transition-colors">
            Hủy
          </button>
          <button 
            onClick={handleSave}
            disabled={loading || selectedIds.size === 0 || !examName.trim()}
            className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium disabled:opacity-50"
          >
            {loading ? 'Đang lưu...' : 'Lưu Đề Thi'}
          </button>
        </div>
      </div>
    </div>
  );
}
