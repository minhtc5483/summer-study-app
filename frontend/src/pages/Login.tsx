import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { api } from '../lib/api';
import { Home } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const setAuth = useAuthStore((state) => state.setAuth);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', { username, password });
      setAuth(res.data.token, res.data.refreshToken, res.data.user);
      navigate('/parent');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 relative">
      <Link 
        to="/" 
        className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-sm text-slate-600 hover:text-primary hover:bg-blue-50 transition-colors font-medium border border-slate-200"
      >
        <Home size={20} />
        Trang chủ
      </Link>
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
        <h2 className="text-3xl font-bold text-center text-primary-dark mb-6">Đăng Nhập Phụ Huynh</h2>
        {error && <div className="mb-4 text-sm text-danger bg-red-50 p-3 rounded-lg">{error}</div>}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Tên đăng nhập</label>
            <input
              type="text"
              className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-primary focus:border-primary"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Mật khẩu</label>
            <input
              type="password"
              className="mt-1 block w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-primary focus:border-primary"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 px-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-dark transition-colors"
          >
            Đăng Nhập
          </button>
        </form>
      </div>
    </div>
  );
}
