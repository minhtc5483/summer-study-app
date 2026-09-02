import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Star, Heart, Timer } from 'lucide-react';
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
  const [searchParams] = useSearchParams();
  const isReview = searchParams.get('mode') === 'review';
  const [examName, setExamName] = useState('');
  
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [correctness, setCorrectness] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);

  // Timer states
  const [startTime] = useState<number>(Date.now());
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
    api.get(`/public/exams/${examId}?studentId=${selectedStudent.id}`)
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
        
        if (isReview && res.data.examResult?.answers) {
          try {
            const savedAnswers = JSON.parse(res.data.examResult.answers);
            setAnswers(savedAnswers);
            const newCorrectness: Record<number, boolean> = {};
            Object.keys(savedAnswers).forEach(idxStr => {
              const idx = parseInt(idxStr);
              if (mapped[idx]) {
                newCorrectness[idx] = savedAnswers[idxStr] === mapped[idx].correct;
              }
            });
            setCorrectness(newCorrectness);
          } catch(e) {}
        }

        if (res.data.timeLimit && res.data.timeLimit > 0) {
          setTimeLeft(res.data.timeLimit * 60);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [examId, selectedStudent, navigate, isReview]);

  const handleAnswer = (answer: string) => {
    if (isReview) return;
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
      // Predict state to make UI snappy while the request is in flight — the client's guess
      // at both the score bonus (unconditional Math.floor(timeLeft/10)) and the streak
      // (score > 0 ? +1 : 0) are both just approximations of what the server actually
      // computes (accuracy-scaled bonus; day-based streak — see progressController.ts).
      setSelectedStudent({
        ...selectedStudent,
        totalScore: selectedStudent.totalScore + finalScore,
        currentStreak: newStreak
      });

      // Sync with server
      try {
        let timeSpent = Math.floor((Date.now() - startTime) / 1000);
        const wrongQuestions = Object.entries(correctness)
          .filter(([_, isCorrect]) => !isCorrect)
          .map(([idxStr]) => {
            const idx = parseInt(idxStr);
            return {
              questionId: questions[idx].id,
              userAnswer: answers[idx as unknown as number] || answers[idx]
            };
          });

        const res = await api.post('/public/submit', {
          studentId: selectedStudent.id,
          questionsAttempted: questions.length,
          questionsCorrect: Object.values(correctness).filter(Boolean).length,
          score: finalScore,
          streak: newStreak,
          examId: examId,
          answers: answers,
          timeSpent: timeSpent,
          wrongQuestions: wrongQuestions
        });

        // Reconcile with the server's real numbers — the store this writes to is persisted
        // to localStorage and otherwise never gets corrected. Left as the client's guess,
        // it drifts a little further from the truth on every single exam (the guess above,
        // any manual score adjustment a parent makes directly, a scoring rule that changes
        // server-side, ...) and previously stayed wrong until the bé logged out and back in
        // (which re-fetches the real totals from /public/students).
        if (typeof res.data.totalScore === 'number') {
          setSelectedStudent({
            ...selectedStudent,
            totalScore: res.data.totalScore,
            currentStreak: res.data.newStreak ?? newStreak
          });
        }
      } catch (error) {
        console.error('Failed to save progress', error);
      }
    }
  };

  // Timer Effect
  useEffect(() => {
    if (isReview) return;
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

  // Auto-submit Effect
  useEffect(() => {
    if (isReview || showResult || questions.length === 0) return;
    
    if (Object.keys(answers).length === questions.length) {
      const timer = setTimeout(() => {
        finishQuiz();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [answers, questions.length, isReview, showResult]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen p-4 md:p-12 relative overflow-hidden bg-cream text-center flex flex-col items-center justify-center">
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 md:top-10 md:left-10 p-3 md:p-4 bg-white rounded-full shadow-sm"><ArrowLeft className="w-5 h-5 md:w-6 md:h-6" /></button>
        <div className="text-5xl md:text-6xl mb-4">😅</div>
        <h2 className="text-xl md:text-2xl font-bold text-ink">Đề bài này trống không!</h2>
        <p className="text-ink-muted mt-2 text-sm md:text-base">Ba mẹ chưa thêm câu hỏi nào vào đề thi này.</p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-cream p-3 sm:p-6 md:p-12 relative overflow-hidden flex flex-col"
      style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
    >
      {/* Cảnh vật nền trang trí */}
      <div className="absolute -left-10 bottom-0 w-64 h-64 bg-green-200 rounded-full blur-3xl opacity-50"></div>
      <div className="absolute -right-10 top-0 w-64 h-64 bg-sage-100 rounded-full blur-3xl opacity-50"></div>

      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col relative z-10">
        <div className="flex items-center justify-between gap-2 mb-4 md:mb-8">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center text-ink-muted hover:bg-cream shadow-sm transition-all shrink-0"
          >
            <ArrowLeft className="w-4 h-4 md:w-6 md:h-6" />
          </button>

          <div className="flex flex-wrap justify-end gap-2 md:gap-4 items-center">
            {timeLeft !== null && (
              <div className={`bg-white px-2.5 py-1.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl flex items-center gap-1.5 md:gap-3 shadow-sm border ${timeLeft <= 60 ? 'border-danger animate-pulse' : 'border-cream-border'}`}>
                <Timer className={`w-3.5 h-3.5 md:w-6 md:h-6 ${timeLeft <= 60 ? 'text-danger' : 'text-primary'}`} />
                <span className={`font-extrabold text-xs md:text-xl ${timeLeft <= 60 ? 'text-danger' : 'text-ink'}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
            )}
            <div className="bg-white px-2.5 py-1.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl flex items-center gap-1.5 md:gap-3 shadow-sm border border-cream-border">
              <Star className="text-yellow-400 fill-yellow-400 w-3.5 h-3.5 md:w-6 md:h-6" />
              <span className="font-extrabold text-xs md:text-xl text-ink">{selectedStudent?.totalScore.toLocaleString('vi-VN')}</span>
            </div>
            <div className="bg-white px-2.5 py-1.5 md:px-6 md:py-3 rounded-xl md:rounded-2xl flex items-center gap-1.5 md:gap-3 shadow-sm border border-cream-border">
              <Heart className="text-danger fill-danger w-3.5 h-3.5 md:w-6 md:h-6" />
              <span className="font-extrabold text-xs md:text-xl text-ink">{selectedStudent?.currentStreak} ngày</span>
            </div>
          </div>
        </div>

        <div className="mb-3 md:mb-4 flex flex-wrap justify-between items-end gap-1">
          <div>
            <h2 className="text-lg sm:text-xl md:text-3xl font-bold text-ink">{examName}</h2>
            {isReview && <div className="text-primary font-bold mt-1 text-xs md:text-base">👀 Đang ở chế độ xem lại đề thi</div>}
          </div>
          <span className="text-xs md:text-xl font-medium text-ink-muted">
            Câu {currentQuestion + 1} / {questions.length}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2.5 md:h-4 bg-cream-border rounded-full mb-4 md:mb-12 overflow-hidden shadow-inner">
          <motion.div
            className="h-full bg-gradient-to-r from-primary-light to-primary-dark rounded-full"
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
              <div className="bg-white w-full rounded-[1.5rem] md:rounded-[3rem] p-5 sm:p-8 md:p-16 shadow-xl shadow-cream-border/50 mb-4 md:mb-10 text-center relative border border-cream-border">
                <h3 className="text-xl sm:text-2xl md:text-5xl font-extrabold text-ink leading-tight">
                  {questions[currentQuestion].text}
                </h3>
              </div>

              {questions[currentQuestion].options && questions[currentQuestion].options.length > 0 ? (
                <div className="grid grid-cols-2 gap-2.5 md:gap-4 w-full">
                  {questions[currentQuestion].options.map((option: string, idx: number) => {
                    const currentSelectedAnswer = answers[currentQuestion];
                    const currentIsCorrect = correctness[currentQuestion];
                    const isSelected = currentSelectedAnswer === option;
                    const isActuallyCorrect = option === questions[currentQuestion].correct;
                    
                    let bgColor = 'bg-white hover:bg-terracotta-100 hover:border-primary-light border-cream-border';
                    let textColor = 'text-ink';

                    if (isReview) {
                      if (isActuallyCorrect) {
                        bgColor = 'bg-green-100 border-green-500 shadow-lg shadow-green-200 scale-105';
                        textColor = 'text-green-800';
                      } else {
                        bgColor = 'bg-cream border-cream-border opacity-50';
                      }
                    } else if (currentSelectedAnswer !== undefined) {
                      if (isActuallyCorrect) {
                        bgColor = 'bg-green-100 border-green-500 scale-105 shadow-lg shadow-green-200';
                        textColor = 'text-green-800';
                      } else if (isSelected && !isActuallyCorrect) {
                        bgColor = 'bg-red-100 border-red-500 opacity-70 scale-95';
                        textColor = 'text-red-800';
                      } else {
                        bgColor = 'bg-white border-cream-border opacity-50';
                      }
                    }

                    return (
                      <motion.button
                        key={idx}
                        whileHover={!isReview && currentSelectedAnswer === undefined ? { scale: 1.02 } : {}}
                        whileTap={!isReview && currentSelectedAnswer === undefined ? { scale: 0.98 } : {}}
                        onClick={() => handleAnswer(option)}
                        disabled={isReview || currentSelectedAnswer !== undefined}
                        className={`relative p-3 sm:p-5 md:p-8 rounded-xl md:rounded-3xl border-2 md:border-4 text-base sm:text-xl md:text-3xl font-bold transition-all duration-300 shadow-sm ${bgColor} ${textColor}`}
                      >
                        <span className="font-extrabold text-primary/80 mr-1.5 md:mr-3">{String.fromCharCode(65 + idx)}.</span> {option}
                        {isActuallyCorrect && (isReview || (isSelected && currentIsCorrect)) && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2.5 -right-2.5 md:-top-4 md:-right-4 w-7 h-7 md:w-12 md:h-12 bg-green-500 text-white rounded-full flex items-center justify-center text-xs md:text-xl shadow-lg border-2 md:border-4 border-white"
                          >
                            ✓
                          </motion.div>
                        )}
                        {!isReview && isSelected && currentIsCorrect === false && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-2.5 -right-2.5 md:-top-4 md:-right-4 w-7 h-7 md:w-12 md:h-12 bg-red-500 text-white rounded-full flex items-center justify-center text-xs md:text-xl shadow-lg border-2 md:border-4 border-white"
                          >
                            ✗
                          </motion.div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 md:gap-6 w-full">
                  <input
                    type="text"
                    inputMode={!isNaN(Number(questions[currentQuestion].correct)) ? "numeric" : "text"}
                    pattern={!isNaN(Number(questions[currentQuestion].correct)) ? "[0-9]*" : undefined}
                    id={`input-answer-${currentQuestion}`}
                    className="text-center text-xl sm:text-2xl md:text-4xl p-3 md:p-6 rounded-xl md:rounded-3xl border-2 md:border-4 border-cream-border focus:border-primary outline-none w-full max-w-md shadow-inner text-ink font-bold transition-all"
                    placeholder="Nhập câu trả lời..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                         const val = (e.target as HTMLInputElement).value.trim();
                         if (val) handleAnswer(val);
                      }
                    }}
                    disabled={isReview || answers[currentQuestion] !== undefined}
                    defaultValue={isReview ? questions[currentQuestion].correct : (answers[currentQuestion] || '')}
                    autoComplete="off"
                  />

                  {isReview && (
                     <motion.div
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       className={`text-base sm:text-lg md:text-3xl font-bold px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-2xl bg-green-100 text-green-600 border border-green-200 text-center`}
                     >
                       Đáp án đúng: {questions[currentQuestion].correct}
                     </motion.div>
                  )}

                  {!isReview && answers[currentQuestion] !== undefined && (
                     <motion.div
                       initial={{ opacity: 0, y: 10 }}
                       animate={{ opacity: 1, y: 0 }}
                       className={`text-base sm:text-lg md:text-3xl font-bold px-4 py-2 md:px-8 md:py-4 rounded-xl md:rounded-2xl text-center ${correctness[currentQuestion] ? 'bg-green-100 text-green-600 border border-green-200' : 'bg-red-100 text-red-600 border border-red-200'}`}
                     >
                       {correctness[currentQuestion] ? 'Chính xác! 🎉' : `Sai rồi 😅. Đáp án đúng là: ${questions[currentQuestion].correct}`}
                     </motion.div>
                  )}

                  {!isReview && answers[currentQuestion] === undefined && (
                     <button
                       onClick={() => {
                         const input = document.getElementById(`input-answer-${currentQuestion}`) as HTMLInputElement;
                         if (input && input.value.trim()) {
                           handleAnswer(input.value.trim());
                         }
                       }}
                       className="px-6 py-2.5 md:px-10 md:py-4 bg-gradient-to-r from-primary to-primary-dark text-white text-base md:text-2xl font-bold rounded-xl md:rounded-2xl hover:scale-105 transition-all shadow-lg hover:shadow-xl"
                     >
                       Trả Lời
                     </button>
                  )}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto w-full px-2"
            >
              <div className="w-24 h-24 md:w-48 md:h-48 bg-yellow-100 rounded-full flex items-center justify-center mb-4 md:mb-8 relative">
                <div className="absolute inset-0 bg-yellow-400 rounded-full blur-2xl opacity-20 animate-pulse"></div>
                <Star className="text-yellow-500 fill-yellow-500 relative z-10 w-12 h-12 md:w-24 md:h-24" />
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-ink mb-3 md:mb-6">
                {isTimeUp ? 'Hết Giờ Rồi! ⏰' : 'Xuất Sắc! 🎉'}
              </h2>
              <div className="text-sm md:text-xl text-ink-muted font-medium mb-6 md:mb-10 flex flex-col items-center w-full">
                {isTimeUp
                  ? <p className="mb-3 md:mb-4">Bài làm của con đã được nộp tự động.</p>
                  : <p className="mb-3 md:mb-4">Con đã hoàn thành bài tập siêu nhanh!</p>
                }

                <div className="bg-white/60 backdrop-blur-md p-4 md:p-6 rounded-2xl md:rounded-3xl inline-block border-2 border-cream-border shadow-sm text-left w-full max-w-[300px]">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-ink-muted text-sm md:text-base">Điểm bài tập:</span>
                    <span className="text-primary-dark font-extrabold text-lg md:text-2xl">{score}</span>
                  </div>
                  {timeBonus > 0 && (
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-ink-muted text-sm md:text-base">Thưởng tốc độ:</span>
                      <span className="text-green-500 font-extrabold text-lg md:text-2xl">+{timeBonus}</span>
                    </div>
                  )}
                  <div className="w-full h-px bg-cream-border my-3 md:my-4"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-ink font-bold text-lg md:text-2xl">Tổng điểm:</span>
                    <span className="text-yellow-500 font-black text-2xl md:text-4xl">+{score + timeBonus}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/kids')}
                className="px-6 py-3 md:px-10 md:py-5 bg-gradient-to-r from-primary to-primary-dark text-white text-base md:text-2xl font-bold rounded-full hover:opacity-90 transition-all shadow-xl shadow-terracotta-100 hover:scale-105 transform duration-300"
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
            className="bg-white/80 backdrop-blur-md p-2.5 md:p-4 rounded-2xl md:rounded-3xl mt-3 md:mt-4 shadow-sm border border-cream-border relative z-20 flex flex-col md:flex-row items-center gap-2.5 md:gap-4"
            style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom))' }}
          >
            <div className="flex flex-wrap justify-center gap-1.5 md:gap-3 w-full max-h-24 md:max-h-none overflow-y-auto">
              {questions.map((_, idx) => {
                let bg = 'bg-cream text-ink-muted border-cream-border';

                if (isReview) {
                  if (correctness[idx] === true) bg = 'bg-green-100 text-green-600 border-green-500';
                  else if (correctness[idx] === false) bg = 'bg-red-100 text-red-600 border-red-500';
                  else bg = 'bg-cream text-ink-muted border-cream-border opacity-60'; // Not answered
                } else if (correctness[idx] === true) {
                  bg = 'bg-green-100 text-green-600 border-green-500';
                } else if (correctness[idx] === false) {
                  bg = 'bg-red-100 text-red-600 border-red-500';
                }

                const isCurrent = currentQuestion === idx;

                return (
                  <button
                    key={idx}
                    onClick={() => setCurrentQuestion(idx)}
                    className={`min-w-[2rem] h-8 md:min-w-[3rem] md:h-12 rounded-lg md:rounded-2xl text-xs md:text-base font-bold flex items-center justify-center border md:border-2 transition-all shrink-0 ${bg} ${isCurrent ? 'ring-2 md:ring-4 ring-primary-light scale-110 shadow-lg' : ''}`}
                  >
                    {idx + 1}
                  </button>
                )
              })}
            </div>

            {isReview ? (
              <button
                onClick={() => navigate(-1)}
                className="w-full md:w-auto px-5 py-2.5 md:px-8 md:py-3 text-sm md:text-base bg-gradient-to-r from-ink-muted to-ink text-white font-bold rounded-xl md:rounded-2xl whitespace-nowrap hover:shadow-lg hover:scale-105 transition-all shadow-md shrink-0"
              >
                Quay Lại
              </button>
            ) : (
              <button
                onClick={() => {
                  // The server re-grades and ignores an empty submission's score either way
                  // (see progressController.ts), but a stray tap here otherwise ends the exam
                  // with zero warning — this just catches the "tapped too early" case.
                  const answeredCount = Object.keys(answers).length;
                  if (answeredCount === 0) {
                    if (!window.confirm('Bé chưa trả lời câu nào. Nộp bài luôn nhé?')) return;
                  } else if (answeredCount < questions.length) {
                    if (!window.confirm(`Bé mới trả lời ${answeredCount}/${questions.length} câu. Nộp bài luôn nhé?`)) return;
                  }
                  finishQuiz();
                }}
                className="w-full md:w-auto px-5 py-2.5 md:px-8 md:py-3 text-sm md:text-base bg-gradient-to-r from-primary to-primary-dark text-white font-bold rounded-xl md:rounded-2xl whitespace-nowrap hover:shadow-lg hover:scale-105 transition-all shadow-md shrink-0"
              >
                Nộp Bài
              </button>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
