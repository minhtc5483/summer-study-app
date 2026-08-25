import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../lib/api';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { ArrowLeft, Target, Award, Brain, Target as TargetIcon, Clock } from 'lucide-react';

export default function StudentDetailStats() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get(`/statistics/students/${id}/details`);
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center text-ink-muted py-12">
        <p>Không tìm thấy dữ liệu học sinh.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-primary font-bold">Quay lại</button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-cream rounded-xl transition-colors">
          <ArrowLeft size={24} className="text-ink-muted" />
        </button>
        <div className="flex items-center gap-4">
          <img 
            src={data.student.avatar ? data.student.avatar : `https://ui-avatars.com/api/?name=${data.student.name}`}
            alt="avatar" 
            className="w-16 h-16 rounded-2xl object-cover bg-white p-1 border border-cream-border shadow-sm"
          />
          <div>
            <h2 className="text-3xl font-bold text-ink">Thống Kê Của {data.student.name}</h2>
            <p className="text-ink-muted font-medium">{data.student.totalScore.toLocaleString('vi-VN')} Điểm Thành Tích • Chuỗi {data.student.currentStreak} ngày</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-cream-border shadow-sm flex flex-col gap-2">
          <TargetIcon className="text-primary" size={28} />
          <p className="text-sm text-ink-muted font-bold uppercase">Tổng Số Bài Thi</p>
          <p className="text-3xl font-black text-ink">{data.summary.totalExams}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-cream-border shadow-sm flex flex-col gap-2">
          <Brain className="text-gold-600" size={28} />
          <p className="text-sm text-ink-muted font-bold uppercase">Tổng Số Câu Hỏi</p>
          <p className="text-3xl font-black text-ink">{data.summary.totalQuestions}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-cream-border shadow-sm flex flex-col gap-2">
          <Award className="text-secondary-dark" size={28} />
          <p className="text-sm text-ink-muted font-bold uppercase">Độ Chính Xác</p>
          <p className="text-3xl font-black text-ink">{data.summary.avgAccuracy}%</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-cream-border shadow-sm flex flex-col gap-2">
          <Clock className="text-primary-dark" size={28} />
          <p className="text-sm text-ink-muted font-bold uppercase">TG TB/Bài</p>
          <p className="text-3xl font-black text-ink">{Math.floor(data.summary.avgTimeSpent / 60)}m {data.summary.avgTimeSpent % 60}s</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-cream-border shadow-sm flex flex-col gap-2">
          <Target className="text-danger" size={28} />
          <p className="text-sm text-ink-muted font-bold uppercase">Câu Sai Lưu Trữ</p>
          <p className="text-3xl font-black text-ink">{data.summary.wrongCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Biểu đồ điểm theo thời gian */}
        <div className="bg-white p-6 rounded-3xl border border-cream-border shadow-sm">
          <h3 className="text-lg font-bold text-ink mb-6">Tiến Độ Điểm Số</h3>
          <div className="h-72">
            {data.timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.timelineData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line type="monotone" dataKey="score" name="Điểm" stroke="#E8734A" strokeWidth={3} dot={{r: 4, fill: '#E8734A', strokeWidth: 2}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-ink-muted">Chưa có bài thi nào</div>
            )}
          </div>
        </div>

        {/* Độ chính xác theo môn học */}
        <div className="bg-white p-6 rounded-3xl border border-cream-border shadow-sm">
          <h3 className="text-lg font-bold text-ink mb-6">Mức Độ Thành Thạo Theo Môn</h3>
          <div className="h-72">
            {data.subjectData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.subjectData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="subject" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="accuracy" name="Độ Chính Xác (%)" fill="#7FA885" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-ink-muted">Chưa có dữ liệu</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-cream-border shadow-sm">
          <h3 className="text-lg font-bold text-ink mb-6">Lỗi Sai Theo Độ Khó</h3>
          <div className="h-64 flex justify-center">
            {data.difficultyData && data.difficultyData.some((d: any) => d.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.difficultyData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
                  <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="value" name="Số câu sai" radius={[4, 4, 0, 0]} barSize={40}>
                    {data.difficultyData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-ink-muted">Chưa có dữ liệu</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-cream-border shadow-sm">
          <h3 className="text-lg font-bold text-ink mb-6">Tỉ Lệ Đúng Sai Tổng Quan</h3>
          <div className="h-64 flex justify-center">
            {data.accuracyData[0].value > 0 || data.accuracyData[1].value > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.accuracyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {data.accuracyData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
               <div className="h-full flex items-center justify-center text-ink-muted">Chưa có dữ liệu</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
