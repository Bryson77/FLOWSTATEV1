import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';
import { Home, Calendar, Layers, Users } from 'lucide-react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const ACTIVE = isDark ? '#FFFFFF' : '#09090B';
  const INACTIVE = isDark ? '#71717A' : '#A1A1AA';

  return (
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
          title: 'Schedule',
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
          title: 'Social',
          tabBarIcon: ({ color, size }) => <Users size={size || 20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          href: null, // Floating mini-player paradigm
        }}
      />
    </Tabs>
  );
}
