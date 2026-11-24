import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Button, Card, H3, Pill, s as ui, Stat, Sub } from '@/components/ui';
import { distanceM, hm, uid, ymd } from '@/lib/geo';
import { tideName } from '@/lib/lunar';
import { persistPhoto } from '@/lib/photos';
import { fetchMarine, type MarineNow } from '@/lib/marine';
import { allSpecies, REGULATIONS, speciesColor } from '@/lib/species';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

/** 'YYYY-MM-DD' + 'HH:MM'(한국 시간)을 ISO로. 형식이 틀리면 null */
function kstToIso(date: string, time: string): string | null {
  const m = date.trim().match(/^(\d{4})[-.](\d{1,2})[-.](\d{1,2})$/);
  const t = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m || !t || +t[1] > 23 || +t[2] > 59) return null;
  const ms = Date.UTC(+m[1], +m[2] - 1, +m[3], +t[1] - 9, +t[2]);
  return Number.isNaN(ms) ? null : new Date(ms).toISOString();
}

/** 사진 EXIF 촬영 시각 'YYYY:MM:DD HH:MM:SS' (폰 현지 시간=한국 시간으로 본다) */
function exifTime(exif?: Record<string, unknown> | null) {
  const v = (exif?.DateTimeOriginal ?? exif?.DateTime) as string | undefined;
  const m = typeof v === 'string' && v.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2})/);
  return m ? { date: `${m[1]}-${m[2]}-${m[3]}`, time: `${m[4]}:${m[5]}` } : null;
}

