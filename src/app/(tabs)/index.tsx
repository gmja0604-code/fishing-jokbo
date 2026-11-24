import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MapView, { Marker, type MapType } from 'react-native-maps';
import Banner from '@/components/Banner';
import Sheet from '@/components/Sheet';
import { Button, CatchRow, H2, Pill, s as ui, Stat, Sub, Tip } from '@/components/ui';
import { distanceM, fmtDist } from '@/lib/geo';
import { pointSummary, seasonTip } from '@/lib/jokbo';
import { SPECIES, speciesColor } from '@/lib/species';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import type { PlaceType } from '@/lib/types';

const MODES: { key: '2d' | 'sat' | '3d'; label: string }[] = [
  { key: '2d', label: '2D' },
  { key: 'sat', label: '위성' },
  { key: '3d', label: '3D' },
];
const TYPES: PlaceType[] = ['방파제', '갯바위', '선상', '해변 원투', '저수지', '강', '기타'];

export default function MapScreen() {
  const store = useStore();
  const map = useRef<MapView>(null);
  const [mode, setMode] = useState<'2d' | 'sat' | '3d'>('2d');
  const [filter, setFilter] = useState('전체');
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [banner, setBanner] = useState<{ title: string; body: string; pointId: string } | null>(null);
  const [newPt, setNewPt] = useState<{ lat: number; lng: number; startAfter?: boolean } | null>(null);
  const [name, setName] = useState('');
  const [type, setType] = useState<PlaceType>('방파제');
  const [summary, setSummary] = useState<{ pointId: string; mins: number; tripStart: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const alerted = useRef(new Set<string>());

  // 지도 화면을 보는 동안 위치를 따라가며, 저장한 포인트 300m 안에 들어오면 도착 알림을 띄운다.
  useFocusEffect(
    useCallback(() => {
      let sub: Location.LocationSubscription | undefined;
      (async () => {
        const p = await Location.requestForegroundPermissionsAsync();
        if (!p.granted) return;
        sub = await Location.watchPositionAsync({ accuracy: Location.Accuracy.Balanced, distanceInterval: 50 }, (l) => setMe({ lat: l.coords.latitude, lng: l.coords.longitude }));
      })();
      return () => sub?.remove();
    }, []),
  );
  useEffect(() => {
    if (!me) return;
    for (const p of store.points) {
      if (alerted.current.has(p.id) || distanceM(me, p) > 300) continue;
      alerted.current.add(p.id);
      const tip = seasonTip(p.id, store.catches);
      const month = new Date().getMonth() + 1;
      setBanner({ pointId: p.id, title: `${p.name}에 도착했어요`, body: tip ? `${month}월엔 ${tip.species} 확률이 높아요 · ${tip.rig ?? ''}, ${tip.tide ?? ''} 전후 ${tip.hour ?? ''}` : '여기서 첫 기록을 남겨 보세요' });
      break;
    }
  }, [me, store.points, store.catches]);

  useEffect(() => {
    if (!store.activeTrip) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [store.activeTrip]);

  const setMapMode = (m: '2d' | 'sat' | '3d') => {
    setMode(m);
    map.current?.animateCamera({ pitch: m === '3d' ? 60 : 0, ...(m === '3d' ? { zoom: 15 } : {}) }, { duration: 600 });
  };
  const mapType: MapType = mode === 'sat' ? 'hybrid' : 'standard';

  const visible = useMemo(
    () =>
      store.points
        .map((p) => ({ p, sum: pointSummary(p.id, store.catches) }))
        .filter(({ sum }) => filter === '전체' || sum.species.some(([sp]) => sp === filter)),
    [store.points, store.catches, filter],
  );

  const myPosition = async () => {
    if (me) return me;
    const p = await Location.requestForegroundPermissionsAsync();
    if (!p.granted) return null;
    const l = await Location.getCurrentPositionAsync({});
    const pos = { lat: l.coords.latitude, lng: l.coords.longitude };
    setMe(pos);
    return pos;
  };

  const startTrip = async () => {
    const pos = await myPosition();
    if (!pos) return setBanner({ pointId: '', title: '위치 권한이 필요해요', body: '설정에서 낚시 족보의 위치 접근을 허용해 주세요.' });
    const near = store.points.map((p) => ({ p, d: distanceM(pos, p) })).sort((a, b) => a.d - b.d)[0];
    if (near && near.d < 500) {
      store.startTrip(near.p.id);
      const visits = store.trips.filter((t) => t.pointId === near.p.id).length + 1;
      setBanner({ pointId: near.p.id, title: '출조를 시작했어요', body: `${near.p.name} ${visits}번째 방문 · 잡으면 [기록]을 누르세요.` });
    } else {
      setName('');
      setNewPt({ ...pos, startAfter: true });
    }
  };

  const endTrip = () => {
    const t = store.activeTrip;
    if (!t) return;
    store.endTrip();
    setSummary({ pointId: t.pointId, tripStart: t.startAt, mins: Math.max(1, Math.round((Date.now() - Date.parse(t.startAt)) / 60000)) });
  };

  const savePoint = () => {
    if (!newPt) return;
    const p = store.addPoint({ name: name.trim() || '새 포인트', type, lat: newPt.lat, lng: newPt.lng });
    if (newPt.startAfter) store.startTrip(p.id);
    setNewPt(null);
    setBanner({ pointId: p.id, title: newPt.startAfter ? '포인트 저장, 출조 시작!' : '포인트를 저장했어요', body: `${p.name} · 잡은 걸 기록하면 족보가 쌓여요.` });
  };

  const elapsed = store.activeTrip ? Math.floor((now - Date.parse(store.activeTrip.startAt)) / 1000) : 0;
  const clock = [elapsed / 3600, (elapsed % 3600) / 60, elapsed % 60].map((x) => String(Math.floor(x)).padStart(2, '0')).join(':');
  const tripCatches = store.activeTrip ? store.catches.filter((c) => c.sessionId === store.activeTrip!.id) : [];
  const sumCatches = summary ? store.catches.filter((c) => c.at >= summary.tripStart && c.pointId === summary.pointId && !c.sample) : [];
  const sumVisits = summary ? store.trips.filter((t) => t.pointId === summary.pointId).length : 0;

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        mapType={mapType}
        showsUserLocation
        showsBuildings
        showsCompass
        pitchEnabled
        initialRegion={{ latitude: 35.17, longitude: 129.19, latitudeDelta: 0.16, longitudeDelta: 0.16 }}
        onLongPress={(e) => {
          setName('');
          setNewPt({ lat: e.nativeEvent.coordinate.latitude, lng: e.nativeEvent.coordinate.longitude });
        }}>
        {visible.map(({ p, sum }) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.name}
            description={sum.top ? `${sum.top} 외 · 총 ${sum.total}마리` : p.type}
            pinColor={speciesColor(filter === '전체' ? sum.top ?? '' : filter)}
            onCalloutPress={() => router.push(`/point/${p.id}`)}
          />
        ))}
      </MapView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filter} contentContainerStyle={{ gap: 6, paddingHorizontal: 10 }}>
        {['전체', ...Object.keys(SPECIES).filter((sp) => store.catches.some((c) => c.species === sp))].map((sp) => (
          <Pill key={sp} label={sp} active={filter === sp} color={sp === '전체' ? undefined : speciesColor(sp)} onPress={() => setFilter(sp)} />
        ))}
      </ScrollView>

      <View style={st.modes} accessibilityRole="radiogroup" accessibilityLabel="지도 종류">
        {MODES.map((m) => (
          <Pressable key={m.key} onPress={() => setMapMode(m.key)} style={[st.mode, mode === m.key && { backgroundColor: C.sea }]} accessibilityRole="radio" accessibilityState={{ checked: mode === m.key }}>
            <Text style={[st.modeT, mode === m.key && { color: '#fff' }]}>{m.label}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={st.locate}
        accessibilityLabel="지금 위치를 포인트로 저장"
        onPress={async () => {
          const pos = await myPosition();
          if (!pos) return;
          map.current?.animateCamera({ center: { latitude: pos.lat, longitude: pos.lng }, zoom: 15 }, { duration: 500 });
          setName('');
          setNewPt(pos);
        }}>
        <Ionicons name="locate" size={22} color={C.sea2} />
      </Pressable>

      {store.activeTrip ? (
        <View style={st.trip}>
          <View style={st.recDot} />
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#ffffffcc', fontSize: 11.5 }}>출조 중 · {store.pointName(store.activeTrip.pointId)}</Text>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] }}>
              {clock} <Text style={{ fontSize: 12, fontWeight: '400' }}>· 기록 {tripCatches.length}건</Text>
            </Text>
          </View>
          <Button label="기록" onPress={() => router.push({ pathname: '/record', params: { pointId: store.activeTrip!.pointId } })} style={{ backgroundColor: '#ffffff26', borderColor: 'transparent', paddingVertical: 9 }} />
          <Button label="종료" primary onPress={endTrip} style={{ paddingVertical: 9 }} />
        </View>
      ) : (
        <Pressable style={st.start} onPress={startTrip} accessibilityRole="button">
          <Ionicons name="play" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 15 }}>출조 시작</Text>
        </Pressable>
      )}

      {banner ? <Banner title={banner.title} body={banner.body} onClose={() => setBanner(null)} onPress={() => banner.pointId && router.push(`/point/${banner.pointId}`)} /> : null}

      <Sheet visible={!!newPt} onClose={() => setNewPt(null)}>
        <H2>{newPt?.startAfter ? '여기를 포인트로 저장하고 출조 시작' : '포인트 저장'}</H2>
        <Sub>
          {newPt ? `${newPt.lat.toFixed(5)}, ${newPt.lng.toFixed(5)}` : ''}
          {me && newPt ? ` · 내 위치에서 ${fmtDist(distanceM(me, newPt))}` : ''}
        </Sub>
        <View>
          <Text style={ui.label}>포인트 이름</Text>
          <TextInput value={name} onChangeText={setName} placeholder="예: 송정 방파제 끝 테트라" style={ui.input} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {TYPES.map((t) => (
            <Pill key={t} label={t} active={type === t} onPress={() => setType(t)} />
          ))}
        </View>
        <Button label={newPt?.startAfter ? '저장하고 출조 시작' : '저장'} primary onPress={savePoint} />
      </Sheet>

      <Sheet visible={!!summary} onClose={() => setSummary(null)}>
        <H2>출조 끝! 수고했어요</H2>
        <Sub>
          {summary ? store.pointName(summary.pointId) : ''} · {summary?.mins}분 · {sumVisits}번째 방문
        </Sub>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Stat value={`${sumCatches.reduce((a, c) => a + c.count, 0)}마리`} label="이번 조과" />
          <Stat value="+30 XP" label="출조 완료 보상" color={C.accent} />
        </View>
        {sumCatches.length ? sumCatches.map((c) => <CatchRow key={c.id} c={c} place={store.pointName(c.pointId)} />) : <Tip>이번엔 꽝이었어요. 꽝도 족보예요. 이 조건에선 안 나온다는 기록이 쌓여요.</Tip>}
        <Button label="확인" primary onPress={() => setSummary(null)} />
      </Sheet>
    </View>
  );
}

const st = StyleSheet.create({
  filter: { position: 'absolute', top: 10, left: 0, right: 0, flexGrow: 0 },
  modes: { position: 'absolute', top: 56, left: 10, backgroundColor: C.card, borderRadius: 10, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  mode: { paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center' },
  modeT: { fontSize: 12, fontWeight: '700', color: C.muted },
  locate: { position: 'absolute', right: 12, bottom: 90, width: 46, height: 46, borderRadius: 23, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  start: { position: 'absolute', bottom: 24, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.accent, paddingVertical: 13, paddingHorizontal: 22, borderRadius: 999, elevation: 6, shadowColor: C.accent, shadowOpacity: 0.45, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  trip: { position: 'absolute', left: 10, right: 10, bottom: 18, backgroundColor: C.sea, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  recDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ff5a4f' },
});
