import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { getSafeErrorMessage } from '../../lib/errors';
import { calculateNextReview, type ReviewRating } from '@saktus/study-engine';

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
  const { user } = useAuth();
  const [decks, setDecks] = useState<DeckItem[]>([]);
  const [courses, setCourses] = useState<{ id: string; name: string; code: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Active study mode
  const [activeDeck, setActiveDeck] = useState<DeckItem | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // New Deck Modal
  const [isNewDeckModalOpen, setIsNewDeckModalOpen] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckCourseId, setNewDeckCourseId] = useState('');
  const [creatingDeck, setCreatingDeck] = useState(false);
  const [deckError, setDeckError] = useState('');

  // Add Card Modal
  const [isAddCardModalOpen, setIsAddCardModalOpen] = useState(false);
  const [targetDeckId, setTargetDeckId] = useState<string>('');
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState('');
  const [addingCard, setAddingCard] = useState(false);
  const [cardError, setCardError] = useState('');

  const fetchDecks = useCallback(async () => {
    setErrorMsg(null);
    try {
      if (!user) {
        setDecks([]);
        setLoading(false);
        return;
      }

      const [decksRes, coursesRes] = await Promise.all([
        supabase
          .from('flashcard_decks')
          .select('*, courses(name, code), flashcards(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase.from('courses').select('id, name, code').eq('user_id', user.id).order('name'),
      ]);

      if (decksRes.error) throw decksRes.error;

      const mapped: DeckItem[] = (decksRes.data || []).map((d: any) => ({
        id: d.id,
        title: d.title,
        course_id: d.course_id,
        courses: d.courses,
        cards: d.flashcards || [],
      }));

      setDecks(mapped);
      setCourses(coursesRes.data || []);
      if (coursesRes.data && coursesRes.data.length > 0 && !newDeckCourseId) {
        setNewDeckCourseId(coursesRes.data[0].id);
      }
    } catch (err: any) {
      console.error('Decks fetch error:', err);
      setErrorMsg(getSafeErrorMessage(err, 'Failed to load decks. Something went wrong.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, newDeckCourseId]);

  useEffect(() => {
    fetchDecks();
  }, [fetchDecks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDecks();
  };

  // Create New Deck
  const handleCreateDeck = async () => {
    if (!user) return;
    if (!newDeckTitle.trim()) {
      setDeckError('Fill this in: Deck title is required.');
      return;
    }

    setCreatingDeck(true);
    setDeckError('');

    try {
      const { data, error } = await supabase
        .from('flashcard_decks')
        .insert({
          user_id: user.id,
          title: newDeckTitle.trim(),
          ...(newDeckCourseId ? { course_id: newDeckCourseId } : {}),
        } as any)
        .select()
        .single();

      if (error) throw error;

      setIsNewDeckModalOpen(false);
      setNewDeckTitle('');
      await fetchDecks();

      // Open Add Card modal for the newly created deck
      if (data?.id) {
        setTargetDeckId(data.id);
        setIsAddCardModalOpen(true);
      }
    } catch (e: any) {
      console.error('Create deck error:', e);
      setDeckError(getSafeErrorMessage(e, 'Failed to create deck. Something went wrong.'));
    } finally {
      setCreatingDeck(false);
    }
  };

  // Add Card to Deck
  const handleAddCard = async (addAnother = false) => {
    if (!user || !targetDeckId) return;
    if (!frontText.trim()) {
      setCardError('Fill this in: Front prompt is required.');
      return;
    }
    if (!backText.trim()) {
      setCardError('Fill this in: Back answer is required.');
      return;
    }

    setAddingCard(true);
    setCardError('');

    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const { error } = await supabase.from('flashcards').insert({
        user_id: user.id,
        deck_id: targetDeckId,
        front_text: frontText.trim(),
        back_text: backText.trim(),
        interval_days: 0,
        ease_factor: 2.5,
        repetition_number: 0,
        due_date: todayStr,
      });

      if (error) throw error;

      setFrontText('');
      setBackText('');

      if (!addAnother) {
        setIsAddCardModalOpen(false);
      }
      await fetchDecks();
    } catch (e: any) {
      console.error('Add card error:', e);
      setCardError(getSafeErrorMessage(e, 'Failed to add card. Something went wrong.'));
    } finally {
      setAddingCard(false);
    }
  };

  // Delete Deck
  const handleDeleteDeck = (deckId: string) => {
    Alert.alert('Delete Deck', 'Are you sure you want to delete this deck and all its cards?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setDecks((prev) => prev.filter((d) => d.id !== deckId));
          try {
            await supabase.from('flashcard_decks').delete().eq('id', deckId);
          } catch {
            fetchDecks();
          }
        },
      },
    ]);
  };

  // SM-2 Review
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
        })
        .eq('id', currentCard.id);

      setFlipped(false);
      if (cardIndex + 1 < activeDeck.cards.length) {
        setCardIndex((prev) => prev + 1);
      } else {
        Alert.alert('Review Complete', 'You reviewed all cards in this deck.');
        setActiveDeck(null);
        setCardIndex(0);
        fetchDecks();
      }
    } catch (err: any) {
      console.error('Error rating card:', err);
    }
  };

  // If in active study mode
  if (activeDeck) {
    const currentCard = activeDeck.cards[cardIndex];
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.reviewHeader}>
          <Pressable
            onPress={() => {
              setActiveDeck(null);
              setCardIndex(0);
              setFlipped(false);
            }}
            hitSlop={8}
            style={styles.backBtn}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text style={styles.reviewTitle} numberOfLines={1}>
            {activeDeck.title}
          </Text>
          <Text style={styles.reviewProgress}>
            {cardIndex + 1}/{activeDeck.cards.length}
          </Text>
        </View>

        <View style={styles.reviewContent}>
          <Pressable style={styles.cardFace} onPress={() => setFlipped(!flipped)}>
            <Text style={styles.cardLabel}>{flipped ? 'ANSWER' : 'QUESTION'}</Text>
            <ScrollView
              style={styles.cardTextScroll}
              contentContainerStyle={styles.cardTextContainer}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <Text style={styles.cardText}>
                {flipped ? currentCard?.back_text : currentCard?.front_text}
              </Text>
            </ScrollView>
            <View style={styles.flipHintRow}>
              <RotateCw size={14} color="#71717A" />
              <Text style={styles.flipHint}>Tap card to flip</Text>
            </View>
          </Pressable>

          {flipped ? (
            <View style={styles.ratingRow}>
              <Pressable
                style={[styles.rateBtn, { backgroundColor: '#EF4444' }]}
                onPress={() => handleRateCard('again')}
              >
                <Text style={styles.rateBtnText}>Again</Text>
              </Pressable>
              <Pressable
                style={[styles.rateBtn, { backgroundColor: '#F59E0B' }]}
                onPress={() => handleRateCard('hard')}
              >
                <Text style={styles.rateBtnText}>Hard</Text>
              </Pressable>
              <Pressable
                style={[styles.rateBtn, { backgroundColor: '#3B82F6' }]}
                onPress={() => handleRateCard('good')}
              >
                <Text style={styles.rateBtnText}>Good</Text>
              </Pressable>
              <Pressable
                style={[styles.rateBtn, { backgroundColor: '#10B981' }]}
                onPress={() => handleRateCard('easy')}
              >
                <Text style={styles.rateBtnText}>Easy</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.showAnswerBtn} onPress={() => setFlipped(true)}>
              <Text style={styles.showAnswerText}>Show Answer</Text>
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
            <Text style={styles.subtitle}>Active recall with spaced repetition</Text>
          </View>
          <Pressable
            style={({ pressed }: { pressed: boolean }) => [styles.addDeckBtn, pressed && styles.pressed]}
            onPress={() => {
              setDeckError('');
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

        {/* Decks List */}
        <View style={styles.deckList}>
          {decks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Layers size={28} color="#52525B" />
              <Text style={styles.emptyTitle}>No flashcard decks yet</Text>
              <Text style={styles.emptySub}>
                Create your first deck to start practicing active recall.
              </Text>
            </View>
          ) : (
            decks.map((deck: DeckItem) => {
              const todayStr = new Date().toISOString().split('T')[0];
              const dueCount = deck.cards.filter(
                (c: CardItem) => !c.due_date || c.due_date <= todayStr
              ).length;

              return (
                <View key={deck.id} style={styles.deckCard}>
                  <View style={styles.deckHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deckTitle}>{deck.title}</Text>
                      <Text style={styles.deckMeta}>
                        {deck.courses?.code ? `${deck.courses.code} · ` : ''}
                        {deck.cards.length} cards · {dueCount} due
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => handleDeleteDeck(deck.id)}
                      hitSlop={8}
                      style={styles.trashBtn}
                    >
                      <Trash2 size={15} color="#52525B" />
                    </Pressable>
                  </View>

                  <View style={styles.deckActionsRow}>
                    <Pressable
                      style={({ pressed }: { pressed: boolean }) => [
                        styles.addCardBtn,
                        pressed && styles.pressed,
                      ]}
                      onPress={() => {
                        setTargetDeckId(deck.id);
                        setCardError('');
                        setIsAddCardModalOpen(true);
                      }}
                    >
                      <Plus size={14} color="#FFFFFF" />
                      <Text style={styles.addCardText}>Add Card</Text>
                    </Pressable>

                    {deck.cards.length > 0 ? (
                      <Pressable
                        style={({ pressed }: { pressed: boolean }) => [
                          styles.reviewBtn,
                          pressed && styles.pressed,
                        ]}
                        onPress={() => {
                          setActiveDeck(deck);
                          setCardIndex(0);
                          setFlipped(false);
                        }}
                      >
                        <Text style={styles.reviewBtnText}>Review Deck</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* New Deck Modal */}
      <Modal visible={isNewDeckModalOpen} animationType="slide" transparent onRequestClose={() => setIsNewDeckModalOpen(false)}>
        <SafeAreaView style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Flashcard Deck</Text>
                <Pressable onPress={() => setIsNewDeckModalOpen(false)} hitSlop={8}>
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
                    placeholder="e.g. Organic Chemistry Reactions"
                    placeholderTextColor="#52525B"
                    value={newDeckTitle}
                    onChangeText={setNewDeckTitle}
                  />
                </View>

                {courses.length > 0 && (
                  <View style={styles.modalField}>
                    <Text style={styles.modalLabel}>LINK TO COURSE (OPTIONAL)</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {courses.map((c: any) => (
                        <Pressable
                          key={c.id}
                          style={[
                            styles.courseChip,
                            newDeckCourseId === c.id && styles.courseChipActive,
                          ]}
                          onPress={() => setNewDeckCourseId(newDeckCourseId === c.id ? '' : c.id)}
                        >
                          <Text
                            style={[
                              styles.courseChipText,
                              newDeckCourseId === c.id && styles.courseChipTextActive,
                            ]}
                          >
                            {c.code || c.name}
                          </Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>
                )}

                <Pressable
                  style={({ pressed }: { pressed: boolean }) => [styles.saveBtn, pressed && styles.pressed]}
                  onPress={handleCreateDeck}
                  disabled={creatingDeck}
                >
                  {creatingDeck ? (
                    <ActivityIndicator size="small" color="#000000" />
                  ) : (
                    <View style={styles.saveBtnRow}>
                      <Check size={16} color="#000000" />
                      <Text style={styles.saveBtnText}>Create Deck & Add Cards</Text>
                    </View>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Add Card Modal */}
      <Modal visible={isAddCardModalOpen} animationType="slide" transparent onRequestClose={() => setIsAddCardModalOpen(false)}>
        <SafeAreaView style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Flashcard</Text>
                <Pressable onPress={() => setIsAddCardModalOpen(false)} hitSlop={8}>
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
                  <Text style={styles.modalLabel}>FRONT (QUESTION / PROMPT)</Text>
                  <TextInput
                    style={[styles.modalInput, styles.multilineInput]}
                    placeholder="e.g. What is the Henderson-Hasselbalch equation?"
                    placeholderTextColor="#52525B"
                    value={frontText}
                    onChangeText={setFrontText}
                    multiline
                  />
                </View>

                <View style={styles.modalField}>
                  <Text style={styles.modalLabel}>BACK (ANSWER / EXPLANATION)</Text>
                  <TextInput
                    style={[styles.modalInput, styles.multilineInput]}
                    placeholder="e.g. pH = pKa + log([A-]/[HA])"
                    placeholderTextColor="#52525B"
                    value={backText}
                    onChangeText={setBackText}
                    multiline
                  />
                </View>

                <View style={styles.cardActionsRow}>
                  <Pressable
                    style={({ pressed }: { pressed: boolean }) => [styles.saveAnotherBtn, pressed && styles.pressed]}
                    onPress={() => handleAddCard(true)}
                    disabled={addingCard}
                  >
                    <PlusCircle size={15} color="#FFFFFF" />
                    <Text style={styles.saveAnotherText}>Save & Add Another</Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }: { pressed: boolean }) => [styles.saveBtn, { flex: 1, minWidth: 120 }, pressed && styles.pressed]}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 100 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  title: { fontSize: 20, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.4 },
  subtitle: { fontSize: 12, color: '#71717A', marginTop: 2 },
  addDeckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addDeckBtnText: { color: '#000000', fontSize: 12, fontWeight: '700' },
  pressed: { transform: [{ scale: 0.97 }] },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: { color: '#EF4444', fontSize: 12 },
  deckList: { gap: 12 },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 36,
    gap: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    backgroundColor: 'rgba(9,9,11,0.5)',
  },
  emptyTitle: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
  emptySub: { color: '#52525B', fontSize: 11, textAlign: 'center', maxWidth: 240 },
  deckCard: {
    backgroundColor: '#09090B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: 16,
    gap: 12,
  },
  deckHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  deckTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  deckMeta: { color: '#71717A', fontSize: 11, marginTop: 3 },
  trashBtn: { padding: 4 },
  deckActionsRow: { flexDirection: 'row', gap: 8 },
  addCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addCardText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  reviewBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderRadius: 10,
  },
  reviewBtnText: { color: '#000000', fontSize: 12, fontWeight: '700' },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: { padding: 4 },
  reviewTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', flex: 1, marginHorizontal: 12 },
  reviewProgress: { color: '#71717A', fontSize: 12, fontWeight: '600' },
  reviewContent: { flex: 1, paddingHorizontal: 20, paddingBottom: 30, justifyContent: 'center' },
  cardFace: {
    backgroundColor: '#09090B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 24,
    minHeight: 260,
    maxHeight: 400,
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  cardLabel: { color: '#71717A', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  cardTextScroll: {
    flexGrow: 0,
    maxHeight: 240,
    marginVertical: 14,
  },
  cardTextContainer: {
    justifyContent: 'center',
    minHeight: 80,
  },
  cardText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    textAlign: 'center',
  },
  flipHintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  flipHint: { color: '#71717A', fontSize: 11 },
  ratingRow: { flexDirection: 'row', gap: 8 },
  rateBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  rateBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  showAnswerBtn: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 14,
  },
  showAnswerText: { color: '#000000', fontSize: 14, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  keyboardAvoid: { width: '100%', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#09090B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    maxHeight: '90%',
  },
  modalScrollContent: {
    gap: 14,
    paddingBottom: 20,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  modalErrorBox: { backgroundColor: 'rgba(239,68,68,0.1)', borderRadius: 8, padding: 8 },
  modalErrorText: { color: '#EF4444', fontSize: 11 },
  modalField: { gap: 6 },
  modalLabel: { color: '#71717A', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  modalInput: {
    backgroundColor: '#000000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    height: 44,
    color: '#FFFFFF',
    fontSize: 13,
  },
  multilineInput: { height: 74, textAlignVertical: 'top', paddingTop: 10 },
  courseChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginRight: 6,
  },
  courseChipActive: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
  courseChipText: { color: '#71717A', fontSize: 11, fontWeight: '600' },
  courseChipTextActive: { color: '#000000', fontWeight: '700' },
  cardActionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  saveAnotherBtn: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveAnotherText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    minWidth: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  saveBtnText: { color: '#000000', fontSize: 13, fontWeight: '700' },
});
