import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { syncArrivalAlerts } from '@/lib/arrival';
import { StoreProvider, useStore } from '@/lib/store';
import { C } from '@/lib/theme';

/** 도착 알림이 켜져 있으면 포인트가 바뀔 때마다 알림 지점을 다시 등록한다 */
function ArrivalSync() {
  const { ready, arrivalOn, points } = useStore();
  const key = points.map((p) => `${p.id}@${p.lat},${p.lng}`).join('|');
  useEffect(() => {
    if (ready && arrivalOn) syncArrivalAlerts(points).catch(() => {});
  }, [ready, arrivalOn, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function RootLayout() {
  return (
    <StoreProvider>
      <ArrivalSync />
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: C.sea }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '800' }, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="record" options={{ presentation: 'modal', title: '조과 기록' }} />
        <Stack.Screen name="point/[id]" options={{ title: '포인트' }} />
      </Stack>
    </StoreProvider>
  );
}
