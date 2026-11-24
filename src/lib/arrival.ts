// 포인트 도착 알림: 저장한 포인트 주변 300m에 들어가면 그 자리의 시즌 족보를 알려준다.
// 백그라운드 위치는 Expo Go에서 동작하지 않으므로 개발 빌드에서 확인한다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { seasonTip } from './jokbo';
import { STORAGE_KEY, type AppData } from './store';
import type { FishingPoint } from './types';

export const GEOFENCE_TASK = 'jokbo-arrival';

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function arrivalMessage(pointId: string) {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  const d = JSON.parse(raw) as AppData;
  const p = d.points.find((x) => x.id === pointId);
  if (!p) return null;
  const tip = seasonTip(pointId, d.catches);
  const month = new Date().getMonth() + 1;
  return {
    title: `${p.name}에 도착했어요`,
    body: tip ? `${month}월엔 ${tip.species} 확률이 높아요 · ${tip.rig ?? ''}, ${tip.tide ?? ''} 전후 ${tip.hour ?? ''}` : '여기서 첫 기록을 남겨 보세요',
  };
}

if (!TaskManager.isTaskDefined(GEOFENCE_TASK)) {
  TaskManager.defineTask(GEOFENCE_TASK, async ({ data, error }) => {
    if (error) return;
    const { eventType, region } = data as { eventType: Location.GeofencingEventType; region: Location.LocationRegion };
    if (eventType !== Location.GeofencingEventType.Enter || !region.identifier) return;
    const msg = await arrivalMessage(region.identifier);
    if (msg) await Notifications.scheduleNotificationAsync({ content: msg, trigger: null });
  });
}

function regions(points: FishingPoint[]) {
  // 안드로이드·iOS 모두 한 앱당 지오펜스는 최대 20곳. 최근 저장한 포인트를 우선한다
  return [...points]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20)
    .map((p) => ({ identifier: p.id, latitude: p.lat, longitude: p.lng, radius: 300, notifyOnEnter: true, notifyOnExit: false }));
}

/** 알림이 켜져 있으면 지금 포인트 목록으로 다시 등록한다(권한을 새로 묻지 않음). 새 포인트 추가·삭제 뒤 호출 */
export async function syncArrivalAlerts(points: FishingPoint[]) {
  const bg = await Location.getBackgroundPermissionsAsync();
  if (!bg.granted) return false;
  const rs = regions(points);
  if (!rs.length) {
    await disableArrivalAlerts();
    return true;
  }
  await Location.startGeofencingAsync(GEOFENCE_TASK, rs);
  return true;
}

/** 켜기: 알림·위치(항상) 권한을 받고 포인트 최대 20곳을 등록한다 */
export async function enableArrivalAlerts(points: FishingPoint[]): Promise<string | null> {
  const n = await Notifications.requestPermissionsAsync();
  if (!n.granted) return '알림 권한이 필요해요.';
  const fg = await Location.requestForegroundPermissionsAsync();
  if (!fg.granted) return '위치 권한이 필요해요.';
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (!bg.granted) return '도착 알림은 위치 권한을 "항상 허용"으로 바꿔야 켜져요.';
  const rs = regions(points);
  if (rs.length) await Location.startGeofencingAsync(GEOFENCE_TASK, rs);
  return null;
}

export async function disableArrivalAlerts() {
  if (await Location.hasStartedGeofencingAsync(GEOFENCE_TASK)) await Location.stopGeofencingAsync(GEOFENCE_TASK);
}
