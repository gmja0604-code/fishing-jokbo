import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useStore } from '@/lib/store';
import { computeStats } from '@/lib/game';
import { C } from '@/lib/theme';

function LevelChip() {
  const s = useStore();
  const st = computeStats(s.points, s.trips, s.catches, s.bonusXp);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 14, backgroundColor: '#ffffff22', paddingVertical: 4, paddingLeft: 4, paddingRight: 10, borderRadius: 999 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 11 }}>{st.level}</Text>
      </View>
      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>{st.levelName}</Text>
      <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: '#ffffff40', overflow: 'hidden' }}>
        <View style={{ width: `${st.progress * 100}%`, height: '100%', backgroundColor: C.gold }} />
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: C.sea },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '900' },
        headerRight: () => <LevelChip />,
        tabBarActiveTintColor: C.fg,
        tabBarInactiveTintColor: C.muted,
      }}>
      <Tabs.Screen name="index" options={{ title: '낚시 족보', tabBarLabel: '지도', tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" color={color as string} size={size} /> }} />
      <Tabs.Screen name="sea" options={{ title: '바다 정보', tabBarIcon: ({ color, size }) => <Ionicons name="water-outline" color={color as string} size={size} /> }} />
      <Tabs.Screen
        name="add"
        options={{
          title: '기록',
          tabBarIcon: () => (
            <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginTop: -16 }}>
              <Ionicons name="add" color="#fff" size={28} />
            </View>
          ),
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
            router.push('/record');
          },
        }}
      />
      <Tabs.Screen name="jokbo" options={{ title: '족보', tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" color={color as string} size={size} /> }} />
      <Tabs.Screen name="me" options={{ title: '나', tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color as string} size={size} /> }} />
    </Tabs>
  );
}
