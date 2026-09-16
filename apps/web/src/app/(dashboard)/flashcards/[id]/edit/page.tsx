"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { getSafeErrorMessage } from "@/lib/errors";
import { textToProseMirrorDoc } from "@saktus/shared";
import type { EnhancedDeck } from "../../types";

interface RapidCardRow {
  id?: string;
  front: string;
  back: string;
  cardType: "standard" | "true_false" | "multiple_choice";
  isNew?: boolean;
}

export default function RapidCardEditorPage() {
  const params = useParams();
  const deckId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deck, setDeck] = useState<EnhancedDeck | null>(null);
  const [rapidCards, setRapidCards] = useState<RapidCardRow[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const fetchDeckAndCards = useCallback(async () => {
    if (!deckId) return;
    setLoading(true);
    try {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr || !user) throw new Error("Sign in required.");
      setCurrentUserId(user.id);

      const { data: deckData, error: deckErr } = await supabase
        .from("flashcard_decks")
        .select(
          `
          id, course_id, user_id, title, description, tags, is_public, visibility, revision, created_at,
          courses (name, code),
          flashcards (id, deck_id, position, front_text, back_text, card_type, options, correct_answer)
        `
        )
        .eq("id", deckId)
        .single();

      if (deckErr) throw deckErr;

      setDeck(deckData);

      const sorted = (deckData.flashcards || [])
        .sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0))
        .map((c: any) => ({
          id: c.id,
          front: c.front_text || "",
          back: c.back_text || c.correct_answer || "",
          cardType: c.card_type || "standard",
        }));

      if (sorted.length === 0) {
        sorted.push({
          front: "",
          back: "",
          cardType: "standard",
          isNew: true,
        });
      }

      setRapidCards(sorted);
    } catch (err: any) {
      console.error("Fetch rapid editor error:", err);
      toast(getSafeErrorMessage(err, "Could not load cards."), "error");
    } finally {
      setLoading(false);
    }
  }, [deckId, supabase, toast]);

  useEffect(() => {
    fetchDeckAndCards();
  }, [fetchDeckAndCards]);

  const handleCardChange = (
    idx: number,
    field: "front" | "back",
    val: string
  ) => {
    setRapidCards((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const handleSpawnNextCard = () => {
    setRapidCards((prev) => [
      ...prev,
      {
        front: "",
        back: "",
        cardType: "standard",
        isNew: true,
      },
    ]);
  };

  const handleDeleteRow = (idx: number) => {
    setRapidCards((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveWorkspace = async () => {
    if (!deck || !currentUserId) return;

    const validCards = rapidCards.filter(
      (c) => c.front.trim().length > 0 && c.back.trim().length > 0
    );

    if (validCards.length === 0) {
      toast("No completed cards to save.", "error");
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update existing cards
      const updates = validCards.filter((c) => c.id && !c.isNew);
      for (const u of updates) {
        const { error: upErr } = await supabase
          .from("flashcards")
          .update({
            front_text: u.front.trim(),
            back_text: u.back.trim(),
            front_content: textToProseMirrorDoc(u.front.trim()),
            back_content: textToProseMirrorDoc(u.back.trim()),
            updated_at: new Date().toISOString(),
          })
          .eq("id", u.id);
        if (upErr) throw upErr;
      }

      // 2. Insert new cards atomically
      const newOnes = validCards.filter((c) => !c.id || c.isNew);
      if (newOnes.length > 0) {
        const payload = newOnes.map((c) => ({
          front: c.front.trim(),
          back: c.back.trim(),
        }));
        const { error: impErr } = await supabase.rpc("import_deck_cards", {
          p_deck_id: deck.id,
          p_cards: payload,
        });
        if (impErr) throw impErr;
      }

      toast("All cards saved successfully.", "success");
      router.push(`/flashcards/${deck.id}`);
    } catch (err: any) {
      console.error("Save workspace error:", err);
      toast(getSafeErrorMessage(err, "Could not save cards."), "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-mono text-zinc-400">
        Loading multi-card workspace...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 animate-in fade-in duration-150">
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <div className="flex items-center gap-3">
          <Link
            href={`/flashcards/${deckId}`}
            className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <h1 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Multi-Card Workspace · {deck?.title}
          </h1>
          <span className="text-xs font-mono text-zinc-400 tnum">
            ({rapidCards.length} cards)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSpawnNextCard}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 btn-press flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" /> Add Card
          </button>
          <button
            onClick={handleSaveWorkspace}
            disabled={isSaving}
            className="px-4 py-1.5 rounded-lg bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {isSaving ? "Saving..." : "Save All Cards"}
          </button>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Tip: Press{" "}
        <kbd className="px-1.5 py-0.5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px]">
          Tab
        </kbd>{" "}
        to jump quickly between Front and Back.
      </p>

      {/* Card rows */}
      <div className="space-y-4">
        {rapidCards.map((card, idx) => (
          <div
            key={card.id || `new-${idx}`}
            className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#09090B] space-y-3 shadow-xs"
          >
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Card {idx + 1}</span>
              {rapidCards.length > 1 && (
                <button
                  onClick={() => handleDeleteRow(idx)}
                  className="text-zinc-400 hover:text-red-500 transition-colors"
                  title="Delete row"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wide">
                  Front Prompt (Question)
                </label>
                <textarea
                  rows={3}
                  value={card.front}
                  onChange={(e) =>
                    handleCardChange(idx, "front", e.target.value)
                  }
                  placeholder="Enter question, concept, or term..."
                  className="w-full mt-1 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400 transition-colors resize-y"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wide">
                  Back Answer (Explanation)
                </label>
                <textarea
                  rows={3}
                  value={card.back}
                  onChange={(e) =>
                    handleCardChange(idx, "back", e.target.value)
                  }
                  placeholder="Enter definition, formula, or answer..."
                  className="w-full mt-1 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-xs text-zinc-900 dark:text-white outline-none focus:border-zinc-400 transition-colors resize-y"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-2 flex justify-center">
        <button
          onClick={handleSpawnNextCard}
          className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 btn-press flex items-center gap-1.5"
        >
          <Plus className="h-4 w-4" /> Add Another Card
        </button>
      </div>
    </div>
  );
}
