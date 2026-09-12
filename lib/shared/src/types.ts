/** User profile with student metadata */
export interface Profile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  university: string | null;
  degree: string | null;
  studyStreakDays: number;
  longestStreakDays: number;
  lastStudyDate: string | null;
  streakFreezesAvailable: number;
  isStudyingNow: boolean;
  currentSubject: string | null;
  sessionEndsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Course / Subject */
export interface Course {
  id: string;
  userId: string;
  name: string;
  code: string;
  color: string;
  targetHoursPerWeek: number;
  createdAt: string;
}

/** Timetable class entry */
export interface TimetableClass {
  id: string;
  courseId: string;
  userId: string;
  dayOfWeek: number; // 1=Mon, 7=Sun
  startTime: string; // HH:MM
  endTime: string;   // HH:MM
  venue: string | null;
  classType: 'lecture' | 'tutorial' | 'lab' | 'workshop';
  createdAt: string;
}

/** Exam or assessment */
export interface Assessment {
  id: string;
  courseId: string;
  userId: string;
  title: string;
  type: 'exam' | 'test' | 'assignment' | 'project' | 'quiz';
  dueDate: string;
  venue: string | null;
  weightPercentage: number | null;
  targetStudyHours: number;
  completed: boolean;
  createdAt: string;
}

/** Flashcard deck */
export interface FlashcardDeck {
  id: string;
  courseId: string;
  userId: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
}

/** Individual flashcard with SM-2 attributes */
export interface Flashcard {
  id: string;
  deckId: string;
  userId: string;
  frontText: string;
  backText: string;
  repetitionNumber: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

/** Completed study session log */
export interface StudySession {
  id: string;
  userId: string;
  courseId: string | null;
  durationSeconds: number;
  mode: 'pomodoro' | 'stopwatch';
  completedAt: string;
  notes: string | null;
}

/** Friendship between users */
export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
}

/** Study squad */
export interface Squad {
  id: string;
  createdBy: string;
  name: string;
  code: string;
  createdAt: string;
}

/** Squad membership */
export interface SquadMember {
  squadId: string;
  userId: string;
  joinedAt: string;
}
