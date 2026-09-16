import type { Course, FlashcardDeck } from "./types";

export interface CourseWithDecks {
  course: Course;
  decks: FlashcardDeck[];
  totalCards: number;
  dueCount: number;
  masteryPct: number;
}

export interface GroupedDecksResult {
  courses: CourseWithDecks[];
  uncategorized: FlashcardDeck[];
  totalDecks: number;
  totalCards: number;
  totalDue: number;
}

/**
 * Groups flashcard decks by their parent course to establish
 * the 4-tier academic hierarchy: Student -> Course -> Deck -> Card.
 */
export function groupDecksByCourse(
  courses: Course[],
  decks: FlashcardDeck[]
): GroupedDecksResult {
  const courseMap = new Map<string, CourseWithDecks>();

  for (const course of courses) {
    courseMap.set(course.id, {
      course,
      decks: [],
      totalCards: 0,
      dueCount: 0,
      masteryPct: 0,
    });
  }

  const uncategorized: FlashcardDeck[] = [];

  for (const deck of decks) {
    const courseGroup = deck.courseId ? courseMap.get(deck.courseId) : undefined;
    if (courseGroup) {
      courseGroup.decks.push(deck);
      const cardCount = deck.cardCount ?? 0;
      const due = deck.dueCount ?? 0;
      courseGroup.totalCards += cardCount;
      courseGroup.dueCount += due;
    } else {
      uncategorized.push(deck);
    }
  }

  // Calculate weighted or average mastery for each course group
  for (const group of courseMap.values()) {
    if (group.decks.length > 0) {
      const decksWithCards = group.decks.filter((d) => (d.cardCount ?? 0) > 0);
      if (decksWithCards.length > 0) {
        const totalMastery = decksWithCards.reduce(
          (acc, d) => acc + (d.masteryPercentage ?? 0),
          0
        );
        group.masteryPct = Math.round(totalMastery / decksWithCards.length);
      } else {
        group.masteryPct = 0;
      }
    }
  }

  const totalCards = decks.reduce((sum, d) => sum + (d.cardCount ?? 0), 0);
  const totalDue = decks.reduce((sum, d) => sum + (d.dueCount ?? 0), 0);

  return {
    courses: Array.from(courseMap.values()),
    uncategorized,
    totalDecks: decks.length,
    totalCards,
    totalDue,
  };
}
