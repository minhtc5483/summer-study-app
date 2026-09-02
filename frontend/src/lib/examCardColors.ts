// Was copy-pasted identically into KidsHome.tsx and SubjectExams.tsx — both render the same
// "sorted exam list" cards and picked a color from this exact palette the exact same way.
const EXAM_CARD_COLORS = ['#E8734A', '#7FA885', '#CA8A04', '#C2503A', '#4F7857'];
const COMPLETED_EXAM_COLOR = '#C9B8A3'; // Xám cho đề đã làm

export function getExamCardColor(index: number, isCompleted: boolean): string {
  if (isCompleted) return COMPLETED_EXAM_COLOR;
  return EXAM_CARD_COLORS[index % EXAM_CARD_COLORS.length];
}
