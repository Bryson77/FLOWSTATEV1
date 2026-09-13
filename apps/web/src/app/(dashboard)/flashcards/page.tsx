'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, BookOpen, Layers, RotateCw, Sparkles, Check, ArrowLeft, Trash2, AlertCircle, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { calculateNextReview, type ReviewRating } from '@flowstate/study-engine';

interface CardItem {
  id: string;
  deck_id: string;
  front_text: string;
  back_text: string;
  repetition_number: number | null;
  interval_days: number | null;
  ease_factor: number | null;
  due_date: string | null;
}

interface DeckItem {
  id: string;
  title: string;
  course_id: string;
  course_name?: string;
  course_code?: string;
  card_count?: number;
  due_count?: number;
  cards?: CardItem[];
}

interface CourseItem {
  id: string;
  name: string;
  code: string;
}

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<DeckItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active study mode
  const [activeDeck, setActiveDeck] = useState<DeckItem | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Create Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deckTitle, setDeckTitle] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [initialFront, setInitialFront] = useState('');
  const [initialBack, setInitialBack] = useState('');

  const { toast } = useToast();
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Please sign in to view flashcards.');

      const [decksRes, coursesRes] = await Promise.all([
        supabase
          .from('flashcard_decks')
          .select('*, courses(name, code), flashcards(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('courses')
          .select('*')
          .eq('user_id', user.id)
          .order('name'),
      ]);

      if (decksRes.error) throw decksRes.error;
      if (coursesRes.error) throw coursesRes.error;

      const todayStr = new Date().toISOString().split('T')[0];

      const mappedDecks: DeckItem[] = (decksRes.data || []).map((d: any) => {
        const cards: CardItem[] = d.flashcards || [];
        const dueCount = cards.filter(c => !c.due_date || c.due_date <= todayStr).length;

        return {
          id: d.id,
          title: d.title,
          course_id: d.course_id,
          course_name: d.courses?.name || 'General',
          course_code: d.courses?.code || '',
          card_count: cards.length,
          due_count: dueCount,
          cards,
        };
      });

      setDecks(mappedDecks);
      setCourses(coursesRes.data || []);
      if (coursesRes.data && coursesRes.data.length > 0 && !selectedCourseId) {
        setSelectedCourseId(coursesRes.data[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load flashcard decks.');
    } finally {
      setLoading(false);
    }
  }, [supabase, selectedCourseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckTitle.trim()) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      let courseIdToUse = selectedCourseId;
      if (!courseIdToUse) {
        if (courses.length > 0) {
          courseIdToUse = courses[0].id;
        } else {
          const { data: newCourse, error: cErr } = await supabase
            .from('courses')
            .insert({ user_id: user.id, name: 'General Revision', code: 'GEN101' })
            .select()
            .single();
          if (cErr) throw cErr;
          courseIdToUse = newCourse.id;
        }
      }

      // Create deck
      const { data: newDeck, error: dErr } = await supabase
        .from('flashcard_decks')
        .insert({
          user_id: user.id,
          course_id: courseIdToUse,
          title: deckTitle.trim(),
        })
        .select()
        .single();

      if (dErr) throw dErr;

      // Add first card if specified
      if (initialFront.trim() && initialBack.trim()) {
        const { error: cErr } = await supabase
          .from('flashcards')
          .insert({
            user_id: user.id,
            deck_id: newDeck.id,
            front_text: initialFront.trim(),
            back_text: initialBack.trim(),
          });
        if (cErr) throw cErr;
      }

      toast('✓ Saved');
      setIsModalOpen(false);
      setDeckTitle('');
      setInitialFront('');
      setInitialBack('');
      await fetchData();
    } catch (err: any) {
      toast(err.message || 'Failed to create deck.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRateCard = async (rating: ReviewRating) => {
    if (!activeDeck || !activeDeck.cards || activeDeck.cards.length === 0) return;
    const currentCard = activeDeck.cards[cardIndex];

    try {
      const result = calculateNextReview({
        repetitionNumber: currentCard.repetition_number || 0,
        intervalDays: currentCard.interval_days || 0,
        easeFactor: currentCard.ease_factor || 2.5,
        rating,
      });

      const nextDueDate = new Date();
      nextDueDate.setDate(nextDueDate.getDate() + result.intervalDays);

      await supabase
        .from('flashcards')
        .update({
          repetition_number: result.repetitionNumber,
          interval_days: result.intervalDays,
          ease_factor: result.easeFactor,
          due_date: nextDueDate.toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentCard.id);

      if (cardIndex + 1 < activeDeck.cards.length) {
        setCardIndex(prev => prev + 1);
        setFlipped(false);
      } else {
        toast('✓ Review logged');
        setActiveDeck(null);
        setCardIndex(0);
        setFlipped(false);
        fetchData();
      }
    } catch {
      toast('Failed to record review.', 'error');
    }
  };

  const handleDeleteDeck = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('flashcard_decks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setDecks(prev => prev.filter(d => d.id !== id));
      toast('✓ Removed');
    } catch {
      toast('Failed to delete deck.', 'error');
    }
  };

  // Study Screen Active
  if (activeDeck && activeDeck.cards && activeDeck.cards.length > 0) {
    const card = activeDeck.cards[cardIndex];

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200 pb-16">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => { setActiveDeck(null); setCardIndex(0); setFlipped(false); }}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#A0A0A0] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Exit Review</span>
          </button>
          <span className="font-mono text-xs text-[#A0A0A0]">
            Card {cardIndex + 1} of {activeDeck.cards.length}
          </span>
        </div>

        {/* 3D Flashcard */}
        <div
          onClick={() => setFlipped(!flipped)}
          className="min-h-[300px] flex flex-col justify-between rounded-2xl border border-[#2A2A2A] bg-[#111111] p-8 cursor-pointer transition-all hover:border-white/20 select-none shadow-2xl"
        >
          <div className="flex items-center justify-between text-[11px] font-mono text-[#A0A0A0] uppercase tracking-wider">
            <span>{flipped ? 'Back / Solution' : 'Front / Prompt'}</span>
            <span>Click to flip</span>
          </div>

          <div className="my-auto py-8 text-center">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-white leading-relaxed">
              {flipped ? card.back_text : card.front_text}
            </h2>
          </div>

          <div className="text-center text-xs text-[#4A4A4A] font-mono">
            {flipped ? 'Rate your recall below' : 'Think of answer, then click'}
          </div>
        </div>

        {/* SM-2 Recall Difficulty Buttons */}
        {flipped ? (
          <div className="grid grid-cols-4 gap-2.5 pt-2 animate-in fade-in duration-150">
            <button
              onClick={() => handleRateCard('again')}
              className="rounded-xl border border-[#E74C3C]/40 bg-[#E74C3C]/10 py-3 text-xs font-semibold text-[#E74C3C] hover:bg-[#E74C3C]/20 transition-all active:scale-95 cursor-pointer"
            >
              Again (1d)
            </button>
            <button
              onClick={() => handleRateCard('hard')}
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 py-3 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-all active:scale-95 cursor-pointer"
            >
              Hard
            </button>
            <button
              onClick={() => handleRateCard('good')}
              className="rounded-xl border border-blue-500/40 bg-blue-500/10 py-3 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition-all active:scale-95 cursor-pointer"
            >
              Good
            </button>
            <button
              onClick={() => handleRateCard('easy')}
              className="rounded-xl border border-[#22C55E]/40 bg-[#22C55E]/10 py-3 text-xs font-semibold text-[#22C55E] hover:bg-[#22C55E]/20 transition-all active:scale-95 cursor-pointer"
            >
              Easy
            </button>
          </div>
        ) : (
          <button
            onClick={() => setFlipped(true)}
            className="w-full rounded-xl bg-white py-3 text-xs font-semibold text-black hover:bg-zinc-200 transition-all active:scale-95 cursor-pointer"
          >
            Show Answer
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Flashcards</h1>
          <p className="mt-1 text-sm text-[#A0A0A0]">Active recall decks with SM-2 spaced repetition.</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-all active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          <span>New Deck</span>
        </button>
      </div>

      {/* Error State */}
      {errorMsg && (
        <div className="rounded-xl border border-[#E74C3C]/30 bg-[#E74C3C]/10 p-4 text-xs text-[#E74C3C] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={fetchData} className="font-medium underline hover:text-white ml-4">
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-44 w-full skeleton rounded-2xl" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !errorMsg && decks.length === 0 && (
        <div className="rounded-2xl border border-[#2A2A2A] bg-[#111111] p-12 text-center space-y-4 max-w-lg mx-auto my-12">
          <h2 className="font-display text-xl font-bold text-white">No flashcard decks yet</h2>
          <p className="text-sm text-[#A0A0A0] leading-relaxed">
            Create decks with active recall cards to train with the SuperMemo SM-2 spaced repetition algorithm.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-xs font-semibold text-black hover:bg-zinc-200 transition-all active:scale-[0.97]"
          >
            <Plus className="h-4 w-4" />
            <span>Create Your First Deck</span>
          </button>
        </div>
      )}

      {/* Decks Grid */}
      {!loading && !errorMsg && decks.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {decks.map((deck) => (
            <div
              key={deck.id}
              onClick={() => {
                if (deck.cards && deck.cards.length > 0) {
                  setActiveDeck(deck);
                  setCardIndex(0);
                  setFlipped(false);
                } else {
                  toast('Deck has no cards yet', 'info');
                }
              }}
              className="group flex flex-col justify-between rounded-2xl border border-[#2A2A2A] bg-[#111111] p-6 transition-all hover:border-white/20 cursor-pointer shadow-xl"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="font-mono text-xs text-[#A0A0A0]">{deck.course_code}</span>
                  <button
                    onClick={(e) => handleDeleteDeck(deck.id, e)}
                    className="opacity-0 group-hover:opacity-100 text-[#A0A0A0] hover:text-[#E74C3C] transition-opacity"
                    title="Delete Deck"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <h3 className="font-display text-lg font-bold text-white leading-snug">
                  {deck.title}
                </h3>
              </div>

              <div className="mt-6 pt-4 border-t border-[#2A2A2A] flex items-center justify-between text-xs font-mono">
                <span className="text-[#A0A0A0]">{deck.card_count} cards</span>
                <span className={`${(deck.due_count || 0) > 0 ? 'text-amber-400 font-semibold' : 'text-[#4A4A4A]'}`}>
                  {deck.due_count} due today
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: New Deck */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-xl border border-[#2A2A2A] bg-[#1A1A1A] p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#2A2A2A] pb-3">
              <h2 className="font-display text-lg font-bold text-white">Create Flashcard Deck</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-[#A0A0A0] hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div>
                <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                  Deck Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4: Binary Trees & Heaps"
                  value={deckTitle}
                  onChange={(e) => setDeckTitle(e.target.value)}
                  className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/40"
                />
              </div>

              {courses.length > 0 && (
                <div>
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-[#A0A0A0] mb-1.5">
                    Course
                  </label>
                  <select
                    value={selectedCourseId}
                    onChange={(e) => setSelectedCourseId(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white focus:outline-none focus:border-white/40"
                  >
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="border-t border-[#2A2A2A] pt-3 space-y-3">
                <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">First Card (Optional)</span>
                <div>
                  <input
                    type="text"
                    placeholder="Front / Question prompt"
                    value={initialFront}
                    onChange={(e) => setInitialFront(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/40 mb-2"
                  />
                  <input
                    type="text"
                    placeholder="Back / Answer solution"
                    value={initialBack}
                    onChange={(e) => setInitialBack(e.target.value)}
                    className="w-full rounded-lg border border-[#2A2A2A] bg-[#111111] px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-white/40"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-[#A0A0A0] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-all active:scale-[0.97] disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Deck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
