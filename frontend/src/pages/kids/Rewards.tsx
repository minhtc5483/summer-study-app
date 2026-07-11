import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Star, Flame, Trophy, Lock, ShoppingBag, Tv, Smartphone, Gamepad2 } from 'lucide-react';
import { useStudentStore } from '../../store/useStudentStore';
import { api } from '../../lib/api';
import confetti from 'canvas-confetti';

interface Badge {
  id: string;
  name: string;
  description: string;
  type: string;
  requirement: number;
  icon: string;
  color: string;
  isEarned: boolean;
  progress: number;
}

export default function Rewards() {
  const navigate = useNavigate();
  const { selectedStudent, setSelectedStudent } = useStudentStore();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);
  const [exchanging, setExchanging] = useState<string | null>(null);

  const STORE_ITEMS = [
    { id: '15_min_tv', name: '15 Phút Xem TV', cost: 500, icon: <Tv size={32} />, color: 'bg-blue-100 text-blue-600 border-blue-200' },
    { id: '30_min_ipad', name: '30 Phút iPad', cost: 1000, icon: <Smartphone size={32} />, color: 'bg-purple-100 text-purple-600 border-purple-200' },
    { id: '1_hr_game', name: '1 Giờ Chơi Game', cost: 2000, icon: <Gamepad2 size={32} />, color: 'bg-rose-100 text-rose-600 border-rose-200' },
  ];

  const handleExchange = async (item: typeof STORE_ITEMS[0]) => {
    if (!selectedStudent || selectedStudent.totalScore < item.cost) {
      alert("Con chưa đủ điểm để đổi món này rùi!");
      return;
    }
    
    if (!window.confirm(`Con có chắc muốn dùng ${item.cost} điểm để đổi "${item.name}" không?`)) return;

    setExchanging(item.id);
    try {
      const res = await api.post('/public/exchange-points', {
        studentId: selectedStudent.id,
        cost: item.cost,
        itemName: item.name
      });
      
      if (res.data.success) {
        setSelectedStudent({
          ...selectedStudent,
          totalScore: res.data.newTotalScore
        });
        
        confetti({
          particleCount: 200,
          spread: 100,
          origin: { y: 0.5 },
          colors: ['#FBBF24', '#F87171', '#60A5FA', '#34D399']
        });
        
        setTimeout(() => {
          alert(`Chúc mừng con đã đổi thành công "${item.name}"! Hãy đưa màn hình này cho Ba Mẹ xem nhé.`);
        }, 500);
      }
    } catch (error) {
      console.error(error);
      alert("Có lỗi xảy ra khi đổi quà!");
    } finally {
      setExchanging(null);
    }
  };

  useEffect(() => {
    if (!selectedStudent) {
      navigate('/');
      return;
    }

    const fetchRewards = async () => {
      try {
        const response = await api.get(`/public/rewards/${selectedStudent.id}`);
        setBadges(response.data.badges);
        
        // Cùng check xem nếu có badge mới thì bắn pháo hoa
        const earned = response.data.badges.filter((b: Badge) => b.isEarned);
        if (earned.length > 0) {
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#FBBF24', '#F87171', '#60A5FA', '#34D399']
          });
        }
      } catch (error) {
        console.error('Lỗi khi lấy phần thưởng', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRewards();
  }, [selectedStudent, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 p-6 md:p-12 relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-200 rounded-full blur-3xl opacity-30 -translate-y-1/2 translate-x-1/3"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-orange-200 rounded-full blur-3xl opacity-30 translate-y-1/3 -translate-x-1/3"></div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 shadow-sm transition-all border border-yellow-100"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div className="flex gap-4">
            <div className="bg-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-sm border border-yellow-100">
              <Star className="text-yellow-400 fill-yellow-400" size={24} />
              <span className="font-extrabold text-xl text-slate-800">{selectedStudent?.totalScore}</span>
            </div>
            <div className="bg-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-sm border border-yellow-100">
              <Flame className="text-orange-500 fill-orange-500" size={24} />
              <span className="font-extrabold text-xl text-slate-800">{selectedStudent?.currentStreak} ngày</span>
            </div>
          </div>
        </div>

        <div className="text-center mb-12">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-24 h-24 bg-gradient-to-tr from-yellow-400 to-orange-500 rounded-full mx-auto flex items-center justify-center mb-6 shadow-xl shadow-yellow-200"
          >
            <Trophy size={48} className="text-white" />
          </motion.div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 mb-4">Góc Phần Thưởng</h1>
          <p className="text-xl text-slate-600">Cố gắng hoàn thành bài tập để mở khóa huy hiệu mới nhé!</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {badges.map((badge, idx) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`bg-white rounded-3xl p-6 shadow-sm border-2 ${badge.isEarned ? 'border-yellow-200 bg-gradient-to-b from-white to-yellow-50/50' : 'border-slate-100 grayscale-[0.5] opacity-80'}`}
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-inner ${badge.isEarned ? badge.color : 'bg-slate-100'}`}>
                  {badge.icon}
                </div>
                {!badge.isEarned && (
                  <div className="bg-slate-100 p-2 rounded-full text-slate-400">
                    <Lock size={20} />
                  </div>
                )}
              </div>
              
              <h3 className={`text-xl font-bold mb-2 ${badge.isEarned ? 'text-slate-800' : 'text-slate-600'}`}>
                {badge.name}
              </h3>
              <p className="text-slate-500 text-sm mb-4 min-h-[40px]">
                {badge.description}
              </p>

              {!badge.isEarned && (
                <div className="mt-auto">
                  <div className="flex justify-between text-xs font-bold text-slate-400 mb-1">
                    <span>Tiến độ</span>
                    <span>{badge.progress}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-slate-300 rounded-full transition-all duration-1000"
                      style={{ width: `${badge.progress}%` }}
                    />
                  </div>
                </div>
              )}
              {badge.isEarned && (
                <div className="mt-auto flex items-center gap-2 text-green-600 font-bold bg-green-50 px-3 py-2 rounded-xl text-sm w-fit">
                  <Star size={16} className="fill-green-600" /> Đã Mở Khóa
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Store Section */}
        <div className="mt-20">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-tr from-pink-400 to-rose-500 rounded-full mx-auto flex items-center justify-center mb-4 shadow-lg shadow-pink-200">
              <ShoppingBag size={40} className="text-white" />
            </div>
            <h2 className="text-4xl font-extrabold text-slate-800 mb-3">Cửa Hàng Đổi Thưởng</h2>
            <p className="text-lg text-slate-600">Dùng điểm thưởng của con để đổi lấy thời gian giải trí nhé!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STORE_ITEMS.map((item, idx) => {
              const canAfford = (selectedStudent?.totalScore || 0) >= item.cost;
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`bg-white rounded-3xl p-6 shadow-sm border-2 text-center flex flex-col items-center relative overflow-hidden ${item.color} ${!canAfford ? 'opacity-70 grayscale-[0.3]' : 'hover:-translate-y-1 hover:shadow-lg transition-all duration-300'}`}
                >
                  <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-inner text-current">
                    {item.icon}
                  </div>
                  <h3 className="text-2xl font-bold mb-2 text-slate-800">{item.name}</h3>
                  <div className="flex items-center gap-1 font-bold text-lg mb-6 bg-white/50 px-4 py-1 rounded-full text-slate-700">
                    <Star size={20} className="text-yellow-500 fill-yellow-500" /> {item.cost} điểm
                  </div>
                  
                  <button
                    onClick={() => handleExchange(item)}
                    disabled={!canAfford || exchanging === item.id}
                    className={`mt-auto w-full py-4 rounded-2xl font-bold text-lg transition-all ${
                      exchanging === item.id 
                        ? 'bg-slate-200 text-slate-500' 
                        : canAfford 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md hover:shadow-xl hover:scale-[1.02]' 
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {exchanging === item.id ? 'Đang Đổi...' : canAfford ? 'Đổi Ngay' : 'Chưa đủ điểm'}
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
