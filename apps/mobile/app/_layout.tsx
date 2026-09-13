import React, { useEffect } from 'react';
import { View, Text, useColorScheme } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../lib/auth-context';

function NavigationGuard({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

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
      <View style={{ flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' }}>
        {/* Saktus Tactile S Brand Emblem */}
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 15,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 26, fontWeight: '800', color: '#000000', letterSpacing: -1 }}>
            S
          </Text>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <AuthProvider>
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
    </AuthProvider>
  );
}
