import React, { useRef, useState, useEffect } from 'react';
import { Camera } from 'lucide-react';

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

interface Student {
  id: string;
  name: string;
  grade: string;
  avatar: string | null;
  totalScore: number;
  currentStreak: number;
  subjects?: Subject[];
}

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData, editingId: string | null) => Promise<void>;
  initialData?: Student | null;
}

export default function StudentModal({ isOpen, onClose, onSubmit, initialData }: StudentModalProps) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<string>('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [availableGrades, setAvailableGrades] = useState<Grade[]>([]);
  const [availableSubjects, setAvailableSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    import('../../lib/api').then(({ api }) => {
      Promise.all([
        api.get('/grades'),
        api.get('/subjects')
      ]).then(([gradesRes, subjectsRes]) => {
        setAvailableGrades(gradesRes.data);
        setAvailableSubjects(subjectsRes.data);
      }).catch(console.error);
    });
  }, []);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setGrade(initialData.grade);
      setAvatarPreview(initialData.avatar ? initialData.avatar : null);
      if (initialData.subjects) {
        setSelectedSubjects(initialData.subjects.map(s => s.id));
      } else {
        setSelectedSubjects([]);
      }
    } else {
      setName('');
      setGrade('');
      setSelectedSubjects([]);
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grade) {
      alert('Vui lòng chọn khối lớp');
      return;
    }
    const formData = new FormData();
    formData.append('name', name);
    formData.append('grade', grade);
    formData.append('subjectIds', JSON.stringify(selectedSubjects));
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }
    await onSubmit(formData, initialData ? initialData.id : null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="text-xl font-bold text-slate-800">
            {initialData ? 'Cập nhật Học Sinh' : 'Thêm Học Sinh Mới'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            &times;
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="flex flex-col items-center">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="w-24 h-24 rounded-full border-4 border-dashed border-slate-200 overflow-hidden bg-slate-50 cursor-pointer hover:bg-slate-100 hover:border-primary transition-all flex flex-col items-center justify-center relative group"
            >
              {avatarPreview ? (
                <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <>
                  <Camera className="text-slate-400 mb-1" />
                  <span className="text-xs text-slate-400 font-medium">Tải ảnh</span>
                </>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="text-white" />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleAvatarChange} 
              accept="image/*" 
              className="hidden" 
            />
            <p className="text-xs text-slate-500 mt-2">Nhấn vào để tải ảnh đại diện</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Tên bé</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary focus:border-primary transition-shadow"
              placeholder="Ví dụ: Bé An"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Lớp</label>
            {availableGrades.length > 0 ? (
              <div className="grid grid-cols-3 gap-3 max-h-40 overflow-y-auto p-1">
                {availableGrades.map((g) => (
                  <label key={g.id} className="cursor-pointer">
                    <input 
                      type="radio" 
                      name="grade" 
                      value={g.name} 
                      checked={grade === g.name}
                      onChange={() => setGrade(g.name)}
                      className="hidden peer" 
                    />
                    <div className="text-center py-2 px-2 rounded-xl border-2 border-slate-200 peer-checked:border-primary peer-checked:bg-blue-50 peer-checked:text-primary-dark font-bold text-slate-600 transition-all text-sm">
                      {g.name}
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-200">
                Chưa có lớp nào. Hãy vào mục Cài Đặt để thêm lớp.
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Môn học được phép làm</label>
            {availableSubjects.length > 0 ? (
              <div className="space-y-2 max-h-40 overflow-y-auto p-1">
                {availableSubjects.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={selectedSubjects.includes(s.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedSubjects([...selectedSubjects, s.id]);
                        else setSelectedSubjects(selectedSubjects.filter(id => id !== s.id));
                      }}
                      className="w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary" 
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{s.icon}</span>
                      <span className="font-semibold text-slate-700">{s.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm border border-yellow-200">
                Chưa có môn học nào. Hãy vào mục Cài Đặt để thêm.
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors shadow-lg shadow-blue-200"
            >
              {initialData ? 'Lưu Thay Đổi' : 'Tạo Học Sinh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
