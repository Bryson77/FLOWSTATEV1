'use client';

import { useState } from 'react';
import { Plus, BookOpen, Layers, RotateCw, Sparkles, Check, ArrowLeft } from 'lucide-react';

interface Flashcard {
  id: string;
  front: string;
  back: string;
}

interface Deck {
  id: string;
  title: string;
  course: string;
  code: string;
  cardCount: number;
  dueToday: number;
  color: string;
  cards: Flashcard[];
}

const INITIAL_DECKS: Deck[] = [
  {
    id: '1',
    title: 'Chapter 4: Binary Trees & Heaps',
    course: 'Computer Science',
    code: 'CSC2001F',
    cardCount: 12,
    dueToday: 8,
    color: '#3B82F6',
    cards: [
      {
        id: 'c1',
        front: 'What is the maximum number of nodes at level L in a binary tree?',
        back: '2^L (assuming the root is at level 0).'
      },
      {
        id: 'c2',
        front: 'What are the properties of a Min-Heap?',
        back: 'A complete binary tree where each node value is less than or equal to the values of its children.'
      },
      {
        id: 'c3',
        front: 'What is the time complexity of building a heap from an array of N elements?',
        back: 'O(N) using bottom-up sift-down (Floyd algorithm).'
      }
    ]
  },
  {
    id: '2',
    title: 'Eigenvalues & Diagonalization',
    course: 'Linear Algebra',
    code: 'MTH2000S',
    cardCount: 15,
    dueToday: 10,
    color: '#8B5CF6',
    cards: [
      {
        id: 'c4',
        front: 'How do you find the eigenvalues of a square matrix A?',
        back: 'Solve the characteristic equation: det(A - λI) = 0.'
      }
    ]
  }
];

export default function FlashcardsPage() {
  const [decks, setDecks] = useState<Deck[]>(INITIAL_DECKS);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCourse, setNewCourse] = useState('Computer Science');
  const [newCode, setNewCode] = useState('CSC2001F');

  const startStudying = (deck: Deck) => {
    setActiveDeck(deck);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  };

  const handleNextCard = () => {
    setIsFlipped(false);
    if (!activeDeck) return;
    if (currentCardIndex + 1 < activeDeck.cards.length) {
      setCurrentCardIndex(currentCardIndex + 1);
    } else {
      setActiveDeck(null); // Finished
    }
  };

  const handleCreateDeck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newDeck: Deck = {
      id: Date.now().toString(),
      title: newTitle,
      course: newCourse,
      code: newCode,
      cardCount: 0,
      dueToday: 0,
      color: '#3B82F6',
      cards: []
    };

    setDecks([...decks, newDeck]);
    setIsCreatingDeck(false);
    setNewTitle('');
  };

  // Study View
  if (activeDeck) {
    const card = activeDeck.cards[currentCardIndex];

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setActiveDeck(null)}
            className="inline-flex items-center gap-2 text-xs font-medium text-[#A0A0A0] hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Exit Deck
          </button>
          <span className="font-mono text-xs text-[#A0A0A0]">
            Card {currentCardIndex + 1} of {activeDeck.cards.length}
          </span>
        </div>

        {/* 3D-feeling Flashcard Container */}
        <div
          onClick={() => setIsFlipped(!isFlipped)}
          className="min-h-[320px] rounded-3xl border border-white/10 bg-[rgba(255,255,255,0.03)] backdrop-blur-[40px] p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:border-white/20 active:scale-[0.99] select-none shadow-2xl relative"
        >
          <span className="absolute top-6 left-6 text-xs font-mono uppercase tracking-widest text-zinc-500">
            {isFlipped ? 'Answer' : 'Question'}
          </span>

          <p className="text-xl sm:text-2xl font-semibold text-white max-w-lg leading-relaxed">
            {isFlipped ? card.back : card.front}
          </p>

          <span className="absolute bottom-6 text-[11px] text-zinc-500 font-medium">
            Click or tap to flip
          </span>
        </div>

        {/* SM-2 Rating Controls */}
        <div className="grid grid-cols-4 gap-3 pt-2">
          <button
            onClick={handleNextCard}
            className="rounded-xl border border-red-500/20 bg-red-500/10 py-3 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all"
          >
            Again (1d)
          </button>
          <button
            onClick={handleNextCard}
            className="rounded-xl border border-amber-500/20 bg-amber-500/10 py-3 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-all"
          >
            Hard (2d)
          </button>
          <button
            onClick={handleNextCard}
            className="rounded-xl border border-blue-500/20 bg-blue-500/10 py-3 text-xs font-semibold text-blue-400 hover:bg-blue-500/20 transition-all"
          >
            Good (4d)
          </button>
          <button
            onClick={handleNextCard}
            className="rounded-xl border border-white/20 bg-white/10 py-3 text-xs font-semibold text-white hover:bg-white/20 transition-all"
          >
            Easy (7d)
          </button>
        </div>
      </div>
    );
  }

  // Decks Browser View
  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-300 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">Flashcards</h1>
          <p className="mt-1 text-[#A0A0A0]">Spaced repetition active recall decks.</p>
        </div>
        <button
          onClick={() => setIsCreatingDeck(!isCreatingDeck)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-all hover:scale-105 active:scale-[0.97]"
        >
          <Plus className="h-4 w-4" />
          Create Deck
        </button>
      </div>

      {isCreatingDeck && (
        <form onSubmit={handleCreateDeck} className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.04)] p-6 backdrop-blur-[40px] saturate-[150%] space-y-4">
          <h3 className="font-display text-lg font-semibold text-white">New Deck</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[#A0A0A0] block mb-1 font-medium">Deck Title</label>
              <input
                type="text"
                placeholder="e.g. Chapter 5: Sorting Algorithms"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-white/40"
              />
            </div>
            <div>
              <label className="text-xs text-[#A0A0A0] block mb-1 font-medium">Course</label>
              <input
                type="text"
                value={newCourse}
                onChange={e => setNewCourse(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-white/40"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreatingDeck(false)}
              className="rounded-full px-4 py-2 text-xs font-medium text-[#A0A0A0] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-zinc-200"
            >
              Save Deck
            </button>
          </div>
        </form>
      )}

      {/* Decks Grid */}
      <div className="grid gap-4 sm:grid-cols-2">
        {decks.map(deck => (
          <div
            key={deck.id}
            className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.03)] backdrop-blur-[40px] p-6 flex flex-col justify-between transition-all hover:bg-[rgba(255,255,255,0.06)] hover:border-white/20"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#A0A0A0] uppercase tracking-wider">{deck.code}</span>
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-mono font-medium text-zinc-300">
                  {deck.cardCount} cards
                </span>
              </div>
              <h3 className="font-display text-xl font-bold text-white mt-2 leading-snug">{deck.title}</h3>
              <p className="text-xs text-zinc-400 mt-1">{deck.course}</p>
            </div>

            <div className="mt-6 flex items-center justify-between pt-4 border-t border-white/5">
              <span className="text-xs text-zinc-300 font-mono font-medium">
                {deck.dueToday} due today
              </span>
              <button
                onClick={() => startStudying(deck)}
                disabled={deck.cards.length === 0}
                className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-40 transition-colors"
              >
                Study Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
