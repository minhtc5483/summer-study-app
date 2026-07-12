import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Folder, Upload, Plus, BookOpen, Trash2, Users, Edit2 } from 'lucide-react';
import ImportModal from './ImportModal';
import CreateExamModal from './CreateExamModal';
import QuickCreateExamModal from './QuickCreateExamModal';
import { Bot } from 'lucide-react';

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

interface Exam {
  id: string;
  topicId: string;
  name: string;
  createdAt: string;
  students: Array<{id: string, name: string, avatar: string | null}>;
  _count: {
    questions: number;
  };
}

export default function QuestionBank() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  
  // Topic creation
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicGrade, setNewTopicGrade] = useState('');
  
  // Modals
  const [importModalTopic, setImportModalTopic] = useState<Topic | null>(null);
  const [createExamTopic, setCreateExamTopic] = useState<Topic | null>(null);
  const [editingExamData, setEditingExamData] = useState<any>(null);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subjRes, topicRes, examRes] = await Promise.all([
        api.get('/subjects'),
        api.get('/topics'),
        api.get('/exams')
      ]);
      setSubjects(subjRes.data);
      setTopics(topicRes.data);
      setExams(examRes.data);
      
      if (subjRes.data.length > 0 && !selectedSubject) {
        setSelectedSubject(subjRes.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  const handleCreateTopic = async () => {
    if (!newTopicName.trim() || !newTopicGrade.trim() || !selectedSubject) return;
    try {
      await api.post('/topics', {
        name: newTopicName,
        grade: newTopicGrade,
        subjectId: selectedSubject.id
      });
      setIsCreatingTopic(false);
      setNewTopicName('');
      setNewTopicGrade('');
      fetchData();
    } catch (error) {
      console.error('Failed to create topic', error);
    }
  };

  const handleEditExam = async (examId: string, topic: Topic) => {
    try {
      const res = await api.get(`/exams/${examId}`);
      setEditingExamData(res.data);
      setCreateExamTopic(topic);
    } catch (err) {
      console.error(err);
      alert('Không thể tải dữ liệu đề thi');
    }
  };

  const handleDeleteExam = async (examId: string) => {
    if (!confirm('Bạn có chắc muốn xóa đề bài này không? Mọi dữ liệu làm bài của bé với đề này sẽ bị mất.')) return;
    try {
      await api.delete(`/exams/${examId}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete exam', error);
      alert('Không thể xóa đề bài');
    }
  };

  const filteredTopics = topics.filter(t => t.subjectId === selectedSubject?.id);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Kho Bài Tập 📚</h1>
          <p className="text-slate-500 mt-2 font-medium">Quản lý và giao đề bài cho các bé</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar: Subjects */}
        <div className="md:col-span-1 space-y-3">
          <h3 className="font-bold text-slate-400 uppercase tracking-wider text-sm px-4 mb-4">Các môn học</h3>
          {subjects.map(subject => (
            <button
              key={subject.id}
              onClick={() => setSelectedSubject(subject)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${
                selectedSubject?.id === subject.id 
                  ? 'bg-primary text-white shadow-lg shadow-blue-200' 
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-100'
              }`}
            >
              {subject.icon?.startsWith('http') ? (
                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                  <img src={subject.icon} alt="icon" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="text-2xl">{subject.icon || '📚'}</div>
              )}
              <span className="font-bold">{subject.name}</span>
            </button>
          ))}
        </div>

        {/* Main Content: Topics & Exams */}
        <div className="md:col-span-3 space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-700 flex items-center gap-2">
              <Folder className="text-primary" /> 
              Chủ đề môn {selectedSubject?.name}
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setIsQuickCreateOpen(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:opacity-90 transition-opacity shadow-md"
              >
                <Bot size={18} /> Tạo Nhanh (AI)
              </button>
              <button 
                onClick={() => setIsCreatingTopic(true)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-medium flex items-center gap-2 transition-colors"
              >
                <Plus size={18} /> Thêm Chủ Đề
              </button>
            </div>
          </div>

          {isCreatingTopic && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex gap-4 items-end animate-in fade-in slide-in-from-top-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-600 mb-1">Tên chủ đề</label>
                <input 
                  type="text" 
                  value={newTopicName}
                  onChange={e => setNewTopicName(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary"
                  placeholder="Ví dụ: Phép cộng phạm vi 10"
                />
              </div>
              <div className="w-32">
                <label className="block text-sm font-medium text-slate-600 mb-1">Dành cho lớp</label>
                <select 
                  value={newTopicGrade}
                  onChange={e => setNewTopicGrade(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary bg-white"
                >
                  <option value="">Chọn...</option>
                  <option value="Lớp 1">Lớp 1</option>
                  <option value="Lớp 2">Lớp 2</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setIsCreatingTopic(false)} className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50">Hủy</button>
                <button onClick={handleCreateTopic} className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary-dark font-medium shadow-sm">Lưu</button>
              </div>
            </div>
          )}

          {filteredTopics.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-slate-200 text-center">
              <div className="text-5xl mb-4 opacity-50">📂</div>
              <p className="text-slate-500 font-medium">Chưa có chủ đề nào cho môn học này.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredTopics.map(topic => {
                const topicExams = exams.filter(e => e.topicId === topic.id);
                
                return (
                  <div key={topic.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                    <div className="p-6 flex items-center justify-between bg-slate-50/50 group border-b border-slate-100 shrink-0">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-primary rounded-2xl flex items-center justify-center">
                          <BookOpen size={24} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-800">{topic.name}</h3>
                          <p className="text-sm text-slate-500 font-medium">{topic.grade}</p>
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
                    
                    {/* Danh sách đề thi của chủ đề này */}
                    <div className="p-4 bg-white flex-1">
                      {topicExams.length === 0 ? (
                        <p className="text-sm text-slate-400 italic text-center py-4">Chưa có đề thi nào trong chủ đề này. Hãy nhấn "Tạo Đề Bài" để bắt đầu.</p>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          {topicExams.map(exam => (
                            <div key={exam.id} className="border border-slate-200 p-4 rounded-2xl hover:border-primary transition-colors flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start mb-2">
                                  <h4 className="font-bold text-slate-700">{exam.name}</h4>
                                  <div className="flex gap-2">
                                    <button onClick={() => handleEditExam(exam.id, topic)} className="text-slate-400 hover:text-blue-500 transition-colors">
                                      <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDeleteExam(exam.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                                </div>
                                <span className="inline-block px-2 py-1 bg-blue-50 text-primary text-xs font-bold rounded">
                                  {exam._count.questions} câu hỏi
                                </span>
                              </div>
                              
                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <div className="flex -space-x-2 overflow-hidden">
                                  {exam.students.length === 0 ? (
                                    <span className="text-xs text-slate-400 italic">Chưa giao cho ai</span>
                                  ) : (
                                    exam.students.map(s => (
                                      <img 
                                        key={s.id}
                                        src={s.avatar ? `http://localhost:3000${s.avatar}` : 'https://ui-avatars.com/api/?name=' + s.name}
                                        alt={s.name}
                                        title={s.name}
                                        className="inline-block h-8 w-8 rounded-full ring-2 ring-white object-cover bg-slate-100"
                                      />
                                    ))
                                  )}
                                </div>
                                {exam.students.length > 0 && (
                                  <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                    <Users size={12} /> Đã giao ({exam.students.length})
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
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
          fetchData();
        }}
      />

      {createExamTopic && (
        <CreateExamModal 
          isOpen={!!createExamTopic}
          onClose={() => {
            setCreateExamTopic(null);
            setEditingExamData(null);
          }}
          topicId={createExamTopic.id}
          topicName={createExamTopic.name}
          initialData={editingExamData}
          onSuccess={() => {
            fetchData();
            setEditingExamData(null);
          }}
        />
      )}

      {selectedSubject && (
        <QuickCreateExamModal
          isOpen={isQuickCreateOpen}
          onClose={() => setIsQuickCreateOpen(false)}
          subjectId={selectedSubject.id}
          subjectName={selectedSubject.name}
          onSuccess={() => {
            fetchData();
            alert('AI đã tạo đề bài thành công!');
          }}
        />
      )}
    </div>
  );
}
