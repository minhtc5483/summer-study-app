import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StudentProfile {
  id: string;
  name: string;
  grade: string;
  avatar: string | null;
  totalScore: number;
  currentStreak: number;
}

interface StudentState {
  selectedStudent: StudentProfile | null;
  setSelectedStudent: (student: StudentProfile | null) => void;
}

export const useStudentStore = create<StudentState>()(
  persist(
    (set) => ({
      selectedStudent: null,
      setSelectedStudent: (student) => set({ selectedStudent: student }),
    }),
    {
      name: 'student-storage',
    }
  )
);
