import React, { useState } from 'react';
import { KeyRound, Lock } from 'lucide-react';
import { api } from '../../lib/api';

// Kept in its own file rather than added to Settings.tsx, which is already well past the
// 300-line limit in coding-rules.md.
export default function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Hai ô mật khẩu mới không giống nhau.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      await api.put('/auth/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSaved(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không đổi được mật khẩu, thử lại nhé.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full px-4 py-2 rounded-xl border border-cream-border focus:ring-2 focus:ring-primary';

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-cream-border p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 bg-cream rounded-2xl flex items-center justify-center text-ink">
          <Lock size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-ink">Đổi mật khẩu</h3>
          <p className="text-xs text-ink-muted font-medium">Mật khẩu đăng nhập tài khoản phụ huynh</p>
        </div>
      </div>
      <p className="text-ink-muted text-sm mb-6">
        Đây là mật khẩu dùng ở màn hình đăng nhập. Khác với mã PIN quản lý ở trên — PIN chỉ chặn cửa khu quản lý
        trên máy đã đăng nhập sẵn.
      </p>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Mật khẩu hiện tại</label>
          <input
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => { setCurrentPassword(e.target.value); setSaved(false); }}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Mật khẩu mới (tối thiểu 6 ký tự)</label>
          <input
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => { setNewPassword(e.target.value); setSaved(false); }}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-muted mb-1">Nhập lại mật khẩu mới</label>
          <input
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => { setConfirmPassword(e.target.value); setSaved(false); }}
            className={inputClass}
          />
        </div>

        <div className="sm:col-span-3">
          <button
            type="submit"
            disabled={saving || !currentPassword || !newPassword || !confirmPassword}
            className="px-6 py-2 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark disabled:opacity-50 flex items-center gap-2"
          >
            <KeyRound size={18} /> {saving ? 'Đang lưu...' : 'Đổi mật khẩu'}
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-danger font-medium mt-3">{error}</p>}
      {saved && (
        <div className="mt-3 text-sm text-secondary-dark font-medium">
          <p>Đã đổi mật khẩu. Lần đăng nhập sau hãy dùng mật khẩu mới.</p>
          <p className="text-ink-muted font-normal mt-1">
            Các máy khác đang đăng nhập sẵn vẫn vào được cho tới khi phiên hết hạn — app chưa có cơ chế đá phiên từ xa.
          </p>
        </div>
      )}
    </div>
  );
}
