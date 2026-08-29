
import { useAuthStore } from '../store/useAuthStore';
import { useManageAccessStore } from '../store/useManageAccessStore';
import { ManagePinLock, ManagePinSetupPrompt } from './parent/ManagePinGate';
import { Navigate, Outlet, NavLink } from 'react-router-dom';
import { Users, LogOut, Settings, BarChart, BookOpen, Bell, CheckCircle2, GraduationCap, Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const NAV_ITEMS = [
  { to: '/parent', label: 'Tổng Quan', icon: BarChart, end: true },
  { to: '/parent/students', label: 'Học Sinh', icon: Users, end: false },
  { to: '/parent/question-bank', label: 'Kho Bài Tập', icon: BookOpen, end: false },
  { to: '/parent/settings', label: 'Cài Đặt', icon: Settings, end: false },
];

interface AppNotification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export default function ParentDashboard() {
  const { token, logout } = useAuthStore();
  const manageToken = useManageAccessStore((s) => s.manageToken);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  // null while we're still asking the server whether this parent has a management PIN.
  const [hasManagePin, setHasManagePin] = useState<boolean | null>(null);
  const [setupSkipped, setSetupSkipped] = useState(false);
  // The sidebar is a fixed 256px column, which left a phone with a ~120px content strip —
  // unusable, and the reason the "Nhập (CSV)" flow was unreachable on a phone. Below md it
  // becomes a drawer opened from the top bar.
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    let isMounted = true;
    api
      .get('/auth/manage-pin')
      .then((res) => isMounted && setHasManagePin(!!res.data.hasPin))
      .catch(() => isMounted && setHasManagePin(false));
    return () => {
      isMounted = false;
    };
  }, [token]);

  const locked = hasManagePin === true && !manageToken;

  useEffect(() => {
    if (!token || locked) return;
    
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
  }, [token, locked]);

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

  // Don't render the dashboard (or let its pages fire requests) until we know whether a PIN
  // is required — otherwise every child page would flash and then 403.
  if (hasManagePin === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-cream text-ink-muted font-medium">
        Đang tải...
      </div>
    );
  }

  if (locked) {
    return <ManagePinLock />;
  }

  return (
    <div className="flex h-screen bg-cream relative">
      {hasManagePin === false && !setupSkipped && (
        <ManagePinSetupPrompt onDone={() => setHasManagePin(true)} onSkip={() => setSetupSkipped(true)} />
      )}
      {/* Sidebar — permanent from md up, a slide-over drawer on phones */}
      {mobileNavOpen && (
        <div className="fixed inset-0 bg-ink/40 z-40 md:hidden" onClick={() => setMobileNavOpen(false)} />
      )}
      <aside
        className={`w-64 bg-white shadow-lg flex flex-col shrink-0 z-50 md:z-auto fixed md:static inset-y-0 left-0 transition-transform md:translate-x-0 ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setMobileNavOpen(false)}
          className="md:hidden absolute top-4 right-4 p-2 text-ink-muted hover:text-ink"
          aria-label="Đóng menu"
        >
          <X size={20} />
        </button>
        <div className="p-6 border-b border-cream-border flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shrink-0">
            <GraduationCap size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-ink leading-tight truncate">Ôn Luyện Hè</h1>
            <p className="text-xs text-ink-muted font-medium">Quản lý phụ huynh</p>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary-dark'
                    : 'text-ink-muted hover:bg-cream'
                }`
              }
              onClick={() => setMobileNavOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} className={isActive ? 'text-primary' : ''} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-cream-border">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 w-full text-danger rounded-xl hover:bg-red-50 transition-colors font-medium"
          >
            <LogOut size={20} /> Đăng Xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header bar for notifications */}
        <header className="h-16 bg-white border-b border-cream-border flex items-center justify-between md:justify-end px-4 md:px-8 relative z-30">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="md:hidden flex items-center gap-2 p-2 -ml-2 text-ink-muted hover:text-ink font-semibold"
            aria-label="Mở menu"
          >
            <Menu size={22} />
            <span className="text-sm">Menu</span>
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-ink-muted hover:bg-cream relative transition-all"
            >
              <Bell size={24} className={unreadCount > 0 ? "animate-pulse text-primary" : ""} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-cream-border overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-cream-border flex justify-between items-center bg-cream">
                  <h3 className="font-bold text-ink">Thông báo</h3>
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
                    <div className="divide-y divide-cream-border">
                      {notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={`p-4 transition-colors ${notif.isRead ? 'bg-white opacity-70' : 'bg-terracotta-100/50'}`}
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
                                className="text-primary hover:text-primary-dark"
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

        <div className="flex-1 p-4 md:p-8 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
