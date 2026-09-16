"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  RotateCw,
  Shuffle,
  Grid,
  Trash2,
  Copy,
  Plus,
  Upload,
  FileText,
  X,
  Share2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { getSafeErrorMessage } from "@/lib/errors";
import {
  createCardSchema,
  validateWithZod,
} from "@/lib/schemas";
import { textToProseMirrorDoc } from "@saktus/shared";
import { getLocalISODate } from "@saktus/study-engine";
import type {
  EnhancedCard,
  EnhancedDeck,
} from "../types";

type CommandTab = "cards" | "progress" | "about";

export default function DeckCommandCenterPage() {
  const params = useParams();
  const deckId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [activeDeck, setActiveDeck] = useState<EnhancedDeck | null>(null);
  const [commandTab, setCommandTab] = useState<CommandTab>("cards");

  // Single Card Modal
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
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

  // Bulk Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState("");
  const [pasteDelimiter, setPasteDelimiter] = useState<
    "auto" | "tab" | "comma" | "semicolon" | "pipe"
  >("auto");
  const [parsedImportRows, setParsedImportRows] = useState<
    Array<{ front: string; back: string; isValid: boolean }>
  >([]);
  const [isImporting, setIsImporting] = useState(false);

  const todayStr = getLocalISODate();

  const fetchDeckData = useCallback(async () => {
    if (!deckId) return;
    setLoading(true);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) throw new Error("Sign in required.");
      setCurrentUserId(user.id);

      // Fetch deck with course and flashcards
      const { data: deckData, error: deckErr } = await supabase
        .from("flashcard_decks")
        .select(
          `
          id, course_id, user_id, title, description, tags, is_public, visibility, revision, created_at, source_creator_username,
          courses (name, code),
          flashcards (
            id, deck_id, user_id, position, version, front_text, back_text, card_type, options, correct_answer, created_at, updated_at
          )
        `
        )
        .eq("id", deckId)
        .single();

      if (deckErr) throw deckErr;

      // Fetch user's review states for due count / mastery
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

      const total = sortedCards.length;
      const dueCount = sortedCards.filter((c) => {
        if (!c.review_state) return true; // Unstudied cards count as due
        return c.review_state.due_date <= todayStr;
      }).length;

      const masteredCount = sortedCards.filter(
        (c) => (c.review_state?.interval_days ?? 0) >= 21
      ).length;
      const masteryPct =
        total > 0 ? Math.round((masteredCount / total) * 100) : 0;

      setActiveDeck({
        ...deckData,
        cards: sortedCards,
        card_count: total,
        due_count: dueCount,
        mastery_pct: masteryPct,
      });
    } catch (err: any) {
      console.error("Fetch deck error:", err);
      toast(getSafeErrorMessage(err, "Could not load deck."), "error");
    } finally {
      setLoading(false);
    }
  }, [deckId, supabase, todayStr, toast]);

  useEffect(() => {
    fetchDeckData();
  }, [fetchDeckData]);

  // Card Operations
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
        const { error } = await supabase
          .from("flashcards")
          .update({
            front_text: cardFront.trim(),
            back_text: cardBack.trim(),
            front_content: textToProseMirrorDoc(cardFront.trim()),
            back_content: textToProseMirrorDoc(cardBack.trim()),
            card_type: cardType,
            options: optionsPayload,
            correct_answer: correctAnswer,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingCardId);

        if (error) throw error;
        toast("Card updated.", "success");
      } else {
        const currentCount = activeDeck.cards?.length || 0;
        const { error } = await supabase.from("flashcards").insert({
          user_id: currentUserId,
          deck_id: activeDeck.id,
          position: currentCount,
          front_text: cardFront.trim(),
          back_text: cardBack.trim(),
          front_content: textToProseMirrorDoc(cardFront.trim()),
          back_content: textToProseMirrorDoc(cardBack.trim()),
          card_type: cardType,
          options: optionsPayload,
          correct_answer: correctAnswer,
        });

        if (error) throw error;
        toast("Card added.", "success");
      }

      setIsCardModalOpen(false);
      fetchDeckData();
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
      fetchDeckData();
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
        front_content: textToProseMirrorDoc(`${card.front_text} (Copy)`),
        back_content: textToProseMirrorDoc(card.back_text || ""),
        card_type: card.card_type,
        options: card.options,
        correct_answer: card.correct_answer,
      });

      if (error) throw error;
      toast("Card duplicated.", "success");
      fetchDeckData();
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Failed to duplicate card."), "error");
    }
  };

  const handleMoveCardPosition = async (fromIdx: number, toIdx: number) => {
    if (!activeDeck || !activeDeck.cards) return;
    if (toIdx < 0 || toIdx >= activeDeck.cards.length) return;

    const cardsCopy = [...activeDeck.cards];
    const [moved] = cardsCopy.splice(fromIdx, 1);
    cardsCopy.splice(toIdx, 0, moved);

    const reorderedIds = cardsCopy.map((c) => c.id);

    try {
      const { error } = await supabase.rpc("reorder_flashcards", {
        p_deck_id: activeDeck.id,
        p_card_ids: reorderedIds,
        p_expected_revision: activeDeck.revision || 1,
      });

      if (error) throw error;
      toast("Card order saved.", "success");
      fetchDeckData();
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Failed to reorder cards."), "error");
    }
  };

  const handleDeleteDeck = async () => {
    if (!activeDeck) return;
    if (
      !confirm(
        "Are you sure you want to permanently delete this deck? All cards and progress will be lost."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("flashcard_decks")
        .delete()
        .eq("id", activeDeck.id);
      if (error) throw error;

      toast("Deck deleted.", "success");
      router.push("/flashcards");
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Could not delete deck."), "error");
    }
  };

  // Bulk Import Handlers
  const handleParseImportText = (text: string) => {
    setPasteContent(text);
    if (!text.trim()) {
      setParsedImportRows([]);
      return;
    }

    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const parsed: Array<{ front: string; back: string; isValid: boolean }> = [];

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
      fetchDeckData();
    } catch (err: any) {
      toast(getSafeErrorMessage(err, "Import failed."), "error");
    } finally {
      setIsImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-mono text-zinc-400">
        Loading deck command center...
      </div>
    );
  }

  if (!activeDeck) {
    return (
      <div className="py-24 text-center space-y-4">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
          Deck not found or you do not have permission to view it.
        </p>
        <Link
          href="/flashcards"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Return to Library
        </Link>
      </div>
    );
  }

  const isOwner = currentUserId === activeDeck.user_id;

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-150">
      {/* Command Header */}
      <div className="space-y-3 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <Link
          href="/flashcards"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Library
        </Link>

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

          {/* Quick Study & Management Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/flashcards/${activeDeck.id}/study?mode=srs`}
              className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press flex items-center gap-1.5"
            >
              <RotateCw className="h-3.5 w-3.5" /> Study Due (
              {activeDeck.due_count || 0})
            </Link>
            <Link
              href={`/flashcards/${activeDeck.id}/study?mode=cram`}
              className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 btn-press flex items-center gap-1.5"
            >
              <Shuffle className="h-3.5 w-3.5" /> Cram All
            </Link>
            <Link
              href={`/flashcards/${activeDeck.id}/match`}
              className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 btn-press flex items-center gap-1.5"
            >
              <Grid className="h-3.5 w-3.5" /> Match
            </Link>
            {isOwner && (
              <>
                <Link
                  href={`/flashcards/${activeDeck.id}/edit`}
                  className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 btn-press"
                >
                  Edit Cards
                </Link>
                <button
                  onClick={handleDeleteDeck}
                  className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-red-500 btn-press"
                  title="Delete deck"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Command Center Navigation Tabs */}
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
            {isOwner && (
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
            )}
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
              {isOwner && (
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
              )}
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

                  {isOwner && (
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={() => handleMoveCardPosition(idx, idx - 1)}
                        disabled={idx === 0}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-20"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMoveCardPosition(idx, idx + 1)}
                        disabled={idx === (activeDeck.cards?.length || 0) - 1}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white disabled:opacity-20"
                        title="Move Down"
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
                        title="Duplicate"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="p-1.5 rounded text-zinc-400 hover:text-red-500"
                        title="Delete Card"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
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
              <span className="text-xs text-zinc-400 font-mono">DUE TODAY</span>
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
                  (c) => (c.review_state?.interval_days ?? 0) >= 21
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

      {/* ===================================================================== */}
      {/* MODAL: SINGLE CARD CREATE / EDIT                                      */}
      {/* ===================================================================== */}
      {isCardModalOpen && (
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
                    )
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
      {isImportModalOpen && (
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
                )
              )}
            </div>

            <textarea
              rows={5}
              value={pasteContent}
              onChange={(e) => handleParseImportText(e.target.value)}
              placeholder={`FRONT<TAB>BACK\nWhat is encapsulation?\tBundling data with methods...\nWhat is polymorphism?\tProviding a single interface...`}
              className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 font-mono text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400"
            />

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
