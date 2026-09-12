import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Pause, RotateCcw } from 'lucide-react-native';

export default function TimerScreen() {
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (timeLeft === 0) {
      setIsRunning(false);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isRunning, timeLeft]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Course Header */}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>CSC2001F · Computer Science</Text>
        </View>

        {/* Clock Face */}
        <View style={styles.clockContainer}>
          <Text style={styles.timerText}>{timeStr}</Text>
          <Text style={styles.quoteText}>"stay locked in."</Text>
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <Pressable
            onPress={() => setIsRunning(!isRunning)}
            style={styles.playButton}
          >
            {isRunning ? (
              <Pause size={24} color="#000000" fill="#000000" />
            ) : (
              <Play size={24} color="#000000" fill="#000000" style={{ marginLeft: 2 }} />
            )}
          </Pressable>
          <Pressable
            onPress={() => {
              setIsRunning(false);
              setTimeLeft(45 * 60);
            }}
            style={styles.resetButton}
          >
            <RotateCcw size={20} color="#71717A" />
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 36,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  badgeText: {
    color: '#A0A0A0',
    fontSize: 12,
    fontWeight: '600',
  },
  clockContainer: {
    alignItems: 'center',
  },
  timerText: {
    color: '#FFFFFF',
    fontSize: 76,
    fontWeight: '700',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  quoteText: {
    color: '#71717A',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 12,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  playButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
