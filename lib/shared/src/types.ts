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
  tier: "free" | "standard" | "pro";
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
  endTime: string; // HH:MM
  venue: string | null;
  classType: "lecture" | "tutorial" | "lab" | "workshop";
  createdAt: string;
}

/** Exam or assessment */
export interface Assessment {
  id: string;
  courseId: string;
  userId: string;
  title: string;
  type: "exam" | "test" | "assignment" | "project" | "quiz";
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
  prio: "urgent" | "high" | "normal" | "low";
  done: boolean;
  notes: string | null;
  due: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Rich Content ProseMirror/TipTap AST */
export interface RichContentDoc {
  type: "doc";
  content: RichContentNode[];
}

export interface RichContentNode {
  type:
    | "paragraph"
    | "heading"
    | "bulletList"
    | "orderedList"
    | "listItem"
    | "codeBlock"
    | "table"
    | "tableRow"
    | "tableCell"
    | "image"
    | "mathEquation"
    | "text";
  attrs?: Record<string, any>;
  content?: RichContentNode[];
  marks?: Array<{
    type:
      | "bold"
      | "italic"
      | "underline"
      | "strike"
      | "code"
      | "highlight"
      | "link";
    attrs?: Record<string, any>;
  }>;
  text?: string;
}

/** Flashcard deck */
export interface FlashcardDeck {
  id: string;
  courseId: string | null;
  userId: string;
  title: string;
  description: string | null;
  tags: string[];
  isPublic: boolean;
  visibility: "private" | "friends" | "public";
  revision: number;
  sourceDeckId?: string | null;
  sourceCreatorUsername?: string | null;
  createdAt: string;
  courseName?: string;
  courseCode?: string;
  cardCount?: number;
  dueCount?: number;
  masteryPercentage?: number;
  ownerUsername?: string;
}

/** Individual flashcard with content AST and ordering */
export interface Flashcard {
  id: string;
  deckId: string;
  userId: string;
  position: number;
  version: number;
  frontText: string;
  backText: string;
  frontContent?: RichContentDoc;
  backContent?: RichContentDoc;
  cardType: "standard" | "true_false" | "multiple_choice";
  options: string[];
  correctAnswer: string | null;
  repetitionNumber?: number;
  intervalDays?: number;
  easeFactor?: number;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

/** Decoupled per-user SRS progress */
export interface FlashcardReviewState {
  id: string;
  userId: string;
  cardId: string;
  repetitionNumber: number;
  intervalDays: number;
  easeFactor: number;
  dueDate: string; // YYYY-MM-DD
  lastReviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Review audit and analytics event */
export interface FlashcardReviewEvent {
  id: string;
  idempotencyKey?: string;
  userId: string;
  cardId: string;
  deckId: string;
  rating: "retry" | "hard" | "good" | "easy";
  studyMode: "standard" | "cram" | "mcq" | "true_false" | "match";
  responseTimeMs?: number;
  reviewedAt: string;
}

/** Deck collaboration member */
export interface DeckMember {
  id: string;
  deckId: string;
  userId: string;
  role: "editor" | "viewer";
  createdAt: string;
  updatedAt: string;
  username?: string;
  avatarUrl?: string | null;
}

/** Completed study session log */
export interface StudySession {
  id: string;
  userId: string;
  courseId: string | null;
  taskId?: string | null;
  assessmentId?: string | null;
  durationSeconds: number;
  mode: "pomodoro" | "stopwatch";
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
  status: "active" | "paused" | "completed";
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
  type: "deadline" | "class" | "streak" | "social" | "system";
  read: boolean;
  link: string | null;
  createdAt: string;
}

/** Academic Tier Definition (Feature Split Specification) */
export type PricingTier = "free" | "standard" | "pro";

export interface TierFeatures {
  timetable: boolean;
  examTracker: boolean;
  focusTimer: boolean;
  streaks: boolean;
  maxFlashcardDecks: number | "unlimited";
  socialAndRooms: boolean;
  leaderboards: boolean;
  analytics: "basic" | "full";
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
    analytics: "basic",
    aiFlashcards: false,
  },
  standard: {
    timetable: true,
    examTracker: true,
    focusTimer: true,
    streaks: true,
    maxFlashcardDecks: "unlimited",
    socialAndRooms: true,
    leaderboards: true,
    analytics: "full",
    aiFlashcards: false,
  },
  pro: {
    timetable: true,
    examTracker: true,
    focusTimer: true,
    streaks: true,
    maxFlashcardDecks: "unlimited",
    socialAndRooms: true,
    leaderboards: true,
    analytics: "full",
    aiFlashcards: true,
  },
};
