import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, Target, Brain, Award, Flame, CalendarClock, Trash2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface StudentStat {
  studentId: string;
  name: string;
  currentStreak: number;
  totalScore: number;
  totalAttempted: number;
  totalCorrect: number;
  accuracy: number;
  wrongQuestionsCount: number;
  earnedBadges?: { id: string; name: string; icon: string; color: string }[];
}

export default function Overview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<StudentStat[]>([]);
  const [aiSchedules, setAiSchedules] = useState<any[]>([]);
  const [pointExchanges, setPointExchanges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchStats = async () => {
      try {
        const [statRes, scheduleRes, exchangeRes] = await Promise.all([
          api.get('/statistics'),
          api.get('/exams/ai-schedules'),
          api.get('/point-exchanges')
        ]);
        if (isMounted) {
          setStats(statRes.data);
          setAiSchedules(scheduleRes.data);
          setPointExchanges(exchangeRes.data);
        }
      } catch (error) {
        console.error('Failed to fetch data', error);
      } finally {
        if (isMounted && loading) setLoading(false);
      }
    };
    
    fetchStats(); // Initial fetch
    
    // Polling every 3 seconds for instant updates
    const intervalId = setInterval(fetchStats, 3000);
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [loading]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleDeleteSchedule = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn hủy lịch tự động này?')) return;
    try {
      await api.delete(`/exams/ai-schedules/${id}`);
      setAiSchedules(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert('Không thể xóa lịch');
    }
  };

  const handleFulfillExchange = async (id: string) => {
    try {
      await api.put(`/point-exchanges/${id}/fulfill`);
      setPointExchanges(prev => prev.map(e => e.id === id ? { ...e, status: 'FULFILLED' } : e));
    } catch (err) {
      alert('Không thể cập nhật yêu cầu');
    }
  };

  // Summary calculations
  const totalStudents = stats.length;
  const avgAccuracy = totalStudents > 0 
    ? Math.round(stats.reduce((acc, curr) => acc + curr.accuracy, 0) / totalStudents)
    : 0;
  const totalQuestions = stats.reduce((acc, curr) => acc + curr.totalAttempted, 0);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold text-slate-800">Tổng Quan Tiến Độ</h2>
        <p className="text-slate-500 mt-2">Theo dõi kết quả học tập của các bé trong mùa hè này.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
        >
          <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
            <Users size={28} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Số Học Sinh</p>
            <p className="text-2xl font-bold text-slate-800">{totalStudents}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
        >
          <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
            <Target size={28} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Tỷ lệ Chính xác (TB)</p>
            <p className="text-2xl font-bold text-slate-800">{avgAccuracy}%</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4"
        >
          <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
            <Brain size={28} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Tổng Câu đã làm</p>
            <p className="text-2xl font-bold text-slate-800">{totalQuestions}</p>
          </div>
        </motion.div>
      </div>

      {/* Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Award className="text-yellow-500" /> Bảng Xếp Hạng Điểm Số
          </h3>
          <div className="h-80">
            {stats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="totalScore" name="Tổng Điểm" fill="#F59E0B" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Chưa có dữ liệu học tập
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Target className="text-blue-500" /> Tỷ lệ Chính xác (%)
          </h3>
          <div className="h-80">
            {stats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="accuracy" name="Độ Chính Xác (%)" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Chưa có dữ liệu học tập
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-800">Chi tiết Thành tích</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-sm">
              <tr>
                <th className="py-4 px-6 font-medium">Học sinh</th>
                <th className="py-4 px-6 font-medium">Tổng điểm</th>
                <th className="py-4 px-6 font-medium">Chuỗi ngày (Streak)</th>
                <th className="py-4 px-6 font-medium">Huy hiệu</th>
                <th className="py-4 px-6 font-medium">Đã làm</th>
                <th className="py-4 px-6 font-medium">Độ chính xác</th>
                <th className="py-4 px-6 font-medium">Câu sai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {stats.map((student) => (
                <tr 
                  key={student.studentId} 
                  className="hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/parent/students/${student.studentId}/stats`)}
                >
                  <td className="py-4 px-6 font-medium text-blue-600 hover:underline">{student.name}</td>
                  <td className="py-4 px-6">
                    <span className="flex items-center gap-1 font-bold text-yellow-500">
                      {student.totalScore} <Award size={16} />
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="flex items-center gap-1 text-orange-500 font-medium">
                      {student.currentStreak} <Flame size={16} />
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-1 flex-wrap max-w-[120px]">
                      {student.earnedBadges && student.earnedBadges.slice(0, 3).map(badge => (
                        <div key={badge.id} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shadow-sm border border-slate-700/50 ${badge.color}`} title={badge.name}>
                          {badge.icon}
                        </div>
                      ))}
                      {student.earnedBadges && student.earnedBadges.length > 3 && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-slate-700 text-slate-300 shadow-sm border border-slate-600">
                          +{student.earnedBadges.length - 3}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-slate-600">{student.totalAttempted} câu</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      student.accuracy >= 80 ? 'bg-green-100 text-green-700' :
                      student.accuracy >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {student.accuracy}%
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-600">{student.wrongQuestionsCount} câu</td>
                </tr>
              ))}
              {stats.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Chưa có học sinh nào. Hãy thêm học sinh và làm bài tập nhé!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Schedules Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 overflow-hidden mt-8">
        <div className="p-6 border-b border-blue-100 bg-blue-50/50 flex items-center gap-3">
          <CalendarClock className="text-blue-600" />
          <h3 className="text-lg font-bold text-blue-900">Lịch giao bài tự động bằng AI</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-sm">
              <tr>
                <th className="py-4 px-6 font-medium">Môn học</th>
                <th className="py-4 px-6 font-medium">Chủ đề</th>
                <th className="py-4 px-6 font-medium">Cấu trúc đề</th>
                <th className="py-4 px-6 font-medium">Lịch tạo đề</th>
                <th className="py-4 px-6 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {aiSchedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-800">{schedule.subject?.name}</td>
                  <td className="py-4 px-6 text-slate-600">{schedule.topic?.name || 'Tất cả'}</td>
                  <td className="py-4 px-6 text-slate-600">
                    {schedule.numberOfQuestions} câu / {schedule.timeLimit} phút
                  </td>
                  <td className="py-4 px-6 text-blue-600 font-medium">
                    Hằng ngày lúc 06:00
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button 
                      onClick={() => handleDeleteSchedule(schedule.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hủy lịch"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {aiSchedules.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Bạn chưa cài đặt lịch tự động nào. Hãy vào "Tạo đề nhanh" để thiết lập.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Point Exchanges Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-purple-100 overflow-hidden mt-8">
        <div className="p-6 border-b border-purple-100 bg-purple-50/50 flex items-center gap-3">
          <Award className="text-purple-600" />
          <h3 className="text-lg font-bold text-purple-900">Yêu cầu đổi Giờ chơi điện thoại</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-sm">
              <tr>
                <th className="py-4 px-6 font-medium">Học sinh</th>
                <th className="py-4 px-6 font-medium">Điểm đã dùng</th>
                <th className="py-4 px-6 font-medium">Thời gian chơi (Phút)</th>
                <th className="py-4 px-6 font-medium">Thời gian đổi</th>
                <th className="py-4 px-6 font-medium">Trạng thái</th>
                <th className="py-4 px-6 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pointExchanges.map((exchange) => (
                <tr key={exchange.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-800 flex items-center gap-3">
                    <img 
                      src={exchange.student.avatar ? `http://localhost:3000${exchange.student.avatar}` : `https://ui-avatars.com/api/?name=${exchange.student.name}`}
                      alt={exchange.student.name}
                      className="w-8 h-8 rounded-full"
                    />
                    {exchange.student.name}
                  </td>
                  <td className="py-4 px-6 text-orange-600 font-bold">-{exchange.points}</td>
                  <td className="py-4 px-6 text-purple-600 font-bold">{exchange.minutes} Phút</td>
                  <td className="py-4 px-6 text-slate-600">
                    {new Date(exchange.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="py-4 px-6">
                    {exchange.status === 'PENDING' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">Đang chờ</span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Đã duyệt</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    {exchange.status === 'PENDING' && (
                      <button 
                        onClick={() => handleFulfillExchange(exchange.id)}
                        className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg transition-colors flex items-center gap-2 ml-auto"
                      >
                        <CheckCircle size={16} /> Đã cho chơi
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {pointExchanges.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Chưa có yêu cầu đổi giờ chơi nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
