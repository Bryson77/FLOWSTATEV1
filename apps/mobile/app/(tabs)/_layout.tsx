import React from 'react';
import { Tabs, useSegments, router } from 'expo-router';
import { View, Pressable, Text, useColorScheme } from 'react-native';
import { Home, Calendar, Layers, Users, User, Play, Pause, Clock, ChevronRight } from 'lucide-react-native';
import { useMobileTimer } from '../../lib/timer-context';
import { useThemeColors } from '../../lib/theme';

function FloatingTimerBar() {
  const segments = useSegments();
  const theme = useThemeColors();
  const { isRunning, timeLeft, selectedDuration, selectedItem, timeStr, toggleTimer } = useMobileTimer();

  const isTimerTab = segments[segments.length - 1] === 'timer';
  const isTimerActive = isRunning || (timeLeft > 0 && timeLeft < selectedDuration);

  if (!isTimerActive || isTimerTab) {
    return null;
  }

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 94,
        left: 16,
        right: 16,
        backgroundColor: theme.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: theme.border,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 6,
      }}
    >
      <Pressable
        onPress={() => router.push('/(tabs)/timer' as any)}
        style={({ pressed }) => [
          { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
          pressed && { transform: [{ scale: 0.98 }] },
        ]}
      >
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            backgroundColor: theme.surfaceHover,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Clock size={16} color={isRunning ? '#10B981' : theme.textMuted} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text
              style={{
                color: theme.textPrimary,
                fontSize: 14,
                fontWeight: '700',
                fontVariant: ['tabular-nums'],
              }}
            >
              {timeStr}
            </Text>
            {isRunning && (
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: '#10B981',
                }}
              />
            )}
          </View>
          <Text
            style={{
              color: theme.textMuted,
              fontSize: 11,
              fontWeight: '500',
            }}
            numberOfLines={1}
          >
            {selectedItem?.title || 'General Focus Session'}
          </Text>
        </View>
      </Pressable>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable
          onPress={toggleTimer}
          hitSlop={8}
          style={({ pressed }) => [
            {
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: theme.buttonPrimaryBg,
              alignItems: 'center',
              justifyContent: 'center',
            },
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
        >
          {isRunning ? (
            <Pause size={14} color={theme.buttonPrimaryText} />
          ) : (
            <Play size={14} color={theme.buttonPrimaryText} fill={theme.buttonPrimaryText} />
          )}
        </Pressable>

        <Pressable
          onPress={() => router.push('/(tabs)/timer' as any)}
          hitSlop={8}
          style={({ pressed }) => [
            { padding: 4 },
            pressed && { transform: [{ scale: 0.95 }] },
          ]}
        >
          <ChevronRight size={16} color={theme.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const ACTIVE = isDark ? '#FFFFFF' : '#09090B';
  const INACTIVE = isDark ? '#71717A' : '#A1A1AA';

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: isDark ? '#000000' : '#FFFFFF',
            borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            borderTopWidth: 0.5,
            paddingTop: 8,
            height: 84,
          },
          tabBarActiveTintColor: ACTIVE,
          tabBarInactiveTintColor: INACTIVE,
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '500',
            marginTop: 4,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Home size={size || 20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="schedule"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color, size }) => <Calendar size={size || 20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="cards"
          options={{
            title: 'Cards',
            tabBarIcon: ({ color, size }) => <Layers size={size || 20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="social"
          options={{
            title: 'Friends',
            tabBarIcon: ({ color, size }) => <Users size={size || 20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <User size={size || 20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="timer"
          options={{
            href: null, // Full timer screen accessible via floating pill or direct link
          }}
        />
      </Tabs>
      <FloatingTimerBar />
    </View>
  );
}
