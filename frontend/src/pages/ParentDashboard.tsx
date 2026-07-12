
import { useAuthStore } from '../store/useAuthStore';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { Users, LogOut, Settings, BarChart, BookOpen, Bell, CheckCircle2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface AppNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function ParentDashboard() {
  const { token, logout } = useAuthStore();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!token) return;
    
    let isMounted = true;
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        if (isMounted) setNotifications(res.data);
      } catch (err) {
        // ignore
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000); // Poll every 5s
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [token]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => 
        (id === 'all' || n.id === id) ? { ...n, isRead: true } : n
      ));
    } catch (err) {
      console.error(err);
    }
  };

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50 relative">
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
          <Link to="/parent/question-bank" className="flex items-center gap-3 px-4 py-3 text-slate-700 rounded-xl hover:bg-slate-100 transition-colors">
            <BookOpen size={20} /> Kho Bài Tập
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
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header bar for notifications */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-end px-8 relative z-50">
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 hover:bg-slate-100 relative transition-all"
            >
              <Bell size={24} className={unreadCount > 0 ? "animate-pulse text-primary" : ""} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-bold text-slate-800">Thông báo</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={() => markAsRead('all')}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      Chưa có thông báo nào
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`p-4 transition-colors ${notif.isRead ? 'bg-white opacity-70' : 'bg-blue-50/50'}`}
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <h4 className={`text-sm ${notif.isRead ? 'font-medium text-slate-700' : 'font-bold text-slate-900'}`}>
                                {notif.title}
                              </h4>
                              <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                              <p className="text-[10px] text-slate-400 mt-2">
                                {new Date(notif.createdAt).toLocaleString('vi-VN')}
                              </p>
                            </div>
                            {!notif.isRead && (
                              <button 
                                onClick={() => markAsRead(notif.id)}
                                className="text-blue-500 hover:text-blue-700"
                                title="Đánh dấu đã đọc"
                              >
                                <CheckCircle2 size={18} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
