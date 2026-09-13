import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layers, ArrowLeft, AlertCircle, RotateCw } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { calculateNextReview, type ReviewRating } from '@flowstate/study-engine';

interface CardItem {
  id: string;
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
  courses?: { name: string; code: string };
  cards: CardItem[];
}

export default function CardsScreen() {
  const [decks, setDecks] = useState<DeckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active study mode
  const [activeDeck, setActiveDeck] = useState<DeckItem | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const fetchDecks = useCallback(async () => {
    setErrorMsg(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setDecks([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('flashcard_decks')
        .select('*, courses(name, code), flashcards(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: DeckItem[] = (data || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        course_id: d.course_id,
        courses: d.courses,
        cards: d.flashcards || [],
      }));

      setDecks(mapped);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load decks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDecks();
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

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + result.intervalDays);

      await supabase
        .from('flashcards')
        .update({
          repetition_number: result.repetitionNumber,
          interval_days: result.intervalDays,
          ease_factor: result.easeFactor,
          due_date: nextDate.toISOString().split('T')[0],
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentCard.id);

      if (cardIndex + 1 < activeDeck.cards.length) {
        setCardIndex((prev) => prev + 1);
        setFlipped(false);
      } else {
        setActiveDeck(null);
        setCardIndex(0);
        setFlipped(false);
        fetchDecks();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Study Screen Active
  if (activeDeck && activeDeck.cards && activeDeck.cards.length > 0) {
    const card = activeDeck.cards[cardIndex];

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.studyContent}>
          {/* Top Bar */}
          <View style={styles.studyTopBar}>
            <Pressable
              onPress={() => {
                setActiveDeck(null);
                setCardIndex(0);
                setFlipped(false);
              }}
              style={styles.exitButton}
            >
              <ArrowLeft size={16} color="#A0A0A0" />
              <Text style={styles.exitText}>Exit</Text>
            </Pressable>
            <Text style={styles.cardCounter}>
              Card {cardIndex + 1} of {activeDeck.cards.length}
            </Text>
          </View>

          {/* Flashcard Body */}
          <Pressable
            onPress={() => setFlipped(!flipped)}
            style={styles.flashcard}
          >
            <View style={styles.flashcardHeader}>
              <Text style={styles.cardSideLabel}>
                {flipped ? 'SOLUTION' : 'PROMPT'}
              </Text>
              <RotateCw size={14} color="#71717A" />
            </View>

            <View style={styles.cardCenter}>
              <Text style={styles.cardText}>
                {flipped ? card.back_text : card.front_text}
              </Text>
            </View>

            <Text style={styles.tapToFlip}>
              {flipped ? 'Rate your recall below' : 'Tap to reveal answer'}
            </Text>
          </Pressable>

          {/* Recall Actions */}
          {flipped ? (
            <View style={styles.ratingRow}>
              <Pressable
                onPress={() => handleRateCard('again')}
                style={[styles.rateButton, { borderColor: 'rgba(231, 76, 60, 0.4)', backgroundColor: 'rgba(231, 76, 60, 0.1)' }]}
              >
                <Text style={[styles.rateText, { color: '#E74C3C' }]}>Again (1d)</Text>
              </Pressable>
              <Pressable
                onPress={() => handleRateCard('hard')}
                style={[styles.rateButton, { borderColor: 'rgba(245, 158, 11, 0.4)', backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}
              >
                <Text style={[styles.rateText, { color: '#F59E0B' }]}>Hard</Text>
              </Pressable>
              <Pressable
                onPress={() => handleRateCard('good')}
                style={[styles.rateButton, { borderColor: 'rgba(59, 130, 246, 0.4)', backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
              >
                <Text style={[styles.rateText, { color: '#3B82F6' }]}>Good</Text>
              </Pressable>
              <Pressable
                onPress={() => handleRateCard('easy')}
                style={[styles.rateButton, { borderColor: 'rgba(34, 197, 94, 0.4)', backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}
              >
                <Text style={[styles.rateText, { color: '#22C55E' }]}>Easy</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setFlipped(true)}
              style={styles.flipButton}
            >
              <Text style={styles.flipButtonText}>Show Answer</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FFFFFF" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Flashcards</Text>
            <Text style={styles.subtitle}>Active recall & spaced repetition</Text>
          </View>
        </View>

        {/* Error State */}
        {errorMsg && (
          <View style={styles.errorBox}>
            <AlertCircle size={16} color="#E74C3C" />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <View style={styles.skeletonContainer}>
            <View style={styles.skeletonCard} />
            <View style={styles.skeletonCard} />
          </View>
        )}

        {/* Empty State */}
        {!loading && decks.length === 0 && (
          <View style={styles.emptyContainer}>
            <Layers size={36} color="#4A4A4A" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No flashcard decks yet</Text>
            <Text style={styles.emptySubtitle}>
              Create decks with active recall cards from the web cockpit to start training with SuperMemo SM-2.
            </Text>
          </View>
        )}

        {/* Decks List */}
        {!loading && decks.length > 0 && (
          <View style={styles.deckGrid}>
            {decks.map((deck) => (
              <Pressable
                key={deck.id}
                onPress={() => {
                  if (deck.cards.length > 0) {
                    setActiveDeck(deck);
                    setCardIndex(0);
                    setFlipped(false);
                  }
                }}
                style={styles.deckCard}
              >
                <View>
                  <View style={styles.deckHeader}>
                    <Text style={styles.deckCode}>{deck.courses?.code || 'STUDY'}</Text>
                    <Layers size={14} color="#71717A" />
                  </View>
                  <Text style={styles.deckTitle}>{deck.title}</Text>
                </View>

                <View style={styles.deckFooter}>
                  <Text style={styles.cardCountText}>
                    {deck.cards.length} cards
                  </Text>
                  <Text style={styles.dueText}>
                    {deck.cards.length > 0 ? 'Ready to Review' : 'No Cards'}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#A0A0A0',
    marginTop: 4,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(231, 76, 60, 0.3)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 13,
    flex: 1,
  },
  skeletonContainer: {
    gap: 12,
  },
  skeletonCard: {
    height: 130,
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  emptyContainer: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 16,
    padding: 36,
    alignItems: 'center',
    marginTop: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: 20,
  },
  deckGrid: {
    gap: 14,
  },
  deckCard: {
    backgroundColor: '#111111',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 18,
    minHeight: 140,
    justifyContent: 'space-between',
  },
  deckHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deckCode: {
    fontSize: 11,
    color: '#A0A0A0',
    fontFamily: 'monospace',
    fontWeight: '700',
  },
  deckTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  deckFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#2A2A2A',
  },
  cardCountText: {
    fontSize: 12,
    color: '#A0A0A0',
    fontFamily: 'monospace',
  },
  dueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    fontFamily: 'monospace',
  },
  studyContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  studyTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  exitText: {
    fontSize: 12,
    color: '#A0A0A0',
    fontWeight: '600',
  },
  cardCounter: {
    fontSize: 12,
    color: '#A0A0A0',
    fontFamily: 'monospace',
  },
  flashcard: {
    flex: 1,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 20,
    padding: 24,
    marginVertical: 24,
    justifyContent: 'space-between',
  },
  flashcardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSideLabel: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#A0A0A0',
    letterSpacing: 1,
  },
  cardCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cardText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 30,
  },
  tapToFlip: {
    textAlign: 'center',
    fontSize: 12,
    color: '#4A4A4A',
  },
  flipButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  flipButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  rateButton: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  rateText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
