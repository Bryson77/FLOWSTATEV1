"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  RotateCw,
  CheckCircle2,
  Volume2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { getSafeErrorMessage } from "@/lib/errors";
import { getLocalISODate, type ReviewRating } from "@saktus/study-engine";
import type { EnhancedCard, EnhancedDeck } from "../../types";

export default function StudyPlayerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const deckId = params.id as string;
  const initialMode = (searchParams.get("mode") as "srs" | "cram") || "srs";

  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeDeck, setActiveDeck] = useState<EnhancedDeck | null>(null);

  // Study state
  const [studyMode, setStudyMode] = useState<"srs" | "cram">(initialMode);
  const [studyQueue, setStudyQueue] = useState<EnhancedCard[]>([]);
  const [studyIndex, setStudyIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedMcqChoice, setSelectedMcqChoice] = useState<string | null>(null);
  const [cardStartTime, setCardStartTime] = useState<number>(Date.now());
  const [isSessionComplete, setIsSessionComplete] = useState(false);

  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    retry: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  const todayStr = getLocalISODate();

  const initializeStudyQueue = useCallback(
    (cards: EnhancedCard[], mode: "srs" | "cram") => {
      let queue: EnhancedCard[] = [];
      if (mode === "srs") {
        queue = cards.filter(
          (c) => !c.review_state || c.review_state.due_date <= todayStr
        );
        if (queue.length === 0) {
          queue = [...cards];
        }
      } else {
        queue = [...cards].sort(() => Math.random() - 0.5);
      }
      return queue;
    },
    [todayStr]
  );

  const fetchDeckAndStart = useCallback(async () => {
    if (!deckId) return;
    setLoading(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Sign in required.");
      setCurrentUserId(user.id);

      const { data: deckData, error: deckErr } = await supabase
        .from("flashcard_decks")
        .select(
          `
          id, course_id, user_id, title, description, tags, is_public, visibility, revision, created_at,
          courses (name, code),
          flashcards (
            id, deck_id, user_id, position, version, front_text, back_text, card_type, options, correct_answer, created_at, updated_at
          )
        `
        )
        .eq("id", deckId)
        .single();

      if (deckErr) throw deckErr;

      // Fetch user's review states
      const { data: reviewStates } = await supabase
        .from("flashcard_review_states")
        .select("*")
        .eq("user_id", user.id);

      const reviewMap = new Map<string, any>();
      (reviewStates || []).forEach((rs: any) => reviewMap.set(rs.card_id, rs));

      const sortedCards: EnhancedCard[] = (deckData.flashcards || [])
        .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
        .map((c: any) => ({
          ...c,
          review_state: reviewMap.get(c.id) || null,
        }));

      if (sortedCards.length === 0) {
        toast("This deck has no cards to study.", "error");
        router.push(`/flashcards/${deckId}`);
        return;
      }

      setActiveDeck({
        ...deckData,
        cards: sortedCards,
      });

      const initialQueue = initializeStudyQueue(sortedCards, studyMode);
      setStudyQueue(initialQueue);
      setStudyIndex(0);
      setIsFlipped(false);
      setSelectedMcqChoice(null);
      setSessionStats({ reviewed: 0, retry: 0, hard: 0, good: 0, easy: 0 });
      setIsSessionComplete(false);
      setCardStartTime(Date.now());
    } catch (err: any) {
      console.error("Fetch study deck error:", err);
      toast(getSafeErrorMessage(err, "Could not initialize study session."), "error");
    } finally {
      setLoading(false);
    }
  }, [deckId, initializeStudyQueue, router, studyMode, supabase, toast]);

  useEffect(() => {
    fetchDeckAndStart();
  }, [fetchDeckAndStart]);

  // Rate card via atomic submit_flashcard_review RPC
  const handleRateCard = async (rating: ReviewRating) => {
    if (studyQueue.length === 0 || !activeDeck || !currentUserId) return;
    const currentCard = studyQueue[studyIndex];
    const responseTimeMs = Math.max(100, Date.now() - cardStartTime);

    // Map study rating to RPC param ('retry' | 'hard' | 'good' | 'easy')
    const rpcRating = rating === "again" ? "retry" : rating;

    try {
      // Update session statistics locally
      setSessionStats((prev) => ({
        ...prev,
        reviewed: prev.reviewed + 1,
        [rpcRating]: prev[rpcRating] + 1,
      }));

      // Commit review via atomic RPC
      const { data: rpcResult, error: rpcErr } = await (supabase.rpc as any)(
        "submit_flashcard_review",
        {
          p_card_id: currentCard.id,
          p_rating: rpcRating,
          p_study_mode: studyMode === "srs" ? "standard" : "cram",
          p_response_time_ms: responseTimeMs,
          p_deck_id: activeDeck.id,
        }
      );

      if (rpcErr) throw rpcErr;

      const resData = rpcResult as any;

      // In-session Retry Requeue
      if (rpcRating === "retry" || resData?.in_session_requeue) {
        setStudyQueue((prev) => [...prev, currentCard]);
      }

      // Check daily study streak notification if milestone reached
      if (resData?.new_streak && resData?.streak_incremented) {
        toast(`Daily streak active: ${resData.new_streak} days!`, "success");
      }

      // Move to next card or complete
      if (studyIndex + 1 < studyQueue.length) {
        setStudyIndex(studyIndex + 1);
        setIsFlipped(false);
        setSelectedMcqChoice(null);
        setCardStartTime(Date.now());
      } else {
        setIsSessionComplete(true);
      }
    } catch (err: any) {
      console.error("Review submission error:", err);
      toast(getSafeErrorMessage(err, "Failed to record review."), "error");
    }
  };

  // Keyboard Navigation: Space to flip, 1-4 to rate
  useEffect(() => {
    if (loading || isSessionComplete || studyQueue.length === 0) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

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
  }, [loading, isSessionComplete, isFlipped, studyIndex, studyQueue, handleRateCard]);

  const handleRestartSession = (mode: "srs" | "cram") => {
    if (!activeDeck?.cards) return;
    setStudyMode(mode);
    const newQueue = initializeStudyQueue(activeDeck.cards, mode);
    setStudyQueue(newQueue);
    setStudyIndex(0);
    setIsFlipped(false);
    setSelectedMcqChoice(null);
    setSessionStats({ reviewed: 0, retry: 0, hard: 0, good: 0, easy: 0 });
    setIsSessionComplete(false);
    setCardStartTime(Date.now());
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-mono text-zinc-400">
        Preparing study session...
      </div>
    );
  }

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
              ? "All review intervals and next due dates are saved."
              : "Cram session finished."}
          </p>
        </div>

        {/* Session breakdown cards */}
        <div className="grid grid-cols-4 gap-2 pt-2">
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B]">
            <div className="text-lg font-bold text-zinc-900 dark:text-white font-mono tnum">
              {sessionStats.reviewed}
            </div>
            <div className="text-[10px] text-zinc-400">Total Cards</div>
          </div>
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B]">
            <div className="text-lg font-bold text-zinc-900 dark:text-white font-mono tnum">
              {sessionStats.retry}
            </div>
            <div className="text-[10px] text-zinc-400">Retry</div>
          </div>
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B]">
            <div className="text-lg font-bold text-zinc-900 dark:text-white font-mono tnum">
              {sessionStats.good}
            </div>
            <div className="text-[10px] text-zinc-400">Good</div>
          </div>
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B]">
            <div className="text-lg font-bold text-zinc-900 dark:text-white font-mono tnum">
              {sessionStats.easy}
            </div>
            <div className="text-[10px] text-zinc-400">Easy</div>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-4">
          <button
            onClick={() => handleRestartSession(studyMode)}
            className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-900 dark:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all btn-press"
          >
            Study Again
          </button>
          <Link
            href={`/flashcards/${deckId}`}
            className="px-5 py-2 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 transition-all btn-press"
          >
            Back to Deck
          </Link>
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
        <Link
          href={`/flashcards/${deckId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Exit
        </Link>
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
          <p className="text-lg sm:text-xl font-semibold text-zinc-900 dark:text-white leading-relaxed whitespace-pre-wrap">
            {isFlipped
              ? currentCard?.back_text || currentCard?.correct_answer
              : currentCard?.front_text}
          </p>

          {/* Multiple Choice interactive selection (on front) */}
          {!isFlipped &&
            currentCard?.card_type === "multiple_choice" &&
            currentCard.options && (
              <div className="grid grid-cols-1 gap-2 pt-3 text-left max-w-md mx-auto">
                {currentCard.options.map((opt: any, i: number) => (
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
          {!isFlipped && currentCard?.card_type === "true_false" && (
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
            ? "Rate your recall below (Keys 1 - 4)"
            : "Think through the prompt before flipping"}
        </div>
      </div>

      {/* SRS Rating Bar */}
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
