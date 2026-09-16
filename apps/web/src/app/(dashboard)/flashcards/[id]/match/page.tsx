"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Award, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { getSafeErrorMessage } from "@/lib/errors";
import type { EnhancedDeck } from "../../types";

interface MatchTile {
  id: string;
  cardId: string;
  type: "front" | "back";
  text: string;
  isMatched: boolean;
}

export default function MatchGamePage() {
  const params = useParams();
  const deckId = params.id as string;
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [deck, setDeck] = useState<EnhancedDeck | null>(null);

  // Match Game State
  const [matchTiles, setMatchTiles] = useState<MatchTile[]>([]);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [isMatchWon, setIsMatchWon] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startNewGame = useCallback((cards: any[]) => {
    if (!cards || cards.length < 3) return;

    // Select up to 6 cards suitable for fast tile matching
    const shortCards = cards
      .filter((c) => (c.front_text?.length || 0) <= 80 && (c.back_text?.length || 0) <= 80)
      .slice(0, 6);

    const matchSet = shortCards.length >= 3 ? shortCards : cards.slice(0, 6);

    const tiles: MatchTile[] = [];
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

    setMatchTiles(tiles.sort(() => Math.random() - 0.5));
    setSelectedTileId(null);
    setTimerSeconds(0);
    setMistakes(0);
    setIsMatchWon(false);

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => prev + 1);
    }, 1000);
  }, []);

  useEffect(() => {
    async function loadDeck() {
      if (!deckId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("flashcard_decks")
          .select(
            `
            id, title,
            flashcards (id, front_text, back_text, correct_answer)
          `
          )
          .eq("id", deckId)
          .single();

        if (error) throw error;
        setDeck(data);

        if (!data.flashcards || data.flashcards.length < 3) {
          toast("Match mode requires at least 3 cards.", "error");
        } else {
          startNewGame(data.flashcards);
        }
      } catch (err: any) {
        toast(getSafeErrorMessage(err, "Could not load match game."), "error");
      } finally {
        setLoading(false);
      }
    }

    loadDeck();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [deckId, supabase, toast, startNewGame]);

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

    if (firstTile.cardId === clicked.cardId && firstTile.type !== clicked.type) {
      // Correct Match
      setMatchTiles((prev) =>
        prev.map((t) =>
          t.cardId === clicked.cardId ? { ...t, isMatched: true } : t
        )
      );
      setSelectedTileId(null);

      const remaining = matchTiles.filter(
        (t) => !t.isMatched && t.cardId !== clicked.cardId
      ).length;

      if (remaining === 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        setIsMatchWon(true);
        toast("Match cleared! Superb speed.", "success");
      }
    } else {
      // Mismatch: add penalty
      setMistakes((m) => m + 1);
      setTimerSeconds((t) => t + 2); // 2 second penalty
      setSelectedTileId(null);
      toast("Not a match (+2s penalty)", "error");
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-xs font-mono text-zinc-400">
        Loading match game...
      </div>
    );
  }

  if (!deck?.flashcards || deck.flashcards.length < 3) {
    return (
      <div className="max-w-md mx-auto py-24 text-center space-y-4">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
          Match mode requires at least 3 cards in the deck.
        </p>
        <Link
          href={`/flashcards/${deckId}`}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Deck
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-16 animate-in fade-in duration-150">
      {/* Game Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <Link
          href={`/flashcards/${deckId}`}
          onClick={() => {
            if (timerRef.current) clearInterval(timerRef.current);
          }}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Exit Match
        </Link>
        <div className="flex items-center gap-4 text-xs font-mono tnum">
          <span className="text-zinc-500">
            Time:{" "}
            <strong className="text-zinc-900 dark:text-white">
              {timerSeconds}s
            </strong>
          </span>
          <span className="text-zinc-500">
            Mistakes:{" "}
            <strong className="text-zinc-900 dark:text-white">
              {mistakes}
            </strong>
          </span>
        </div>
      </div>

      {isMatchWon ? (
        <div className="text-center py-12 space-y-4 bg-white dark:bg-[#09090B] border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xs">
          <Award className="h-10 w-10 mx-auto text-zinc-900 dark:text-white" />
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Cleared in {timerSeconds} seconds!
          </h2>
          <p className="text-xs text-zinc-500">
            Match results reinforce fast neural recall paths without resetting
            your spaced repetition review schedules.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <button
              onClick={() => startNewGame(deck.flashcards)}
              className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold btn-press flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Play Again
            </button>
            <Link
              href={`/flashcards/${deckId}`}
              className="px-5 py-2 rounded-xl bg-zinc-900 dark:bg-white text-xs font-semibold text-white dark:text-zinc-900 btn-press"
            >
              Done
            </Link>
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
