// Extracted out of progressController.ts so it can be unit tested in isolation (see
// streak.test.ts) without needing a live server or database.
export function computeStreak(student: { lastActive: Date | null; currentStreak: number }): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastActive = student.lastActive;
  let newStreak = student.currentStreak;

  if (lastActive) {
    const lastActiveDate = new Date(lastActive);
    lastActiveDate.setHours(0, 0, 0, 0);
    // Signed, not Math.abs: if the server's clock ever moves backward (NTP correction, a
    // restored backup, manual clock change on the Pi) a negative diff used to fall through
    // Math.abs into the same "days passed" branches as a forward gap, incrementing or even
    // resetting the streak on a submission that's actually earlier than the last one on
    // record. A negative diff now does nothing — the streak just stays as it was.
    const diffDays = Math.round((today.getTime() - lastActiveDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1; // reset streak if a day was missed
    } else if (diffDays === 0 && newStreak === 0) {
      newStreak = 1;
    }
  } else {
    newStreak = 1;
  }

  return newStreak;
}
