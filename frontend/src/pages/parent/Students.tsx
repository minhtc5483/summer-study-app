import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { Plus, Trash2, Edit2, Flame } from 'lucide-react';
import StudentModal from './StudentModal';

interface Student {
  id: string;
  name: string;
  grade: number;
  avatar: string | null;
  totalScore: number;
  currentStreak: number;
}

export default function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students');
      setStudents(res.data);
    } catch (err) {
      console.error('Failed to fetch students', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (student?: Student) => {
    setEditingStudent(student || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
  };

  const handleSubmit = async (formData: FormData, editingId: string | null) => {
    try {
      if (editingId) {
        await api.put(`/students/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/students', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      handleCloseModal();
      fetchStudents();
    } catch (err) {
      console.error('Failed to save student', err);
      alert('Có lỗi xảy ra khi lưu học sinh.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa học sinh này?')) {
      try {
        await api.delete(`/students/${id}`);
        fetchStudents();
      } catch (err) {
        console.error('Failed to delete student', err);
        alert('Có lỗi xảy ra khi xóa.');
      }
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Đang tải...</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Quản Lý Học Sinh</h2>
          <p className="text-slate-500 mt-2">Thêm và cập nhật thông tin học sinh trong gia đình.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-primary text-white px-5 py-3 rounded-xl hover:bg-primary-dark transition-colors font-medium shadow-sm"
        >
          <Plus size={20} />
          Thêm Bé Mới
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {students.length === 0 ? (
          <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-dashed border-slate-300">
            <p className="text-slate-500 text-lg">Chưa có học sinh nào. Hãy thêm một bé để bắt đầu!</p>
          </div>
        ) : (
          students.map((student) => (
            <div key={student.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full border-4 border-blue-50 overflow-hidden bg-slate-100 mb-4 shadow-sm flex items-center justify-center">
                {student.avatar ? (
                  <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">👦</span>
                )}
              </div>
              <h3 className="text-xl font-bold text-slate-800">{student.name}</h3>
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-sm font-medium rounded-full mt-2">
                Lớp {student.grade}
              </span>
              
              <div className="mt-6 flex items-center gap-4 w-full border-t border-slate-100 pt-4">
                <div className="flex-1 text-center border-r border-slate-100">
                  <div className="text-xs text-slate-400 font-medium">ĐIỂM</div>
                  <div className="font-bold text-slate-700">{student.totalScore}</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xs text-slate-400 font-medium">CHUỖI</div>
                  <div className="font-bold text-orange-500 flex items-center justify-center gap-1">
                    {student.currentStreak} <Flame size={14} />
                  </div>
                </div>
              </div>

              <div className="flex w-full gap-2 mt-6">
                <button
                  onClick={() => handleOpenModal(student)}
                  className="flex-1 flex justify-center py-2 text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(student.id)}
                  className="flex-1 flex justify-center py-2 text-danger bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <StudentModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        onSubmit={handleSubmit} 
        initialData={editingStudent} 
      />
    </div>
  );
}