export default function RecordScreen() {
  const store = useStore();
  const params = useLocalSearchParams<{ pointId?: string; catchId?: string }>();
  const editing = params.catchId ? store.catches.find((c) => c.id === params.catchId) : undefined;
  const [nowIso] = useState(() => new Date().toISOString());
  const [photo, setPhoto] = useState<string | undefined>(editing?.photoUri);
  const [pointId, setPointId] = useState(editing?.pointId ?? params.pointId ?? store.activeTrip?.pointId ?? store.points[0]?.id);
  const speciesOptions = allSpecies(store.catches);
  const [species, setSpecies] = useState(editing?.species ?? '감성돔');
  const [customOpen, setCustomOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const [count, setCount] = useState(editing ? String(editing.count) : '1');
  const [size, setSize] = useState(editing?.sizeCm ? String(editing.sizeCm) : '');
  const [rig, setRig] = useState(editing && editing.rig !== '-' ? editing.rig : '');
  const [bait, setBait] = useState(editing && editing.bait !== '-' ? editing.bait : '');
  const [memo, setMemo] = useState(editing?.memo ?? '');
  const [date, setDate] = useState(ymd(editing?.at ?? nowIso));
  const [time, setTime] = useState(hm(editing?.at ?? nowIso));
  const [timeTouched, setTimeTouched] = useState(false);
  const [env, setEnv] = useState<MarineNow | null>(null);
  const p = store.points.find((x) => x.id === pointId);

  // 가장 가까운 포인트를 자동으로 고른다
  useEffect(() => {
    if (editing || params.pointId || store.activeTrip) return;
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
    if (p && !editing) fetchMarine(p.lat, p.lng).then(setEnv);
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert('사진', camera ? '카메라 권한이 필요해요.' : '사진 접근 권한이 필요해요.');
    const opt: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, exif: !camera };
    const r = camera ? await ImagePicker.launchCameraAsync(opt) : await ImagePicker.launchImageLibraryAsync(opt);
    if (r.canceled) return;
    setPhoto(r.assets[0].uri);
    // 앨범 사진은 찍은 시각으로 기록 시간을 맞춘다
    const ex = camera ? null : exifTime(r.assets[0].exif);
    if (ex) {
      setDate(ex.date);
      setTime(ex.time);
      setTimeTouched(true);
    }
  };

  const reg = REGULATIONS.find((x) => x.species === (customOpen ? custom.trim() : species));
  const tooSmall = reg?.minCm && +size > 0 && +size < reg.minCm;

  const save = () => {
    if (!p) return Alert.alert('포인트', '먼저 지도에서 포인트를 저장해 주세요.');
    const sp = (customOpen ? custom : species).trim();
    if (!sp) return Alert.alert('어종', '어종 이름을 적어 주세요.');
    const at = kstToIso(date, time);
    if (!at) return Alert.alert('시간', '날짜는 2026-11-24, 시간은 06:30 처럼 적어 주세요.');
    const timeChanged = editing ? at !== editing.at : timeTouched;
    // 지금 기록이면 실시간 정보를, 지난 시간 기록이면 그날의 물때만 붙인다(계산값이라 통신 없이도 된다)
    const live = !timeChanged && !editing;
    const cond = editing && !timeChanged
      ? editing.cond
      : live
        ? { tide: env?.tide ?? tideName(new Date(at)), waterTemp: env?.waterTemp, airTemp: env?.airTemp, wind: env?.wind, wave: env?.wave, moon: env?.moon }
        : { tide: tideName(new Date(at)) };
    const id = editing?.id ?? uid('c');
    const fields = {
      pointId: p.id,
      at,
      species: sp,
      count: Math.max(1, +count || 1),
      sizeCm: +size || 0,
      rig: rig.trim() || '-',
      bait: bait.trim() || '-',
      memo: memo.trim() || undefined,
      photoUri: persistPhoto(photo, id),
      cond,
    };
    if (editing) store.updateCatch(editing.id, fields);
    else store.addCatch({ ...fields, sessionId: store.activeTrip?.id });
    router.back();
  };

  const remove = () => {
    if (!editing) return;
    Alert.alert('기록 삭제', `${editing.species} ${editing.count}마리 기록을 지울까요? 되돌릴 수 없어요.`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => { store.deleteCatch(editing.id); router.back(); } },
    ]);
  };

  const n = (v?: number, u = '') => (v == null ? '-' : v.toFixed(1) + u);
  return (
    <ScrollView contentContainerStyle={ui.screen} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: editing ? '기록 수정' : '조과 기록' }} />
      {params.catchId && !editing ? <Sub>이 기록을 찾을 수 없어요. 이미 지워졌을 수 있어요.</Sub> : null}
      <Sub>{editing ? '바꿀 부분만 고치고 저장하세요.' : '사진부터 찍으세요. 위치·시간·날씨·물때는 자동으로 붙어요.'}</Sub>
      <Pressable onPress={() => pick(true)} style={{ aspectRatio: 4 / 3, borderRadius: 14, borderWidth: 2, borderStyle: 'dashed', borderColor: C.line, backgroundColor: C.card, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="조과 사진 찍기">
        {photo ? <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} /> : (
          <View style={{ alignItems: 'center', gap: 4 }}>
            <Ionicons name="camera-outline" size={36} color={C.muted} />
            <Text style={[ui.body, { fontWeight: '700' }]}>사진 찍기</Text>
          </View>
        )}
      </Pressable>
      <Button label="앨범에서 고르기" onPress={() => pick(false)} />

      {editing ? (
        <Card>
          <H3>기록 당시 정보</H3>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Stat value={editing.cond.tide} label="물때" />
            <Stat value={n(editing.cond.waterTemp, '°')} label="수온" />
            <Stat value={n(editing.cond.wind)} label="풍속 m/s" />
            <Stat value={n(editing.cond.wave)} label="파고 m" />
          </View>
          <Sub>시간을 바꾸면 물때는 그날 기준으로 다시 계산해요.</Sub>
        </Card>
      ) : (
        <Card>
          <H3 right={<Sub>{env ? (env.error ? '통신 안 됨 · 물때만' : '실시간') : '불러오는 중'}</Sub>}>자동으로 붙는 정보</H3>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Stat value={env?.tide ?? tideName()} label="물때" />
            <Stat value={n(env?.waterTemp, '°')} label="수온" />
            <Stat value={n(env?.wind)} label="풍속 m/s" />
            <Stat value={n(env?.wave)} label="파고 m" />
          </View>
          {env?.error ? <Sub>바다 날씨를 못 불러와도 기록은 저장돼요. 물때는 폰에서 계산해요.</Sub> : null}
        </Card>
      )}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Text style={ui.label}>날짜</Text>
          <TextInput value={date} onChangeText={(v) => { setDate(v); setTimeTouched(true); }} style={ui.input} placeholder="2026-11-24" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ui.label}>시간</Text>
          <TextInput value={time} onChangeText={(v) => { setTime(v); setTimeTouched(true); }} style={ui.input} placeholder="06:30" />
        </View>
      </View>

      <View>
        <Text style={ui.label}>포인트</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {store.points.map((x) => <Pill key={x.id} label={x.name} active={x.id === pointId} onPress={() => setPointId(x.id)} />)}
        </ScrollView>
      </View>

      <View>
        <Text style={ui.label}>어종 <Text style={{ fontWeight: '400' }}>· 목록에 없으면 직접 입력</Text></Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {speciesOptions.map((x) => <Pill key={x} label={x} color={speciesColor(x)} active={!customOpen && x === species} onPress={() => { setSpecies(x); setCustomOpen(false); }} />)}
          <Pill label="+ 직접 입력" active={customOpen} onPress={() => setCustomOpen(true)} />
        </View>
        {customOpen ? <TextInput value={custom} onChangeText={setCustom} style={[ui.input, { marginTop: 6 }]} placeholder="예: 전갱이, 삼치, 쏘가리" autoFocus /> : null}
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
      {tooSmall ? <Text style={{ color: C.crit, fontSize: 13 }}>{reg?.species}은 {reg?.minCm}cm 미만은 포획 금지예요. 방생해 주세요.</Text> : null}
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
      <Button label={editing ? '수정 저장' : '기록 저장'} primary onPress={save} />
      {editing ? <Button label="이 기록 삭제" onPress={remove} /> : null}
    </ScrollView>
  );
}
