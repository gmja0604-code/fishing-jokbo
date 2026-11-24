import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { Button, Card, CatchRow, H2, H3, Rank, s as ui, Stat, Sub, Tip } from '@/components/ui';
import { fetchAmenities, kakaoMapUrl, kakaoSearchUrl, type Amenity } from '@/lib/amenities';
import { fmtDist } from '@/lib/geo';
import { pointSummary, placeHistory } from '@/lib/jokbo';
import { speciesColor } from '@/lib/species';
import { useMarine } from '@/lib/useMarine';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

const STATUS_COLOR = { open: C.good, soon: C.warn, closed: C.crit, unknown: C.muted };

export default function PointScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const store = useStore();
  const p = store.points.find((x) => x.id === id);
  const { data } = useMarine(p?.lat, p?.lng);
  const [am, setAm] = useState<Amenity[] | null>(null);
  const [amErr, setAmErr] = useState(false);

  useEffect(() => {
    if (p) fetchAmenities(p.lat, p.lng).then(setAm).catch(() => setAmErr(true));
  }, [p?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!p) return <View style={ui.screen}><Sub>포인트를 찾을 수 없어요.</Sub></View>;
  const sum = pointSummary(p.id, store.catches);
  const hist = placeHistory([p], store.trips, store.catches)[0];
  const groups: Amenity['kind'][] = ['화장실', '식당', '편의점', '낚시점', '주차', '카페'];

  const share = (rough: boolean) => {
    const lat = rough ? Math.round(p.lat * 200) / 200 : p.lat;
    const lng = rough ? Math.round(p.lng * 200) / 200 : p.lng;
    Share.share({ message: `[낚시 족보] ${p.name}${rough ? ' (대략 위치)' : ''}\n${kakaoMapUrl(p.name, lat, lng)}` });
  };

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <Stack.Screen options={{ title: p.name }} />
      <View>
        <H2>{p.name}</H2>
        <Sub>
          {p.type}
          {hist ? ` · 방문 ${hist.visits}회 · 조과 ${hist.caught}회 · 꽝 ${hist.visits - hist.caught}회` : ''} · 총 {sum.total}마리
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
        <Sub>누르면 카카오맵에서 열려요. 영업시간은 OpenStreetMap 정보라 없는 곳도 있어요.</Sub>
      </Card>

      {sum.recent.length ? (
        <Card>
          <H3>최근 조과</H3>
          {sum.recent.slice(0, 5).map((c) => <CatchRow key={c.id} c={c} place={p.name} />)}
        </Card>
      ) : null}
    </ScrollView>
  );
}
