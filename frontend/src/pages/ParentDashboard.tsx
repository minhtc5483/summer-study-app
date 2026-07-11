
import { useAuthStore } from '../store/useAuthStore';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { Users, LogOut, Settings, BarChart } from 'lucide-react';

export default function ParentDashboard() {
  const { token, logout } = useAuthStore();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg flex flex-col">
        <div className="p-6 border-b border-slate-100">
          <h1 className="text-2xl font-bold text-primary-dark">Quản Lý</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <Link to="/parent" className="flex items-center gap-3 px-4 py-3 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
            <BarChart size={20} /> Tổng Quan
          </Link>
          <Link to="/parent/students" className="flex items-center gap-3 px-4 py-3 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
            <Users size={20} /> Học Sinh
          </Link>

          <Link to="/parent/settings" className="flex items-center gap-3 px-4 py-3 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
            <Settings size={20} /> Cài Đặt
          </Link>
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full text-danger rounded-xl hover:bg-red-50 transition-colors"
          >
            <LogOut size={20} /> Đăng Xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
