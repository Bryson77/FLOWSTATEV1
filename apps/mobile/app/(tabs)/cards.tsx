import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  Layers,
  ArrowLeft,
  AlertCircle,
  RotateCw,
  Plus,
  Trash2,
  Check,
  X,
  PlusCircle,
  Search,
  BookOpen,
  Gamepad2,
  Clock,
  Bookmark,
  Globe,
  Lock,
  RefreshCw,
  ChevronRight,
  CheckCircle2,
  Shuffle,
} from "lucide-react-native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth-context";
import {
  calculateNextReview,
  getLocalISODate,
  type ReviewRating,
} from "@saktus/study-engine";
import { textToProseMirrorDoc, groupDecksByCourse, getSafeErrorMessage } from "@saktus/shared";
import { useThemeColors, type ThemeColors } from "../../lib/theme";
import { useMobileTimer } from "../../lib/timer-context";


interface FlashcardItem {
  id: string;
  deck_id: string;
  user_id: string;
  front_text: string;
  back_text: string;
  position?: number;
  repetition_number: number;
  interval_days: number;
  ease_factor: number;
  due_date: string | null;
  last_reviewed_at?: string | null;
  isRequeuePass?: boolean;
}

interface DeckItem {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  course_id?: string | null;
  visibility?: "private" | "public";
  is_public?: boolean;
  courses?: { name: string; code: string } | null;
  cards: FlashcardItem[];
  dueCount: number;
  isSaved?: boolean;
  creator_name?: string | null;
}

interface MatchTile {
  id: string;
  cardId: string;
  text: string;
  isFront: boolean;
  isMatched: boolean;
}

type LibraryTab = "my_decks" | "saved" | "discover";
type ActiveView = "library" | "deck_detail" | "study" | "match";
type StudyMode = "srs" | "cram";

