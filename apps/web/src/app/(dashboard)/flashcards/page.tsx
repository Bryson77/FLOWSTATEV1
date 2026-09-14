"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  BookOpen,
  Layers,
  RotateCw,
  Check,
  ArrowLeft,
  Trash2,
  AlertCircle,
  X,
  Search,
  Copy,
  Tag,
  Share2,
  Shuffle,
  Grid,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MoreVertical,
  Download,
  Upload,
  UserPlus,
  ArrowUpDown,
  FileText,
  Flame,
  Award,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { getSafeErrorMessage } from "@/lib/errors";
import {
  createDeckSchema,
  createCardSchema,
  validateWithZod,
  reorderCardsSchema,
  type CreateDeckInput,
  type CreateCardInput,
} from "@/lib/schemas";
import {
  calculateNextReview,
  calculateSM2,
  QUALITY_MAP,
  type ReviewRating,
} from "@saktus/study-engine";
import type {
  FlashcardDeck,
  Flashcard,
  FlashcardReviewState,
  DeckMember,
} from "@saktus/shared";

// Card item type combining content and user's review state
interface EnhancedCard extends Flashcard {
  review_state?: FlashcardReviewState | null;
}

// Deck item type combining deck metadata and aggregates
interface EnhancedDeck extends FlashcardDeck {
  cards?: EnhancedCard[];
  card_count?: number;
  due_count?: number;
  mastery_pct?: number;
  courses?: { name: string; code: string } | null;
}

interface CourseOption {
  id: string;
  name: string;
  code: string;
}

type LibraryTab = "my" | "saved" | "shared" | "discover";
type CommandTab = "cards" | "progress" | "about";
type ViewMode =
  "library" | "deck_command" | "rapid_editor" | "study_player" | "match_game";

