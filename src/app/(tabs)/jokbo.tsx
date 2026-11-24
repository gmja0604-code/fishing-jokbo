import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Button, Card, CatchRow, Columns, H2, H3, Pill, Rank, s as ui, Sub, Tip } from '@/components/ui';
import { placeHistory, speciesSummary, todayPicks, pointSummary } from '@/lib/jokbo';
import { tideName } from '@/lib/lunar';
import { allSpecies, speciesColor } from '@/lib/species';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

export default function JokboScreen() {
  const store = useStore();
  const [mode, setMode] = useState<'species' | 'point' | 'today'>('species');
  const caught = allSpecies(store.catches).filter((sp) => store.catches.some((c) => c.species === sp));
  const [sp, setSp] = useState(caught[0] ?? '감성돔');
  const sum = useMemo(() => speciesSummary(sp, store.catches), [sp, store.catches]);
  const today = useMemo(() => todayPicks(store.catches, tideName()), [store.catches]);
  const hasSample = store.catches.some((c) => c.sample);
  // 포인트별: 마릿수만이 아니라 다녀온 날 중 손맛 본 날의 비율(성공률)도 함께 본다
  const pointRows = useMemo(() => {
    const hist = new Map(placeHistory(store.points, store.trips, store.catches).map((h) => [h.point.id, h]));
    return store.points
      .map((p) => {
        const h = hist.get(p.id);
        return { p, ps: pointSummary(p.id, store.catches), visits: h?.visits ?? 0, caught: h?.caught ?? 0, rate: h && h.visits ? h.caught / h.visits : 0 };
      })
      .filter((r) => r.visits > 0)
      .sort((a, b) => b.rate - a.rate || b.ps.total - a.ps.total);
  }, [store.points, store.trips, store.catches]);

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <View style={ui.row}>
        <H2>나의 족보</H2>
        <Sub>기록 {store.catches.length}건{hasSample ? ' · 예시 포함' : ''}</Sub>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        <Pill label="어종별" active={mode === 'species'} onPress={() => setMode('species')} />
        <Pill label="포인트별" active={mode === 'point'} onPress={() => setMode('point')} />
        <Pill label="오늘 추천" active={mode === 'today'} onPress={() => setMode('today')} />
      </View>

      {!store.catches.length ? <Tip>아직 기록이 없어요. 가운데 [+]를 눌러 첫 조과를 남기면 족보가 시작돼요.</Tip> : null}

      {mode === 'species' && store.catches.length ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {caught.map((x) => (
              <Pill key={x} label={x} color={speciesColor(x)} active={x === sp} onPress={() => setSp(x)} />
            ))}
          </View>
          {sum.points[0] ? (
            <Tip>
              <Text style={ui.tipT}>
                <Text style={{ fontWeight: '800', color: C.accent }}>{sp}</Text>은 <Text style={{ fontWeight: '800', color: C.accent }}>{store.pointName(sum.points[0][0])}</Text>에서 가장 많이 잡혔고,{' '}
                <Text style={{ fontWeight: '800', color: C.accent }}>{sum.rigs[0]?.[0]}</Text>가 잘 먹혔어요.
                {sum.tempRange ? ` 수온 ${sum.tempRange[0].toFixed(1)}~${sum.tempRange[1].toFixed(1)}°C 사이에 나왔어요.` : ''} <Text style={ui.sub}>(기록 {sum.records}회 기준)</Text>
              </Text>
            </Tip>
          ) : null}
          <Card>
            <H3>잘 나온 포인트</H3>
            <Rank items={sum.points.map(([id, v]) => ({ label: store.pointName(id), value: v }))} color={speciesColor(sp)} />
          </Card>
          <Card>
            <H3>물때별 마릿수</H3>
            <Columns data={sum.tides} />
          </Card>
          <Card>
            <H3>시간대별 마릿수</H3>
            <Columns data={sum.hours} />
          </Card>
          <Card>
            <H3>잘 된 채비</H3>
            <Rank items={sum.rigs.map(([k, v]) => ({ label: k, value: v }))} color={C.sea2} />
          </Card>
          <Card>
            <H3>최근 기록</H3>
            {sum.recent.slice(0, 6).map((c) => <CatchRow key={c.id} c={c} place={store.pointName(c.pointId)} />)}
          </Card>
        </>
      ) : null}

      {mode === 'point' ? (
        <>
          <Sub>성공률 = 다녀온 날 중 한 마리라도 잡은 날의 비율. 높은 순서예요.</Sub>
          {pointRows.map(({ p, ps, visits, caught: ok, rate }) => (
            <Card key={p.id}>
              <H3 right={<Sub>{p.type}</Sub>}>{p.name}</H3>
              <View style={ui.row}>
                <Text style={[ui.body, { fontWeight: '800', color: rate >= 0.5 ? C.good : C.warn }]}>성공률 {Math.round(rate * 100)}%</Text>
                <Sub>방문 {visits}회 · 조과 {ok}회 · 꽝 {visits - ok}회 · {ps.total}마리</Sub>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {ps.species.map(([x, v]) => <Pill key={x} label={`${x} ${v}`} color={speciesColor(x)} />)}
              </View>
              <Button label="포인트 보기" onPress={() => router.push(`/point/${p.id}`)} />
            </Card>
          ))}
        </>
      ) : null}

      {mode === 'today' ? (
        <>
          <Card>
            <H3>오늘 조건</H3>
            <Sub>물때 {tideName()} · 오늘과 물때가 비슷했던 날 {today.basis}번의 기록에서 골랐어요.</Sub>
          </Card>
          {today.picks.length ? today.picks.map((pk, i) => (
            <Card key={pk.pointId + pk.species}>
              <H3 right={<Sub>{pk.count}마리</Sub>}>{`${i + 1}. ${store.pointName(pk.pointId)} · ${pk.species}`}</H3>
              <Button label="포인트 보기" onPress={() => router.push(`/point/${pk.pointId}`)} />
            </Card>
          )) : <Tip>비슷한 물때의 기록이 아직 없어요.</Tip>}
        </>
      ) : null}
    </ScrollView>
  );
}
