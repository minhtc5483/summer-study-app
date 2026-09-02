import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Lock, ShieldCheck, ArrowLeft } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useManageAccessStore } from '../../store/useManageAccessStore';

// Full-screen lock shown instead of the dashboard when the parent hasn't entered their
// management PIN on this device (or the 30-minute unlock lapsed). The login session itself
// is effectively permanent — tokens live in localStorage and the refresh token is rotated on
// every use — so without this, anyone holding the family tablet walks straight into the
// parent area by tapping "Quản lý Phụ huynh".
export function ManagePinLock() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Recovery path for a forgotten PIN. PUT /auth/manage-pin only ever checked the account
  // password (see backend/src/controllers/authController.ts) -- it never required the manage
  // token -- but this screen used to be the only door into /parent, and Settings (the only
  // place with a PIN reset form) sits behind that same door. Forgetting the PIN was a real
  // dead end: "log out and back in" (the old hint text below) hits this exact lock again,
  // it does not skip it. This form calls the already-password-gated endpoint directly.
  const [showForgot, setShowForgot] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [password, setPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [resetting, setResetting] = useState(false);
  const setManageToken = useManageAccessStore((s) => s.setManageToken);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/auth/manage-pin/verify', { pin });
      setManageToken(res.data.manageToken);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Sai mã PIN, thử lại nhé.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(newPin)) {
      setForgotError('Mã PIN phải gồm 4-8 chữ số.');
      return;
    }
    setForgotError('');
    setResetting(true);
    try {
      const res = await api.put('/auth/manage-pin', { pin: newPin, password });
      setManageToken(res.data.manageToken);
    } catch (err: any) {
      setForgotError(err.response?.data?.error || 'Mật khẩu không đúng, thử lại nhé.');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-terracotta-100 text-primary-dark flex items-center justify-center mx-auto mb-5">
          <Lock size={28} />
        </div>
        <h2 className="text-2xl font-bold text-ink mb-2">Khu quản lý phụ huynh</h2>
        <p className="text-ink-muted text-sm mb-6">Nhập mã PIN quản lý để tiếp tục.</p>

        {!showForgot ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="w-full text-center text-3xl tracking-[0.5em] py-4 border border-cream-border rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="••••"
              />
              {error && <p className="text-sm text-danger font-medium">{error}</p>}
              <button
                type="submit"
                disabled={pin.length < 4 || submitting}
                className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {submitting ? 'Đang kiểm tra...' : 'Mở khóa'}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-4 text-sm">
              <button onClick={() => navigate('/')} className="text-ink-muted hover:text-ink flex items-center gap-1 font-medium">
                <ArrowLeft size={16} /> Về trang chủ
              </button>
              <span className="text-cream-border">|</span>
              <button
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                className="text-ink-muted hover:text-danger font-medium"
              >
                Đăng xuất
              </button>
            </div>

            <button
              onClick={() => { setShowForgot(true); setForgotError(''); }}
              className="text-xs text-primary hover:text-primary-dark font-semibold mt-6"
            >
              Quên mã PIN? Đặt lại bằng mật khẩu tài khoản
            </button>
          </>
        ) : (
          <form onSubmit={handleReset} className="space-y-4 text-left">
            <button
              type="button"
              onClick={() => { setShowForgot(false); setForgotError(''); setNewPin(''); setPassword(''); }}
              className="text-xs text-ink-muted hover:text-ink flex items-center gap-1 font-medium mb-2"
            >
              <ArrowLeft size={14} /> Quay lại nhập PIN
            </button>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Mã PIN mới (4-8 chữ số)</label>
              <input
                type="password"
                inputMode="numeric"
                autoFocus
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="w-full px-4 py-3 border border-cream-border rounded-xl focus:ring-2 focus:ring-primary text-center tracking-widest"
                placeholder="Ví dụ: 2468"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Mật khẩu tài khoản (để xác nhận là bạn)</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-cream-border rounded-xl focus:ring-2 focus:ring-primary"
              />
            </div>
            {forgotError && <p className="text-sm text-danger font-medium">{forgotError}</p>}
            <button
              type="submit"
              disabled={resetting || !newPin || !password}
              className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors disabled:opacity-50"
            >
              {resetting ? 'Đang đặt lại...' : 'Đặt PIN mới'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// Shown once to a parent who has no PIN yet, so upgrading the app doesn't lock anyone out of
// their own account. Skippable, but it comes back on the next visit until a PIN is set.
export function ManagePinSetupPrompt({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const setManageToken = useManageAccessStore((s) => s.setManageToken);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4,8}$/.test(pin)) {
      setError('Mã PIN phải gồm 4-8 chữ số.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await api.put('/auth/manage-pin', { pin, password });
      setManageToken(res.data.manageToken);
      onDone();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Không đặt được mã PIN, thử lại nhé.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-sage-100 text-ink flex items-center justify-center shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-ink">Đặt mã PIN quản lý</h2>
            <p className="text-sm text-ink-muted">Để các bé không tự vào được khu quản lý</p>
          </div>
        </div>

        <p className="text-sm text-ink-muted mb-5">
          Máy đã đăng nhập sẽ ghi nhớ tài khoản rất lâu, nên chỉ cần bấm "Quản lý Phụ huynh" là vào được.
          Đặt một mã PIN ngắn để mỗi lần vào khu quản lý đều phải nhập lại.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Mã PIN mới (4-8 chữ số)</label>
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              className="w-full px-4 py-3 border border-cream-border rounded-xl focus:ring-2 focus:ring-primary"
              placeholder="Ví dụ: 2468"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Mật khẩu tài khoản (để xác nhận là bạn)</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-cream-border rounded-xl focus:ring-2 focus:ring-primary"
            />
          </div>
          {error && <p className="text-sm text-danger font-medium">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onSkip} className="flex-1 py-3 border border-cream-border text-ink-muted rounded-xl hover:bg-cream font-medium">
              Để sau
            </button>
            <button
              type="submit"
              disabled={submitting || !pin || !password}
              className="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <KeyRound size={18} /> {submitting ? 'Đang lưu...' : 'Đặt mã PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
