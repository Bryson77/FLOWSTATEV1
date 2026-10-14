export interface EnhancedCard {
  id: string;
  deck_id?: string;
  deckId?: string;
  front_text?: string;
  frontText?: string;
  back_text?: string;
  backText?: string;
  position?: number;
  card_type?: string;
  options?: any;
  correct_answer?: string;
  review_state?: any;
}

export interface EnhancedDeck {
  id: string;
  title: string;
  description?: string | null;
  course_id?: string | null;
  courseId?: string | null;
  user_id?: string;
  userId?: string;
  visibility?: "private" | "friends" | "public" | string | null;
  is_public?: boolean | null;
  isPublic?: boolean | null;
  source_deck_id?: string | null;
  sourceCreatorUsername?: string | null;
  source_creator_username?: string | null;
  cards?: EnhancedCard[];
  flashcards?: any[];
  card_count?: number;
  cardCount?: number;
  due_count?: number;
  dueCount?: number;
  mastery_pct?: number;
  masteryPercentage?: number;
  courses?: { name: string; code: string; color?: string | null } | null;
  created_at?: string | null;
  tags?: string[] | null;
  revision?: number;
}

export interface CourseOption {
  id: string;
  name: string;
  code: string;
  color?: string | null;
}

export type LibraryTab = "my" | "saved" | "shared" | "discover";