export default function CardsScreen() {
  const { user } = useAuth();
  const theme = useThemeColors();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const mobileTimer = useMobileTimer();

  // Navigation & View Mode
  const [activeView, setActiveView] = useState<ActiveView>("library");

  const [activeTab, setActiveTab] = useState<LibraryTab>("my_decks");
  const [activeDeck, setActiveDeck] = useState<DeckItem | null>(null);

  // Data
  const [myDecks, setMyDecks] = useState<DeckItem[]>([]);
  const [savedDecks, setSavedDecks] = useState<DeckItem[]>([]);
  const [publicDecks, setPublicDecks] = useState<DeckItem[]>([]);
  const [courses, setCourses] = useState<
    { id: string; name: string; code: string }[]
  >([]);
  const [savedDeckIds, setSavedDeckIds] = useState<Set<string>>(new Set());

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("all");

  // Loading & Error States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // New Deck Modal
  const [isNewDeckModalOpen, setIsNewDeckModalOpen] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState("");
  const [newDeckDescription, setNewDeckDescription] = useState("");
  const [newDeckCourseId, setNewDeckCourseId] = useState("");
  const [newDeckIsPublic, setNewDeckIsPublic] = useState(false);
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [deckError, setDeckError] = useState("");

  // Add Card Modal
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [targetDeckId, setTargetDeckId] = useState<string>("");
  const [frontText, setFrontText] = useState("");
  const [backText, setBackText] = useState("");
  const [addingCard, setAddingCard] = useState(false);
  const [cardError, setCardError] = useState("");

  // Study Player State
  const [studyMode, setStudyMode] = useState<StudyMode>("srs");
  const [studyQueue, setStudyQueue] = useState<FlashcardItem[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [cardsReviewedCount, setCardsReviewedCount] = useState(0);
  const [inSessionRetries, setInSessionRetries] = useState(0);
  const [ratingCounts, setRatingCounts] = useState<Record<string, number>>({
    retry: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const cardStartTimeRef = useRef<number>(Date.now());

  // Match Mode State
  const [matchTiles, setMatchTiles] = useState<MatchTile[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [mismatchedTileIds, setMismatchedTileIds] = useState<string[]>([]);
  const [matchTimerSeconds, setMatchTimerSeconds] = useState(0);
  const [matchRunning, setMatchRunning] = useState(false);
  const [matchCompleted, setMatchCompleted] = useState(false);
  const [matchPenalties, setMatchPenalties] = useState(0);
  const matchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const todayStr = useMemo(() => getLocalISODate(), []);

  // Safe Haptic feedback helper
  const triggerHaptic = (
    style: "light" | "medium" | "heavy" | "notification" = "light",
  ) => {
    try {
      if (style === "light")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      else if (style === "medium")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      else if (style === "heavy")
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      else if (style === "notification")
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Ignored if platform doesn't support
    }
  };

  // Fetch Decks, Review States, Saves, and Courses
  const fetchAllData = useCallback(async () => {
    setErrorMsg(null);
    try {
      if (!user) {
        setMyDecks([]);
        setSavedDecks([]);
        setPublicDecks([]);
        setLoading(false);
        return;
      }

      // Parallel queries
      const [myDecksRes, savedRes, publicRes, coursesRes, statesRes] =
        await Promise.all([
          supabase
            .from("flashcard_decks")
            .select("*, courses(name, code), flashcards(*)")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
          supabase
            .from("deck_saves")
            .select(
              "deck_id, flashcard_decks(*, courses(name, code), flashcards(*))",
            )
            .eq("user_id", user.id),
          supabase
            .from("flashcard_decks")
            .select("*, courses(name, code), flashcards(*)")
            .eq("is_public", true)
            .neq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(30),
          supabase
            .from("courses")
            .select("id, name, code")
            .eq("user_id", user.id)
            .order("name"),
          supabase
            .from("flashcard_review_states")
            .select(
              "card_id, repetition_number, interval_days, ease_factor, due_date, last_reviewed_at",
            )
            .eq("user_id", user.id),
        ]);

      if (myDecksRes.error) throw myDecksRes.error;

      // Build Map of review states for current user
      const reviewMap = new Map<string, any>();
      (statesRes.data || []).forEach((st: any) => {
        reviewMap.set(st.card_id, st);
      });

      // Helper to enrich cards with review state
      const enrichCards = (
        rawCards: any[],
      ): { cards: FlashcardItem[]; dueCount: number } => {
        let due = 0;
        const mapped: FlashcardItem[] = (rawCards || [])
          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
          .map((c: any) => {
            const st = reviewMap.get(c.id);
            const rep = st ? st.repetition_number : (c.repetition_number ?? 0);
            const interval = st ? st.interval_days : (c.interval_days ?? 0);
            const ease = st
              ? Number(st.ease_factor)
              : Number(c.ease_factor ?? 2.5);
            const dueDate = st ? st.due_date : (c.due_date ?? null);

            const isDue = !dueDate || dueDate <= todayStr;
            if (isDue) due++;

            return {
              id: c.id,
              deck_id: c.deck_id,
              user_id: c.user_id,
              front_text: c.front_text,
              back_text: c.back_text,
              position: c.position,
              repetition_number: rep,
              interval_days: interval,
              ease_factor: ease,
              due_date: dueDate,
              last_reviewed_at: st?.last_reviewed_at || null,
            };
          });
        return { cards: mapped, dueCount: due };
      };

      // Map My Decks
      const mappedMyDecks: DeckItem[] = (myDecksRes.data || []).map(
        (d: any) => {
          const { cards, dueCount } = enrichCards(d.flashcards || []);
          return {
            id: d.id,
            user_id: d.user_id,
            title: d.title,
            description: d.description,
            course_id: d.course_id,
            visibility: d.visibility || (d.is_public ? "public" : "private"),
            is_public: d.is_public,
            courses: d.courses,
            cards,
            dueCount,
          };
        },
      );

      // Map Saved Decks
      const savedIds = new Set<string>();
      const mappedSavedDecks: DeckItem[] = (savedRes.data || [])
        .map((s: any) => s.flashcard_decks)
        .filter(Boolean)
        .map((d: any) => {
          savedIds.add(d.id);
          const { cards, dueCount } = enrichCards(d.flashcards || []);
          return {
            id: d.id,
            user_id: d.user_id,
            title: d.title,
            description: d.description,
            course_id: d.course_id,
            visibility: d.visibility || "public",
            is_public: true,
            courses: d.courses,
            cards,
            dueCount,
            isSaved: true,
          };
        });

      // Map Public / Discover Decks
      const mappedPublicDecks: DeckItem[] = (publicRes.data || []).map(
        (d: any) => {
          const { cards, dueCount } = enrichCards(d.flashcards || []);
          return {
            id: d.id,
            user_id: d.user_id,
            title: d.title,
            description: d.description,
            course_id: d.course_id,
            visibility: "public",
            is_public: true,
            courses: d.courses,
            cards,
            dueCount,
            isSaved: savedIds.has(d.id),
          };
        },
      );

      setMyDecks(mappedMyDecks);
      setSavedDecks(mappedSavedDecks);
      setPublicDecks(mappedPublicDecks);
      setSavedDeckIds(savedIds);
      setCourses(coursesRes.data || []);

      // If activeDeck is currently open, keep it in sync
      if (activeDeck) {
        const fresh =
          mappedMyDecks.find((d) => d.id === activeDeck.id) ||
          mappedSavedDecks.find((d) => d.id === activeDeck.id) ||
          mappedPublicDecks.find((d) => d.id === activeDeck.id);
        if (fresh) setActiveDeck(fresh);
      }
    } catch (err: any) {
      console.error("Fetch decks error:", err);
      setErrorMsg(getSafeErrorMessage(err, "Failed to load flashcard decks."));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, todayStr, activeDeck]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  // Filtered decks based on active tab, search, and course
  const displayedDecks = useMemo(() => {
    let source = myDecks;
    if (activeTab === "saved") source = savedDecks;
    else if (activeTab === "discover") source = publicDecks;

    return source.filter((deck) => {
      const matchesSearch =
        deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (deck.courses?.code &&
          deck.courses.code.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCourse =
        selectedCourseId === "all" || deck.course_id === selectedCourseId;

      return matchesSearch && matchesCourse;
    });
  }, [
    activeTab,
    myDecks,
    savedDecks,
    publicDecks,
    searchQuery,
    selectedCourseId,
  ]);

  // Group My Decks by Course for the 4-tier academic hierarchy
  const courseGroupedMyDecks = useMemo(() => {
    if (activeTab !== "my_decks") return null;

    const formattedDecks = displayedDecks.map((d) => ({
      ...d,
      courseId: d.course_id,
      cardCount: d.cards.length,
      dueCount: d.dueCount,
    }));

    const result = groupDecksByCourse(courses as any, formattedDecks as any);

    return {
      courses: result.courses.map((g) => ({
        course: g.course,
        decks: g.decks as unknown as DeckItem[],
        totalCards: g.totalCards,
        totalDue: g.dueCount,
        masteryPct: g.masteryPct,
      })),
      uncategorized: result.uncategorized as unknown as DeckItem[],
    };
  }, [activeTab, courses, displayedDecks]);

  // Create New Deck
  const handleCreateDeck = async () => {
    if (!user) return;
    if (!newDeckTitle.trim()) {
      setDeckError("Deck title is required.");
      return;
    }

    setCreatingDeck(true);
    setDeckError("");

    try {
      const { data, error } = await supabase
        .from("flashcard_decks")
        .insert({
          user_id: user.id,
          title: newDeckTitle.trim(),
          description: newDeckDescription.trim() || null,
          course_id: newDeckCourseId || null,
          visibility: newDeckIsPublic ? "public" : "private",
          is_public: newDeckIsPublic,
        } as any)
        .select()
        .single();

      if (error) throw error;

      triggerHaptic("notification");
      setIsNewDeckModalOpen(false);
      setNewDeckTitle("");
      setNewDeckDescription("");
      setNewDeckCourseId("");
      setNewDeckIsPublic(false);
      await fetchAllData();

      // Open Add Card modal for newly created deck
      if (data?.id) {
        setTargetDeckId(data.id);
        setIsAddCardModalOpen(true);
      }
    } catch (e: any) {
      console.error("Create deck error:", e);
      setDeckError(getSafeErrorMessage(e, "Failed to create deck."));
    } finally {
      setCreatingDeck(false);
    }
  };

  // Add Card to Deck
  const handleAddCard = async (addAnother = false) => {
    if (!user || !targetDeckId) return;
    if (!frontText.trim()) {
      setCardError("Front text (question) is required.");
      return;
    }
    if (!backText.trim()) {
      setCardError("Back text (answer) is required.");
      return;
    }

    setAddingCard(true);
    setCardError("");

    try {
      const currentDeck = myDecks.find((d) => d.id === targetDeckId);
      const nextPosition = (currentDeck?.cards.length ?? 0) + 1;

      const { error } = await supabase.from("flashcards").insert({
        user_id: user.id,
        deck_id: targetDeckId,
        front_text: frontText.trim(),
        back_text: backText.trim(),
        front_content: textToProseMirrorDoc(frontText.trim()) as any,
        back_content: textToProseMirrorDoc(backText.trim()) as any,
        position: nextPosition,
        interval_days: 0,
        ease_factor: 2.5,
        repetition_number: 0,
        due_date: todayStr,
      });

      if (error) throw error;

      triggerHaptic("light");
      setFrontText("");
      setBackText("");

      if (!addAnother) {
        setIsAddCardModalOpen(false);
      }
      await fetchAllData();
    } catch (e: any) {
      console.error("Add card error:", e);
      setCardError(getSafeErrorMessage(e, "Failed to add card."));
    } finally {
      setAddingCard(false);
    }
  };

  // Delete Card
  const handleDeleteCard = (cardId: string) => {
    Alert.alert("Delete Card", "Are you sure you want to delete this card?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await supabase.from("flashcards").delete().eq("id", cardId);
            triggerHaptic("medium");
            await fetchAllData();
          } catch (err) {
            console.error("Delete card error:", err);
          }
        },
      },
    ]);
  };

  // Delete Deck
  const handleDeleteDeck = (deckId: string) => {
    Alert.alert(
      "Delete Deck",
      "Are you sure you want to delete this deck and all its cards? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.from("flashcard_decks").delete().eq("id", deckId);
              triggerHaptic("heavy");
              if (activeDeck?.id === deckId) {
                setActiveDeck(null);
                setActiveView("library");
              }
              await fetchAllData();
            } catch (err) {
              console.error("Delete deck error:", err);
            }
          },
        },
      ],
    );
  };

  // Save Public Deck to Library
  const handleSaveDeck = async (deckId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase.rpc("save_public_deck", {
        p_source_deck_id: deckId,
      });
      if (error) throw error;
      triggerHaptic("notification");
      setSavedDeckIds((prev) => new Set([...prev, deckId]));
      await fetchAllData();
    } catch (err: any) {
      console.error("Save deck error:", err);
      Alert.alert("Error", getSafeErrorMessage(err, "Failed to save deck."));
    }
  };

  // ==================== STUDY PLAYER LOGIC ====================

  const startStudySession = (deck: DeckItem, mode: StudyMode) => {
    let queue: FlashcardItem[] = [];

    if (mode === "srs") {
      queue = deck.cards.filter((c) => !c.due_date || c.due_date <= todayStr);
      if (queue.length === 0) {
        Alert.alert(
          "All Caught Up",
          "No cards are currently due for spaced repetition in this deck. Would you like to cram all cards instead?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Cram All",
              onPress: () => startStudySession(deck, "cram"),
            },
          ],
        );
        return;
      }
    } else {
      queue = [...deck.cards];
    }

    if (queue.length === 0) {
      Alert.alert(
        "Empty Deck",
        "This deck has no cards to study. Add cards first.",
      );
      return;
    }

    setActiveDeck(deck);
    setStudyMode(mode);
    setStudyQueue(queue);
    setQueueIndex(0);
    setIsFlipped(false);
    setSessionCompleted(false);
    setCardsReviewedCount(0);
    setInSessionRetries(0);
    setRatingCounts({ retry: 0, hard: 0, good: 0, easy: 0 });
    cardStartTimeRef.current = Date.now();
    setActiveView("study");
    triggerHaptic("light");
  };

  const handleRateCard = async (rating: ReviewRating) => {
    if (queueIndex >= studyQueue.length || !user) return;

    const currentCard = studyQueue[queueIndex];
    const durationMs = Math.max(500, Date.now() - cardStartTimeRef.current);

    triggerHaptic(rating === "retry" ? "medium" : "light");

    // Run canonical Saktus SM-2 algorithm
    const result = calculateNextReview({
      repetitionNumber: currentCard.repetition_number,
      intervalDays: currentCard.interval_days,
      easeFactor: currentCard.ease_factor,
      rating,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    });

    setRatingCounts((prev) => ({
      ...prev,
      [rating === "again" ? "retry" : rating]:
        (prev[rating === "again" ? "retry" : rating] || 0) + 1,
    }));
    setCardsReviewedCount((prev) => prev + 1);

    // In-session Requeue handling
    let nextQueue = [...studyQueue];
    if (result.inSessionRequeue) {
      setInSessionRetries((prev) => prev + 1);
      // Re-append card to the end of the session queue with a requeue badge
      nextQueue.push({
        ...currentCard,
        isRequeuePass: true,
      });
      setStudyQueue(nextQueue);
    }

    // Persist to database atomically via submit_flashcard_review RPC
    try {
      const { error: rpcErr } = await (supabase.rpc as any)("submit_flashcard_review", {
        p_card_id: currentCard.id,
        p_rating: rating === "again" ? "retry" : rating,
        p_study_mode: studyMode === "srs" ? "standard" : "cram",
        p_response_time_ms: durationMs,
        p_deck_id: activeDeck?.id || currentCard.deck_id,
      });
      if (rpcErr) {
        console.error("submit_flashcard_review RPC error:", rpcErr);
      }
    } catch (err) {
      console.error("Failed to persist review rating:", err);
    }

    // Move to next card or finish session
    if (queueIndex + 1 < nextQueue.length) {
      setQueueIndex((prev) => prev + 1);
      setIsFlipped(false);
      cardStartTimeRef.current = Date.now();
    } else {
      triggerHaptic("notification");
      setSessionCompleted(true);
      fetchAllData();
    }
  };

  // ==================== MATCH MODE LOGIC ====================

  const startMatchGame = (deck: DeckItem) => {
    if (deck.cards.length < 3) {
      Alert.alert(
        "More Cards Needed",
        "Match mode requires at least 3 flashcards in the deck.",
      );
      return;
    }

    // Pick up to 6 cards randomly
    const shuffledCards = [...deck.cards]
      .sort(() => 0.5 - Math.random())
      .slice(0, 6);

    const tiles: MatchTile[] = [];
    shuffledCards.forEach((c) => {
      tiles.push({
        id: `${c.id}-front`,
        cardId: c.id,
        text: c.front_text,
        isFront: true,
        isMatched: false,
      });
      tiles.push({
        id: `${c.id}-back`,
        cardId: c.id,
        text: c.back_text,
        isFront: false,
        isMatched: false,
      });
    });

    // Shuffle tiles
    setMatchTiles(tiles.sort(() => 0.5 - Math.random()));
    setSelectedTileId(null);
    setMismatchedTileIds([]);
    setMatchTimerSeconds(0);
    setMatchPenalties(0);
    setMatchCompleted(false);
    setActiveDeck(deck);
    setActiveView("match");
    setMatchRunning(true);
    triggerHaptic("medium");

    if (matchIntervalRef.current) clearInterval(matchIntervalRef.current);
    matchIntervalRef.current = setInterval(() => {
      setMatchTimerSeconds((prev) => +(prev + 0.1).toFixed(1));
    }, 100);
  };

  const handleTilePress = (tile: MatchTile) => {
    if (tile.isMatched || mismatchedTileIds.length > 0) return;

    // First tile tapped
    if (!selectedTileId) {
      setSelectedTileId(tile.id);
      triggerHaptic("light");
      return;
    }

    // Deselect if same tile tapped
    if (selectedTileId === tile.id) {
      setSelectedTileId(null);
      return;
    }

    const firstTile = matchTiles.find((t) => t.id === selectedTileId);
    if (!firstTile) {
      setSelectedTileId(tile.id);
      return;
    }

    // Check Match
    if (firstTile.cardId === tile.cardId && firstTile.id !== tile.id) {
      // MATCH SUCCESS
      triggerHaptic("medium");
      const updated = matchTiles.map((t) =>
        t.cardId === tile.cardId ? { ...t, isMatched: true } : t,
      );
      setMatchTiles(updated);
      setSelectedTileId(null);

      // Check if all matched
      if (updated.every((t) => t.isMatched)) {
        if (matchIntervalRef.current) clearInterval(matchIntervalRef.current);
        setMatchRunning(false);
        setMatchCompleted(true);
        triggerHaptic("notification");
      }
    } else {
      // MISMATCH
      triggerHaptic("heavy");
      setMismatchedTileIds([firstTile.id, tile.id]);
      setMatchPenalties((prev) => prev + 1);
      setMatchTimerSeconds((prev) => +(prev + 1.0).toFixed(1)); // 1.0s penalty

      setTimeout(() => {
        setMismatchedTileIds([]);
        setSelectedTileId(null);
      }, 600);
    }
  };

  useEffect(() => {
    return () => {
      if (matchIntervalRef.current) clearInterval(matchIntervalRef.current);
    };
  }, []);

  // ==================== RENDER: STUDY PLAYER ====================

  if (activeView === "study" && activeDeck) {
    const currentCard = studyQueue[queueIndex];

    if (sessionCompleted) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.sessionHeader}>
            <Pressable
              onPress={() => {
                setActiveView("deck_detail");
              }}
              hitSlop={8}
              style={styles.backBtn}
            >
              <ArrowLeft size={20} color="#FFFFFF" />
            </Pressable>
            <Text style={styles.headerDeckTitle}>Session Completed</Text>
            <View style={{ width: 20 }} />
          </View>

          <View style={styles.summaryContainer}>
            <View style={styles.summaryBadge}>
              <CheckCircle2 size={36} color="#FFFFFF" />
              <Text style={styles.summaryTitle}>Recall Session Complete</Text>
              <Text style={styles.summarySubtitle}>
                All cards scheduled for this study cycle were reviewed and
                updated.
              </Text>
            </View>

            <View style={styles.summaryMetricsRow}>
              <View style={styles.summaryMetricCard}>
                <Text style={styles.summaryMetricValue}>
                  {cardsReviewedCount}
                </Text>
                <Text style={styles.summaryMetricLabel}>CARDS REVIEWED</Text>
              </View>
              <View style={styles.summaryMetricCard}>
                <Text style={styles.summaryMetricValue}>
                  {inSessionRetries}
                </Text>
                <Text style={styles.summaryMetricLabel}>RETRIES MASTERED</Text>
              </View>
            </View>

            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>PERFORMANCE BREAKDOWN</Text>
              <View style={styles.breakdownRow}>
                <View
                  style={[styles.breakdownItem, { borderColor: "#EF4444" }]}
                >
                  <Text style={[styles.breakdownCount, { color: "#EF4444" }]}>
                    {ratingCounts.retry || 0}
                  </Text>
                  <Text style={styles.breakdownLabel}>Retry</Text>
                </View>
                <View
                  style={[styles.breakdownItem, { borderColor: "#F59E0B" }]}
                >
                  <Text style={[styles.breakdownCount, { color: "#F59E0B" }]}>
                    {ratingCounts.hard || 0}
                  </Text>
                  <Text style={styles.breakdownLabel}>Hard</Text>
                </View>
                <View
                  style={[styles.breakdownItem, { borderColor: "#3B82F6" }]}
                >
                  <Text style={[styles.breakdownCount, { color: "#3B82F6" }]}>
                    {ratingCounts.good || 0}
                  </Text>
                  <Text style={styles.breakdownLabel}>Good</Text>
                </View>
                <View
                  style={[styles.breakdownItem, { borderColor: "#10B981" }]}
                >
                  <Text style={[styles.breakdownCount, { color: "#10B981" }]}>
                    {ratingCounts.easy || 0}
                  </Text>
                  <Text style={styles.breakdownLabel}>Easy</Text>
                </View>
              </View>
            </View>

            <View style={styles.summaryActionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.studyAgainBtn,
                  pressed && styles.pressed,
                ]}
                onPress={() => startStudySession(activeDeck, "cram")}
              >
                <RotateCw size={16} color="#FFFFFF" />
                <Text style={styles.studyAgainText}>Study Again (Cram)</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.doneBtn,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  setActiveView("deck_detail");
                }}
              >
                <Text style={styles.doneBtnText}>Back to Deck</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        {/* Study Header */}
        <View style={styles.sessionHeader}>
          <Pressable
            onPress={() => {
              Alert.alert(
                "Exit Study Session",
                "Progress on completed cards is saved. Return to deck?",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Exit",
                    style: "destructive",
                    onPress: () => {
                      setActiveView("deck_detail");
                      fetchAllData();
                    },
                  },
                ],
              );
            }}
            hitSlop={8}
            style={styles.backBtn}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerDeckTitle} numberOfLines={1}>
              {activeDeck.title}
            </Text>
            <View style={styles.headerBadgeRow}>
              <Text style={styles.headerModeBadge}>
                {studyMode === "srs" ? "SRS Review" : "Cram Mode"}
              </Text>
              {currentCard?.isRequeuePass && (
                <Text style={styles.headerRequeueBadge}>Requeue Pass</Text>
              )}
            </View>
          </View>
          <View style={{ alignItems: "flex-end", gap: 2 }}>
            <Text style={styles.headerCounter}>
              {queueIndex + 1}/{studyQueue.length}
            </Text>
            {mobileTimer.isRunning && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Clock size={10} color="#10B981" />
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    color: "#10B981",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {mobileTimer.timeStr}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Study Card Body */}
        <View style={styles.studyContent}>
          <Pressable
            style={({ pressed }) => [
              styles.tactileCard,
              pressed && { transform: [{ scale: 0.99 }] },
            ]}
            onPress={() => {
              triggerHaptic("light");
              setIsFlipped(!isFlipped);
            }}
          >
            <View style={styles.cardTopRow}>
              <Text style={styles.cardRoleLabel}>
                {isFlipped ? "ANSWER / BACK" : "QUESTION / FRONT"}
              </Text>
              <Text style={styles.intervalHint}>
                {currentCard?.interval_days
                  ? `${currentCard.interval_days}d interval`
                  : "New card"}
              </Text>
            </View>

            <ScrollView
              style={styles.cardScroll}
              contentContainerStyle={styles.cardScrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <Text style={styles.cardText}>
                {isFlipped ? currentCard?.back_text : currentCard?.front_text}
              </Text>
            </ScrollView>

            <View style={styles.cardFooterRow}>
              <RotateCw size={13} color="#71717A" />
              <Text style={styles.cardFooterText}>Tap card to flip</Text>
            </View>
          </Pressable>

          {/* Rating Controls */}
          {isFlipped ? (
            <View style={styles.ratingGrid}>
              <Pressable
                style={({ pressed }) => [
                  styles.ratingBtn,
                  styles.rateRetry,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleRateCard("retry")}
              >
                <Text style={styles.rateTitleRetry}>Retry</Text>
                <Text style={styles.rateSubtitle}>Requeue</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.ratingBtn,
                  styles.rateHard,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleRateCard("hard")}
              >
                <Text style={styles.rateTitleHard}>Hard</Text>
                <Text style={styles.rateSubtitle}>+1 day</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.ratingBtn,
                  styles.rateGood,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleRateCard("good")}
              >
                <Text style={styles.rateTitleGood}>Good</Text>
                <Text style={styles.rateSubtitle}>Standard</Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.ratingBtn,
                  styles.rateEasy,
                  pressed && styles.pressed,
                ]}
                onPress={() => handleRateCard("easy")}
              >
                <Text style={styles.rateTitleEasy}>Easy</Text>
                <Text style={styles.rateSubtitle}>Bonus</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.showAnswerBtn,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                triggerHaptic("light");
                setIsFlipped(true);
              }}
            >
              <Text style={styles.showAnswerText}>Show Answer</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ==================== RENDER: MATCH MODE ====================

  if (activeView === "match" && activeDeck) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.sessionHeader}>
          <Pressable
            onPress={() => {
              if (matchIntervalRef.current)
                clearInterval(matchIntervalRef.current);
              setActiveView("deck_detail");
            }}
            hitSlop={8}
            style={styles.backBtn}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerDeckTitle}>{activeDeck.title}</Text>
            <Text style={styles.headerModeBadge}>Match Game</Text>
          </View>
          <View style={styles.timerBadge}>
            <Clock size={14} color="#FFFFFF" />
            <Text style={styles.timerText}>
              {matchTimerSeconds.toFixed(1)}s
            </Text>
          </View>
        </View>

        {matchCompleted ? (
          <View style={styles.summaryContainer}>
            <View style={styles.summaryBadge}>
              <CheckCircle2 size={36} color="#FFFFFF" />
              <Text style={styles.summaryTitle}>Grid Cleared</Text>
              <Text style={styles.summarySubtitle}>
                You matched all card pairs in {matchTimerSeconds.toFixed(1)}{" "}
                seconds!
              </Text>
            </View>

            <View style={styles.summaryMetricsRow}>
              <View style={styles.summaryMetricCard}>
                <Text style={styles.summaryMetricValue}>
                  {matchTimerSeconds.toFixed(1)}s
                </Text>
                <Text style={styles.summaryMetricLabel}>TOTAL TIME</Text>
              </View>
              <View style={styles.summaryMetricCard}>
                <Text style={styles.summaryMetricValue}>{matchPenalties}</Text>
                <Text style={styles.summaryMetricLabel}>PENALTIES (+1s)</Text>
              </View>
            </View>

            <Text style={styles.matchNoticeText}>
              Match mode is a fast-paced speed drill. It does not alter your
              spaced repetition intervals.
            </Text>

            <View style={styles.summaryActionRow}>
              <Pressable
                style={({ pressed }) => [
                  styles.studyAgainBtn,
                  pressed && styles.pressed,
                ]}
                onPress={() => startMatchGame(activeDeck)}
              >
                <Shuffle size={16} color="#FFFFFF" />
                <Text style={styles.studyAgainText}>Play Again</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.doneBtn,
                  pressed && styles.pressed,
                ]}
                onPress={() => setActiveView("deck_detail")}
              >
                <Text style={styles.doneBtnText}>Back to Deck</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.matchScroll}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.matchHintText}>
              Tap a prompt and its matching answer to clear the grid.
            </Text>

            <View style={styles.matchGrid}>
              {matchTiles.map((tile) => {
                const isSelected = selectedTileId === tile.id;
                const isMismatched = mismatchedTileIds.includes(tile.id);
                const isMatched = tile.isMatched;

                return (
                  <Pressable
                    key={tile.id}
                    disabled={isMatched}
                    style={({ pressed }) => [
                      styles.matchTile,
                      isSelected && styles.matchTileSelected,
                      isMismatched && styles.matchTileMismatched,
                      isMatched && styles.matchTileMatched,
                      pressed && !isMatched && styles.pressed,
                    ]}
                    onPress={() => handleTilePress(tile)}
                  >
                    <Text
                      style={[
                        styles.matchTileText,
                        isMatched && styles.matchTileTextMatched,
                      ]}
                      numberOfLines={4}
                    >
                      {tile.text}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    );
  }

  // ==================== RENDER: DECK DETAIL ====================

  if (activeView === "deck_detail" && activeDeck) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.sessionHeader}>
          <Pressable
            onPress={() => {
              setActiveView("library");
              setActiveDeck(null);
            }}
            hitSlop={8}
            style={styles.backBtn}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.headerDeckTitle} numberOfLines={1}>
            {activeDeck.title}
          </Text>
          {activeDeck.user_id === user?.id && (
            <Pressable
              onPress={() => handleDeleteDeck(activeDeck.id)}
              hitSlop={8}
              style={styles.backBtn}
            >
              <Trash2 size={18} color="#EF4444" />
            </Pressable>
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.detailScroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FFFFFF"
            />
          }
        >
          {/* Deck Info Banner */}
          <View style={styles.deckBanner}>
            <View style={styles.deckBannerMeta}>
              {activeDeck.courses?.code ? (
                <View style={styles.courseBadge}>
                  <Text style={styles.courseBadgeText}>
                    {activeDeck.courses.code}
                  </Text>
                </View>
              ) : null}
              <View style={styles.visibilityBadge}>
                {activeDeck.is_public ? (
                  <Globe size={11} color="#A1A1AA" />
                ) : (
                  <Lock size={11} color="#A1A1AA" />
                )}
                <Text style={styles.visibilityText}>
                  {activeDeck.is_public ? "Public" : "Private"}
                </Text>
              </View>
            </View>

            <Text style={styles.detailTitle}>{activeDeck.title}</Text>
            {activeDeck.description ? (
              <Text style={styles.detailDescription}>
                {activeDeck.description}
              </Text>
            ) : null}

            <View style={styles.detailStatsRow}>
              <Text style={styles.detailStatText}>
                {activeDeck.cards.length}{" "}
                {activeDeck.cards.length === 1 ? "card" : "cards"}
              </Text>
              <Text style={styles.detailStatDot}>·</Text>
              <Text
                style={[
                  styles.detailStatText,
                  activeDeck.dueCount > 0 ? styles.detailStatDue : null,
                ]}
              >
                {activeDeck.dueCount} due for review
              </Text>
            </View>

            {/* Main Study Actions */}
            <View style={styles.detailActionGrid}>
              <Pressable
                style={({ pressed }) => [
                  styles.mainStudyBtn,
                  pressed && styles.pressed,
                ]}
                onPress={() => startStudySession(activeDeck, "srs")}
              >
                <BookOpen size={16} color="#000000" />
                <Text style={styles.mainStudyText}>
                  {activeDeck.dueCount > 0
                    ? `Study (${activeDeck.dueCount} Due)`
                    : "Study Decks"}
                </Text>
              </Pressable>

              <View style={styles.detailSubActionRow}>
                <Pressable
                  style={({ pressed }) => [
                    styles.subActionBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => startStudySession(activeDeck, "cram")}
                >
                  <RotateCw size={14} color="#FFFFFF" />
                  <Text style={styles.subActionText}>Cram All</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [
                    styles.subActionBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => startMatchGame(activeDeck)}
                >
                  <Gamepad2 size={14} color="#FFFFFF" />
                  <Text style={styles.subActionText}>Match Game</Text>
                </Pressable>
              </View>
            </View>
          </View>

          {/* Cards Section */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              Cards ({activeDeck.cards.length})
            </Text>
            {activeDeck.user_id === user?.id && (
              <Pressable
                style={({ pressed }) => [
                  styles.addCardMiniBtn,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  setTargetDeckId(activeDeck.id);
                  setCardError("");
                  setIsAddCardModalOpen(true);
                }}
              >
                <Plus size={14} color="#000000" />
                <Text style={styles.addCardMiniText}>Add Card</Text>
              </Pressable>
            )}
          </View>

          {activeDeck.cards.length === 0 ? (
            <View style={styles.emptyCard}>
              <Layers size={26} color="#52525B" />
              <Text style={styles.emptyTitle}>No cards in this deck yet</Text>
              <Text style={styles.emptySub}>
                Add questions and answers to begin spaced repetition practice.
              </Text>
            </View>
          ) : (
            activeDeck.cards.map((card, idx) => (
              <View key={card.id} style={styles.cardItemCard}>
                <View style={styles.cardItemHeader}>
                  <Text style={styles.cardNumberText}>#{idx + 1}</Text>
                  {card.due_date && card.due_date <= todayStr && (
                    <View style={styles.cardDueBadge}>
                      <Text style={styles.cardDueBadgeText}>Due</Text>
                    </View>
                  )}
                  {activeDeck.user_id === user?.id && (
                    <Pressable
                      onPress={() => handleDeleteCard(card.id)}
                      hitSlop={8}
                      style={{ padding: 4 }}
                    >
                      <Trash2 size={14} color="#52525B" />
                    </Pressable>
                  )}
                </View>
                <Text style={styles.cardItemPrompt}>{card.front_text}</Text>
                <View style={styles.cardItemDivider} />
                <Text style={styles.cardItemAnswer}>{card.back_text}</Text>
              </View>
            ))
          )}
        </ScrollView>

        {/* Add Card Modal */}
        <Modal
          visible={isAddCardModalOpen}
          animationType="slide"
          transparent
          onRequestClose={() => setIsAddCardModalOpen(false)}
        >
          <SafeAreaView style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.keyboardAvoid}
            >
              <View style={styles.modalCard}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Add Flashcard</Text>
                  <Pressable
                    onPress={() => setIsAddCardModalOpen(false)}
                    hitSlop={8}
                  >
                    <X size={20} color="#71717A" />
                  </Pressable>
                </View>

                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  bounces={false}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={styles.modalScrollContent}
                >
                  {cardError ? (
                    <View style={styles.modalErrorBox}>
                      <Text style={styles.modalErrorText}>{cardError}</Text>
                    </View>
                  ) : null}

                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>
                      FRONT (PROMPT / QUESTION)
                    </Text>
                    <TextInput
                      style={[styles.modalInput, styles.multilineInput]}
                      placeholder="e.g. What is the rate-limiting step in glycolysis?"
                      placeholderTextColor="#52525B"
                      value={frontText}
                      onChangeText={setFrontText}
                      multiline
                    />
                  </View>

                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>
                      BACK (ANSWER / EXPLANATION)
                    </Text>
                    <TextInput
                      style={[styles.modalInput, styles.multilineInput]}
                      placeholder="e.g. Phosphofructokinase-1 (PFK-1)"
                      placeholderTextColor="#52525B"
                      value={backText}
                      onChangeText={setBackText}
                      multiline
                    />
                  </View>

                  <View style={styles.cardActionsRow}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.saveAnotherBtn,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleAddCard(true)}
                      disabled={addingCard}
                    >
                      <PlusCircle size={15} color="#FFFFFF" />
                      <Text style={styles.saveAnotherText}>Save & Another</Text>
                    </Pressable>

                    <Pressable
                      style={({ pressed }) => [
                        styles.saveBtn,
                        { flex: 1, minWidth: 120 },
                        pressed && styles.pressed,
                      ]}
                      onPress={() => handleAddCard(false)}
                      disabled={addingCard}
                    >
                      {addingCard ? (
                        <ActivityIndicator size="small" color="#000000" />
                      ) : (
                        <Text style={styles.saveBtnText}>Save Card</Text>
                      )}
                    </Pressable>
                  </View>
                </ScrollView>
              </View>
            </KeyboardAvoidingView>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    );
  }

  // ==================== DECK CARD RENDERER ====================

  const renderDeckItem = (deck: DeckItem) => {
    const isOwner = deck.user_id === user?.id;
    const isSaved = savedDeckIds.has(deck.id);

    return (
      <View key={deck.id} style={styles.deckCard}>
        <View style={styles.deckHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.deckBadgeRow}>
              {deck.courses?.code ? (
                <View style={styles.courseBadge}>
                  <Text style={styles.courseBadgeText}>
                    {deck.courses.code}
                  </Text>
                </View>
              ) : null}
              {deck.is_public && (
                <View style={styles.visibilityBadge}>
                  <Globe size={10} color="#A1A1AA" />
                  <Text style={styles.visibilityText}>Public</Text>
                </View>
              )}
              {deck.isSaved && (
                <View style={styles.savedBadge}>
                  <Bookmark size={10} color="#A1A1AA" />
                  <Text style={styles.visibilityText}>Saved</Text>
                </View>
              )}
            </View>
            <Text style={styles.deckTitle}>{deck.title}</Text>
            {deck.description ? (
              <Text style={styles.deckDescSnippet} numberOfLines={1}>
                {deck.description}
              </Text>
            ) : null}
            <Text style={styles.deckMeta}>
              {deck.cards.length} cards ·{" "}
              <Text
                style={
                  deck.dueCount > 0 ? styles.dueTextHighlight : null
                }
              >
                {deck.dueCount} due
              </Text>
            </Text>
          </View>

          {isOwner ? (
            <Pressable
              onPress={() => handleDeleteDeck(deck.id)}
              hitSlop={8}
              style={styles.trashBtn}
            >
              <Trash2 size={15} color="#52525B" />
            </Pressable>
          ) : null}
        </View>

        {/* Actions Row */}
        <View style={styles.deckActionsRow}>
          {activeTab === "discover" && !isOwner ? (
            <Pressable
              style={({ pressed }) => [
                styles.saveCommunityBtn,
                isSaved && styles.saveCommunityBtnActive,
                pressed && styles.pressed,
              ]}
              disabled={isSaved}
              onPress={() => handleSaveDeck(deck.id)}
            >
              {isSaved ? (
                <>
                  <Check size={14} color="#A1A1AA" />
                  <Text style={styles.saveCommunityTextActive}>
                    Saved
                  </Text>
                </>
              ) : (
                <>
                  <Bookmark size={14} color="#000000" />
                  <Text style={styles.saveCommunityText}>
                    Save to Library
                  </Text>
                </>
              )}
            </Pressable>
          ) : null}

          {deck.cards.length > 0 && (
            <Pressable
              style={({ pressed }) => [
                styles.reviewBtn,
                deck.dueCount > 0
                  ? styles.reviewBtnActive
                  : styles.reviewBtnInactive,
                pressed && styles.pressed,
              ]}
              onPress={() => startStudySession(deck, "srs")}
            >
              <BookOpen
                size={13}
                color={deck.dueCount > 0 ? "#000000" : "#FFFFFF"}
              />
              <Text
                style={
                  deck.dueCount > 0
                    ? styles.reviewBtnTextActive
                    : styles.reviewBtnTextInactive
                }
              >
                {deck.dueCount > 0
                  ? `Study (${deck.dueCount})`
                  : "Study"}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.detailLinkBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              setActiveDeck(deck);
              setActiveView("deck_detail");
            }}
          >
            <Text style={styles.detailLinkText}>Cards</Text>
            <ChevronRight size={14} color="#A1A1AA" />
          </Pressable>
        </View>
      </View>
    );
  };

  // ==================== RENDER: MAIN LIBRARY ====================

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.isDark ? "#FFFFFF" : "#09090B"}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Flashcards</Text>
            <Text style={styles.subtitle}>
              Active recall with spaced repetition
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.addDeckBtn,
              pressed && styles.pressed,
            ]}
            onPress={() => {
              setDeckError("");
              setIsNewDeckModalOpen(true);
            }}
          >
            <Plus size={16} color="#000000" />
            <Text style={styles.addDeckBtnText}>New Deck</Text>
          </Pressable>
        </View>

        {errorMsg && (
          <View style={styles.errorBox}>
            <AlertCircle size={14} color="#EF4444" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Tab Segment Switcher */}
        <View style={styles.tabBar}>
          <Pressable
            style={[
              styles.tabItem,
              activeTab === "my_decks" && styles.tabItemActive,
            ]}
            onPress={() => {
              setActiveTab("my_decks");
              triggerHaptic("light");
            }}
          >
            <Text
              style={[
                styles.tabItemText,
                activeTab === "my_decks" && styles.tabItemTextActive,
              ]}
            >
              My Decks ({myDecks.length})
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tabItem,
              activeTab === "saved" && styles.tabItemActive,
            ]}
            onPress={() => {
              setActiveTab("saved");
              triggerHaptic("light");
            }}
          >
            <Text
              style={[
                styles.tabItemText,
                activeTab === "saved" && styles.tabItemTextActive,
              ]}
            >
              Saved ({savedDecks.length})
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tabItem,
              activeTab === "discover" && styles.tabItemActive,
            ]}
            onPress={() => {
              setActiveTab("discover");
              triggerHaptic("light");
            }}
          >
            <Text
              style={[
                styles.tabItemText,
                activeTab === "discover" && styles.tabItemTextActive,
              ]}
            >
              Discover ({publicDecks.length})
            </Text>
          </Pressable>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={15} color="#71717A" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search decks by title or course..."
            placeholderTextColor="#71717A"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <X size={15} color="#71717A" />
            </Pressable>
          ) : null}
        </View>

        {/* Course Filter Chips */}
        {courses.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.coursesScroll}
          >
            <Pressable
              style={[
                styles.courseChip,
                selectedCourseId === "all" && styles.courseChipActive,
              ]}
              onPress={() => setSelectedCourseId("all")}
            >
              <Text
                style={[
                  styles.courseChipText,
                  selectedCourseId === "all" && styles.courseChipTextActive,
                ]}
              >
                All Courses
              </Text>
            </Pressable>

            {courses.map((c) => (
              <Pressable
                key={c.id}
                style={[
                  styles.courseChip,
                  selectedCourseId === c.id && styles.courseChipActive,
                ]}
                onPress={() =>
                  setSelectedCourseId(selectedCourseId === c.id ? "all" : c.id)
                }
              >
                <Text
                  style={[
                    styles.courseChipText,
                    selectedCourseId === c.id && styles.courseChipTextActive,
                  ]}
                >
                  {c.code || c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Decks List */}
        <View style={styles.deckList}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color="#FFFFFF"
              style={{ marginVertical: 30 }}
            />
          ) : displayedDecks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Layers size={28} color="#52525B" />
              <Text style={styles.emptyTitle}>
                {activeTab === "discover"
                  ? "No public decks found"
                  : activeTab === "saved"
                    ? "No saved decks yet"
                    : "No flashcard decks yet"}
              </Text>
              <Text style={styles.emptySub}>
                {activeTab === "discover"
                  ? "Public decks created by other students will appear here."
                  : activeTab === "saved"
                    ? "Explore the Discover tab to save decks created by fellow students."
                    : "Create your first deck to start practicing active recall."}
              </Text>
            </View>
          ) : activeTab === "my_decks" &&
            courseGroupedMyDecks &&
            courses.length > 0 ? (
            <View style={{ gap: 20 }}>
              {courseGroupedMyDecks.courses.map((group) => (
                <View key={group.course.id} style={{ gap: 10 }}>
                  <View style={styles.courseGroupHeader}>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Text style={styles.courseGroupName}>
                        {group.course.name}
                      </Text>
                      {group.course.code ? (
                        <View style={styles.courseBadge}>
                          <Text style={styles.courseBadgeText}>
                            {group.course.code}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={styles.courseGroupMeta}>
                      {group.decks.length} decks · {group.totalCards} cards ·{" "}
                      {group.totalDue} due
                    </Text>
                  </View>

                  {group.decks.length === 0 ? (
                    <View style={styles.courseEmptySubCard}>
                      <Text style={styles.courseEmptySubText}>
                        No decks linked to this course yet.
                      </Text>
                    </View>
                  ) : (
                    group.decks.map(renderDeckItem)
                  )}
                </View>
              ))}

              {courseGroupedMyDecks.uncategorized.length > 0 ? (
                <View style={{ gap: 10, marginTop: 6 }}>
                  <View style={styles.courseGroupHeader}>
                    <Text style={styles.courseGroupName}>
                      General / Uncategorized Decks
                    </Text>
                    <Text style={styles.courseGroupMeta}>
                      {courseGroupedMyDecks.uncategorized.length} decks
                    </Text>
                  </View>
                  {courseGroupedMyDecks.uncategorized.map(renderDeckItem)}
                </View>
              ) : null}
            </View>
          ) : (
            displayedDecks.map(renderDeckItem)
          )}
        </View>
      </ScrollView>

      {/* New Deck Modal */}
      <Modal
        visible={isNewDeckModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsNewDeckModalOpen(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Flashcard Deck</Text>
                <Pressable
                  onPress={() => setIsNewDeckModalOpen(false)}
                  hitSlop={8}
                >
                  <X size={20} color="#71717A" />
                </Pressable>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                {deckError ? (
                  <View style={styles.modalErrorBox}>
                    <Text style={styles.modalErrorText}>{deckError}</Text>
                  </View>
                ) : null}

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>DECK TITLE</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. Neuroanatomy Pathways"
                    placeholderTextColor="#52525B"
                    value={newDeckTitle}
                    onChangeText={setNewDeckTitle}
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>DESCRIPTION (OPTIONAL)</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 60, paddingTop: 10 }]}
                    placeholder="e.g. Key motor and sensory pathways for Midterm 2"
                    placeholderTextColor="#52525B"
                    value={newDeckDescription}
                    onChangeText={setNewDeckDescription}
                    multiline
                  />
                </View>

                {courses.length > 0 && (
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>
                      LINK TO COURSE (OPTIONAL)
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ gap: 6 }}
                    >
                      {courses.map((c) => (
                        <Pressable
                          key={c.id}
                          style={[
                            styles.courseChip,
                            newDeckCourseId === c.id && styles.courseChipActive,
                          ]}
                          onPress={() =>
                            setNewDeckCourseId(
                              newDeckCourseId === c.id ? "" : c.id,
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.courseChipText,
                              newDeckCourseId === c.id &&
                                styles.courseChipTextActive,
                            ]}
                          >
                            {c.code || c.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>VISIBILITY</Text>
                  <View style={styles.visibilityToggleRow}>
                    <Pressable
                      style={[
                        styles.visibilityOption,
                        !newDeckIsPublic && styles.visibilityOptionActive,
                      ]}
                      onPress={() => setNewDeckIsPublic(false)}
                    >
                      <Lock
                        size={13}
                        color={!newDeckIsPublic ? "#000000" : "#A1A1AA"}
                      />
                      <Text
                        style={[
                          styles.visibilityOptionText,
                          !newDeckIsPublic && styles.visibilityOptionTextActive,
                        ]}
                      >
                        Private (Only Me)
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.visibilityOption,
                        newDeckIsPublic && styles.visibilityOptionActive,
                      ]}
                      onPress={() => setNewDeckIsPublic(true)}
                    >
                      <Globe
                        size={13}
                        color={newDeckIsPublic ? "#000000" : "#A1A1AA"}
                      />
                      <Text
                        style={[
                          styles.visibilityOptionText,
                          newDeckIsPublic && styles.visibilityOptionTextActive,
                        ]}
                      >
                        Public (University)
                      </Text>
                    </Pressable>
                  </View>
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.saveBtn,
                    pressed && styles.pressed,
                  ]}
                  onPress={handleCreateDeck}
                  disabled={creatingDeck}
                >
                  {creatingDeck ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <View style={styles.saveBtnRow}>
                      <Check size={16} color="#000000" />
                      <Text style={styles.saveBtnText}>
                        Create Deck & Add Cards
                      </Text>
                    </View>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Add Card Modal */}
      <Modal
        visible={isAddCardModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddCardModalOpen(false)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Flashcard</Text>
                <Pressable
                  onPress={() => setIsAddCardModalOpen(false)}
                  hitSlop={8}
                >
                  <X size={20} color="#71717A" />
                </Pressable>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                bounces={false}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.modalScrollContent}
              >
                {cardError ? (
                  <View style={styles.modalErrorBox}>
                    <Text style={styles.modalErrorText}>{cardError}</Text>
                  </View>
                ) : null}

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>
                    FRONT (PROMPT / QUESTION)
                  </Text>
                  <TextInput
                    style={[styles.modalInput, styles.multilineInput]}
                    placeholder="e.g. What is the derivative of sin(x)?"
                    placeholderTextColor="#52525B"
                    value={frontText}
                    onChangeText={setFrontText}
                    multiline
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>
                    BACK (ANSWER / EXPLANATION)
                  </Text>
                  <TextInput
                    style={[styles.modalInput, styles.multilineInput]}
                    placeholder="e.g. cos(x)"
                    placeholderTextColor="#52525B"
                    value={backText}
                    onChangeText={setBackText}
                    multiline
                  />
                </View>

                <View style={styles.cardActionsRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.saveAnotherBtn,
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleAddCard(true)}
                    disabled={addingCard}
                  >
                    <PlusCircle size={15} color="#FFFFFF" />
                    <Text style={styles.saveAnotherText}>Save & Another</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.saveBtn,
                      { flex: 1, minWidth: 120 },
                      pressed && styles.pressed,
                    ]}
                    onPress={() => handleAddCard(false)}
                    disabled={addingCard}
                  >
                    {addingCard ? (
                      <ActivityIndicator size="small" color="#000000" />
                    ) : (
                      <Text style={styles.saveBtnText}>Save Card</Text>
                    )}
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 110 },
    pressed: { transform: [{ scale: 0.97 }] },

    // Header
    header: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.textPrimary,
      letterSpacing: -0.4,
    },
    subtitle: { fontSize: 12, color: theme.textMuted, marginTop: 2 },
    addDeckBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.buttonPrimaryBg,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 10,
    },
    addDeckBtnText: { color: theme.buttonPrimaryText, fontSize: 12, fontWeight: "700" },

    // Tabs
    tabBar: {
      flexDirection: "row",
      backgroundColor: theme.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 3,
      marginBottom: 12,
    },
    tabItem: {
      flex: 1,
      paddingVertical: 7,
      alignItems: "center",
      borderRadius: 9,
    },
    tabItemActive: {
      backgroundColor: theme.surfaceHover,
    },
    tabItemText: {
      color: theme.textMuted,
      fontSize: 11,
      fontWeight: "600",
    },
    tabItemTextActive: {
      color: theme.textPrimary,
      fontWeight: "700",
    },

    // Search
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      height: 40,
      marginBottom: 12,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      color: theme.textPrimary,
      fontSize: 13,
    },

    // Course Filter
    coursesScroll: {
      gap: 6,
      marginBottom: 14,
    },
    courseChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
    },
    courseChipActive: {
      backgroundColor: theme.buttonPrimaryBg,
      borderColor: theme.buttonPrimaryBg,
    },
    courseChipText: {
      color: theme.textSecondary,
      fontSize: 11,
      fontWeight: "600",
    },
    courseChipTextActive: {
      color: theme.buttonPrimaryText,
      fontWeight: "700",
    },

    // Deck List
    deckList: { gap: 12 },
    deckCard: {
      backgroundColor: theme.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 16,
      gap: 12,
    },
    deckHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    deckBadgeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 6,
    },
    courseBadge: {
      backgroundColor: theme.surfaceHover,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
    },
    courseBadgeText: {
      color: theme.textSecondary,
      fontSize: 10,
      fontWeight: "700",
    },
    visibilityBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.surfaceHover,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    savedBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: "rgba(59,130,246,0.1)",
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: "rgba(59,130,246,0.2)",
    },
    visibilityText: {
      color: theme.textSecondary,
      fontSize: 10,
      fontWeight: "600",
    },
    deckTitle: {
      color: theme.textPrimary,
      fontSize: 16,
      fontWeight: "700",
      letterSpacing: -0.2,
    },
    deckDescSnippet: { color: theme.textMuted, fontSize: 12, marginTop: 2 },
    deckMeta: {
      color: theme.textMuted,
      fontSize: 11,
      marginTop: 4,
      fontVariant: ["tabular-nums"],
    },
    dueTextHighlight: {
      color: theme.textPrimary,
      fontWeight: "700",
    },
    trashBtn: { padding: 4 },
    deckActionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 4,
    },
    reviewBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 9,
      borderRadius: 10,
    },
    reviewBtnActive: {
      backgroundColor: theme.buttonPrimaryBg,
    },
    reviewBtnInactive: {
      backgroundColor: theme.surfaceHover,
      borderWidth: 1,
      borderColor: theme.border,
    },
    reviewBtnTextActive: {
      color: theme.buttonPrimaryText,
      fontSize: 12,
      fontWeight: "700",
    },
    reviewBtnTextInactive: {
      color: theme.textPrimary,
      fontSize: 12,
      fontWeight: "600",
    },
    detailLinkBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.surfaceHover,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
    },
    detailLinkText: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: "600",
    },
    saveCommunityBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: theme.buttonPrimaryBg,
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 10,
    },
    saveCommunityBtnActive: {
      backgroundColor: theme.surfaceHover,
      borderWidth: 1,
      borderColor: theme.border,
    },
    saveCommunityText: {
      color: theme.buttonPrimaryText,
      fontSize: 12,
      fontWeight: "700",
    },
    saveCommunityTextActive: {
      color: theme.textSecondary,
      fontSize: 12,
      fontWeight: "600",
    },

    // Empty State
    emptyCard: {
      alignItems: "center",
      paddingVertical: 36,
      gap: 6,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.border,
      borderRadius: 14,
      backgroundColor: theme.surfaceSubtle,
    },
    emptyTitle: { color: theme.textPrimary, fontSize: 13, fontWeight: "600" },
    emptySub: {
      color: theme.textMuted,
      fontSize: 11,
      textAlign: "center",
      maxWidth: 240,
    },

    // Session / Detail Header
    sessionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.borderSubtle,
    },
    backBtn: { padding: 4 },
    headerCenter: { alignItems: "center", flex: 1, marginHorizontal: 10 },
    headerDeckTitle: { color: theme.textPrimary, fontSize: 14, fontWeight: "700" },
    headerBadgeRow: { flexDirection: "row", gap: 6, marginTop: 2 },
    headerModeBadge: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    headerRequeueBadge: {
      color: theme.errorText,
      fontSize: 10,
      fontWeight: "700",
      textTransform: "uppercase",
    },
    headerCounter: {
      color: theme.textMuted,
      fontSize: 12,
      fontWeight: "600",
      fontVariant: ["tabular-nums"],
    },
    timerBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.surfaceHover,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    timerText: {
      color: theme.textPrimary,
      fontSize: 12,
      fontWeight: "700",
      fontVariant: ["tabular-nums"],
    },

    // Study Player Body
    studyContent: {
      flex: 1,
      paddingHorizontal: 20,
      paddingBottom: 30,
      justifyContent: "center",
    },
    tactileCard: {
      backgroundColor: theme.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 24,
      minHeight: 300,
      justifyContent: "space-between",
    },
    cardFrontText: {
      color: theme.textPrimary,
      fontSize: 20,
      fontWeight: "600",
      textAlign: "center",
      lineHeight: 28,
    },
    cardBackText: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: "500",
      textAlign: "center",
      lineHeight: 26,
    },
    flipPrompt: {
      color: theme.textMuted,
      fontSize: 12,
      textAlign: "center",
      marginTop: 10,
    },

    // Rating Bar
    ratingRow: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    rateBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },
    rateRetry: {
      backgroundColor: "rgba(239,68,68,0.1)",
      borderColor: "rgba(239,68,68,0.25)",
    },
    rateHard: {
      backgroundColor: "rgba(245,158,11,0.1)",
      borderColor: "rgba(245,158,11,0.25)",
    },
    rateGood: {
      backgroundColor: "rgba(59,130,246,0.1)",
      borderColor: "rgba(59,130,246,0.25)",
    },
    rateEasy: {
      backgroundColor: "rgba(16,185,129,0.1)",
      borderColor: "rgba(16,185,129,0.25)",
    },
    rateBtnLabel: {
      fontSize: 12,
      fontWeight: "700",
    },
    rateRetryText: { color: "#EF4444" },
    rateHardText: { color: "#F59E0B" },
    rateGoodText: { color: "#3B82F6" },
    rateEasyText: { color: "#10B981" },

    // Match Mode
    matchScroll: { padding: 20, gap: 14 },
    matchHintText: { color: theme.textMuted, fontSize: 12, textAlign: "center" },
    matchNoticeText: {
      color: theme.textMuted,
      fontSize: 11,
      textAlign: "center",
      paddingHorizontal: 10,
    },
    matchGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      justifyContent: "space-between",
    },
    matchTile: {
      width: "48%",
      minHeight: 90,
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    matchTileSelected: {
      borderColor: theme.textPrimary,
      backgroundColor: theme.surfaceHover,
    },
    matchTileMismatched: {
      borderColor: "#EF4444",
      backgroundColor: "rgba(239,68,68,0.1)",
    },
    matchTileMatched: {
      borderColor: "#10B981",
      opacity: 0.35,
    },
    matchTileText: {
      color: theme.textPrimary,
      fontSize: 13,
      fontWeight: "600",
      textAlign: "center",
      lineHeight: 18,
    },
    matchTileTextMatched: {
      color: "#10B981",
    },

    // Deck Detail
    detailScroll: {
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: 100,
      gap: 18,
    },
    deckBanner: {
      backgroundColor: theme.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 18,
      gap: 14,
    },
    bannerTitle: {
      color: theme.textPrimary,
      fontSize: 18,
      fontWeight: "800",
      letterSpacing: -0.3,
    },
    bannerDesc: {
      color: theme.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    statsRow: { flexDirection: "row", gap: 8 },
    deckStatCard: {
      flex: 1,
      backgroundColor: theme.surfaceHover,
      borderRadius: 10,
      padding: 10,
      alignItems: "center",
      gap: 2,
    },
    deckStatValue: {
      color: theme.textPrimary,
      fontSize: 14,
      fontWeight: "800",
    },
    deckStatLabel: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: "600",
    },
    primaryStudyBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: theme.buttonPrimaryBg,
      paddingVertical: 12,
      borderRadius: 12,
    },
    primaryStudyBtnText: {
      color: theme.buttonPrimaryText,
      fontSize: 13,
      fontWeight: "700",
    },
    subActionsRow: { flexDirection: "row", gap: 8 },
    subActionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: theme.surfaceHover,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 10,
      borderRadius: 10,
    },
    subActionText: { color: theme.textPrimary, fontSize: 12, fontWeight: "600" },
    sectionHeaderRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    sectionTitle: { color: theme.textPrimary, fontSize: 15, fontWeight: "700" },
    addCardMiniBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      backgroundColor: theme.buttonPrimaryBg,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    addCardMiniText: { color: theme.buttonPrimaryText, fontSize: 11, fontWeight: "700" },
    cardItemCard: {
      backgroundColor: theme.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.borderSubtle,
      padding: 14,
      gap: 6,
    },
    cardItemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    cardNumberText: { color: theme.textMuted, fontSize: 11, fontWeight: "700" },
    cardDueBadge: {
      backgroundColor: theme.surfaceHover,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    cardDueBadgeText: { color: theme.textPrimary, fontSize: 9, fontWeight: "700" },
    cardItemPrompt: {
      color: theme.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      lineHeight: 20,
    },
    cardItemDivider: {
      height: 1,
      backgroundColor: theme.borderSubtle,
      marginVertical: 2,
    },
    cardItemAnswer: { color: theme.textSecondary, fontSize: 13, lineHeight: 18 },

    // Modals
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.6)",
      justifyContent: "flex-end",
    },
    keyboardAvoid: { width: "100%", justifyContent: "flex-end" },
    modalCard: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 20,
      maxHeight: "90%",
    },
    modalScrollContent: { gap: 14, paddingBottom: 20 },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    modalTitle: { color: theme.textPrimary, fontSize: 17, fontWeight: "700" },
    modalErrorBox: {
      backgroundColor: theme.errorBg,
      borderRadius: 8,
      padding: 8,
    },
    modalErrorText: { color: theme.errorText, fontSize: 11 },
    modalField: { gap: 6 },
    modalLabel: {
      color: theme.textMuted,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.5,
    },
    modalInput: {
      backgroundColor: theme.surfaceHover,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 12,
      height: 44,
      color: theme.textPrimary,
      fontSize: 13,
    },
    multilineInput: { height: 74, textAlignVertical: "top", paddingTop: 10 },
    visibilityToggleRow: { flexDirection: "row", gap: 8 },
    visibilityOption: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: theme.surfaceHover,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.border,
      paddingVertical: 10,
    },
    visibilityOptionActive: {
      backgroundColor: theme.buttonPrimaryBg,
      borderColor: theme.buttonPrimaryBg,
    },
    visibilityOptionText: { color: theme.textSecondary, fontSize: 11, fontWeight: "600" },
    visibilityOptionTextActive: { color: theme.buttonPrimaryText, fontWeight: "700" },
    cardActionsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 10,
      marginTop: 6,
    },
    saveAnotherBtn: {
      flex: 1,
      minWidth: 140,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: theme.surfaceHover,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
    },
    saveAnotherText: { color: theme.textPrimary, fontSize: 12, fontWeight: "600" },
    saveBtn: {
      flex: 1,
      minWidth: 120,
      backgroundColor: theme.buttonPrimaryBg,
      borderRadius: 12,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    saveBtnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    saveBtnText: { color: theme.buttonPrimaryText, fontSize: 13, fontWeight: "700" },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: theme.errorBg,
      borderWidth: 1,
      borderColor: theme.errorText,
      padding: 12,
      borderRadius: 12,
      marginBottom: 16,
    },
    errorText: { color: theme.errorText, fontSize: 12 },

    // Course Grouping Hierarchy
    courseGroupHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    courseGroupName: {
      fontSize: 14,
      fontWeight: "700",
      color: theme.textPrimary,
    },
    courseGroupMeta: {
      fontSize: 11,
      color: theme.textMuted,
      fontVariant: ["tabular-nums"],
    },
    courseEmptySubCard: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: theme.border,
      alignItems: "center",
    },
    courseEmptySubText: {
      fontSize: 12,
      color: theme.textMuted,
    },
    doneBtn: {
      backgroundColor: theme.surfaceHover,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 16,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8,
    },
    doneBtnText: {
      color: theme.textPrimary,
      fontSize: 13,
      fontWeight: "600",
    },
    deckBannerMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    detailTitle: {
      fontSize: 20,
      fontWeight: "700",
      color: theme.textPrimary,
      marginBottom: 4,
    },
    detailDescription: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 18,
      marginBottom: 10,
    },
    detailStatsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 16,
    },
    detailStatText: {
      fontSize: 12,
      color: theme.textMuted,
    },
    detailStatDot: {
      fontSize: 12,
      color: theme.textMuted,
    },
    detailStatDue: {
      color: "#F59E0B",
      fontWeight: "600",
    },
    ratingGrid: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 20,
      paddingBottom: 20,
    },
    ratingBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
    },
    rateTitleRetry: { color: "#EF4444", fontSize: 13, fontWeight: "700" },
    rateTitleHard: { color: "#F59E0B", fontSize: 13, fontWeight: "700" },
    rateTitleGood: { color: "#3B82F6", fontSize: 13, fontWeight: "700" },
    rateTitleEasy: { color: "#10B981", fontSize: 13, fontWeight: "700" },
    rateSubtitle: { color: theme.textMuted, fontSize: 10, marginTop: 2 },
    showAnswerBtn: {
      backgroundColor: theme.buttonPrimaryBg,
      borderRadius: 12,
      paddingVertical: 14,
      marginHorizontal: 20,
      marginBottom: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    showAnswerText: {
      color: theme.buttonPrimaryText,
      fontSize: 14,
      fontWeight: "700",
    },
    summaryContainer: {
      flex: 1,
      padding: 24,
      alignItems: "center",
      justifyContent: "center",
      gap: 20,
    },
    summaryBadge: {
      alignItems: "center",
      gap: 8,
    },
    summaryTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.textPrimary,
    },
    summarySubtitle: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: "center",
    },
    summaryMetricsRow: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
    },
    summaryMetricCard: {
      flex: 1,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
      gap: 4,
    },
    summaryMetricValue: {
      fontSize: 20,
      fontWeight: "800",
      color: theme.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    summaryMetricLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.textMuted,
      letterSpacing: 0.5,
    },
    summaryActionRow: {
      flexDirection: "row",
      gap: 12,
      width: "100%",
    },
    studyAgainBtn: {
      flex: 1,
      backgroundColor: theme.buttonPrimaryBg,
      borderRadius: 12,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    studyAgainText: {
      color: theme.buttonPrimaryText,
      fontSize: 13,
      fontWeight: "700",
    },
    detailActionGrid: {
      gap: 10,
    },
    mainStudyBtn: {
      backgroundColor: theme.buttonPrimaryBg,
      borderRadius: 12,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    mainStudyText: {
      color: theme.buttonPrimaryText,
      fontSize: 14,
      fontWeight: "700",
    },
    detailSubActionRow: {
      flexDirection: "row",
      gap: 10,
    },
    subActionBtn: {
      flex: 1,
      backgroundColor: theme.surfaceHover,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    breakdownCard: {
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      padding: 16,
      gap: 12,
      width: "100%",
    },
    breakdownTitle: {
      fontSize: 11,
      fontWeight: "700",
      color: theme.textMuted,
      letterSpacing: 0.5,
    },
    breakdownRow: {
      flexDirection: "row",
      gap: 8,
    },
    breakdownItem: {
      flex: 1,
      backgroundColor: theme.surfaceHover,
      borderRadius: 10,
      borderWidth: 1,
      padding: 10,
      alignItems: "center",
      gap: 2,
    },
    breakdownCount: {
      fontSize: 16,
      fontWeight: "800",
      fontVariant: ["tabular-nums"],
    },
    breakdownLabel: {
      fontSize: 10,
      fontWeight: "600",
      color: theme.textMuted,
    },
    cardTopRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    cardRoleLabel: {
      fontSize: 10,
      fontWeight: "700",
      color: theme.textMuted,
      letterSpacing: 0.5,
    },
    intervalHint: {
      fontSize: 11,
      fontWeight: "600",
      color: theme.textSecondary,
    },
    cardScroll: {
      flex: 1,
    },
    cardScrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 10,
    },
    cardText: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.textPrimary,
      textAlign: "center",
      lineHeight: 26,
    },
    cardFooterRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      marginTop: 12,
    },
    cardFooterText: {
      fontSize: 11,
      color: theme.textMuted,
      fontWeight: "500",
    },
  });
