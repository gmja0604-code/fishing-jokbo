import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import Sheet from '@/components/Sheet';
import { Button, Card, CatchRow, H2, H3, Pill, Rank, s as ui, Stat, Sub, Tip } from '@/components/ui';
import { fetchAmenities, kakaoMapUrl, kakaoSearchUrl, nearbyLinks, type Amenity } from '@/lib/amenities';
import { PLACE_TYPES, type PlaceType } from '@/lib/types';
import { fmtDist } from '@/lib/geo';
import { pointSummary, placeHistory } from '@/lib/jokbo';
import { speciesColor } from '@/lib/species';
import { useMarine } from '@/lib/useMarine';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

const STATUS_COLOR = { open: C.good, soon: C.warn, closed: C.crit, unknown: C.muted };

async function openApp(link: { app: string; web: string }) {
  try {
    await Linking.openURL(link.app);
  } catch {
    Linking.openURL(link.web).catch(() => {});
  }
}

export default function PointScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();
  const p = store.points.find((x) => x.id === id);
  const { data } = useMarine(p?.lat, p?.lng);
  const [am, setAm] = useState<Amenity[] | null>(null);
  const [amErr, setAmErr] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(p?.name ?? '');
  const [type, setType] = useState<PlaceType>(p?.type ?? '방파제');

  useEffect(() => {
    if (p) fetchAmenities(p.lat, p.lng).then(setAm).catch(() => setAmErr(true));
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) return <View style={ui.screen}><Sub>포인트를 찾을 수 없어요.</Sub></View>;
  const sum = pointSummary(p.id, store.catches);
  const hist = placeHistory([p], store.trips, store.catches)[0];
  const groups: Amenity['kind'][] = ['화장실', '식당', '편의점', '낚시점', '주차', '카페'];

  const remove = () => {
    const n = store.catches.filter((c) => c.pointId === p.id).length;
    Alert.alert('포인트 삭제', `${p.name}${n ? `와 이 포인트의 조과 기록 ${n}건` : ''}을 지울까요? 되돌릴 수 없어요.`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: () => { router.back(); store.deletePoint(p.id); } },
    ]);
  };

  const share = (rough: boolean) => {
    const lat = rough ? Math.round(p.lat * 200) / 200 : p.lat;
    const lng = rough ? Math.round(p.lng * 200) / 200 : p.lng;
    Share.share({ message: `[낚시 족보] ${p.name}${rough ? ' (대략 위치)' : ''}\n${kakaoMapUrl(p.name, lat, lng)}` });
  };

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <Stack.Screen options={{ title: p.name, headerRight: () => <Pressable onPress={() => { setName(p.name); setType(p.type); setEditOpen(true); }} hitSlop={10}><Text style={{ color: '#fff', fontWeight: '700' }}>편집</Text></Pressable> }} />
      <View>
        <H2>{p.name}</H2>
        <Sub>
          {p.type}
          {hist ? ` · 방문 ${hist.visits}회 · 조과 ${hist.caught}회 · 꽝 ${hist.visits - hist.caught}회 · 성공률 ${Math.round((hist.caught / hist.visits) * 100)}%` : ''} · 총 {sum.total}마리
        </Sub>
      </View>
      {sum.top ? (
        <Tip>
          <Text style={ui.tipT}>
            족보 한 줄: 이 포인트에선 <Text style={{ fontWeight: '800', color: C.accent }}>{sum.top}</Text> 조과가 가장 많았어요. <Text style={{ fontWeight: '800', color: C.accent }}>{sum.rig}</Text>, <Text style={{ fontWeight: '800', color: C.accent }}>{sum.tide}</Text> 전후, <Text style={{ fontWeight: '800', color: C.accent }}>{sum.hour}</Text>에 잘 됐어요.
          </Text>
        </Tip>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Stat value={data?.waterTemp != null ? `${data.waterTemp.toFixed(1)}°C` : '-'} label="지금 수온" />
        <Stat value={data?.tide ?? '-'} label="오늘 물때" />
        <Stat value={data?.wind != null ? `${data.wind.toFixed(1)}` : '-'} label="풍속 m/s" />
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button label="여기서 기록하기" primary style={{ flex: 1 }} onPress={() => router.push({ pathname: '/record', params: { pointId: p.id } })} />
        <Button label="친구에게 보내기" style={{ flex: 1 }} onPress={() => share(false)} />
      </View>
      <Button label="대략 위치(약 500m)로 보내기" onPress={() => share(true)} />

      {sum.species.length ? (
        <Card>
          <H3>잡힌 어종 순위</H3>
          <Rank items={sum.species.map(([sp, v]) => ({ label: sp, value: v, color: speciesColor(sp) }))} />
        </Card>
      ) : null}

      <Card>
        <H3 right={<Sub>반경 1km</Sub>}>주변 편의시설</H3>
        {!am && !amErr ? <ActivityIndicator color={C.sea2} /> : null}
        {amErr ? <Sub>편의시설 정보를 불러오지 못했어요.</Sub> : null}
        {am && !am.length ? <Sub>주변에 등록된 편의시설이 없어요.</Sub> : null}
        {am
          ? groups.map((g) =>
              am
                .filter((a) => a.kind === g)
                .slice(0, g === '식당' ? 3 : 1)
                .map((a, i) => (
                  <Pressable key={g + i} onPress={() => Linking.openURL(a.kind === '화장실' || a.kind === '주차' ? kakaoMapUrl(a.name, a.lat, a.lng) : kakaoSearchUrl(a.name))} style={[ui.row, { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }]}>
                    <Text style={[ui.sub, { width: 48, fontWeight: '700' }]}>{a.kind}</Text>
                    <Text style={[ui.body, { flex: 1 }]} numberOfLines={1}>
                      {a.name} <Text style={ui.sub}>{fmtDist(a.dist)}</Text>
                    </Text>
                    {a.status ? <Text style={{ fontSize: 11.5, fontWeight: '700', color: STATUS_COLOR[a.status.state] }}>{a.status.text}</Text> : null}
                  </Pressable>
                )),
            )
          : null}
        <Sub>누르면 카카오맵에서 열려요. 영업시간은 OpenStreetMap 정보라 없는 곳도 있어요. 더 정확한 영업시간은 아래 버튼으로 지도 앱에서 확인하세요.</Sub>
        {(['화장실', '식당', '낚시점', '편의점'] as const).map((q) => {
          const l = nearbyLinks(q === '식당' ? '맛집' : q, p.lat, p.lng);
          return (
            <View key={q} style={[ui.row, { gap: 6 }]}>
              <Text style={[ui.body, { flex: 1 }]}>주변 {q}</Text>
              <Button label="카카오맵" onPress={() => openApp(l.kakao)} style={{ paddingVertical: 6, paddingHorizontal: 10 }} />
              <Button label="네이버지도" onPress={() => openApp(l.naver)} style={{ paddingVertical: 6, paddingHorizontal: 10 }} />
            </View>
          );
        })}
      </Card>

      {sum.recent.length ? (
        <Card>
          <H3>최근 조과</H3>
          {sum.recent.slice(0, 5).map((c) => <CatchRow key={c.id} c={c} place={p.name} />)}
          <Sub>기록을 누르면 고치거나 지울 수 있어요.</Sub>
        </Card>
      ) : null}

      <Sheet visible={editOpen} onClose={() => setEditOpen(false)}>
        <H2>포인트 편집</H2>
        <View>
          <Text style={ui.label}>이름</Text>
          <TextInput value={name} onChangeText={setName} style={ui.input} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {PLACE_TYPES.map((t) => <Pill key={t} label={t} active={t === type} onPress={() => setType(t)} />)}
        </View>
        <Button label="저장" primary disabled={!name.trim()} onPress={() => { store.updatePoint(p.id, { name: name.trim(), type }); setEditOpen(false); }} />
        <Button label="이 포인트 삭제" onPress={() => { setEditOpen(false); remove(); }} />
      </Sheet>
    </ScrollView>
  );
}
