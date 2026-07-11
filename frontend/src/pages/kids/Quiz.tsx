import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStudentStore } from '../../store/useStudentStore';
import { api } from '../../lib/api';

// Mock data for demonstration
const mockQuestions = [
  { id: 1, text: '8 + 7 = ?', options: ['13', '14', '15', '16'], correct: '15' },
  { id: 2, text: '12 - 5 = ?', options: ['6', '7', '8', '9'], correct: '7' },
];

export default function Quiz() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const { selectedStudent, setSelectedStudent } = useStudentStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!selectedStudent) {
      navigate('/');
    }
  }, [selectedStudent, navigate]);

  const currentQ = mockQuestions[currentIndex];
  const isFinished = currentIndex >= mockQuestions.length;

  useEffect(() => {
    if (isFinished && selectedStudent) {
      // Submit progress to backend
      api.post('/submit', {
        studentId: selectedStudent.id,
        topicId: "mock-topic-id", // MVP placeholder
        questionsAttempted: mockQuestions.length,
        questionsCorrect: score / 10,
        score: score
      }).then((res: any) => {
        // Update local store streak & score
        setSelectedStudent({
          ...selectedStudent,
          totalScore: selectedStudent.totalScore + score,
          currentStreak: res.data.newStreak || selectedStudent.currentStreak
        });
      }).catch((err: any) => {
        console.error('Failed to submit progress', err);
      });
    }
  }, [isFinished]);

  if (!selectedStudent) return null;

  const handleAnswer = (option: string) => {
    if (selected) return; // Prevent multiple clicks
    setSelected(option);
    
    if (option === currentQ.correct) {
      setIsCorrect(true);
      setScore(prev => prev + 10);
    } else {
      setIsCorrect(false);
    }
  };

  const handleNext = () => {
    setSelected(null);
    setIsCorrect(null);
    setCurrentIndex(prev => prev + 1);
  };

  if (isFinished) {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white p-10 rounded-3xl shadow-xl text-center max-w-md w-full"
        >
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-4xl font-bold text-slate-800 mb-2">Hoàn thành!</h2>
          <p className="text-xl text-slate-600 mb-6">Con giỏi quá!</p>
          
          <div className="flex justify-center gap-2 mb-8 text-yellow-400">
            <Star size={40} fill="currentColor" />
            <Star size={40} fill="currentColor" />
            <Star size={40} fill="currentColor" />
          </div>
          
          <div className="bg-slate-50 rounded-2xl p-6 mb-8">
            <p className="text-2xl font-bold text-primary">Điểm: {score}</p>
          </div>

          <button 
            onClick={() => navigate('/kids')}
            className="w-full py-4 bg-primary text-white text-xl font-bold rounded-2xl hover:bg-primary-dark transition-colors"
          >
            Về Trang Chủ
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-6 relative">
      {/* Global Navigation */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm text-slate-600 hover:text-primary transition-colors font-medium text-sm">
          <span className="text-lg">🏠</span> Trang chủ
        </button>
        <button onClick={() => navigate('/login')} className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-sm rounded-xl shadow-sm text-slate-600 hover:text-primary transition-colors font-medium text-sm">
          <span className="text-lg">👨‍👩‍👧</span> Phụ huynh
        </button>
      </div>

      <header className="flex justify-between items-center mb-8 mt-12">
        <button onClick={() => navigate('/kids')} className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-slate-400 hover:text-slate-600 tooltip" title="Thoát khỏi bài tập">
          <X size={24} />
        </button>
        <div className="bg-white px-6 py-2 rounded-full shadow-sm font-bold text-slate-500">
          Câu {currentIndex + 1} / {mockQuestions.length}
        </div>
        <div className="w-12 h-12"></div>
      </header>

      <main className="flex-1 flex flex-col max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className="flex-1 flex flex-col"
          >
            <div className="bg-white rounded-3xl p-10 shadow-sm mb-8 text-center min-h-[200px] flex items-center justify-center">
              <h2 className="text-5xl font-extrabold text-slate-800">{currentQ.text}</h2>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {currentQ.options.map((opt) => {
                let btnClass = "bg-white text-slate-700 border-2 border-slate-200 hover:border-primary hover:bg-blue-50";
                
                if (selected === opt) {
                  if (isCorrect) btnClass = "bg-green-500 text-white border-green-500 shadow-lg shadow-green-200";
                  else btnClass = "bg-red-500 text-white border-red-500 shadow-lg shadow-red-200";
                } else if (selected && opt === currentQ.correct && !isCorrect) {
                  // Show correct answer if selected wrong
                  btnClass = "bg-green-100 text-green-700 border-green-400";
                }

                return (
                  <button
                    key={opt}
                    disabled={selected !== null}
                    onClick={() => handleAnswer(opt)}
                    className={`text-3xl font-bold py-8 rounded-3xl transition-all duration-300 ${btnClass}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {selected && (
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="text-center"
              >
                {isCorrect ? (
                  <div className="mb-6">
                    <p className="text-2xl font-bold text-green-500 mb-2">🎉 Chính xác!</p>
                    <p className="text-orange-500 font-bold">+10 điểm</p>
                  </div>
                ) : (
                  <div className="mb-6">
                    <p className="text-2xl font-bold text-slate-600 mb-2">😊 Gần đúng rồi!</p>
                    <p className="text-slate-500">Cùng cố gắng câu tiếp theo nhé.</p>
                  </div>
                )}
                <button
                  onClick={handleNext}
                  className="w-full md:w-auto md:px-12 py-4 bg-primary text-white text-2xl font-bold rounded-2xl hover:bg-primary-dark transition-colors shadow-lg shadow-blue-200"
                >
                  Tiếp Tục
                </button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
