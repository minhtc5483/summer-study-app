import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { BookOpen, Layers, Plus, Trash2, Edit2, Check, X, Lock, KeyRound, ShieldCheck } from 'lucide-react';
import { useManageAccessStore } from '../../store/useManageAccessStore';

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

interface StudentPinInfo {
  id: string;
  name: string;
  avatar: string | null;
  hasPin: boolean;
}

export default function Settings() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<StudentPinInfo[]>([]);

  // Grade Form
  const [newGradeName, setNewGradeName] = useState('');

  // Subject Form
  const [editingSubject, setEditingSubject] = useState<Partial<Subject> | null>(null);

  // Per-student PIN form: which student is being edited + the 4-digit value typed
  const [editingPinFor, setEditingPinFor] = useState<string | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [pinSaving, setPinSaving] = useState(false);
  const [pinError, setPinError] = useState('');

  // Parent management PIN — the gate on the whole /parent area (see ManagePinGate).
  const setManageToken = useManageAccessStore((s) => s.setManageToken);
  const [hasManagePin, setHasManagePin] = useState<boolean | null>(null);
  const [managePin, setManagePin] = useState('');
  const [managePassword, setManagePassword] = useState('');
  const [manageSaving, setManageSaving] = useState(false);
  const [manageError, setManageError] = useState('');
  const [manageSaved, setManageSaved] = useState(false);

  const handleSaveManagePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(managePin)) {
      setManageError('Mã PIN phải gồm 4-8 chữ số.');
      return;
    }
    setManageSaving(true);
    setManageError('');
    try {
      const res = await api.put('/auth/manage-pin', { pin: managePin, password: managePassword });
      setManageToken(res.data.manageToken);
      setHasManagePin(true);
      setManagePin('');
      setManagePassword('');
      setManageSaved(true);
    } catch (error: any) {
      setManageError(error.response?.data?.error || 'Không lưu được mã PIN, thử lại nhé.');
    } finally {
      setManageSaving(false);
    }
  };

  const handleClearManagePin = async () => {
    if (!confirm('Bỏ mã PIN quản lý? Bất kỳ ai cầm máy đã đăng nhập đều vào được khu quản lý.')) return;
    const password = prompt('Nhập mật khẩu tài khoản để xác nhận:');
    if (!password) return;
    try {
      await api.put('/auth/manage-pin', { pin: '', password });
      setManageToken(null);
      setHasManagePin(false);
      setManageSaved(false);
    } catch (error: any) {
      setManageError(error.response?.data?.error || 'Không bỏ được mã PIN.');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gradesRes, subjectsRes, studentsRes, managePinRes] = await Promise.all([
        api.get('/grades'),
        api.get('/subjects'),
        api.get('/students'),
        api.get('/auth/manage-pin')
      ]);
      setGrades(gradesRes.data);
      setSubjects(subjectsRes.data);
      setStudents(studentsRes.data);
      setHasManagePin(!!managePinRes.data.hasPin);
    } catch (error) {
      console.error('Failed to fetch settings data', error);
    }
  };

  const handleSavePin = async (studentId: string) => {
    if (!/^\d{4}$/.test(pinValue)) {
      setPinError('Mã PIN phải gồm đúng 4 chữ số.');
      return;
    }
    setPinSaving(true);
    setPinError('');
    try {
      await api.put(`/students/${studentId}/pin`, { pin: pinValue });
      setEditingPinFor(null);
      setPinValue('');
      fetchData();
    } catch (error) {
      console.error('Failed to save PIN', error);
      setPinError('Có lỗi xảy ra, thử lại nhé.');
    } finally {
      setPinSaving(false);
    }
  };

  const handleClearPin = async (studentId: string) => {
    if (!confirm('Bỏ mã PIN của bé này? Bé sẽ vào học được ngay mà không cần nhập PIN.')) return;
    try {
      await api.put(`/students/${studentId}/pin`, { pin: '' });
      fetchData();
    } catch (error) {
      console.error('Failed to clear PIN', error);
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
        <h2 className="text-3xl font-bold text-ink">Cài Đặt Hệ Thống</h2>
        <p className="text-ink-muted mt-2">Quản lý danh sách các khối lớp và môn học khả dụng.</p>
      </div>

      {/* Parent management PIN */}
      <div className="bg-white rounded-3xl shadow-sm border border-cream-border p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-terracotta-100 rounded-2xl flex items-center justify-center text-primary-dark">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-ink">Mã PIN quản lý</h3>
            <p className="text-xs text-ink-muted font-medium">
              {hasManagePin === null ? 'Đang tải...' : hasManagePin ? 'Đang bật — mỗi lần vào khu quản lý phải nhập PIN' : 'Chưa đặt — ai cầm máy cũng vào được khu quản lý'}
            </p>
          </div>
        </div>
        <p className="text-ink-muted text-sm mb-6">
          Máy đã đăng nhập sẽ ghi nhớ tài khoản rất lâu nên không hỏi lại mật khẩu. Mã PIN này chặn ở cửa khu quản lý,
          và có hiệu lực 30 phút cho mỗi lần nhập.
        </p>

        <form onSubmit={handleSaveManagePin} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">{hasManagePin ? 'Mã PIN mới' : 'Mã PIN'} (4-8 chữ số)</label>
            <input
              type="password"
              inputMode="numeric"
              value={managePin}
              onChange={(e) => { setManagePin(e.target.value.replace(/\D/g, '').slice(0, 8)); setManageSaved(false); }}
              className="w-32 px-4 py-2 rounded-xl border border-cream-border text-center tracking-widest focus:ring-2 focus:ring-primary"
              placeholder="••••"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Mật khẩu tài khoản</label>
            <input
              type="password"
              value={managePassword}
              onChange={(e) => setManagePassword(e.target.value)}
              className="w-56 px-4 py-2 rounded-xl border border-cream-border focus:ring-2 focus:ring-primary"
            />
          </div>
          <button
            type="submit"
            disabled={manageSaving || !managePin || !managePassword}
            className="px-6 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50"
          >
            {manageSaving ? 'Đang lưu...' : hasManagePin ? 'Đổi mã PIN' : 'Bật mã PIN'}
          </button>
          {hasManagePin && (
            <button type="button" onClick={handleClearManagePin} className="px-4 py-2 text-ink-muted hover:text-danger font-medium">
              Bỏ mã PIN
            </button>
          )}
        </form>
        {manageError && <p className="text-sm text-danger font-medium mt-3">{manageError}</p>}
        {manageSaved && <p className="text-sm text-secondary-dark font-medium mt-3">Đã lưu mã PIN quản lý.</p>}
      </div>

      {/* Per-student PIN */}
      <div className="bg-white rounded-3xl shadow-sm border border-cream-border p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-sage-100 rounded-2xl flex items-center justify-center text-secondary-dark">
            <KeyRound size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-ink">Mã PIN cho từng bé</h3>
          </div>
        </div>
        <p className="text-ink-muted text-sm mb-6">
          Đặt mã PIN gồm 4 chữ số cho từng bé để chỉ bé đó mới vào được hồ sơ của mình. Bé chưa có mã PIN sẽ vào học được ngay khi chạm vào tên, không cần nhập gì.
        </p>

        <div className="space-y-3">
          {students.map(student => (
            <div key={student.id} className="flex items-center justify-between gap-4 p-4 bg-cream rounded-2xl border border-cream-border">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-cream-border flex items-center justify-center shrink-0">
                  {student.avatar ? (
                    <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">👦</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-ink truncate">{student.name}</p>
                  <p className="text-xs text-ink-muted flex items-center gap-1">
                    {student.hasPin ? (
                      <><Lock size={12} /> Đã đặt mã PIN</>
                    ) : (
                      'Chưa đặt mã PIN — vào học tự do'
                    )}
                  </p>
                </div>
              </div>

              {editingPinFor === student.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    autoFocus
                    value={pinValue}
                    onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                    placeholder="4 số"
                    className="w-20 px-3 py-2 rounded-lg border border-cream-border text-center tracking-widest focus:ring-2 focus:ring-secondary"
                  />
                  <button
                    onClick={() => handleSavePin(student.id)}
                    disabled={pinSaving}
                    className="p-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark disabled:opacity-50"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={() => { setEditingPinFor(null); setPinValue(''); setPinError(''); }}
                    className="p-2 bg-cream-border text-ink rounded-lg hover:bg-terracotta-100"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => { setEditingPinFor(student.id); setPinValue(''); setPinError(''); }}
                    className="px-3 py-2 text-sm font-medium text-secondary-dark bg-sage-100 rounded-lg hover:bg-sage-100/70 transition-colors"
                  >
                    {student.hasPin ? 'Đổi PIN' : 'Đặt PIN'}
                  </button>
                  {student.hasPin && (
                    <button
                      onClick={() => handleClearPin(student.id)}
                      className="p-2 text-ink-muted hover:text-danger hover:bg-terracotta-100 rounded-lg transition-colors"
                      title="Bỏ mã PIN"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
          {students.length === 0 && (
            <p className="text-ink-muted text-center py-4">Chưa có bé nào. Thêm bé ở mục Quản lý Học sinh.</p>
          )}
        </div>
        {pinError && <p className="text-danger text-sm mt-3">{pinError}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Grades Management */}
        <div className="bg-white rounded-3xl shadow-sm border border-cream-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-terracotta-100 rounded-2xl flex items-center justify-center text-primary-dark">
              <Layers size={24} />
            </div>
            <h3 className="text-xl font-bold text-ink">Danh sách Khối Lớp</h3>
          </div>

          <form onSubmit={handleAddGrade} className="flex gap-2 mb-6">
            <input
              type="text"
              value={newGradeName}
              onChange={(e) => setNewGradeName(e.target.value)}
              placeholder="VD: Mầm Non, Lớp 3..."
              className="flex-1 px-4 py-3 rounded-xl border border-cream-border focus:ring-2 focus:ring-primary focus:border-primary"
            />
            <button
              type="submit"
              className="px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors font-medium flex items-center gap-2"
            >
              <Plus size={20} /> Thêm
            </button>
          </form>

          <div className="space-y-3">
            {grades.map(grade => (
              <div key={grade.id} className="flex items-center justify-between p-4 bg-cream rounded-2xl border border-cream-border">
                <span className="font-semibold text-ink">{grade.name}</span>
                <button
                  onClick={() => handleDeleteGrade(grade.id)}
                  className="p-2 text-ink-muted hover:text-danger hover:bg-terracotta-100 rounded-xl transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {grades.length === 0 && (
              <p className="text-ink-muted text-center py-4">Chưa có khối lớp nào.</p>
            )}
          </div>
        </div>

        {/* Subjects Management */}
        <div className="bg-white rounded-3xl shadow-sm border border-cream-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gold-100 rounded-2xl flex items-center justify-center text-gold-600">
              <BookOpen size={24} />
            </div>
            <h3 className="text-xl font-bold text-ink">Danh sách Môn Học</h3>
          </div>

          {editingSubject ? (
            <form onSubmit={handleSaveSubject} className="p-4 bg-cream rounded-2xl border border-cream-border mb-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Tên môn học</label>
                <input
                  type="text"
                  required
                  value={editingSubject.name || ''}
                  onChange={(e) => setEditingSubject({...editingSubject, name: e.target.value})}
                  className="w-full px-4 py-2 rounded-lg border border-cream-border focus:ring-2 focus:ring-gold-600"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Icon (Emoji hoặc URL ảnh)</label>
                  <input
                    type="text"
                    value={editingSubject.icon || ''}
                    onChange={(e) => setEditingSubject({...editingSubject, icon: e.target.value})}
                    placeholder="VD: 📐 hoặc https://..."
                    className="w-full px-4 py-2 rounded-lg border border-cream-border"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink mb-1">Mã màu (Hex)</label>
                  <input
                    type="text"
                    value={editingSubject.color || ''}
                    onChange={(e) => setEditingSubject({...editingSubject, color: e.target.value})}
                    placeholder="VD: #E8734A"
                    className="w-full px-4 py-2 rounded-lg border border-cream-border"
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSubject(null)}
                  className="px-4 py-2 bg-cream-border text-ink rounded-lg hover:bg-terracotta-100 transition-colors"
                >
                  <X size={18} />
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gold-600 text-white rounded-lg hover:opacity-90 transition-colors"
                >
                  <Check size={18} />
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setEditingSubject({ name: '', icon: '📚', color: '#CA8A04' })}
              className="w-full py-4 border-2 border-dashed border-cream-border rounded-2xl text-ink-muted font-medium hover:border-gold-600 hover:text-gold-600 transition-colors flex items-center justify-center gap-2 mb-6"
            >
              <Plus size={20} /> Thêm Môn Học
            </button>
          )}

          <div className="space-y-3">
            {subjects.map(subject => (
              <div key={subject.id} className="flex items-center justify-between p-4 bg-cream rounded-2xl border border-cream-border">
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm text-white overflow-hidden"
                    style={{ backgroundColor: subject.color || '#CA8A04' }}
                  >
                    {subject.icon?.startsWith('http') ? (
                      <img src={subject.icon} alt="icon" className="w-full h-full object-cover" />
                    ) : (
                      subject.icon
                    )}
                  </div>
                  <span className="font-semibold text-ink">{subject.name}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingSubject(subject)}
                    className="p-2 text-ink-muted hover:text-gold-600 hover:bg-gold-100 rounded-xl transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteSubject(subject.id)}
                    className="p-2 text-ink-muted hover:text-danger hover:bg-terracotta-100 rounded-xl transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {subjects.length === 0 && (
              <p className="text-ink-muted text-center py-4">Chưa có môn học nào.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
