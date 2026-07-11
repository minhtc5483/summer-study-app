import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Folder, Upload, Plus, ChevronRight, BookOpen } from 'lucide-react';
import ImportModal from './ImportModal';
import CreateExamModal from './CreateExamModal';

interface Subject {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

interface Topic {
  id: string;
  subjectId: string;
  name: string;
  grade: string;
  description: string | null;
}

export default function QuestionBank() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  
  // Topic creation
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicGrade, setNewTopicGrade] = useState('');
  
  // Modals
  const [importModalTopic, setImportModalTopic] = useState<Topic | null>(null);
  const [createExamTopic, setCreateExamTopic] = useState<Topic | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subjectsRes, topicsRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/topics')
      ]);
      setSubjects(subjectsRes.data);
      setTopics(topicsRes.data);
      if (subjectsRes.data.length > 0 && !selectedSubject) {
        setSelectedSubject(subjectsRes.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch question bank data', error);
    }
  };

  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;
    try {
      await api.post('/topics', {
        subjectId: selectedSubject.id,
        name: newTopicName,
        grade: newTopicGrade || 'Lớp 1' // Defaulting to something if empty
      });
      setNewTopicName('');
      setNewTopicGrade('');
      setIsCreatingTopic(false);
      fetchData();
    } catch (error) {
      console.error('Failed to create topic', error);
    }
  };

  const filteredTopics = topics.filter(t => t.subjectId === selectedSubject?.id);

  return (
    <div className="space-y-8 max-w-6xl mx-auto flex flex-col h-[calc(100vh-6rem)]">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Kho Bài Tập</h2>
        <p className="text-slate-500 mt-2">Quản lý ngân hàng câu hỏi theo từng môn học và chủ đề.</p>
      </div>

      <div className="flex flex-1 gap-8 min-h-0">
        {/* Sidebar for Subjects */}
        <div className="w-64 flex-shrink-0 bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 bg-slate-50 font-semibold text-slate-700 flex items-center gap-2">
            <BookOpen size={18} />
            Môn học
          </div>
          <div className="overflow-y-auto p-2 space-y-1 flex-1">
            {subjects.map(subject => (
              <button
                key={subject.id}
                onClick={() => setSelectedSubject(subject)}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  selectedSubject?.id === subject.id 
                    ? 'bg-blue-50 border border-blue-200 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{subject.icon}</span>
                  <span className="font-medium">{subject.name}</span>
                </div>
                {selectedSubject?.id === subject.id && <ChevronRight size={16} />}
              </button>
            ))}
            {subjects.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-500">
                Chưa có môn học nào. Hãy thêm ở trang Cài Đặt.
              </div>
            )}
          </div>
        </div>

        {/* Main Content for Topics */}
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col overflow-hidden relative">
          {selectedSubject ? (
            <>
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl text-white shadow-sm"
                    style={{ backgroundColor: selectedSubject.color || '#3B82F6' }}
                  >
                    {selectedSubject.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-800">Chủ đề môn {selectedSubject.name}</h3>
                    <p className="text-sm text-slate-500">{filteredTopics.length} chủ đề</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreatingTopic(true)}
                  className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium flex items-center gap-2"
                >
                  <Plus size={18} /> Thêm Chủ Đề
                </button>
              </div>

              {isCreatingTopic && (
                <div className="p-6 border-b border-slate-100 bg-blue-50/50">
                  <form onSubmit={handleCreateTopic} className="flex gap-4">
                    <input
                      type="text"
                      required
                      value={newTopicName}
                      onChange={(e) => setNewTopicName(e.target.value)}
                      placeholder="Tên chủ đề (VD: Phép cộng phạm vi 10)"
                      className="flex-1 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="text"
                      required
                      value={newTopicGrade}
                      onChange={(e) => setNewTopicGrade(e.target.value)}
                      placeholder="Dành cho Lớp..."
                      className="w-48 px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary"
                    />
                    <button type="button" onClick={() => setIsCreatingTopic(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-200 rounded-xl transition-colors">
                      Hủy
                    </button>
                    <button type="submit" className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium">
                      Lưu
                    </button>
                  </form>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {filteredTopics.map(topic => (
                  <div key={topic.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-300 transition-colors group">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm border border-slate-100">
                        <Folder size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-lg">{topic.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs font-semibold px-2 py-1 bg-slate-200 text-slate-600 rounded-md">
                            {topic.grade}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCreateExamTopic(topic)}
                        className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-purple-50 text-purple-600 border border-purple-200 rounded-xl hover:bg-purple-600 hover:text-white transition-all font-medium flex items-center gap-2 shadow-sm"
                      >
                        <Plus size={18} /> Tạo Đề Bài
                      </button>
                      <button
                        onClick={() => setImportModalTopic(topic)}
                        className="opacity-0 group-hover:opacity-100 px-4 py-2 bg-white border border-primary text-primary rounded-xl hover:bg-primary hover:text-white transition-all font-medium flex items-center gap-2 shadow-sm"
                      >
                        <Upload size={18} /> Nhập (CSV)
                      </button>
                    </div>
                  </div>
                ))}

                {filteredTopics.length === 0 && !isCreatingTopic && (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Folder size={40} />
                    </div>
                    <p className="text-slate-500">Chưa có chủ đề nào cho môn này.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <BookOpen size={48} className="mb-4 opacity-20" />
              <p>Vui lòng chọn hoặc thêm một môn học</p>
            </div>
          )}
        </div>
      </div>

      <ImportModal
        isOpen={!!importModalTopic}
        onClose={() => setImportModalTopic(null)}
        topicId={importModalTopic?.id || ''}
        topicName={importModalTopic?.name || ''}
        onSuccess={() => {
          // You could optionally refresh some stats here
        }}
      />

      <CreateExamModal
        isOpen={!!createExamTopic}
        onClose={() => setCreateExamTopic(null)}
        topicId={createExamTopic?.id || ''}
        topicName={createExamTopic?.name || ''}
        onSuccess={() => {
          alert('Tạo đề thi thành công! Bé đã có thể làm đề này.');
        }}
      />
    </div>
  );
}
