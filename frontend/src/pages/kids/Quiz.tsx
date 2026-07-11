import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Heart, Volume2, Timer } from 'lucide-react';
import { useStudentStore } from '../../store/useStudentStore';
import { api } from '../../lib/api';
import confetti from 'canvas-confetti';

interface Question {
  id: string;
  type: string;
  content: string; // JSON string
  level: number;
  points: number;
}

export default function Quiz() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const { selectedStudent, setSelectedStudent } = useStudentStore();
  
  const [questions, setQuestions] = useState<any[]>([]);
  const [examName, setExamName] = useState('');
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [correctness, setCorrectness] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isTimeUp, setIsTimeUp] = useState(false);
  const [timeBonus, setTimeBonus] = useState(0);

  // Sound effects
  const playSound = (type: 'correct' | 'wrong' | 'complete') => {
    const audio = new Audio();
    if (type === 'correct') audio.src = 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3';
    if (type === 'wrong') audio.src = 'https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3';
    if (type === 'complete') audio.src = 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3';
    audio.volume = 0.5;
    audio.play().catch(e => console.log('Audio blocked', e));
  };

  useEffect(() => {
    if (!selectedStudent) {
      navigate('/');
      return;
    }
    
    setLoading(true);
    api.get(`/public/exams/${examId}`)
      .then(res => {
        setExamName(res.data.name);
        const mapped = res.data.questionsList.map((q: Question) => {
          let contentObj = { text: '', options: [], correct: '' };
          try {
            contentObj = JSON.parse(q.content);
          } catch(e) {}
          
          return {
            id: q.id,
            points: q.points,
            text: contentObj.text,
            options: contentObj.options || [],
            correct: contentObj.correct
          };
        });
        setQuestions(mapped);
        
        if (res.data.timeLimit && res.data.timeLimit > 0) {
          setTimeLeft(res.data.timeLimit * 60);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [examId, selectedStudent, navigate]);

  const handleAnswer = (answer: string) => {
    if (answers[currentQuestion] !== undefined) return;
    
    const correct = answer === questions[currentQuestion].correct;
    
    setAnswers(prev => ({ ...prev, [currentQuestion]: answer }));
    setCorrectness(prev => ({ ...prev, [currentQuestion]: correct }));
    
    if (correct) {
      playSound('correct');
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3B82F6', '#10B981', '#FCD34D']
      });
      setScore(s => s + questions[currentQuestion].points);
    } else {
      playSound('wrong');
    }

    setTimeout(() => {
      // Find next unanswered question
      let found = false;
      for (let i = currentQuestion + 1; i < questions.length; i++) {
        if (answers[i] === undefined && i !== currentQuestion) {
          setCurrentQuestion(i);
          found = true;
          break;
        }
      }
      if (!found) {
        for (let i = 0; i < currentQuestion; i++) {
          if (answers[i] === undefined && i !== currentQuestion) {
            setCurrentQuestion(i);
            found = true;
            break;
          }
        }
      }
    }, 1500);
  };

  const finishQuiz = async () => {
    playSound('complete');
    setShowResult(true);
    
    let bonus = 0;
    if (timeLeft !== null && timeLeft > 0 && !isTimeUp) {
      bonus = Math.floor(timeLeft / 10);
      setTimeBonus(bonus);
    }
    const finalScore = score + bonus;
    
    // Auto-calculate current streak just based on score > 0 for this demo
    const isPassing = finalScore > 0; // Or some threshold
    const newStreak = isPassing ? (selectedStudent?.currentStreak || 0) + 1 : 0;
    
    if (selectedStudent) {
      // Predict state to make UI snappy
      setSelectedStudent({
        ...selectedStudent,
        totalScore: selectedStudent.totalScore + finalScore,
        currentStreak: newStreak
      });

      // Sync with server
      try {
        await api.post('/public/submit', {
          studentId: selectedStudent.id,
          score: finalScore,
          streak: newStreak
        });
      } catch (error) {
        console.error('Failed to save progress', error);
      }
    }
  };

  // Timer Effect
  useEffect(() => {
    if (timeLeft === null || showResult || isTimeUp) return;

    if (timeLeft <= 0) {
      setIsTimeUp(true);
      playSound('wrong'); // Play a sound for time up
      finishQuiz();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, showResult, isTimeUp]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen p-6 md:p-12 relative overflow-hidden bg-slate-50 text-center flex flex-col items-center justify-center">
        <button onClick={() => navigate(-1)} className="absolute top-10 left-10 p-4 bg-white rounded-full shadow-sm"><ArrowLeft /></button>
        <div className="text-6xl mb-4">😅</div>
        <h2 className="text-2xl font-bold text-slate-800">Đề bài này trống không!</h2>
        <p className="text-slate-500 mt-2">Ba mẹ chưa thêm câu hỏi nào vào đề thi này.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 relative overflow-hidden flex flex-col">
      {/* Cảnh vật nền trang trí */}
      <div className="absolute -left-10 bottom-0 w-64 h-64 bg-green-200 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute -right-10 top-0 w-64 h-64 bg-blue-200 rounded-full blur-3xl opacity-50"></div>

      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col relative z-10">
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-slate-100 shadow-sm transition-all"
          >
            <ArrowLeft size={24} />
          </button>
          
          <div className="flex gap-4 items-center">
            {timeLeft !== null && (
              <div className={`bg-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-sm border ${timeLeft <= 60 ? 'border-red-500 animate-pulse' : 'border-slate-100'}`}>
                <Timer className={`${timeLeft <= 60 ? 'text-red-500' : 'text-blue-500'}`} size={24} />
                <span className={`font-extrabold text-xl ${timeLeft <= 60 ? 'text-red-500' : 'text-slate-800'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
            <div className="bg-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-sm border border-slate-100">
              <Star className="text-yellow-400 fill-yellow-400" size={24} />
              <span className="font-extrabold text-xl text-slate-800">{selectedStudent?.totalScore}</span>
            </div>
            <div className="bg-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-sm border border-slate-100">
              <Heart className="text-red-500 fill-red-500" size={24} />
              <span className="font-extrabold text-xl text-slate-800">{selectedStudent?.currentStreak} ngày</span>
            </div>
          </div>
        </div>

        <div className="mb-4 flex justify-between items-end">
          <h2 className="text-3xl font-bold text-slate-700">{examName}</h2>
          <span className="text-xl font-medium text-slate-500">
            Câu {currentQuestion + 1} / {questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-4 bg-slate-200 rounded-full mb-12 overflow-hidden shadow-inner">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(currentQuestion / questions.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        <AnimatePresence mode="wait">
          {!showResult ? (
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 flex flex-col items-center justify-center max-w-2xl mx-auto w-full"
            >
              <div className="bg-white w-full rounded-[3rem] p-10 md:p-16 shadow-xl shadow-slate-200/50 mb-10 text-center relative border border-slate-100">
                <button 
                  className="absolute top-6 right-6 p-4 bg-blue-50 text-primary rounded-2xl hover:bg-blue-100 transition-colors"
                  onClick={() => {
                    const msg = new SpeechSynthesisUtterance(questions[currentQuestion].text);
                    msg.lang = 'vi-VN';
                    window.speechSynthesis.speak(msg);
                  }}
                >
                  <Volume2 size={28} />
                </button>
                <h3 className="text-4xl md:text-5xl font-extrabold text-slate-800 leading-tight">
                  {questions[currentQuestion].text}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full">
                {questions[currentQuestion].options.map((option: string, idx: number) => {
                  const currentSelectedAnswer = answers[currentQuestion];
                  const currentIsCorrect = correctness[currentQuestion];
                  const isSelected = currentSelectedAnswer === option;
                  const isActuallyCorrect = option === questions[currentQuestion].correct;
                  
                  let bgColor = 'bg-white hover:bg-blue-50 hover:border-blue-300 border-slate-200';
                  let textColor = 'text-slate-700';

                  if (currentSelectedAnswer !== undefined) {
                    if (isActuallyCorrect) {
                      bgColor = 'bg-green-100 border-green-500 scale-105 shadow-lg shadow-green-200';
                      textColor = 'text-green-800';
                    } else if (isSelected && !isActuallyCorrect) {
                      bgColor = 'bg-red-100 border-red-500 opacity-70 scale-95';
                      textColor = 'text-red-800';
                    } else {
                      bgColor = 'bg-white border-slate-200 opacity-50';
                    }
                  }

                  return (
                    <motion.button
                      key={idx}
                      whileHover={currentSelectedAnswer === undefined ? { scale: 1.02 } : {}}
                      whileTap={currentSelectedAnswer === undefined ? { scale: 0.98 } : {}}
                      onClick={() => handleAnswer(option)}
                      disabled={currentSelectedAnswer !== undefined}
                      className={`relative p-8 rounded-3xl border-4 text-3xl font-bold transition-all duration-300 shadow-sm ${bgColor} ${textColor}`}
                    >
                      {option}
                      {isSelected && currentIsCorrect && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-4 -right-4 w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center text-xl shadow-lg border-4 border-white"
                        >
                          ✓
                        </motion.div>
                      )}
                      {isSelected && currentIsCorrect === false && (
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-4 -right-4 w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center text-xl shadow-lg border-4 border-white"
                        >
                          ✗
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto w-full"
            >
              <div className="w-48 h-48 bg-yellow-100 rounded-full flex items-center justify-center mb-8 relative">
                <div className="absolute inset-0 bg-yellow-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                <Star className="text-yellow-500 fill-yellow-500 relative z-10" size={96} />
              </div>
              
              <h2 className="text-5xl font-extrabold text-slate-800 mb-6">
                {isTimeUp ? 'Hết Giờ Rồi! ⏰' : 'Xuất Sắc! 🎉'}
              </h2>
              <div className="text-xl text-slate-600 font-medium mb-10 flex flex-col items-center">
                {isTimeUp 
                  ? <p className="mb-4">Bài làm của con đã được nộp tự động.</p>
                  : <p className="mb-4">Con đã hoàn thành bài tập siêu nhanh!</p>
                }
                
                <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl inline-block border-2 border-slate-200 shadow-sm text-left min-w-[300px]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-500">Điểm bài tập:</span>
                    <span className="text-blue-600 font-extrabold text-2xl">{score}</span>
                  </div>
                  {timeBonus > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-500">Thưởng tốc độ:</span>
                      <span className="text-green-500 font-extrabold text-2xl">+{timeBonus}</span>
                    </div>
                  )}
                  <div className="w-full h-px bg-slate-300 my-4"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-800 font-bold text-2xl">Tổng điểm:</span>
                    <span className="text-yellow-500 font-black text-4xl">+{score + timeBonus}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/kids')}
                className="px-10 py-5 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-2xl font-bold rounded-full hover:from-blue-600 hover:to-indigo-600 transition-all shadow-xl shadow-blue-200 hover:scale-105 transform duration-300"
              >
                Tiếp Tục Chơi
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Bar */}
        {!showResult && questions.length > 0 && (
          <motion.div 
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-white/80 backdrop-blur-md p-4 rounded-3xl mt-4 flex justify-between items-center shadow-sm border border-slate-200 relative z-20"
          >
            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
              {questions.map((_, idx) => {
                let bg = 'bg-slate-100 text-slate-500 border-slate-200';
                if (correctness[idx] === true) bg = 'bg-green-100 text-green-600 border-green-500';
                else if (correctness[idx] === false) bg = 'bg-red-100 text-red-600 border-red-500';
                
                const isCurrent = currentQuestion === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestion(idx)}
                    className={`min-w-[3rem] h-12 rounded-2xl font-bold flex items-center justify-center border-2 transition-all ${bg} ${isCurrent ? 'ring-4 ring-blue-300 scale-110 shadow-lg' : ''}`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>

            <button
              onClick={finishQuiz}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-bold rounded-2xl whitespace-nowrap ml-4 hover:shadow-lg hover:scale-105 transition-all shadow-md"
            >
              Nộp Bài
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
