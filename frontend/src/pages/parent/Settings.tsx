import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { BookOpen, Layers, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

interface Grade {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
}

export default function Settings() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // Grade Form
  const [newGradeName, setNewGradeName] = useState('');
  
  // Subject Form
  const [editingSubject, setEditingSubject] = useState<Partial<Subject> | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gradesRes, subjectsRes] = await Promise.all([
        api.get('/grades'),
        api.get('/subjects')
      ]);
      setGrades(gradesRes.data);
      setSubjects(subjectsRes.data);
    } catch (error) {
      console.error('Failed to fetch settings data', error);
    }
  };

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGradeName.trim()) return;
    try {
      await api.post('/grades', { name: newGradeName });
      setNewGradeName('');
      fetchData();
    } catch (error) {
      console.error('Failed to add grade', error);
    }
  };

  const handleDeleteGrade = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa khối lớp này?')) return;
    try {
      await api.delete(`/grades/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete grade', error);
    }
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject?.name) return;
    try {
      if (editingSubject.id) {
        await api.put(`/subjects/${editingSubject.id}`, editingSubject);
      } else {
        await api.post('/subjects', editingSubject);
      }
      setEditingSubject(null);
      fetchData();
    } catch (error) {
      console.error('Failed to save subject', error);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa môn học này?')) return;
    try {
      await api.delete(`/subjects/${id}`);
      fetchData();
    } catch (error) {
      console.error('Failed to delete subject', error);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Cài Đặt Hệ Thống</h2>
        <p className="text-slate-500 mt-2">Quản lý danh sách các khối lớp và môn học khả dụng.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Grades Management */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
              <Layers size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Danh sách Khối Lớp</h3>
          </div>

          <form onSubmit={handleAddGrade} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newGradeName}
              onChange={(e) => setNewGradeName(e.target.value)}
              placeholder="VD: Mầm Non, Lớp 3..."
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="submit"
              className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <Plus size={20} /> Thêm
            </button>
          </form>

          <div className="space-y-3">
            {grades.map(grade => (
              <div key={grade.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="font-semibold text-slate-700">{grade.name}</span>
                <button
                  onClick={() => handleDeleteGrade(grade.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {grades.length === 0 && (
              <p className="text-slate-500 text-center py-4">Chưa có khối lớp nào.</p>
            )}
          </div>
        </div>

        {/* Subjects Management */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600">
              <BookOpen size={24} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Danh sách Môn Học</h3>
          </div>

          {editingSubject ? (
            <form onSubmit={handleSaveSubject} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tên môn học</label>
                <input
                  type="text"
                  required
                  value={editingSubject.name || ''}
                  onChange={(e) => setEditingSubject({...editingSubject, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Icon (Emoji hoặc URL ảnh)</label>
                  <input
                    type="text"
                    value={editingSubject.icon || ''}
                    onChange={(e) => setEditingSubject({...editingSubject, icon: e.target.value})}
                    placeholder="VD: 📐 hoặc https://..."
                    className="w-full px-4 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mã màu (Hex)</label>
                  <input
                    type="text"
                    value={editingSubject.color || ''}
                    onChange={(e) => setEditingSubject({...editingSubject, color: e.target.value})}
                    placeholder="VD: #3B82F6"
                    className="w-full px-4 py-2 rounded-lg border border-slate-200"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors"
                >
                  <X size={18} />
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Check size={18} />
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setEditingSubject({ name: '', icon: '📚', color: '#8B5CF6' })}
              className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-500 font-medium hover:border-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center gap-2 mb-6"
            >
              <Plus size={20} /> Thêm Môn Học
            </button>
          )}

          <div className="space-y-3">
            {subjects.map(subject => (
              <div key={subject.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm text-white overflow-hidden"
                    style={{ backgroundColor: subject.color || '#cbd5e1' }}
                  >
                    {subject.icon?.startsWith('http') ? (
                      <img src={subject.icon} alt="icon" className="w-full h-full object-cover" />
                    ) : (
                      subject.icon
                    )}
                  </div>
                  <span className="font-semibold text-slate-700">{subject.name}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingSubject(subject)}
                    className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(subject.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {subjects.length === 0 && (
              <p className="text-slate-500 text-center py-4">Chưa có môn học nào.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
