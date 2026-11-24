import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, useWindowDimensions, View } from 'react-native';
import TideChart from '@/components/TideChart';
import { Card, H2, H3, Pill, s as ui, Stat, Sub } from '@/components/ui';
import { fishingIndex, weatherText, windDirText } from '@/lib/marine';
import { useMarine } from '@/lib/useMarine';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import { hm } from '@/lib/geo';

export default function SeaScreen() {
  const store = useStore();
  const [pid, setPid] = useState(store.points[0]?.id);
  const p = store.points.find((x) => x.id === pid) ?? store.points[0];
  const { data, loading, refresh } = useMarine(p?.lat, p?.lng);
  const { width } = useWindowDimensions();
  const score = data ? fishingIndex(data) : null;
  const n = (v: number | undefined, d = 1) => (v == null ? '-' : v.toFixed(d));

  if (!p) return <View style={ui.screen}><Sub>포인트를 먼저 저장해 주세요.</Sub></View>;
  return (
    <ScrollView contentContainerStyle={ui.screen} refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {store.points.map((x) => (
          <Pill key={x.id} label={x.name} active={x.id === p.id} onPress={() => setPid(x.id)} />
        ))}
      </ScrollView>
      <View>
        <H2>{p.name}</H2>
        <Sub>{data ? `${hm(data.fetchedAt)} 갱신 · 10분마다 자동 갱신 · 당겨서 새로고침` : '불러오는 중'}</Sub>
      </View>
      {data?.error ? <Card><Text style={{ color: C.crit }}>{data.error}</Text></Card> : null}
      {!data ? <ActivityIndicator color={C.sea2} /> : (
        <>
          <Card>
            <H3>오늘 낚시 지수</H3>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
              <Text style={{ fontSize: 40, fontWeight: '900', color: score! >= 75 ? C.good : score! >= 55 ? C.warn : C.crit, fontVariant: ['tabular-nums'] }}>{score}</Text>
              <Text style={[ui.sub, { paddingBottom: 8 }]}>/ 100 · {score! >= 75 ? '출조 추천' : score! >= 55 ? '무난' : '쉬어가기'}</Text>
            </View>
            <Sub>물때, 풍속, 파고를 반영한 참고용 지수예요.</Sub>
          </Card>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Stat value={`${n(data.waterTemp)}°`} label="수온" />
            <Stat value={n(data.wind)} label={`풍속 m/s ${windDirText(data.windDir)}`} />
            <Stat value={n(data.wave)} label="파고 m" />
            <Stat value={`${n(data.airTemp)}°`} label={`기온 · ${weatherText(data.weatherCode)}`} />
            <Stat value={data.tide} label={`물때 · ${data.moon}`} />
            <Stat value={data.sunrise ?? '-'} label={`일출 · 일몰 ${data.sunset ?? '-'}`} />
          </View>
          {data.seaLevel.length > 2 ? (
            <Card>
              <H3>오늘 조석</H3>
              <TideChart points={data.seaLevel} width={width - 32 - 30} />
              <Sub>모델 기반 해수면 높이예요. 정식 출시 때 국립해양조사원 조석 예보로 바꿔요.</Sub>
            </Card>
          ) : null}
          <Card>
            <H3>시간대별 예보</H3>
            {data.hourly.map((h) => (
              <View key={h.time} style={[ui.row, { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }]}>
                <Text style={[ui.body, { width: 54 }]}>{h.time.slice(11, 13)}시</Text>
                <Text style={[ui.body, { flex: 1 }]}>{weatherText(h.code)}</Text>
                <Text style={[ui.body, { width: 70, textAlign: 'right' }]}>{n(h.wind)} m/s</Text>
                <Text style={[ui.body, { width: 60, textAlign: 'right' }]}>{n(h.wave)} m</Text>
              </View>
            ))}
          </Card>
          <Sub>데이터: Open-Meteo 날씨·해양 예보. 기상특보는 다음 단계에서 기상청 연동으로 추가해요.</Sub>
        </>
      )}
    </ScrollView>
  );
}
