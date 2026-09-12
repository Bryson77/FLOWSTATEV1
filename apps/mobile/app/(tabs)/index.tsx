import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, Play, Layers, Calendar, Flame } from 'lucide-react-native';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Good evening</Text>
            <Text style={styles.subtitle}>Academic cockpit · today's plan</Text>
          </View>
          <View style={styles.streakPill}>
            <Flame size={16} color="#F59E0B" />
            <Text style={styles.streakText}>4 Days</Text>
          </View>
        </View>

        {/* Next Up Card */}
        <View style={styles.nextUpCard}>
          <View style={styles.nextUpBadge}>
            <View style={styles.indicatorDot} />
            <Text style={styles.nextUpBadgeText}>NEXT CLASS UP</Text>
          </View>
          <Text style={styles.nextUpTitle}>CSC2001F · Computer Science</Text>
          <View style={styles.nextUpMeta}>
            <Clock size={13} color="#71717A" />
            <Text style={styles.nextUpTime}>Tomorrow 09:00 · Science LT2</Text>
          </View>
        </View>

        {/* Dashboard Grid */}
        <View style={styles.grid}>
          {/* Card 1: Focus Goal */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>SESSION GOAL</Text>
            <Text style={styles.cardMetric}>2 / 4</Text>
            <Text style={styles.cardSubtext}>sessions logged today</Text>
            <Pressable style={styles.cardButton}>
              <Play size={12} color="#000000" />
              <Text style={styles.cardButtonText}>Start Focus</Text>
            </Pressable>
          </View>

          {/* Card 2: Flashcards */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>FLASHCARDS</Text>
            <Text style={styles.cardMetric}>18</Text>
            <Text style={styles.cardSubtext}>due for review (SM-2)</Text>
            <Pressable style={styles.cardButton}>
              <Layers size={12} color="#000000" />
              <Text style={styles.cardButtonText}>Review Now</Text>
            </Pressable>
          </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginTop: 2,
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  streakText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  nextUpCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 20,
    gap: 8,
  },
  nextUpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  nextUpBadgeText: {
    color: '#71717A',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  nextUpTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '600',
  },
  nextUpMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  nextUpTime: {
    color: '#A0A0A0',
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 16,
    justifyContent: 'space-between',
    minHeight: 150,
  },
  cardHeader: {
    color: '#71717A',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  cardMetric: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 8,
  },
  cardSubtext: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 2,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 14,
  },
  cardButtonText: {
    color: '#000000',
    fontSize: 12,
    fontWeight: '600',
  },
});
