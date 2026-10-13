import React, { useEffect } from 'react';
import { View, Text, useColorScheme, Image } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth-context';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    if (isLoading) return;

    const inAuth = segments[0] === 'login';

    if (!session && !inAuth) {
      router.replace('/login');
    } else if (session && inAuth) {
      router.replace('/(tabs)');
    }
  }, [session, isLoading, segments, router]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? '#000000' : '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
        <Image
          source={require('../assets/icon.png')}
          style={{ width: 64, height: 64, borderRadius: 16 }}
          resizeMode="contain"
        />
      </View>
    );
  }

  return <>{children}</>;
}

import { TimerProvider } from '../lib/timer-context';
import { RebrandingModal } from '../components/RebrandingModal';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <AuthProvider>
      <TimerProvider>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <NavigationGuard>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: isDark ? '#000000' : '#FFFFFF' },
              animation: 'fade',
            }}
          >
            <Stack.Screen name="login" />
            <Stack.Screen name="(tabs)" />
          </Stack>
        </NavigationGuard>
        <RebrandingModal />
      </TimerProvider>
    </AuthProvider>
  );
}