export default function FlashcardsPage() {
  const { toast } = useToast();
  const supabase = createClient();

  // Navigation & View state
  const [viewMode, setViewMode] = useState<ViewMode>("library");
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("my");
  const [commandTab, setCommandTab] = useState<CommandTab>("cards");
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Decks & Data state
  const [myDecks, setMyDecks] = useState<EnhancedDeck[]>([]);
  const [savedDecks, setSavedDecks] = useState<EnhancedDeck[]>([]);
  const [sharedDecks, setSharedDecks] = useState<EnhancedDeck[]>([]);
  const [discoverDecks, setDiscoverDecks] = useState<EnhancedDeck[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);

  // Selected / Active Deck
  const [activeDeck, setActiveDeck] = useState<EnhancedDeck | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCourseFilter, setSelectedCourseFilter] = useState("all");
  const [reviewFilter, setReviewFilter] = useState<
    "all" | "due" | "learning" | "mastered"
  >("all");

  // Modals
  const [isCreateDeckOpen, setIsCreateDeckOpen] = useState(false);
  const [isEditDeckOpen, setIsEditDeckOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Deck Form State
  const [deckFormTitle, setDeckFormTitle] = useState("");
  const [deckFormDescription, setDeckFormDescription] = useState("");
  const [deckFormCourseId, setDeckFormCourseId] = useState<string>("");
  const [deckFormVisibility, setDeckFormVisibility] = useState<
    "private" | "friends" | "public"
  >("private");
  const [deckFormTags, setDeckFormTags] = useState("");
  const [isSavingDeck, setIsSavingDeck] = useState(false);

  // Single Card Form State
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardType, setCardType] = useState<
    "standard" | "true_false" | "multiple_choice"
  >("standard");
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");
  const [mcqOptions, setMcqOptions] = useState<string[]>(["", "", "", ""]);
  const [mcqCorrect, setMcqCorrect] = useState("0");
  const [tfCorrect, setTfCorrect] = useState("True");
  const [isSavingCard, setIsSavingCard] = useState(false);

  // Rapid Editor State
  const [rapidCards, setRapidCards] = useState<
    Array<{
      id?: string;
      front: string;
      back: string;
      cardType: "standard" | "true_false" | "multiple_choice";
      options: string[];
      correctAnswer: string;
      isNew?: boolean;
    }>
  >([]);
  const [rapidFocusedIdx, setRapidFocusedIdx] = useState<number>(0);

  // Study Player State
  const [studyMode, setStudyMode] = useState<"srs" | "cram">("srs");
  const [studyQueue, setStudyQueue] = useState<EnhancedCard[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedMcqChoice, setSelectedMcqChoice] = useState<string | null>(
    null,
  );
  const [sessionSessionStats, setSessionStats] = useState({
    reviewed: 0,
    retry: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  // Match Mode Game State
  const [matchTiles, setMatchTiles] = useState<
    Array<{
      id: string;
      cardId: string;
      type: "front" | "back";
      text: string;
      isMatched: boolean;
    }>
  >([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [matchTimerSeconds, setMatchTimerSeconds] = useState(0);
  const [matchMistakes, setMatchMistakes] = useState(0);
  const [isMatchWon, setIsMatchWon] = useState(false);
  const matchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Import State
  const [importSource, setImportSource] = useState<"paste" | "quizlet">(
    "paste",
  );
  const [pasteContent, setPasteContent] = useState("");
  const [pasteDelimiter, setPasteDelimiter] = useState<
    "auto" | "tab" | "comma" | "semicolon" | "pipe"
  >("auto");
  const [parsedImportRows, setParsedImportRows] = useState<
    Array<{ front: string; back: string; isValid: boolean }>
  >([]);
  const [isImporting, setIsImporting] = useState(false);

  // Collaboration State
  const [collaborators, setCollaborators] = useState<DeckMember[]>([]);
  const [inviteEmailOrUsername, setInviteEmailOrUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("editor");

  // Today's ISO date string
  const todayStr = new Date().toISOString().split("T")[0];

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user)
        throw new Error("Sign in required to view flashcards.");
      setCurrentUserId(user.id);

      // 1. Fetch user's courses
      const { data: coursesData } = await supabase
        .from("courses")
        .select("id, name, code")
        .eq("user_id", user.id)
        .order("name");
      setCourses(coursesData || []);

      // 2. Fetch My Decks
      const { data: decksData, error: decksErr } = await supabase
        .from("flashcard_decks")
        .select(
          `
          id, course_id, user_id, title, description, tags, is_public, visibility, revision, created_at,
          courses (name, code),
          flashcards (
            id, deck_id, user_id, position, version, front_text, back_text, card_type, options, correct_answer, created_at, updated_at
          )
        `,
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (decksErr) throw decksErr;

      // 3. Fetch user's review states for due count / mastery calculation
      const { data: reviewStates } = await supabase
        .from("flashcard_review_states")
        .select("*")
        .eq("user_id", user.id);

      const reviewMap = new Map<string, FlashcardReviewState>();
      (reviewStates || []).forEach((rs: any) => reviewMap.set(rs.card_id, rs));

      const processedMyDecks: EnhancedDeck[] = (decksData || []).map(
        (d: any) => {
          const sortedCards: EnhancedCard[] = (d.flashcards || [])
            .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
            .map((c: any) => ({
              ...c,
              review_state: reviewMap.get(c.id) || null,
            }));

          const total = sortedCards.length;
          const dueCount = sortedCards.filter((c) => {
            if (!c.review_state) return true; // Unstudied cards are due
            return c.review_state.due_date <= todayStr;
          }).length;

          const masteredCount = sortedCards.filter(
            (c) => (c.review_state?.interval_days ?? 0) >= 21,
          ).length;
          const masteryPct =
            total > 0 ? Math.round((masteredCount / total) * 100) : 0;

          return {
            ...d,
            cards: sortedCards,
            card_count: total,
            due_count: dueCount,
            mastery_pct: masteryPct,
          };
        },
      );
      setMyDecks(processedMyDecks);

      // 4. Fetch Saved Decks
      const { data: savedData } = await supabase
        .from("deck_saves")
        .select(
          `
          deck_id,
          flashcard_decks (
            id, course_id, user_id, title, description, tags, is_public, visibility, revision, created_at, source_creator_username,
            courses (name, code),
            flashcards (id, deck_id, user_id, position, version, front_text, back_text, card_type, options, correct_answer)
          )
        `,
        )
        .eq("user_id", user.id);

      const processedSaved: EnhancedDeck[] = (savedData || [])
        .map((s: any) => s.flashcard_decks)
        .filter(Boolean)
        .map((d: any) => {
          const cards = (d.flashcards || []).map((c: any) => ({
            ...c,
            review_state: reviewMap.get(c.id) || null,
          }));
          const total = cards.length;
          const dueCount = cards.filter(
            (c: any) => !c.review_state || c.review_state.due_date <= todayStr,
          ).length;
          const masteredCount = cards.filter(
            (c: any) => (c.review_state?.interval_days ?? 0) >= 21,
          ).length;
          return {
            ...d,
            cards,
            card_count: total,
            due_count: dueCount,
            mastery_pct:
              total > 0 ? Math.round((masteredCount / total) * 100) : 0,
          };
        });
      setSavedDecks(processedSaved);

      // 5. Fetch Shared Decks
      const { data: sharedData } = await supabase
        .from("deck_members")
        .select(
          `
          deck_id, role,
          flashcard_decks (
            id, course_id, user_id, title, description, tags, is_public, visibility, revision, created_at,
            courses (name, code),
            flashcards (id, deck_id, user_id, position, version, front_text, back_text, card_type, options, correct_answer)
          )
        `,
        )
        .eq("user_id", user.id);

      const processedShared: EnhancedDeck[] = (sharedData || [])
        .map((sm: any) => sm.flashcard_decks)
        .filter(Boolean)
        .map((d: any) => ({
          ...d,
          card_count: (d.flashcards || []).length,
          due_count: 0,
          mastery_pct: 0,
        }));
      setSharedDecks(processedShared);

      // 6. Fetch Discover Decks (Public Decks not owned by user)
      const { data: discoverData } = await supabase
        .from("flashcard_decks")
        .select(
          `
          id, course_id, user_id, title, description, tags, is_public, visibility, created_at,
          courses (name, code),
          flashcards (id)
        `,
        )
        .eq("visibility", "public")
        .neq("user_id", user.id)
        .limit(20);

      const processedDiscover: EnhancedDeck[] = (discoverData || []).map(
        (d: any) => ({
          ...d,
          card_count: (d.flashcards || []).length,
        }),
      );
      setDiscoverDecks(processedDiscover);

      // If activeDeck was set, refresh its pointer
      if (activeDeck) {
        const refreshed =
          processedMyDecks.find((d) => d.id === activeDeck.id) ||
          processedSaved.find((d) => d.id === activeDeck.id) ||
          activeDeck;
        setActiveDeck(refreshed);
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      toast(getSafeErrorMessage(err, "Could not load flashcards."), "error");
    } finally {
      setLoading(false);
    }
  }, [supabase, todayStr]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // ==========================================================================
  // DECK CREATION & EDITING
  // ==========================================================================

  const handleOpenCreateDeck = () => {
    setDeckFormTitle("");
    setDeckFormDescription("");
    setDeckFormCourseId(courses[0]?.id || "");
    setDeckFormVisibility("private");
    setDeckFormTags("");
    setIsCreateDeckOpen(true);
  };

  const handleSaveNewDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;

    const parsedTags = deckFormTags
      .split(",")
      .map((t) => t.trim().replace(/^#/, ""))
      .filter(Boolean);

    const validation = validateWithZod(createDeckSchema, {
      title: deckFormTitle,
      description: deckFormDescription || null,
      courseId: deckFormCourseId ? deckFormCourseId : null,
      visibility: deckFormVisibility,
      tags: parsedTags,
    });

    if (!validation.success) {
      toast(validation.error, "error");
      return;
    }

    setIsSavingDeck(true);
    try {
      const { data, error } = await supabase
        .from("flashcard_decks")
        .insert({
          user_id: currentUserId,
          title: deckFormTitle.trim(),
          description: deckFormDescription.trim() || null,
          course_id: deckFormCourseId ? deckFormCourseId : null,
          visibility: deckFormVisibility,
          tags: parsedTags,
        })
        .select("*, courses(name, code)")
        .single();

      if (error) throw error;

      toast("Deck created successfully.", "success");
      setIsCreateDeckOpen(false);
      await fetchAllData();

      // Open command center for the newly created deck
      if (data) {
        setActiveDeck({
          ...data,
          cards: [],
          card_count: 0,
          due_count: 0,
          mastery_pct: 0,
        });
        setViewMode("deck_command");
      }
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Failed to create deck."), "error");
    } finally {
      setIsSavingDeck(false);
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this deck? All cards and progress will be lost.",
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("flashcard_decks")
        .delete()
        .eq("id", deckId);
      if (error) throw error;

      toast("Deck deleted.", "success");
      setActiveDeck(null);
      setViewMode("library");
      fetchAllData();
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Could not delete deck."), "error");
    }
  };

  // ==========================================================================
  // SINGLE CARD OPERATIONS
  // ==========================================================================

  const handleOpenAddCard = () => {
    setEditingCardId(null);
    setCardType("standard");
    setCardFront("");
    setCardBack("");
    setMcqOptions(["", "", "", ""]);
    setMcqCorrect("0");
    setTfCorrect("True");
    setIsCardModalOpen(true);
  };

  const handleOpenEditCard = (card: EnhancedCard) => {
    setEditingCardId(card.id);
    setCardType(card.card_type || "standard");
    setCardFront(card.front_text || "");
    setCardBack(card.back_text || "");
    if (card.card_type === "multiple_choice" && card.options) {
      setMcqOptions(card.options.concat(["", "", "", ""]).slice(0, 4));
      const idx = card.options.indexOf(card.correct_answer || "");
      setMcqCorrect(idx >= 0 ? String(idx) : "0");
    } else if (card.card_type === "true_false") {
      setTfCorrect(card.correct_answer === "False" ? "False" : "True");
    }
    setIsCardModalOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeck || !currentUserId) return;

    let correctAnswer = cardBack.trim();
    let optionsPayload: string[] = [];

    if (cardType === "true_false") {
      correctAnswer = tfCorrect;
    } else if (cardType === "multiple_choice") {
      optionsPayload = mcqOptions.map((o) => o.trim()).filter(Boolean);
      const selectedIdx = parseInt(mcqCorrect, 10);
      correctAnswer = optionsPayload[selectedIdx] || optionsPayload[0] || "";
    }

    const validation = validateWithZod(createCardSchema, {
      deckId: activeDeck.id,
      cardType,
      frontText: cardFront,
      backText: cardBack,
      options: optionsPayload,
      correctAnswer,
    });

    if (!validation.success) {
      toast(validation.error, "error");
      return;
    }

    setIsSavingCard(true);
    try {
      if (editingCardId) {
        // Edit existing card
        const { error } = await supabase
          .from("flashcards")
          .update({
            front_text: cardFront.trim(),
            back_text: cardBack.trim(),
            card_type: cardType,
            options: optionsPayload,
            correct_answer: correctAnswer,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCardId);

        if (error) throw error;
        toast("Card updated.", "success");
      } else {
        // Create new card
        const currentCount = activeDeck.cards?.length || 0;
        const { error } = await supabase.from("flashcards").insert({
          user_id: currentUserId,
          deck_id: activeDeck.id,
          position: currentCount,
          front_text: cardFront.trim(),
          back_text: cardBack.trim(),
          card_type: cardType,
          options: optionsPayload,
          correct_answer: correctAnswer,
        });

        if (error) throw error;
        toast("Card added.", "success");
      }

      setIsCardModalOpen(false);
      fetchAllData();
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Failed to save card."), "error");
    } finally {
      setIsSavingCard(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from("flashcards")
        .delete()
        .eq("id", cardId);
      if (error) throw error;
      toast("Card deleted.", "success");
      fetchAllData();
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Failed to delete card."), "error");
    }
  };

  const handleDuplicateCard = async (card: EnhancedCard) => {
    if (!currentUserId || !activeDeck) return;
    try {
      const { error } = await supabase.from("flashcards").insert({
        user_id: currentUserId,
        deck_id: activeDeck.id,
        position: (activeDeck.cards?.length || 0) + 1,
        front_text: `${card.front_text} (Copy)`,
        back_text: card.back_text,
        card_type: card.card_type,
        options: card.options,
        correct_answer: card.correct_answer,
      });

      if (error) throw error;
      toast("Card duplicated.", "success");
      fetchAllData();
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Failed to duplicate card."), "error");
    }
  };

  // ==========================================================================
  // RAPID MULTI-CARD EDITOR WORKSPACE
  // ==========================================================================

  const handleOpenRapidEditor = () => {
    if (!activeDeck) return;
    const initial = (activeDeck.cards || []).map((c) => ({
      id: c.id,
      front: c.front_text,
      back: c.back_text,
      cardType: c.card_type || "standard",
      options: c.options || [],
      correctAnswer: c.correct_answer || "",
    }));

    // If empty deck, provide one blank card to start typing
    if (initial.length === 0) {
      initial.push({
        front: "",
        back: "",
        cardType: "standard",
        options: [],
        correctAnswer: "",
        isNew: true,
      });
    }

    setRapidCards(initial);
    setRapidFocusedIdx(initial.length - 1);
    setViewMode("rapid_editor");
  };

  const handleRapidCardChange = (
    idx: number,
    field: "front" | "back",
    val: string,
  ) => {
    setRapidCards((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleSpawnNextRapidCard = (fromIdx: number) => {
    setRapidCards((prev) => [
      ...prev,
      {
        front: "",
        back: "",
        cardType: "standard",
        options: [],
        correctAnswer: "",
        isNew: true,
      },
    ]);
    setRapidFocusedIdx(fromIdx + 1);
  };

  const handleSaveRapidWorkspace = async () => {
    if (!activeDeck || !currentUserId) return;

    try {
      const validCards = rapidCards.filter(
        (c) => c.front.trim() && c.back.trim(),
      );
      if (validCards.length === 0) {
        toast("No valid cards to save.", "error");
        return;
      }

      // 1. Update existing cards
      const updates = validCards.filter((c) => c.id && !c.isNew);
      for (const u of updates) {
        await supabase
          .from("flashcards")
          .update({ front_text: u.front.trim(), back_text: u.back.trim() })
          .eq("id", u.id);
      }

      // 2. Insert new cards
      const newOnes = validCards.filter((c) => !c.id || c.isNew);
      if (newOnes.length > 0) {
        const payload = newOnes.map((c, i) => ({
          front: c.front.trim(),
          back: c.back.trim(),
        }));
        await supabase.rpc("import_deck_cards", {
          p_deck_id: activeDeck.id,
          p_cards: payload,
        });
      }

      toast("All cards saved.", "success");
      setViewMode("deck_command");
      fetchAllData();
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Could not save workspace."), "error");
    }
  };

  // ==========================================================================
  // ATOMIC REORDERING
  // ==========================================================================

  const handleMoveCardPosition = async (fromIdx: number, toIdx: number) => {
    if (!activeDeck || !activeDeck.cards) return;
    if (toIdx < 0 || toIdx >= activeDeck.cards.length) return;

    const cardsCopy = [...activeDeck.cards];
    const [moved] = cardsCopy.splice(fromIdx, 1);
    cardsCopy.splice(toIdx, 0, moved);

    const reorderedIds = cardsCopy.map((c) => c.id);

    try {
      const { data, error } = await supabase.rpc("reorder_flashcards", {
        p_deck_id: activeDeck.id,
        p_card_ids: reorderedIds,
        p_expected_revision: activeDeck.revision || 1,
      });

      if (error) throw error;
      toast("Card order saved.", "success");
      fetchAllData();
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Failed to reorder cards."), "error");
    }
  };

  // ==========================================================================
  // STUDY SESSION CONTROLLER (SRS & CRAM)
  // ==========================================================================

  const handleStartStudy = (mode: "srs" | "cram") => {
    if (!activeDeck || !activeDeck.cards || activeDeck.cards.length === 0) {
      toast("Deck has no cards to study.", "error");
      return;
    }

    setStudyMode(mode);
    setIsFlipped(false);
    setSelectedMcqChoice(null);
    setStudyIndex(0);
    setSessionStats({ reviewed: 0, retry: 0, hard: 0, good: 0, easy: 0 });
    setIsSessionComplete(false);

    let queue: EnhancedCard[] = [];
    if (mode === "srs") {
      // Due cards first; if none due, load all cards
      queue = activeDeck.cards.filter(
        (c) => !c.review_state || c.review_state.due_date <= todayStr,
      );
      if (queue.length === 0) {
        queue = [...activeDeck.cards];
      }
    } else {
      // Cram mode: shuffle all cards
      queue = [...activeDeck.cards].sort(() => Math.random() - 0.5);
    }

    setStudyQueue(queue);
    setViewMode("study_player");
  };

  const handleRateCard = async (rating: ReviewRating) => {
    if (studyQueue.length === 0 || !activeDeck || !currentUserId) return;
    const currentCard = studyQueue[studyIndex];

    // Compute Saktus SM-2
    const prevRep =
      currentCard.review_state?.repetition_number ??
      currentCard.repetition_number ??
      0;
    const prevInt =
      currentCard.review_state?.interval_days ?? currentCard.interval_days ?? 0;
    const prevEase =
      currentCard.review_state?.ease_factor ?? currentCard.ease_factor ?? 2.5;

    const result = calculateNextReview({
      repetitionNumber: prevRep,
      intervalDays: prevInt,
      easeFactor: Number(prevEase),
      rating,
    });

    try {
      // Update session statistics
      setSessionStats((prev) => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        [rating === "again" ? "retry" : rating]:
          prev[rating === "again" ? "retry" : rating] + 1,
      }));

      // Log review event audit
      await supabase.from("flashcard_review_events").insert({
        user_id: currentUserId,
        card_id: currentCard.id,
        deck_id: activeDeck.id,
        rating: rating === "again" ? "retry" : rating,
        study_mode: studyMode === "srs" ? "standard" : "cram",
      });

      // If SRS mode, commit authoritative review state
      if (studyMode === "srs") {
        await supabase.from("flashcard_review_states").upsert(
          {
            user_id: currentUserId,
            card_id: currentCard.id,
            repetition_number: result.repetitionNumber,
            interval_days: result.intervalDays,
            ease_factor: result.easeFactor,
            due_date: result.nextReviewDate,
            last_reviewed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id, card_id" },
        );
      }

      // IN-SESSION RETRY REQUEUE: If rated Retry, push to back of active queue!
      if (result.inSessionRequeue) {
        setStudyQueue((prev) => [...prev, currentCard]);
        toast("Card requeued in active session.", "info");
      }

      // Check daily study streak goal (e.g. at 15 reviews)
      if (sessionSessionStats.reviewed + 1 === 15) {
        await supabase.rpc("record_study_activity", {
          p_user_id: currentUserId,
          p_activity_type: "flashcards",
        });
        toast("Daily streak secured (15 cards reviewed)!", "success");
      }

      // Advance to next card or complete
      if (studyIndex + 1 < studyQueue.length) {
        setStudyIndex(studyIndex + 1);
        setIsFlipped(false);
        setSelectedMcqChoice(null);
      } else {
        setIsSessionComplete(true);
      }
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Failed to record review."), "error");
    }
  };

  // Keyboard navigation during study
  useEffect(() => {
    if (viewMode !== "study_player" || isSessionComplete) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === "1") handleRateCard("retry");
        if (e.key === "2") handleRateCard("hard");
        if (e.key === "3") handleRateCard("good");
        if (e.key === "4") handleRateCard("easy");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [viewMode, isFlipped, studyIndex, studyQueue, isSessionComplete]);

  // ==========================================================================
  // MATCH MODE (GAME SESSION)
  // ==========================================================================

  const handleStartMatchGame = () => {
    if (!activeDeck || !activeDeck.cards || activeDeck.cards.length < 3) {
      toast("Match mode requires at least 3 cards in the deck.", "error");
      return;
    }

    // Pick up to 6 cards suitable for matching (short definitions)
    const selectedSubset = [...activeDeck.cards]
      .filter((c) => c.front_text.length <= 80 && c.back_text.length <= 80)
      .slice(0, 6);

    const matchSet =
      selectedSubset.length >= 3
        ? selectedSubset
        : activeDeck.cards.slice(0, 6);

    const tiles: Array<{
      id: string;
      cardId: string;
      type: "front" | "back";
      text: string;
      isMatched: boolean;
    }> = [];

    matchSet.forEach((c) => {
      tiles.push({
        id: `${c.id}-front`,
        cardId: c.id,
        type: "front",
        text: c.front_text,
        isMatched: false,
      });
      tiles.push({
        id: `${c.id}-back`,
        cardId: c.id,
        type: "back",
        text: c.back_text || c.correct_answer || "Definition",
        isMatched: false,
      });
    });

    // Shuffle tiles
    setMatchTiles(tiles.sort(() => Math.random() - 0.5));
    setSelectedTileId(null);
    setMatchTimerSeconds(0);
    setMatchMistakes(0);
    setIsMatchWon(false);
    setViewMode("match_game");

    if (matchTimerRef.current) clearInterval(matchTimerRef.current);
    matchTimerRef.current = setInterval(() => {
      setMatchTimerSeconds((prev) => prev + 1);
    }, 1000);
  };

  const handleTileClick = (tileId: string) => {
    if (isMatchWon) return;
    const clicked = matchTiles.find((t) => t.id === tileId);
    if (!clicked || clicked.isMatched) return;

    if (!selectedTileId) {
      setSelectedTileId(tileId);
      return;
    }

    if (selectedTileId === tileId) {
      setSelectedTileId(null);
      return;
    }

    const firstTile = matchTiles.find((t) => t.id === selectedTileId);
    if (!firstTile) return;

    // Check if match
    if (
      firstTile.cardId === clicked.cardId &&
      firstTile.type !== clicked.type
    ) {
      // MATCH SUCCESS!
      setMatchTiles((prev) =>
        prev.map((t) =>
          t.cardId === clicked.cardId ? { ...t, isMatched: true } : t,
        ),
      );
      setSelectedTileId(null);

      // Check victory
      const remainingUnmatched = matchTiles.filter(
        (t) => !t.isMatched && t.cardId !== clicked.cardId,
      ).length;
      if (remainingUnmatched === 0) {
        if (matchTimerRef.current) clearInterval(matchTimerRef.current);
        setIsMatchWon(true);
        toast("Grid cleared! Match session complete.", "success");
      }
    } else {
      // MISMATCH
      setMatchMistakes((m) => m + 1);
      setMatchTimerSeconds((t) => t + 2); // 2 second penalty
      setSelectedTileId(null);
      toast("Not a match (+2s penalty)", "error");
    }
  };

  // ==========================================================================
  // BULK IMPORT PARSER & COMMIT
  // ==========================================================================

  const handleParseImportText = (text: string) => {
    setPasteContent(text);
    if (!text.trim()) {
      setParsedImportRows([]);
      return;
    }

    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsed: Array<{ front: string; back: string; isValid: boolean }> = [];

    // Auto-detect delimiter
    let delim = "\t";
    if (pasteDelimiter === "comma") delim = ",";
    else if (pasteDelimiter === "semicolon") delim = ";";
    else if (pasteDelimiter === "pipe") delim = "|";
    else if (pasteDelimiter === "auto") {
      const sample = lines.slice(0, 5).join("\n");
      if (sample.includes("\t")) delim = "\t";
      else if (sample.includes("::")) delim = "::";
      else if (sample.includes("|")) delim = "|";
      else if (sample.includes(";")) delim = ";";
      else if (sample.includes(",")) delim = ",";
    }

    lines.forEach((line) => {
      const parts = line.split(delim);
      if (parts.length >= 2) {
        const front = parts[0].trim().replace(/^["']|["']$/g, "");
        const back = parts
          .slice(1)
          .join(delim)
          .trim()
          .replace(/^["']|["']$/g, "");
        parsed.push({
          front,
          back,
          isValid: front.length > 0 && back.length > 0,
        });
      } else {
        parsed.push({
          front: line.trim(),
          back: "",
          isValid: false,
        });
      }
    });

    setParsedImportRows(parsed);
  };

  const handleCommitImport = async (skipInvalid: boolean) => {
    if (!activeDeck || !currentUserId) return;
    const toImport = skipInvalid
      ? parsedImportRows.filter((r) => r.isValid)
      : parsedImportRows;

    if (toImport.length === 0) {
      toast("No valid cards to import.", "error");
      return;
    }

    setIsImporting(true);
    try {
      const payload = toImport.map((r) => ({
        front: r.front.trim(),
        back: r.back.trim(),
      }));

      const { data, error } = await supabase.rpc("import_deck_cards", {
        p_deck_id: activeDeck.id,
        p_cards: payload,
      });

      if (error) throw error;

      toast(`Successfully imported ${data} cards.`, "success");
      setIsImportModalOpen(false);
      setPasteContent("");
      setParsedImportRows([]);
      fetchAllData();
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Import failed."), "error");
    } finally {
      setIsImporting(false);
    }
  };

  // ==========================================================================
  // SAVE PUBLIC DECK & COLLABORATION
  // ==========================================================================

  const handleSavePublicDeck = async (deckId: string) => {
    try {
      const { data, error } = await supabase.rpc("save_public_deck", {
        p_source_deck_id: deckId,
      });

      if (error) throw error;
      toast("Deck saved to your library with attribution.", "success");
      setLibraryTab("saved");
      fetchAllData();
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Failed to save public deck."), "error");
    }
  };

  // Filter library decks
  const currentTabDecks =
    libraryTab === "my"
      ? myDecks
      : libraryTab === "saved"
        ? savedDecks
        : libraryTab === "shared"
          ? sharedDecks
          : discoverDecks;

  const filteredDecks = currentTabDecks.filter((deck) => {
    const matchesCourse =
      selectedCourseFilter === "all" ||
      (selectedCourseFilter === "none" && !deck.course_id) ||
      deck.course_id === selectedCourseFilter;

    const matchesSearch =
      !searchQuery ||
      deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (deck.description &&
        deck.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      deck.tags?.some((t) =>
        t.toLowerCase().includes(searchQuery.toLowerCase()),
      );

    if (!matchesCourse || !matchesSearch) return false;

    if (reviewFilter === "due") return (deck.due_count || 0) > 0;
    if (reviewFilter === "learning")
      return (deck.mastery_pct || 0) < 60 && (deck.card_count || 0) > 0;
    if (reviewFilter === "mastered") return (deck.mastery_pct || 0) >= 60;

    return true;
  });

  // ==========================================================================
  // RENDER SUB-VIEWS
  // ==========================================================================

  // 1. STUDY PLAYER VIEW
  if (viewMode === "study_player" && studyQueue.length > 0) {
    if (isSessionComplete) {
      return (
        <div className="max-w-xl mx-auto py-12 px-4 space-y-6 text-center animate-in fade-in duration-200">
          <div className="h-14 w-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-7 w-7 text-zinc-900 dark:text-white" />
          </div>
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              Study Session Complete
            </h2>
            <p className="text-xs text-zinc-500">
              {studyMode === "srs"
                ? "Review intervals and schedule updated."
                : "Cram session complete."}
            </p>
          </div>

          {/* Session breakdown cards */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B]">
              <div className="text-lg font-bold text-zinc-900 dark:text-white font-mono tnum">
                {sessionSessionStats.reviewed}
              </div>
              <div className="text-[10px] text-zinc-400">Total Cards</div>
            </div>
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B]">
              <div className="text-lg font-bold text-zinc-900 dark:text-white font-mono tnum">
                {sessionSessionStats.retry}
              </div>
              <div className="text-[10px] text-zinc-400">Retry</div>
            </div>
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B]">
              <div className="text-lg font-bold text-zinc-900 dark:text-white font-mono tnum">
                {sessionSessionStats.good}
              </div>
              <div className="text-[10px] text-zinc-400">Good</div>
            </div>
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B]">
              <div className="text-lg font-bold text-zinc-900 dark:text-white font-mono tnum">
                {sessionSessionStats.easy}
              </div>
              <div className="text-[10px] text-zinc-400">Easy</div>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-4">
            <button
              onClick={() => handleStartStudy(studyMode)}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all btn-press"
            >
              Study Again
            </button>
            <button
              onClick={() => {
                setViewMode("deck_command");
                fetchAllData();
              }}
              className="px-5 py-2 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 transition-all btn-press"
            >
              Back to Deck
            </button>
          </div>
        </div>
      );
    }

    const currentCard = studyQueue[studyIndex];
    const progressPct = ((studyIndex + 1) / studyQueue.length) * 100;

    return (
      <div className="max-w-2xl mx-auto space-y-5 pb-16 animate-in fade-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <button
            onClick={() => {
              setViewMode("deck_command");
              fetchAllData();
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Exit
          </button>
          <div className="text-center">
            <span className="text-xs font-semibold text-zinc-900 dark:text-white">
              {activeDeck?.title}
            </span>
            <span className="text-xs text-zinc-400 font-mono tnum ml-2">
              {studyIndex + 1} / {studyQueue.length}
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 uppercase">
            {studyMode === "srs" ? "SRS" : "CRAM"}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-1 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-zinc-900 dark:bg-white transition-all duration-200"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Tactile 3D Flip Card */}
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="relative min-h-[360px] w-full cursor-pointer rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] p-8 shadow-sm flex flex-col justify-between select-none transition-all hover:border-zinc-300 dark:hover:border-zinc-700 active:scale-[0.99]"
        >
          <div className="flex items-center justify-between text-zinc-400 text-[11px] font-mono">
            <span>{isFlipped ? "ANSWER / EXPLANATION" : "QUESTION"}</span>
            <span className="inline-flex items-center gap-1">
              <RotateCw className="h-3 w-3" /> Space to flip
            </span>
          </div>

          <div className="py-6 text-center space-y-4">
            <p className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-white leading-relaxed">
              {isFlipped
                ? currentCard.back_text || currentCard.correct_answer
                : currentCard.front_text}
            </p>

            {/* Multiple Choice interactive selection (on front) */}
            {!isFlipped &&
              currentCard.card_type === "multiple_choice" &&
              currentCard.options && (
                <div className="grid grid-cols-1 gap-2 pt-3 text-left max-w-md mx-auto">
                  {currentCard.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMcqChoice(opt);
                        setIsFlipped(true);
                      }}
                      className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-600 transition-all text-left"
                    >
                      <span className="font-mono text-zinc-400 mr-2">
                        {String.fromCharCode(65 + i)}.
                      </span>
                      {opt}
                    </button>
                  ))}
                </div>
              )}

            {/* True / False interactive selection (on front) */}
            {!isFlipped && currentCard.card_type === "true_false" && (
              <div className="flex justify-center gap-3 pt-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                  className="px-6 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-900 dark:text-white hover:border-zinc-400 dark:hover:border-zinc-600"
                >
                  True
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsFlipped(true);
                  }}
                  className="px-6 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs font-semibold text-zinc-900 dark:text-white hover:border-zinc-400 dark:hover:border-zinc-600"
                >
                  False
                </button>
              </div>
            )}
          </div>

          <div className="text-center text-[11px] font-mono text-zinc-400">
            {isFlipped
              ? "Rate your recall below to update scheduling"
              : "Think through the prompt before flipping"}
          </div>
        </div>

        {/* SRS Rating Bar (Solid, tactile buttons) */}
        {isFlipped && (
          <div className="grid grid-cols-4 gap-2 pt-1 animate-in fade-in duration-100">
            <button
              onClick={() => handleRateCard("retry")}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all btn-press"
            >
              <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                Retry
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                Requeue (1)
              </div>
            </button>
            <button
              onClick={() => handleRateCard("hard")}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all btn-press"
            >
              <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                Hard
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                Gently advance (2)
              </div>
            </button>
            <button
              onClick={() => handleRateCard("good")}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all btn-press"
            >
              <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                Good
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                Standard (3)
              </div>
            </button>
            <button
              onClick={() => handleRateCard("easy")}
              className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 text-center hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-all btn-press"
            >
              <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                Easy
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                Max jump (4)
              </div>
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2. MATCH MODE GAME VIEW
  if (viewMode === "match_game") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-16 animate-in fade-in duration-150">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <button
            onClick={() => {
              if (matchTimerRef.current) clearInterval(matchTimerRef.current);
              setViewMode("deck_command");
            }}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Exit Match
          </button>
          <div className="flex items-center gap-4 text-xs font-mono tnum">
            <span className="text-zinc-500">
              Time:{" "}
              <strong className="text-zinc-900 dark:text-white">
                {matchTimerSeconds}s
              </strong>
            </span>
            <span className="text-zinc-500">
              Mistakes:{" "}
              <strong className="text-zinc-900 dark:text-white">
                {matchMistakes}
              </strong>
            </span>
          </div>
        </div>

        {isMatchWon ? (
          <div className="text-center py-12 space-y-4 bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
            <Award className="h-10 w-10 mx-auto text-zinc-900 dark:text-white" />
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
              Cleared in {matchTimerSeconds} seconds!
            </h3>
            <p className="text-xs text-zinc-500">
              Match results are recorded as session training data without
              altering SRS schedules.
            </p>
            <div className="pt-2 flex justify-center gap-3">
              <button
                onClick={handleStartMatchGame}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold btn-press"
              >
                Play Again
              </button>
              <button
                onClick={() => setViewMode("deck_command")}
                className="px-5 py-2 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {matchTiles.map((tile) => {
              if (tile.isMatched) {
                return (
                  <div
                    key={tile.id}
                    className="min-h-[100px] rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-transparent opacity-20"
                  />
                );
              }
              const isSelected = selectedTileId === tile.id;
              return (
                <button
                  key={tile.id}
                  onClick={() => handleTileClick(tile.id)}
                  className={`min-h-[100px] p-4 rounded-xl border text-xs font-medium text-center flex items-center justify-center transition-all select-none btn-press ${
                    isSelected
                      ? "border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                      : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] text-zinc-800 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-600"
                  }`}
                >
                  {tile.text}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 3. RAPID MULTI-CARD EDITOR WORKSPACE
  if (viewMode === "rapid_editor" && activeDeck) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-150">
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode("deck_command")}
              className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Multi-Card Workspace · {activeDeck.title}
            </h2>
            <span className="text-xs font-mono text-zinc-400 tnum">
              ({rapidCards.length} cards)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSpawnNextRapidCard(rapidCards.length - 1)}
              className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 btn-press flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" /> Add Card
            </button>
            <button
              onClick={handleSaveRapidWorkspace}
              className="px-4 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press"
            >
              Save All Cards
            </button>
          </div>
        </div>

        <p className="text-xs text-zinc-500">
          Pro-tip: Press{" "}
          <kbd className="px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 font-mono">
            Tab
          </kbd>{" "}
          to jump between Front & Back.
        </p>

        {/* Card editor rows */}
        <div className="space-y-4">
          {rapidCards.map((card, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] space-y-3"
            >
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span>Card {idx + 1}</span>
                {rapidCards.length > 1 && (
                  <button
                    onClick={() =>
                      setRapidCards((prev) => prev.filter((_, i) => i !== idx))
                    }
                    className="text-zinc-400 hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase">
                    Front (Question)
                  </label>
                  <textarea
                    rows={3}
                    value={card.front}
                    onChange={(e) =>
                      handleRapidCardChange(idx, "front", e.target.value)
                    }
                    placeholder="Enter question or term..."
                    className="w-full mt-1 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-zinc-400 uppercase">
                    Back (Answer)
                  </label>
                  <textarea
                    rows={3}
                    value={card.back}
                    onChange={(e) =>
                      handleRapidCardChange(idx, "back", e.target.value)
                    }
                    placeholder="Enter answer or definition..."
                    className="w-full mt-1 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 4. DECK COMMAND CENTER VIEW
  if (viewMode === "deck_command" && activeDeck) {
    return (
      <div className="space-y-6 pb-16 animate-in fade-in duration-150">
        {/* Command Header */}
        <div className="space-y-3 border-b border-zinc-200 dark:border-zinc-800 pb-5">
          <button
            onClick={() => {
              setActiveDeck(null);
              setViewMode("library");
              fetchAllData();
            }}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Library
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  {activeDeck.title}
                </h1>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  {activeDeck.visibility}
                </span>
                {activeDeck.source_creator_username && (
                  <span className="text-[10px] text-zinc-400">
                    Saved from @{activeDeck.source_creator_username}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                {activeDeck.courses?.name || "General Course"} ·{" "}
                {activeDeck.cards?.length || 0} cards ·{" "}
                <span className="font-mono tnum">
                  {activeDeck.due_count || 0} due today
                </span>{" "}
                ·{" "}
                <span className="font-mono tnum">
                  {activeDeck.mastery_pct || 0}% mastered
                </span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleStartStudy("srs")}
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press flex items-center gap-1.5"
              >
                <RotateCw className="h-3.5 w-3.5" /> Study Due (
                {activeDeck.due_count || 0})
              </button>
              <button
                onClick={() => handleStartStudy("cram")}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 btn-press flex items-center gap-1.5"
              >
                <Shuffle className="h-3.5 w-3.5" /> Cram All
              </button>
              <button
                onClick={handleStartMatchGame}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 btn-press flex items-center gap-1.5"
              >
                <Grid className="h-3.5 w-3.5" /> Match
              </button>
              <button
                onClick={handleOpenRapidEditor}
                className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 btn-press"
              >
                Edit Cards
              </button>
              <button
                onClick={() => handleDeleteDeck(activeDeck.id)}
                className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-red-500 btn-press"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Command Center Tabs */}
        <div className="flex items-center gap-4 border-b border-zinc-200 dark:border-zinc-800 text-xs">
          <button
            onClick={() => setCommandTab("cards")}
            className={`pb-2.5 font-medium transition-colors border-b-2 ${
              commandTab === "cards"
                ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            Cards ({activeDeck.cards?.length || 0})
          </button>
          <button
            onClick={() => setCommandTab("progress")}
            className={`pb-2.5 font-medium transition-colors border-b-2 ${
              commandTab === "progress"
                ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            Progress & Mastery
          </button>
          <button
            onClick={() => setCommandTab("about")}
            className={`pb-2.5 font-medium transition-colors border-b-2 ${
              commandTab === "about"
                ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white"
                : "border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            About Deck
          </button>
        </div>

        {/* TAB 1: CARDS LIST */}
        {commandTab === "cards" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                Ordered by sequential review position
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 btn-press flex items-center gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" /> Bulk Import
                </button>
                <button
                  onClick={handleOpenAddCard}
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Card
                </button>
              </div>
            </div>

            {!activeDeck.cards || activeDeck.cards.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                <FileText className="h-8 w-8 text-zinc-400 mx-auto" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  No cards in this deck yet
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Create cards one-by-one, open the multi-card editor, or paste
                  cards in bulk.
                </p>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    onClick={handleOpenAddCard}
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press"
                  >
                    Add First Card
                  </button>
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium btn-press"
                  >
                    Bulk Import
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {activeDeck.cards.map((card, idx) => (
                  <div
                    key={card.id}
                    className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-[10px] font-mono text-zinc-400 tnum w-6 text-center">
                        #{idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                          {card.front_text}
                        </p>
                        <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                          {card.back_text || card.correct_answer}
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-zinc-900 px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                        {card.card_type === "multiple_choice"
                          ? "MCQ"
                          : card.card_type === "true_false"
                            ? "T/F"
                            : "Standard"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => handleMoveCardPosition(idx, idx - 1)}
                        disabled={idx === 0}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-20"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMoveCardPosition(idx, idx + 1)}
                        disabled={idx === (activeDeck.cards?.length || 0) - 1}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-20"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => handleOpenEditCard(card)}
                        className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-xs font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDuplicateCard(card)}
                        className="p-1.5 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1.5 rounded text-zinc-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PROGRESS */}
        {commandTab === "progress" && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                    Deck Mastery
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Cards with review intervals of 21+ days are classified as
                    mastered.
                  </p>
                </div>
                <span className="text-2xl font-bold font-mono tnum text-zinc-900 dark:text-white">
                  {activeDeck.mastery_pct || 0}%
                </span>
              </div>
              <div className="h-2 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-zinc-900 dark:bg-white"
                  style={{ width: `${activeDeck.mastery_pct || 0}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B]">
                <span className="text-xs text-zinc-400 font-mono">
                  DUE TODAY
                </span>
                <p className="text-xl font-bold font-mono tnum text-zinc-900 dark:text-white mt-1">
                  {activeDeck.due_count || 0}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B]">
                <span className="text-xs text-zinc-400 font-mono">
                  TOTAL CARDS
                </span>
                <p className="text-xl font-bold font-mono tnum text-zinc-900 dark:text-white mt-1">
                  {activeDeck.cards?.length || 0}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B]">
                <span className="text-xs text-zinc-400 font-mono">
                  MASTERED (21d+)
                </span>
                <p className="text-xl font-bold font-mono tnum text-zinc-900 dark:text-white mt-1">
                  {activeDeck.cards?.filter(
                    (c) => (c.review_state?.interval_days ?? 0) >= 21,
                  ).length || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ABOUT */}
        {commandTab === "about" && (
          <div className="space-y-4 max-w-xl">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] space-y-3 text-xs">
              <div>
                <span className="text-zinc-400 font-mono">DESCRIPTION</span>
                <p className="text-zinc-800 dark:text-zinc-200 mt-1">
                  {activeDeck.description || "No description provided."}
                </p>
              </div>
              <div>
                <span className="text-zinc-400 font-mono">COURSE</span>
                <p className="text-zinc-800 dark:text-zinc-200 mt-1">
                  {activeDeck.courses?.name || "General (No course linked)"}
                </p>
              </div>
              <div>
                <span className="text-zinc-400 font-mono">TAGS</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {activeDeck.tags && activeDeck.tags.length > 0 ? (
                    activeDeck.tags.map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-[10px]"
                      >
                        #{t}
                      </span>
                    ))
                  ) : (
                    <span className="text-zinc-500">None</span>
                  )}
                </div>
              </div>
              <div>
                <span className="text-zinc-400 font-mono">VISIBILITY</span>
                <p className="text-zinc-800 dark:text-zinc-200 mt-1 capitalize">
                  {activeDeck.visibility}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==========================================================================
  // 5. MAIN FLASHCARD LIBRARY VIEW
  // ==========================================================================

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Flashcards
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Spaced repetition memory training and collaborative study decks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenCreateDeck}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Create Deck
          </button>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-6 border-b border-zinc-200 dark:border-zinc-800 text-xs">
        <button
          onClick={() => setLibraryTab("my")}
          className={`pb-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            libraryTab === "my"
              ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <Layers className="h-3.5 w-3.5" /> My Decks ({myDecks.length})
        </button>
        <button
          onClick={() => setLibraryTab("saved")}
          className={`pb-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            libraryTab === "saved"
              ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" /> Saved Decks ({savedDecks.length})
        </button>
        <button
          onClick={() => setLibraryTab("shared")}
          className={`pb-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            libraryTab === "shared"
              ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <Share2 className="h-3.5 w-3.5" /> Shared With Me (
          {sharedDecks.length})
        </button>
        <button
          onClick={() => setLibraryTab("discover")}
          className={`pb-3 font-medium transition-colors border-b-2 flex items-center gap-1.5 ${
            libraryTab === "discover"
              ? "border-zinc-900 dark:border-white text-zinc-900 dark:text-white"
              : "border-transparent text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <Search className="h-3.5 w-3.5" /> Discover ({discoverDecks.length})
        </button>
      </div>

      {/* Filter & Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search decks by title or tag..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400 placeholder:text-zinc-400"
          />
        </div>

        <select
          value={selectedCourseFilter}
          onChange={(e) => setSelectedCourseFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] text-xs text-zinc-800 dark:text-zinc-200 outline-none"
        >
          <option value="all">All Courses</option>
          <option value="none">General Decks</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code ? `${c.code}: ` : ""}
              {c.name}
            </option>
          ))}
        </select>

        {libraryTab !== "discover" && (
          <div className="flex rounded-xl border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-100 dark:bg-zinc-900 text-xs">
            {(["all", "due", "learning", "mastered"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setReviewFilter(f)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-all ${
                  reviewFilter === f
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Decks Grid */}
      {filteredDecks.length === 0 ? (
        <div className="p-16 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
          <Layers className="h-8 w-8 text-zinc-400 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            {libraryTab === "discover"
              ? "No public decks found"
              : libraryTab === "saved"
                ? "No saved decks yet"
                : libraryTab === "shared"
                  ? "No collaborative decks shared with you"
                  : "No flashcard decks found"}
          </h3>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto">
            {libraryTab === "my"
              ? "Create a deck to begin spaced repetition recall."
              : libraryTab === "discover"
                ? "Be the first student to publish a public study deck."
                : "Decks you bookmark or collaborate on will appear here."}
          </p>
          {libraryTab === "my" && (
            <button
              onClick={handleOpenCreateDeck}
              className="mt-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press"
            >
              Create First Deck
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDecks.map((deck) => (
            <div
              key={deck.id}
              onClick={() => {
                setActiveDeck(deck);
                setViewMode("deck_command");
              }}
              className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] hover:border-zinc-400 dark:hover:border-zinc-700 transition-all cursor-pointer flex flex-col justify-between space-y-4 group btn-press shadow-xs"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                    {deck.courses?.name || "General Deck"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {deck.source_creator_username && (
                      <span className="text-[10px] text-zinc-400">
                        @{deck.source_creator_username}
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-zinc-400 uppercase px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800">
                      {deck.visibility}
                    </span>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white line-clamp-1 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors">
                  {deck.title}
                </h3>
                {deck.description && (
                  <p className="text-xs text-zinc-500 line-clamp-2">
                    {deck.description}
                  </p>
                )}
              </div>

              {/* Bottom statistics & actions */}
              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 font-mono tnum text-[11px] text-zinc-500">
                  <span>{deck.card_count || 0} cards</span>
                  {libraryTab !== "discover" && (
                    <>
                      <span>·</span>
                      <span
                        className={
                          deck.due_count && deck.due_count > 0
                            ? "text-zinc-900 dark:text-white font-bold"
                            : ""
                        }
                      >
                        {deck.due_count || 0} due
                      </span>
                      <span>·</span>
                      <span>{deck.mastery_pct || 0}% mastered</span>
                    </>
                  )}
                </div>

                {libraryTab === "discover" ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSavePublicDeck(deck.id);
                    }}
                    className="px-3 py-1 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  >
                    Save Deck
                  </button>
                ) : (
                  <span className="text-[11px] font-medium text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                    Open →
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: CREATE DECK                                                    */}
      {/* ===================================================================== */}
      {isCreateDeckOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Create Flashcard Deck
              </h3>
              <button
                onClick={() => setIsCreateDeckOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewDeck} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Deck Title *
                </label>
                <input
                  type="text"
                  required
                  value={deckFormTitle}
                  onChange={(e) => setDeckFormTitle(e.target.value)}
                  placeholder="e.g. Binary Trees & Graph Traversal"
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Course / Subject
                </label>
                <select
                  value={deckFormCourseId}
                  onChange={(e) => setDeckFormCourseId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none"
                >
                  <option value="">No Course / General</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code ? `${c.code}: ` : ""}
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={deckFormDescription}
                  onChange={(e) => setDeckFormDescription(e.target.value)}
                  placeholder="Summary of topics covered..."
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Visibility
                  </label>
                  <select
                    value={deckFormVisibility}
                    onChange={(e) =>
                      setDeckFormVisibility(e.target.value as any)
                    }
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none"
                  >
                    <option value="private">Private (Only you)</option>
                    <option value="friends">Friends Only</option>
                    <option value="public">Public (Community)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Tags (comma separated)
                  </label>
                  <input
                    type="text"
                    value={deckFormTags}
                    onChange={(e) => setDeckFormTags(e.target.value)}
                    placeholder="exam-1, oop, midterms"
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateDeckOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium btn-press"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDeck}
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press disabled:opacity-50"
                >
                  {isSavingDeck ? "Creating..." : "Create Deck"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: SINGLE CARD CREATE / EDIT                                      */}
      {/* ===================================================================== */}
      {isCardModalOpen && activeDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                {editingCardId ? "Edit Flashcard" : "Add Flashcard"}
              </h3>
              <button
                onClick={() => setIsCardModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Card Type
                </label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {(["standard", "multiple_choice", "true_false"] as const).map(
                    (t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setCardType(t)}
                        className={`py-1.5 rounded-lg border text-xs font-medium capitalize btn-press ${
                          cardType === t
                            ? "border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                            : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {t.replace("_", " ")}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Front Prompt *
                </label>
                <textarea
                  required
                  rows={2}
                  value={cardFront}
                  onChange={(e) => setCardFront(e.target.value)}
                  placeholder="Enter the question or concept..."
                  className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400"
                />
              </div>

              {/* Standard Mode: Back Answer */}
              {cardType === "standard" && (
                <div>
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Back Answer *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={cardBack}
                    onChange={(e) => setCardBack(e.target.value)}
                    placeholder="Enter the explanation or recall target..."
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400"
                  />
                </div>
              )}

              {/* MCQ Mode: 4 Options + Correct Option Selector */}
              {cardType === "multiple_choice" && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Choices & Correct Answer
                  </label>
                  {mcqOptions.map((opt, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="mcqCorrectChoice"
                        checked={mcqCorrect === String(i)}
                        onChange={() => setMcqCorrect(String(i))}
                        className="h-3.5 w-3.5"
                      />
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...mcqOptions];
                          next[i] = e.target.value;
                          setMcqOptions(next);
                        }}
                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none"
                      />
                    </div>
                  ))}
                  <textarea
                    rows={2}
                    value={cardBack}
                    onChange={(e) => setCardBack(e.target.value)}
                    placeholder="Explanation (shown after answering)..."
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none"
                  />
                </div>
              )}

              {/* True/False Mode */}
              {cardType === "true_false" && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Correct Answer
                  </label>
                  <div className="flex gap-3">
                    {["True", "False"].map((choice) => (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => setTfCorrect(choice)}
                        className={`flex-1 py-1.5 rounded-lg border text-xs font-semibold btn-press ${
                          tfCorrect === choice
                            ? "border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                            : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        {choice}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={cardBack}
                    onChange={(e) => setCardBack(e.target.value)}
                    placeholder="Explanation of why it is True/False..."
                    className="w-full mt-1 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none"
                  />
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium btn-press"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCard}
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press disabled:opacity-50"
                >
                  {isSavingCard ? "Saving..." : "Save Card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL: BULK IMPORT                                                    */}
      {/* ===================================================================== */}
      {isImportModalOpen && activeDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] p-6 space-y-4 shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Import Cards in Bulk
                </h3>
                <p className="text-xs text-zinc-500">
                  Paste tab or comma-separated pairs from Quizlet, Excel, or
                  Google Sheets.
                </p>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2">
              {(["auto", "tab", "comma", "semicolon", "pipe"] as const).map(
                (d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setPasteDelimiter(d);
                      handleParseImportText(pasteContent);
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono capitalize border ${
                      pasteDelimiter === d
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent"
                        : "border-zinc-200 dark:border-zinc-800 text-zinc-500"
                    }`}
                  >
                    {d}
                  </button>
                ),
              )}
            </div>

            <textarea
              rows={5}
              value={pasteContent}
              onChange={(e) => handleParseImportText(e.target.value)}
              placeholder={`FRONT<TAB>BACK\nWhat is encapsulation?\tBundling data with methods...\nWhat is polymorphism?\tProviding a single interface...`}
              className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-mono text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400"
            />

            {/* Parsed Preview Table */}
            {parsedImportRows.length > 0 && (
              <div className="flex-1 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-zinc-400 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  <span>
                    {parsedImportRows.length} detected ·{" "}
                    <span className="text-zinc-900 dark:text-white font-bold">
                      {parsedImportRows.filter((r) => r.isValid).length} valid
                    </span>
                    {parsedImportRows.some((r) => !r.isValid) && (
                      <span className="text-amber-500 ml-1">
                        · {parsedImportRows.filter((r) => !r.isValid).length}{" "}
                        incomplete
                      </span>
                    )}
                  </span>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {parsedImportRows.map((r, i) => (
                    <div
                      key={i}
                      className={`grid grid-cols-2 gap-2 p-2 rounded-lg text-xs font-mono border ${
                        r.isValid
                          ? "border-zinc-100 dark:border-zinc-800"
                          : "border-amber-500/50 bg-amber-500/5"
                      }`}
                    >
                      <span className="truncate">
                        {r.front || "<Empty Front>"}
                      </span>
                      <span className="truncate text-zinc-500">
                        {r.back || "<Empty Back>"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-between items-center">
              <span className="text-[11px] text-zinc-400">
                Atomic database commit guarantees zero orphaned rows.
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium btn-press"
                >
                  Cancel
                </button>
                {parsedImportRows.some((r) => !r.isValid) && (
                  <button
                    onClick={() => handleCommitImport(true)}
                    disabled={isImporting}
                    className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium hover:bg-zinc-100 dark:hover:bg-zinc-900 btn-press"
                  >
                    Skip Incomplete & Import Valid
                  </button>
                )}
                <button
                  onClick={() => handleCommitImport(false)}
                  disabled={isImporting || parsedImportRows.length === 0}
                  className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press disabled:opacity-50"
                >
                  {isImporting ? "Importing..." : "Import All"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
