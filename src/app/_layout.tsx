import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StoreProvider } from '@/lib/store';
import { C } from '@/lib/theme';
import '@/lib/arrival';

export default function RootLayout() {
  return (
    <StoreProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: C.sea }, headerTintColor: '#fff', headerTitleStyle: { fontWeight: '800' }, contentStyle: { backgroundColor: C.bg } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="record" options={{ presentation: 'modal', title: '조과 기록' }} />
        <Stack.Screen name="point/[id]" options={{ title: '포인트' }} />
      </Stack>
    </StoreProvider>
  );
}
