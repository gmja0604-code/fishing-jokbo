import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Card, H3, Pill, s as ui, Stat, Sub } from '@/components/ui';
import { distanceM } from '@/lib/geo';
import { fetchMarine, type MarineNow } from '@/lib/marine';
import { REGULATIONS, SPECIES_LIST, speciesColor } from '@/lib/species';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

export default function RecordScreen() {
  const store = useStore();
  const params = useLocalSearchParams<{ pointId?: string }>();
  const [photo, setPhoto] = useState<string>();
  const [pointId, setPointId] = useState(params.pointId ?? store.activeTrip?.pointId ?? store.points[0]?.id);
  const [species, setSpecies] = useState('감성돔');
  const [count, setCount] = useState('1');
  const [size, setSize] = useState('');
  const [rig, setRig] = useState('');
  const [bait, setBait] = useState('');
  const [memo, setMemo] = useState('');
  const [env, setEnv] = useState<MarineNow | null>(null);
  const p = store.points.find((x) => x.id === pointId);

  // 가장 가까운 포인트를 자동으로 고른다
  useEffect(() => {
    if (params.pointId || store.activeTrip) return;
    (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) return;
      const l = await Location.getLastKnownPositionAsync();
      if (!l) return;
      const me = { lat: l.coords.latitude, lng: l.coords.longitude };
      const near = store.points.map((x) => ({ x, d: distanceM(me, x) })).sort((a, b) => a.d - b.d)[0];
      if (near && near.d < 1000) setPointId(near.x.id);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (p) fetchMarine(p.lat, p.lng).then(setEnv);
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('사진', camera ? '카메라 권한이 필요해요.' : '사진 접근 권한이 필요해요.');
    const r = camera ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!r.canceled) setPhoto(r.assets[0].uri);
  };

  const reg = REGULATIONS.find((x) => x.species === species);
  const tooSmall = reg?.minCm && +size > 0 && +size < reg.minCm;

  const save = () => {
    if (!p) return Alert.alert('포인트', '먼저 지도에서 포인트를 저장해 주세요.');
    store.addCatch({
      pointId: p.id,
      at: new Date().toISOString(),
      species,
      count: Math.max(1, +count || 1),
      sizeCm: +size || 0,
      rig: rig.trim() || '-',
      bait: bait.trim() || '-',
      memo: memo.trim() || undefined,
      photoUri: photo,
      sessionId: store.activeTrip?.id,
      cond: { tide: env?.tide ?? '-', waterTemp: env?.waterTemp, airTemp: env?.airTemp, wind: env?.wind, wave: env?.wave, moon: env?.moon },
    });
    router.back();
  };

  const n = (v?: number, u = '') => (v == null ? '-' : v.toFixed(1) + u);
  return (
    <ScrollView contentContainerStyle={ui.screen} keyboardShouldPersistTaps="handled">
      <Sub>사진부터 찍으세요. 위치·시간·날씨·물때는 자동으로 붙어요.</Sub>
      <Pressable onPress={() => pick(true)} style={{ aspectRatio: 4 / 3, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: C.line, backgroundColor: C.card, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="조과 사진 찍기">
        {photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} /> : (
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Ionicons name="camera-outline" size={36} color={C.muted} />
            <Text style={[ui.body, { fontWeight: '700' }]}>사진 찍기</Text>
          </View>
        )}
      </Pressable>
      <Button label="앨범에서 고르기" onPress={() => pick(false)} />

      <Card>
        <H3 right={<Sub>{env ? '실시간' : '불러오는 중'}</Sub>}>자동으로 붙는 정보</H3>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <Stat value={env?.tide ?? '-'} label="물때" />
          <Stat value={n(env?.waterTemp, '°')} label="수온" />
          <Stat value={n(env?.wind)} label="풍속 m/s" />
          <Stat value={n(env?.wave)} label="파고 m" />
        </View>
      </Card>

      <View>
        <Text style={ui.label}>포인트</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {store.points.map((x) => <Pill key={x.id} label={x.name} active={x.id === pointId} onPress={() => setPointId(x.id)} />)}
        </ScrollView>
      </View>

      <View>
        <Text style={ui.label}>어종 <Text style={{ fontWeight: '400' }}>· 사진 어종 자동 판별은 다음 단계예요</Text></Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {SPECIES_LIST.map((x) => <Pill key={x} label={x} color={speciesColor(x)} active={x === species} onPress={() => setSpecies(x)} />)}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={ui.label}>마릿수</Text>
          <TextInput keyboardType="number-pad" value={count} onChangeText={setCount} style={ui.input} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ui.label}>최대 크기(cm)</Text>
          <TextInput keyboardType="numeric" value={size} onChangeText={setSize} style={ui.input} placeholder="35" />
        </View>
      </View>
      {tooSmall ? <Text style={{ color: C.crit, fontSize: 13 }}>{species}은 {reg!.minCm}cm 미만은 포획 금지예요. 방생해 주세요.</Text> : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={ui.label}>채비</Text>
          <TextInput value={rig} onChangeText={setRig} style={ui.input} placeholder="반유동 찌채비" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ui.label}>미끼</Text>
          <TextInput value={bait} onChangeText={setBait} style={ui.input} placeholder="크릴" />
        </View>
      </View>
      <View>
        <Text style={ui.label}>메모</Text>
        <TextInput value={memo} onChangeText={setMemo} style={[ui.input, { minHeight: 70 }]} multiline placeholder="입질 패턴, 수심, 밑걸림 위치 등" />
      </View>
      <Button label="기록 저장" primary onPress={save} />
    </ScrollView>
  );
}
