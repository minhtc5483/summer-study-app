import { useEffect, useState } from 'react';
import { X, CheckCircle2, XCircle, Clock, Trophy, Loader2 } from 'lucide-react';
import { api } from '../../lib/api';

interface QuestionDetail {
  index: number;
  text: string;
  options?: string[];
  correctAnswer?: string;
  userAnswer: string | null;
  isCorrect: boolean;
}

interface ExamResultDetail {
  id: string;
  student: { id: string; name: string; avatar: string | null };
  examName: string;
  subjectName: string;
  topicName: string | null;
  score: number;
  questionsAttempted: number;
  questionsCorrect: number;
  timeSpent: number | null;
  timeLimit: number | null;
  createdAt: string;
  questions: QuestionDetail[];
}

const formatTime = (seconds: number | null) => {
  if (seconds === null || seconds === undefined) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m} phút ${s.toString().padStart(2, '0')} giây`;
};

// Opened from a "vừa nộp bài" notification (see ParentDashboard) to show the full per-
// question breakdown behind that one-line summary — what the bé answered vs. the right
// answer, for every question.
export default function ExamResultDetailModal({
  examResultId,
  onClose,
}: {
  examResultId: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<ExamResultDetail | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError('');
    api
      .get(`/statistics/exam-results/${examResultId}`)
      .then((res) => {
        if (isMounted) setDetail(res.data);
      })
      .catch((err) => {
        if (isMounted) setError(err.response?.data?.error || 'Không tải được chi tiết bài làm.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [examResultId]);

  const questionsWrong = detail ? detail.questionsAttempted - detail.questionsCorrect : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-cream-border flex justify-between items-start bg-terracotta-100 shrink-0">
          {detail ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-white shrink-0 flex items-center justify-center border-2 border-white shadow-sm">
                {detail.student.avatar ? (
                  <img src={detail.student.avatar} alt={detail.student.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">👦</span>
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-ink truncate">{detail.examName}</h3>
                <p className="text-sm text-ink-muted">
                  {detail.student.name} · {detail.subjectName}
                  {detail.topicName ? ` · ${detail.topicName}` : ''}
                </p>
              </div>
            </div>
          ) : (
            <h3 className="text-lg font-bold text-ink">Chi tiết bài làm</h3>
          )}
          <button onClick={onClose} className="text-ink-muted hover:text-ink bg-white rounded-full p-2 shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-16 text-ink-muted gap-2">
              <Loader2 size={20} className="animate-spin" /> Đang tải...
            </div>
          )}

          {!loading && error && (
            <div className="p-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl text-sm font-medium">{error}</div>
          )}

          {!loading && detail && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-cream rounded-2xl p-4 text-center">
                  <Trophy size={18} className="mx-auto text-gold-600 mb-1" />
                  <div className="text-xl font-bold text-ink">{detail.score.toLocaleString('vi-VN')}</div>
                  <div className="text-xs text-ink-muted font-medium">Điểm</div>
                </div>
                <div className="bg-cream rounded-2xl p-4 text-center">
                  <CheckCircle2 size={18} className="mx-auto text-secondary-dark mb-1" />
                  <div className="text-xl font-bold text-ink">
                    {detail.questionsCorrect}/{detail.questionsAttempted}
                  </div>
                  <div className="text-xs text-ink-muted font-medium">Câu đúng</div>
                </div>
                <div className="bg-cream rounded-2xl p-4 text-center">
                  <XCircle size={18} className="mx-auto text-danger mb-1" />
                  <div className="text-xl font-bold text-ink">{questionsWrong}</div>
                  <div className="text-xs text-ink-muted font-medium">Câu sai</div>
                </div>
                <div className="bg-cream rounded-2xl p-4 text-center">
                  <Clock size={18} className="mx-auto text-primary mb-1" />
                  <div className="text-sm font-bold text-ink leading-tight">{formatTime(detail.timeSpent)}</div>
                  <div className="text-xs text-ink-muted font-medium">Thời gian làm</div>
                </div>
              </div>

              <div className="space-y-3">
                {detail.questions.map((q) => (
                  <div
                    key={q.index}
                    className={`p-4 rounded-2xl border ${
                      q.isCorrect ? 'bg-sage-100 border-sage-100' : 'bg-red-50 border-red-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {q.isCorrect ? (
                        <CheckCircle2 size={18} className="text-secondary-dark shrink-0 mt-0.5" />
                      ) : (
                        <XCircle size={18} className="text-danger shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">
                          Câu {q.index}. {q.text}
                        </p>
                        <div className="mt-2 text-sm space-y-1">
                          <p className={q.isCorrect ? 'text-secondary-dark font-medium' : 'text-danger font-medium'}>
                            Bé trả lời: {q.userAnswer ?? <span className="italic text-ink-muted">(bỏ trống)</span>}
                          </p>
                          {!q.isCorrect && (
                            <p className="text-ink-muted">
                              Đáp án đúng: <span className="font-medium text-ink">{q.correctAnswer ?? '—'}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
