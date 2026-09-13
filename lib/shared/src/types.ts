/** User profile with student metadata */
export interface Profile {
  id: string;
  email: string;
  fullName: string;
  username: string | null;
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
  timezone: string | null;
  hasCompletedOnboarding: boolean;
  dailyStudyGoalMinutes: number;
  emailNotificationsOptIn: boolean;
  tier: 'free' | 'standard' | 'pro';
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

/** Task or academic reminder */
export interface Task {
  id: string;
  userId: string;
  courseId: string | null;
  text: string;
  prio: 'urgent' | 'high' | 'normal' | 'low';
  done: boolean;
  notes: string | null;
  due: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Flashcard deck */
export interface FlashcardDeck {
  id: string;
  courseId: string;
  userId: string;
  title: string;
  description: string | null;
  tags: string[];
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
  cardType: 'standard' | 'true_false' | 'multiple_choice';
  options: string[];
  correctAnswer: string | null;
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

/** One-way follow relationship */
export interface Follow {
  id: string;
  followerId: string;
  followeeId: string;
  createdAt: string;
}

/** Server-managed streak */
export interface Streak {
  userId: string;
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  freezesAvailable: number;
  freezesUsedTotal: number;
  updatedAt: string;
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

/** Synchronized study room */
export interface StudyRoom {
  id: string;
  hostId: string;
  name: string;
  code: string;
  courseId: string | null;
  durationSeconds: number;
  elapsedSecondsAtPause: number;
  status: 'active' | 'paused' | 'completed';
  lastResumedAt: string | null;
  createdAt: string;
}

/** Study room member */
export interface StudyRoomMember {
  roomId: string;
  userId: string;
  joinedAt: string;
  completed: boolean;
}

/** In-app notification */
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'deadline' | 'class' | 'streak' | 'social' | 'system';
  read: boolean;
  link: string | null;
  createdAt: string;
}

/** Academic Tier Definition (Feature Split Specification) */
export type PricingTier = 'free' | 'standard' | 'pro';

export interface TierFeatures {
  timetable: boolean;
  examTracker: boolean;
  focusTimer: boolean;
  streaks: boolean;
  maxFlashcardDecks: number | 'unlimited';
  socialAndRooms: boolean;
  leaderboards: boolean;
  analytics: 'basic' | 'full';
  aiFlashcards: boolean;
}

export const PRICING_TIER_LIMITS: Record<PricingTier, TierFeatures> = {
  free: {
    timetable: true,
    examTracker: true,
    focusTimer: true,
    streaks: true,
    maxFlashcardDecks: 3,
    socialAndRooms: false,
    leaderboards: false,
    analytics: 'basic',
    aiFlashcards: false,
  },
  standard: {
    timetable: true,
    examTracker: true,
    focusTimer: true,
    streaks: true,
    maxFlashcardDecks: 'unlimited',
    socialAndRooms: true,
    leaderboards: true,
    analytics: 'full',
    aiFlashcards: false,
  },
  pro: {
    timetable: true,
    examTracker: true,
    focusTimer: true,
    streaks: true,
    maxFlashcardDecks: 'unlimited',
    socialAndRooms: true,
    leaderboards: true,
    analytics: 'full',
    aiFlashcards: true,
  },
};

