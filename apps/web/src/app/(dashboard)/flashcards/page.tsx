'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  BookOpen,
  Layers,
  RotateCw,
  Sparkles,
  Check,
  ArrowLeft,
  Trash2,
  AlertCircle,
  X,
  Search,
  Copy,
  Tag,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/toast';
import { calculateNextReview, type ReviewRating } from '@flowstate/study-engine';

interface CardItem {
  id: string;
  deck_id: string;
  front_text: string;
  back_text: string;
  card_type: 'standard' | 'true_false' | 'multiple_choice';
  options?: string[];
  correct_answer?: string | null;
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
  tags?: string[];
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

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'due' | 'learning' | 'mastered'>('all');

  // Study Mode State
  const [activeDeck, setActiveDeck] = useState<DeckItem | null>(null);
  const [studyQueue, setStudyQueue] = useState<CardItem[]>([]);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [selectedMcqOption, setSelectedMcqOption] = useState<string | null>(null);
  const [reviewedCountThisSession, setReviewedCountThisSession] = useState(0);

  // Deck Management View (Cards inside a deck)
  const [managingDeck, setManagingDeck] = useState<DeckItem | null>(null);

  // Create Deck Modal
  const [isDeckModalOpen, setIsDeckModalOpen] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckCourseId, setNewDeckCourseId] = useState('');
  const [newDeckTags, setNewDeckTags] = useState('');
  const [isSavingDeck, setIsSavingDeck] = useState(false);

  // Add/Edit Card Modal
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardType, setCardType] = useState<'standard' | 'true_false' | 'multiple_choice'>('standard');
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [mcqOptions, setMcqOptions] = useState<string[]>(['', '', '', '']);
  const [mcqCorrect, setMcqCorrect] = useState('0');
  const [tfCorrect, setTfCorrect] = useState('true');
  const [isSavingCard, setIsSavingCard] = useState(false);

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
        const cards: CardItem[] = (d.flashcards || []).map((c: any) => ({
          id: c.id,
          deck_id: c.deck_id,
          front_text: c.front_text,
          back_text: c.back_text,
          card_type: c.card_type || 'standard',
          options: c.options || [],
          correct_answer: c.correct_answer,
          repetition_number: c.repetition_number,
          interval_days: c.interval_days,
          ease_factor: c.ease_factor,
          due_date: c.due_date,
        }));

        const dueCount = cards.filter(c => !c.due_date || c.due_date <= todayStr).length;

        return {
          id: d.id,
          title: d.title,
          course_id: d.course_id,
          course_name: d.courses?.name || 'General',
          course_code: d.courses?.code || '',
          tags: d.tags || [],
          card_count: cards.length,
          due_count: dueCount,
          cards,
        };
      });

      setDecks(mappedDecks);
      setCourses(coursesRes.data || []);
      if (coursesRes.data && coursesRes.data.length > 0 && !newDeckCourseId) {
        setNewDeckCourseId(coursesRes.data[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load flashcard decks.');
    } finally {
      setLoading(false);
    }
  }, [supabase, newDeckCourseId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered decks list
  const filteredDecks = decks.filter(deck => {
    const matchesCourse = selectedCourseFilter === 'all' || deck.course_id === selectedCourseFilter;
    const matchesSearch = !searchQuery || 
      deck.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deck.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
      deck.cards?.some(c => c.front_text.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesCourse || !matchesSearch) return false;

    if (reviewFilter === 'due') return (deck.due_count || 0) > 0;
    if (reviewFilter === 'learning') return deck.cards?.some(c => (c.ease_factor || 2.5) < 2.3);
    if (reviewFilter === 'mastered') return deck.cards?.some(c => (c.interval_days || 0) > 21);

    return true;
  });

  // Start Study Session
  const handleStartStudy = (deck: DeckItem, mode: 'srs' | 'cram' = 'srs') => {
    const todayStr = new Date().toISOString().split('T')[0];
    let queue: CardItem[] = [];

    if (mode === 'srs') {
      queue = (deck.cards || []).filter(c => !c.due_date || c.due_date <= todayStr);
      if (queue.length === 0) {
        queue = deck.cards || [];
      }
    } else {
      queue = [...(deck.cards || [])].sort(() => Math.random() - 0.5);
    }

    if (queue.length === 0) {
      toast('Deck has no cards yet. Add cards first.', 'error');
      return;
    }

    setActiveDeck(deck);
    setStudyQueue(queue);
    setCardIndex(0);
    setFlipped(false);
    setSelectedMcqOption(null);
    setReviewedCountThisSession(0);
  };

  // Process SM-2 Rating
  const handleReviewRating = async (rating: ReviewRating) => {
    if (!activeDeck || studyQueue.length === 0) return;
    const currentCard = studyQueue[cardIndex];

    const result = calculateNextReview({
      repetitionNumber: currentCard.repetition_number || 0,
      intervalDays: currentCard.interval_days || 0,
      easeFactor: currentCard.ease_factor ? Number(currentCard.ease_factor) : 2.5,
      rating,
    });

    try {
      const { error } = await supabase
        .from('flashcards')
        .update({
          repetition_number: result.repetitionNumber,
          interval_days: result.intervalDays,
          ease_factor: result.easeFactor,
          due_date: result.nextReviewDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentCard.id);

      if (error) throw error;

      const newCount = reviewedCountThisSession + 1;
      setReviewedCountThisSession(newCount);

      // When 15 cards are reviewed, invoke server-side streak function
      if (newCount === 15) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.rpc('record_study_activity', {
            p_user_id: user.id,
            p_activity_type: 'flashcards'
          });
          toast('15 cards studied: Daily streak secured!', 'success');
        }
      }

      if (cardIndex + 1 < studyQueue.length) {
        setCardIndex(cardIndex + 1);
        setFlipped(false);
        setSelectedMcqOption(null);
      } else {
        toast('Study session complete!', 'success');
        setActiveDeck(null);
        fetchData();
      }
    } catch (err: any) {
      toast('Failed to record card review', 'error');
    }
  };

  // Keyboard navigation during study
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeDeck) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped(prev => !prev);
      } else if (flipped) {
        if (e.key === '1') handleReviewRating('again');
        if (e.key === '2') handleReviewRating('hard');
        if (e.key === '3') handleReviewRating('good');
        if (e.key === '4') handleReviewRating('easy');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDeck, flipped, cardIndex, studyQueue]);

  // Create new deck
  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckTitle.trim() || !newDeckCourseId) return;

    setIsSavingDeck(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const parsedTags = newDeckTags
        .split(',')
        .map(t => t.trim().replace(/^#/, ''))
        .filter(Boolean);

      const { data, error } = await supabase
        .from('flashcard_decks')
        .insert({
          user_id: user.id,
          course_id: newDeckCourseId,
          title: newDeckTitle.trim(),
          tags: parsedTags,
          is_public: false,
        })
        .select('*, courses(name, code)')
        .single();

      if (error) throw error;

      setIsDeckModalOpen(false);
      setNewDeckTitle('');
      setNewDeckTags('');
      toast('Deck created', 'success');
      fetchData();
    } catch (err: any) {
      toast(err.message || 'Failed to create deck', 'error');
    } finally {
      setIsSavingDeck(false);
    }
  };

  // Save Card (Create or Edit)
  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingDeck || !cardFront.trim()) return;

    setIsSavingCard(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      let correctAnswer = cardBack.trim();
      let optionsPayload: string[] = [];

      if (cardType === 'true_false') {
        correctAnswer = tfCorrect;
      } else if (cardType === 'multiple_choice') {
        optionsPayload = mcqOptions.map(o => o.trim()).filter(Boolean);
        const selectedIdx = parseInt(mcqCorrect, 10);
        correctAnswer = optionsPayload[selectedIdx] || optionsPayload[0] || '';
      }

      if (editingCardId) {
        const { error } = await supabase
          .from('flashcards')
          .update({
            front_text: cardFront.trim(),
            back_text: cardBack.trim(),
            card_type: cardType,
            options: optionsPayload,
            correct_answer: correctAnswer,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCardId);

        if (error) throw error;
        toast('Card updated', 'success');
      } else {
        const { error } = await supabase
          .from('flashcards')
          .insert({
            user_id: user.id,
            deck_id: managingDeck.id,
            front_text: cardFront.trim(),
            back_text: cardBack.trim(),
            card_type: cardType,
            options: optionsPayload,
            correct_answer: correctAnswer,
            repetition_number: 0,
            interval_days: 0,
            ease_factor: 2.5,
            due_date: new Date().toISOString().split('T')[0],
          });

        if (error) throw error;
        toast('Card added', 'success');
      }

      // Reset form & reload
      setCardFront('');
      setCardBack('');
      setMcqOptions(['', '', '', '']);
      setIsCardModalOpen(false);
      setEditingCardId(null);
      fetchData();
    } catch (err: any) {
      toast(err.message || 'Failed to save card', 'error');
    } finally {
      setIsSavingCard(false);
    }
  };

  // Delete Deck
  const handleDeleteDeck = async (deckId: string) => {
    if (!confirm('Are you sure? This will delete the deck and all associated cards.')) return;

    try {
      const { error } = await supabase.from('flashcard_decks').delete().eq('id', deckId);
      if (error) throw error;
      toast('Deck deleted', 'success');
      if (managingDeck?.id === deckId) setManagingDeck(null);
      fetchData();
    } catch {
      toast('Failed to delete deck', 'error');
    }
  };

  // Reset SRS Intervals
  const handleResetSRS = async (deckId: string) => {
    if (!confirm('Reset all cards in this deck back to Day 1 review status?')) return;

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('flashcards')
        .update({
          repetition_number: 0,
          interval_days: 0,
          ease_factor: 2.5,
          due_date: todayStr,
        })
        .eq('deck_id', deckId);

      if (error) throw error;
      toast('All card intervals reset to Day 1', 'success');
      fetchData();
    } catch {
      toast('Failed to reset intervals', 'error');
    }
  };

  // Delete single card
  const handleDeleteCard = async (cardId: string) => {
    try {
      const { error } = await supabase.from('flashcards').delete().eq('id', cardId);
      if (error) throw error;
      toast('Card deleted', 'success');
      fetchData();
    } catch {
      toast('Failed to delete card', 'error');
    }
  };

  // Duplicate single card
  const handleDuplicateCard = async (card: CardItem) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('flashcards')
        .insert({
          user_id: user.id,
          deck_id: card.deck_id,
          front_text: `${card.front_text} (Copy)`,
          back_text: card.back_text,
          card_type: card.card_type,
          options: card.options,
          correct_answer: card.correct_answer,
          repetition_number: 0,
          interval_days: 0,
          ease_factor: 2.5,
          due_date: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;
      toast('Card duplicated', 'success');
      fetchData();
    } catch {
      toast('Failed to duplicate card', 'error');
    }
  };

  // Active Study View
  if (activeDeck && studyQueue.length > 0) {
    const currentCard = studyQueue[cardIndex];
    const progressPct = ((cardIndex + 1) / studyQueue.length) * 100;

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200 pb-16">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <button
            onClick={() => setActiveDeck(null)}
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Exit Session
          </button>
          <div className="text-center">
            <span className="text-xs font-semibold text-white">{activeDeck.title}</span>
            <span className="text-xs text-zinc-500 font-mono ml-2">
              {cardIndex + 1} / {studyQueue.length}
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded">
            {currentCard.card_type.replace('_', ' ').toUpperCase()}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-white transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>

        {/* 3D Flip Flashcard */}
        <div
          onClick={() => setFlipped(!flipped)}
          className="relative min-h-[340px] w-full cursor-pointer rounded-2xl border border-white/10 bg-[#09090b] p-8 shadow-2xl flex flex-col justify-between select-none transition-all hover:border-white/20 active:scale-[0.99]"
        >
          <div className="flex items-center justify-between text-zinc-500 text-[11px] font-mono">
            <span>{flipped ? 'ANSWER / EXPLANATION' : 'QUESTION'}</span>
            <span className="inline-flex items-center gap-1">
              <RotateCw className="h-3 w-3" /> Tap or Space to flip
            </span>
          </div>

          <div className="py-8 text-center space-y-4">
            <p className="font-display text-xl sm:text-2xl font-semibold text-white leading-relaxed">
              {flipped ? (currentCard.back_text || currentCard.correct_answer) : currentCard.front_text}
            </p>

            {/* Interactive MCQ Choices (when front is shown) */}
            {!flipped && currentCard.card_type === 'multiple_choice' && currentCard.options && (
              <div className="grid grid-cols-1 gap-2 pt-4 text-left max-w-md mx-auto">
                {currentCard.options.map((opt, i) => (
                  <button
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedMcqOption(opt);
                      setFlipped(true);
                    }}
                    className={`p-3 rounded-xl border text-xs font-medium transition-all ${
                      selectedMcqOption === opt
                        ? 'border-white bg-white text-black'
                        : 'border-white/10 bg-black text-zinc-300 hover:border-white/30'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Interactive True/False Choice */}
            {!flipped && currentCard.card_type === 'true_false' && (
              <div className="flex justify-center gap-4 pt-4">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFlipped(true);
                  }}
                  className="px-6 py-2.5 rounded-xl border border-white/10 bg-black text-xs font-semibold text-white hover:border-white/30"
                >
                  True
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFlipped(true);
                  }}
                  className="px-6 py-2.5 rounded-xl border border-white/10 bg-black text-xs font-semibold text-white hover:border-white/30"
                >
                  False
                </button>
              </div>
            )}
          </div>

          <div className="text-center text-[11px] font-mono text-zinc-600">
            {flipped ? 'Rate your recall below to schedule next interval' : 'Think through the concept before flipping'}
          </div>
        </div>

        {/* SM-2 Interval Rating Buttons */}
        {flipped ? (
          <div className="grid grid-cols-4 gap-2 pt-2 animate-in fade-in duration-150">
            <button
              onClick={() => handleReviewRating('again')}
              className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 text-center hover:bg-red-500/20 transition-all btn-press"
            >
              <div className="text-xs font-bold text-red-400">Again</div>
              <div className="text-[10px] font-mono text-zinc-500">1d (Key: 1)</div>
            </button>
            <button
              onClick={() => handleReviewRating('hard')}
              className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/10 text-center hover:bg-amber-500/20 transition-all btn-press"
            >
              <div className="text-xs font-bold text-amber-400">Hard</div>
              <div className="text-[10px] font-mono text-zinc-500">3d (Key: 2)</div>
            </button>
            <button
              onClick={() => handleReviewRating('good')}
              className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/10 text-center hover:bg-blue-500/20 transition-all btn-press"
            >
              <div className="text-xs font-bold text-blue-400">Good</div>
              <div className="text-[10px] font-mono text-zinc-500">7d (Key: 3)</div>
            </button>
            <button
              onClick={() => handleReviewRating('easy')}
              className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-center hover:bg-emerald-500/20 transition-all btn-press"
            >
              <div className="text-xs font-bold text-emerald-400">Easy</div>
              <div className="text-[10px] font-mono text-zinc-500">14d (Key: 4)</div>
            </button>
          </div>
        ) : (
          <div className="text-center pt-2">
            <button
              onClick={() => setFlipped(true)}
              className="rounded-xl bg-white px-6 py-2.5 text-xs font-semibold text-black hover:bg-zinc-200 transition-all btn-press"
            >
              Show Answer
            </button>
          </div>
        )}
      </div>
    );
  }

  // Deck Management View (View cards inside deck)
  if (managingDeck) {
    const deckCards = managingDeck.cards || [];

    return (
      <div className="space-y-6 animate-in fade-in duration-200 pb-16">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setManagingDeck(null)}
              className="p-2 rounded-lg border border-white/10 text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-white">{managingDeck.title}</h2>
              <p className="text-xs text-zinc-400 font-mono">
                {managingDeck.course_name} ({managingDeck.course_code}) · {deckCards.length} cards
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleResetSRS(managingDeck.id)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#09090b] px-3 py-2 text-xs font-medium text-zinc-300 hover:text-white"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Reset Intervals
            </button>
            <button
              onClick={() => {
                setEditingCardId(null);
                setCardFront('');
                setCardBack('');
                setIsCardModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-xs font-semibold text-black hover:bg-zinc-200 btn-press"
            >
              <Plus className="h-3.5 w-3.5" /> Add Card
            </button>
          </div>
        </div>

        {/* Cards Table */}
        <div className="space-y-3">
          {deckCards.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-2xl text-xs text-zinc-500">
              This deck has no cards. Click "Add Card" to create your first card.
            </div>
          ) : (
            deckCards.map((card, index) => (
              <div
                key={card.id}
                className="flex items-center justify-between p-4 rounded-xl border border-white/[0.06] bg-[#09090b] hover:border-white/15 transition-all"
              >
                <div className="space-y-1 flex-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-zinc-500">#{index + 1}</span>
                    <span className="text-xs font-semibold text-white">{card.front_text}</span>
                    <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-1.5 py-0.5 rounded">
                      {card.card_type}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 line-clamp-1">{card.back_text || card.correct_answer}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDuplicateCard(card)}
                    className="p-1.5 text-zinc-500 hover:text-white transition-colors"
                    title="Duplicate Card"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteCard(card.id)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Delete Card"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Decks Hub Overview
  return (
    <div className="space-y-8 animate-in fade-in duration-200 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">
            Flashcard SRS Engine
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Spaced repetition decks organized strictly by academic subjects.
          </p>
        </div>

        <button
          onClick={() => setIsDeckModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black hover:bg-zinc-200 transition-all btn-press"
        >
          <Plus className="h-4 w-4" /> Create Deck
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search decks, topics (#Chapter1), and cards..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#09090b] pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-white/30"
          />
        </div>

        {/* Course Filter */}
        <select
          value={selectedCourseFilter}
          onChange={e => setSelectedCourseFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#09090b] px-3 py-2.5 text-xs text-zinc-300 focus:outline-none focus:border-white/30"
        >
          <option value="all">All Subjects</option>
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
          ))}
        </select>

        {/* Review Status Filter */}
        <div className="flex rounded-xl border border-white/10 bg-[#09090b] p-1 text-xs">
          <button
            onClick={() => setReviewFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              reviewFilter === 'all' ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setReviewFilter('due')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              reviewFilter === 'due' ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Due Today
          </button>
          <button
            onClick={() => setReviewFilter('learning')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              reviewFilter === 'learning' ? 'bg-white text-black font-semibold' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Learning
          </button>
        </div>
      </div>

      {/* Decks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDecks.length === 0 ? (
          <div className="col-span-full text-center py-16 border border-dashed border-white/10 rounded-2xl space-y-2">
            <p className="text-sm font-semibold text-zinc-400">No decks found</p>
            <p className="text-xs text-zinc-600">Create a flashcard deck or adjust your filters above.</p>
          </div>
        ) : (
          filteredDecks.map(deck => (
            <div
              key={deck.id}
              className="rounded-2xl border border-white/10 bg-[#09090b] p-6 space-y-4 hover:border-white/20 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded">
                    {deck.course_code || deck.course_name}
                  </span>
                  {(deck.due_count || 0) > 0 ? (
                    <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-mono font-medium text-purple-400">
                      {deck.due_count} Due
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-zinc-500">Caught Up</span>
                  )}
                </div>

                <h3 className="text-base font-bold text-white tracking-tight">{deck.title}</h3>

                {deck.tags && deck.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {deck.tags.map((tag, idx) => (
                      <span key={idx} className="text-[10px] font-mono text-zinc-500">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-xs text-zinc-500 font-mono">
                  <span>{deck.card_count} Total Cards</span>
                  <button
                    onClick={() => setManagingDeck(deck)}
                    className="text-zinc-400 hover:text-white underline text-[11px]"
                  >
                    Manage Cards
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleStartStudy(deck, 'srs')}
                    className="flex-1 rounded-xl bg-white py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-all btn-press"
                  >
                    Study Deck
                  </button>
                  <button
                    onClick={() => handleDeleteDeck(deck.id)}
                    className="p-2 rounded-xl border border-white/10 text-zinc-500 hover:text-red-400 transition-colors"
                    title="Delete Deck"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Deck Modal */}
      {isDeckModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#09090b] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-semibold text-white">Create Flashcard Deck</h3>
              <button onClick={() => setIsDeckModalOpen(false)} className="text-zinc-500 hover:text-white">
                Cancel
              </button>
            </div>

            <form onSubmit={handleCreateDeck} className="space-y-3">
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Deck Title</label>
                <input
                  type="text"
                  placeholder="e.g. Chapter 4: Data Structures"
                  value={newDeckTitle}
                  onChange={e => setNewDeckTitle(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Subject</label>
                <select
                  value={newDeckCourseId}
                  onChange={e => setNewDeckCourseId(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                  required
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Tags (Comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Trees, Algorithms, Midterm"
                  value={newDeckTags}
                  onChange={e => setNewDeckTags(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDeckModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingDeck}
                  className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-all btn-press"
                >
                  {isSavingDeck ? 'Creating...' : 'Create Deck'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Card Modal */}
      {isCardModalOpen && managingDeck && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#09090b] p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-sm font-semibold text-white">
                {editingCardId ? 'Edit Card' : `Add Card to ${managingDeck.title}`}
              </h3>
              <button onClick={() => setIsCardModalOpen(false)} className="text-zinc-500 hover:text-white">
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-4">
              {/* Card Type Selector */}
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Card Format</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCardType('standard')}
                    className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                      cardType === 'standard' ? 'border-white bg-white text-black' : 'border-white/10 text-zinc-400'
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardType('true_false')}
                    className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                      cardType === 'true_false' ? 'border-white bg-white text-black' : 'border-white/10 text-zinc-400'
                    }`}
                  >
                    True / False
                  </button>
                  <button
                    type="button"
                    onClick={() => setCardType('multiple_choice')}
                    className={`py-2 rounded-xl text-xs font-medium border transition-all ${
                      cardType === 'multiple_choice' ? 'border-white bg-white text-black' : 'border-white/10 text-zinc-400'
                    }`}
                  >
                    Multiple Choice
                  </button>
                </div>
              </div>

              {/* Front Text */}
              <div>
                <label className="block text-[11px] font-mono text-zinc-400 mb-1">Front Question / Prompt</label>
                <textarea
                  rows={2}
                  placeholder="Enter the concept, term, or question..."
                  value={cardFront}
                  onChange={e => setCardFront(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black p-3 text-xs text-white focus:outline-none focus:border-white/30"
                  required
                />
              </div>

              {/* Format Specific Fields */}
              {cardType === 'standard' && (
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">Back Answer</label>
                  <textarea
                    rows={3}
                    placeholder="Enter the comprehensive answer / definition..."
                    value={cardBack}
                    onChange={e => setCardBack(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black p-3 text-xs text-white focus:outline-none focus:border-white/30"
                    required
                  />
                </div>
              )}

              {cardType === 'true_false' && (
                <div>
                  <label className="block text-[11px] font-mono text-zinc-400 mb-1">Correct Answer</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-xs text-zinc-300">
                      <input
                        type="radio"
                        checked={tfCorrect === 'true'}
                        onChange={() => setTfCorrect('true')}
                      />
                      True
                    </label>
                    <label className="flex items-center gap-2 text-xs text-zinc-300">
                      <input
                        type="radio"
                        checked={tfCorrect === 'false'}
                        onChange={() => setTfCorrect('false')}
                      />
                      False
                    </label>
                  </div>
                </div>
              )}

              {cardType === 'multiple_choice' && (
                <div className="space-y-2">
                  <label className="block text-[11px] font-mono text-zinc-400">Options (Select correct choice)</label>
                  {mcqOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="correct_mcq"
                        checked={mcqCorrect === idx.toString()}
                        onChange={() => setMcqCorrect(idx.toString())}
                      />
                      <input
                        type="text"
                        placeholder={`Option ${idx + 1}`}
                        value={opt}
                        onChange={e => {
                          const updated = [...mcqOptions];
                          updated[idx] = e.target.value;
                          setMcqOptions(updated);
                        }}
                        className="flex-1 rounded-xl border border-white/10 bg-black px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/30"
                        required
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCardModalOpen(false)}
                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCard}
                  className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-zinc-200 transition-all btn-press"
                >
                  {isSavingCard ? 'Saving...' : 'Save Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
