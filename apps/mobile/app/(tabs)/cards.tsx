import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layers, ArrowLeft } from 'lucide-react-native';

const DECKS = [
  {
    id: '1',
    title: 'Chapter 4: Binary Trees & Heaps',
    code: 'CSC2001F',
    cardCount: 12,
    dueToday: 8,
    cards: [
      {
        q: 'What is the maximum number of nodes at level L in a binary tree?',
        a: '2^L (assuming the root is at level 0).',
      },
      {
        q: 'What are the properties of a Min-Heap?',
        a: 'A complete binary tree where each node value is less than or equal to its children.',
      },
    ],
  },
  {
    id: '2',
    title: 'Eigenvalues & Diagonalization',
    code: 'MTH2000S',
    cardCount: 15,
    dueToday: 10,
    cards: [
      {
        q: 'How do you find the eigenvalues of a square matrix A?',
        a: 'Solve the characteristic equation: det(A - λI) = 0.',
      },
    ],
  },
];

export default function CardsScreen() {
  const [activeDeck, setActiveDeck] = useState<any | null>(null);
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  if (activeDeck) {
    const card = activeDeck.cards[cardIndex];

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.studyContent}>
          {/* Top Bar */}
          <View style={styles.studyTopBar}>
            <Pressable
              onPress={() => setActiveDeck(null)}
              style={styles.exitButton}
            >
              <ArrowLeft size={16} color="#A0A0A0" />
              <Text style={styles.exitText}>Exit Deck</Text>
            </Pressable>
            <Text style={styles.cardCounter}>
              Card {cardIndex + 1} of {activeDeck.cards.length}
            </Text>
          </View>

          {/* Flashcard Box */}
          <Pressable
            onPress={() => setFlipped(!flipped)}
            style={styles.flashcardBox}
          >
            <Text style={styles.cardSideLabel}>
              {flipped ? 'ANSWER' : 'QUESTION'}
            </Text>
            <Text style={styles.cardMainText}>
              {flipped ? card.a : card.q}
            </Text>
            <Text style={styles.tapHint}>Tap anywhere to flip</Text>
          </Pressable>

          {/* SM-2 Rating Controls */}
          <View style={styles.ratingsRow}>
            <Pressable
              onPress={() => {
                setFlipped(false);
                if (cardIndex + 1 < activeDeck.cards.length) setCardIndex(cardIndex + 1);
                else setActiveDeck(null);
              }}
              style={styles.ratingBtn}
            >
              <Text style={styles.ratingBtnText}>Again</Text>
              <Text style={styles.ratingSub}>1d</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setFlipped(false);
                if (cardIndex + 1 < activeDeck.cards.length) setCardIndex(cardIndex + 1);
                else setActiveDeck(null);
              }}
              style={styles.ratingBtn}
            >
              <Text style={styles.ratingBtnText}>Hard</Text>
              <Text style={styles.ratingSub}>2d</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setFlipped(false);
                if (cardIndex + 1 < activeDeck.cards.length) setCardIndex(cardIndex + 1);
                else setActiveDeck(null);
              }}
              style={styles.ratingBtn}
            >
              <Text style={styles.ratingBtnText}>Good</Text>
              <Text style={styles.ratingSub}>4d</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setFlipped(false);
                if (cardIndex + 1 < activeDeck.cards.length) setCardIndex(cardIndex + 1);
                else setActiveDeck(null);
              }}
              style={styles.ratingBtn}
            >
              <Text style={styles.ratingBtnText}>Easy</Text>
              <Text style={styles.ratingSub}>7d</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Flashcards</Text>
          <Text style={styles.subtitle}>Spaced repetition recall decks</Text>
        </View>

        {/* Decks Grid */}
        <View style={styles.decksList}>
          {DECKS.map((deck) => (
            <View key={deck.id} style={styles.deckCard}>
              <View style={styles.deckTop}>
                <Text style={styles.deckCode}>{deck.code}</Text>
                <Text style={styles.deckCount}>{deck.cardCount} cards</Text>
              </View>
              <Text style={styles.deckTitle}>{deck.title}</Text>
              <View style={styles.deckBottom}>
                <Text style={styles.dueText}>{deck.dueToday} due today</Text>
                <Pressable
                  onPress={() => {
                    setActiveDeck(deck);
                    setCardIndex(0);
                    setFlipped(false);
                  }}
                  style={styles.studyBtn}
                >
                  <Text style={styles.studyBtnText}>Study Deck</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 20,
  },
  header: {
    gap: 2,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#71717A',
    fontSize: 13,
  },
  decksList: {
    gap: 14,
  },
  deckCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    gap: 12,
  },
  deckTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deckCode: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  deckCount: {
    color: '#A0A0A0',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  deckTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  deckBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  dueText: {
    color: '#D4D4D8',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  studyBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  studyBtnText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
  studyContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
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
  },
  exitText: {
    color: '#A0A0A0',
    fontSize: 13,
  },
  cardCounter: {
    color: '#71717A',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  flashcardBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 300,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardSideLabel: {
    position: 'absolute',
    top: 18,
    left: 18,
    color: '#52525B',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardMainText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 28,
  },
  tapHint: {
    position: 'absolute',
    bottom: 18,
    color: '#52525B',
    fontSize: 11,
  },
  ratingsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ratingBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  ratingBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  ratingSub: {
    color: '#71717A',
    fontSize: 10,
  },
});
