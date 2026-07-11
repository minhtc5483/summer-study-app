import React, { useRef, useState, useEffect } from 'react';
import { Camera } from 'lucide-react';

interface Student {
  id: string;
  name: string;
  grade: number;
  avatar: string | null;
  totalScore: number;
  currentStreak: number;
}

interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: FormData, editingId: string | null) => Promise<void>;
  initialData?: Student | null;
}

export default function StudentModal({ isOpen, onClose, onSubmit, initialData }: StudentModalProps) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState<number>(1);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setGrade(initialData.grade.toString() as any);
      setAvatarPreview(initialData.avatar ? initialData.avatar : null);
    } else {
      setName('');
      setGrade(1);
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
    const formData = new FormData();
    formData.append('name', name);
    formData.append('grade', grade.toString());
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
            <div className="flex gap-4">
              <label className="flex-1 cursor-pointer">
                <input 
                  type="radio" 
                  name="grade" 
                  value={1} 
                  checked={grade === 1}
                  onChange={() => setGrade(1)}
                  className="hidden peer" 
                />
                <div className="text-center py-3 rounded-xl border-2 border-slate-200 peer-checked:border-primary peer-checked:bg-blue-50 peer-checked:text-primary-dark font-bold text-slate-600 transition-all">
                  Lớp 1
                </div>
              </label>
              <label className="flex-1 cursor-pointer">
                <input 
                  type="radio" 
                  name="grade" 
                  value={2} 
                  checked={grade === 2}
                  onChange={() => setGrade(2)}
                  className="hidden peer" 
                />
                <div className="text-center py-3 rounded-xl border-2 border-slate-200 peer-checked:border-primary peer-checked:bg-blue-50 peer-checked:text-primary-dark font-bold text-slate-600 transition-all">
                  Lớp 2
                </div>
              </label>
            </div>
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
