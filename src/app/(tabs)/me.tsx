import { Switch, ScrollView, Text, TextInput, View, Alert } from 'react-native';
import { useMemo, useState } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import Sheet from '@/components/Sheet';
import { Bar, Button, Card, H2, H3, Pill, s as ui, Stat, Sub } from '@/components/ui';
import { disableArrivalAlerts, enableArrivalAlerts } from '@/lib/arrival';
import { badges, bestRecords, computeStats, dex, LEVELS, weeklyQuests } from '@/lib/game';
import { placeHistory } from '@/lib/jokbo';
import { allSpecies, REGULATION_NOTE, REGULATIONS, speciesColor } from '@/lib/species';
import { exportBackup, pickBackup } from '@/lib/backup';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

const Fish = ({ color }: { color: string }) => (
  <Svg width={44} height={22} viewBox="0 0 44 22">
    <Path d="M4 11c6-8 18-9 28-3l8-5v16l-8-5c-10 6-22 5-28-3Z" fill={color} />
    <Circle cx={11} cy={9.5} r={1.6} fill="#fff" />
  </Svg>
);

export default function MeScreen() {
  const store = useStore();
  const st = computeStats(store.points, store.trips, store.catches, store.bonusXp);
  const hist = useMemo(() => placeHistory(store.points, store.trips, store.catches), [store.points, store.trips, store.catches]);
  const recs = bestRecords(store.catches, store.records, store.pointName);
  const dx = dex(store.catches);
  const bd = badges(store.catches, st.pts, st.dates.length);
  const qs = weeklyQuests(store.trips, store.catches, store.questClaims);
  const [recOpen, setRecOpen] = useState(false);
  const [r, setR] = useState({ species: '감성돔', size: '', date: '', place: '' });

  // 이번 달 달력
  const [now] = useState(() => new Date(Date.now() + 9 * 3600e3));
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const first = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const dateSet = new Set(st.dates);
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <ScrollView contentContainerStyle={ui.screen}>
      <View style={{ backgroundColor: C.sea, borderRadius: 16, padding: 16, flexDirection: 'row', gap: 14, alignItems: 'center' }}>
        <Svg width={72} height={72} viewBox="0 0 72 72">
          <Circle cx={36} cy={36} r={31} stroke="#ffffff33" strokeWidth={7} fill="none" />
          <Circle cx={36} cy={36} r={31} stroke={C.gold} strokeWidth={7} fill="none" strokeLinecap="round" strokeDasharray={`${(st.progress * 194.8).toFixed(1)} 194.8`} transform="rotate(-90 36 36)" />
        </Svg>
        <Text style={{ position: 'absolute', left: 16, width: 72, textAlign: 'center', color: '#fff', fontSize: 22, fontWeight: '900' }}>{st.level}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#ffffffbb', fontSize: 12 }}>나의 낚시 등급</Text>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>{st.levelName}</Text>
          <Bar ratio={st.progress} color={C.gold} />
          <Text style={{ color: '#ffffffbb', fontSize: 11.5, marginTop: 4 }}>
            {st.xp} XP · {st.level >= 9 ? '최고 등급' : `${LEVELS[st.level]}까지 ${st.toNext} XP`}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Stat value={`${st.dates.length}`} label="총 출조" />
        <Stat value={`${st.month}`} label="이번 달" />
        <Stat value={`${st.fish}`} label="총 마릿수" />
        <Stat value={`${st.streak}주`} label="연속 출조" />
      </View>

      <Card>
        <H3 right={<Sub>출조 시작 기록 기준</Sub>}>장소별 낚시 히스토리</H3>
        {hist.map((h) => (
          <View key={h.point.id} style={[ui.row, { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }]}>
            <Text style={[ui.body, { flex: 1 }]} numberOfLines={1}>{h.point.name}</Text>
            <Text style={[ui.body, { width: 46 }]}>{h.visits}회</Text>
            <Text style={[ui.body, { width: 54, color: C.good }]}>조과 {h.caught}</Text>
            <Text style={[ui.sub, { width: 40 }]}>꽝 {h.visits - h.caught}</Text>
            <Text style={[ui.sub, { width: 40, textAlign: 'right' }]}>{h.last.slice(5).replace('-', '.')}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <H3 right={<Button label="직접 입력" onPress={() => setRecOpen(true)} style={{ paddingVertical: 6, paddingHorizontal: 10 }} />}>어종별 기록고기</H3>
        {recs.map((rc) => (
          <View key={rc.species} style={[ui.row, { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }]}>
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: speciesColor(rc.species) }} />
            <View style={{ flex: 1 }}>
              <Text style={[ui.body, { fontWeight: '700' }]}>{rc.species}</Text>
              <Text style={ui.sub}>{rc.place} · {rc.date.replace(/-/g, '.')}{rc.manual ? ' · 직접 입력' : ''}</Text>
            </View>
            <Text style={{ fontSize: 17, fontWeight: '900', color: C.fg }}>{rc.sizeCm}cm</Text>
            {rc.manual && rc.id ? (
              <Button
                label="삭제"
                onPress={() => Alert.alert('기록고기 삭제', `${rc.species} ${rc.sizeCm}cm 직접 입력 기록을 지울까요?`, [{ text: '취소', style: 'cancel' }, { text: '삭제', style: 'destructive', onPress: () => store.deleteRecord(rc.id!) }])}
                style={{ paddingVertical: 4, paddingHorizontal: 8 }}
              />
            ) : null}
          </View>
        ))}
      </Card>

      <Card>
        <H3 right={<Sub>■ 출조한 날</Sub>}>{`${m + 1}월 출조 달력`}</H3>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {['일', '월', '화', '수', '목', '금', '토'].map((d) => (
            <Text key={d} style={{ width: `${100 / 7}%`, textAlign: 'center', fontSize: 11, color: C.muted }}>{d}</Text>
          ))}
          {cells.map((d, i) => {
            const key = d ? `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '';
            const on = d && dateSet.has(key);
            return (
              <View key={i} style={{ width: `${100 / 7}%`, padding: 2 }}>
                <View style={{ aspectRatio: 1, borderRadius: 6, backgroundColor: d ? (on ? C.sea2 : C.foam) : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 10.5, color: on ? '#fff' : C.muted, fontWeight: on ? '800' : '400' }}>{d ?? ''}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </Card>

      <Card>
        <H3 right={<Sub>월요일마다 새로 시작</Sub>}>주간 퀘스트</H3>
        {qs.map((q) => (
          <View key={q.key}>
            <View style={ui.row}>
              <Text style={[ui.body, { flex: 1 }]}>{q.title}</Text>
              {q.claimed ? (
                <Text style={[ui.sub, { color: C.good, fontWeight: '700' }]}>받음 ✓</Text>
              ) : q.done ? (
                <Button label={`${q.reward} 받기`} primary onPress={() => store.claimQuest(q.key, q.xp)} style={{ paddingVertical: 5, paddingHorizontal: 10 }} />
              ) : (
                <Text style={ui.sub}>{Math.min(q.value, q.goal)}/{q.goal} · {q.reward}</Text>
              )}
            </View>
            <Bar ratio={q.value / q.goal} color={q.done ? C.good : C.accent} />
          </View>
        ))}
      </Card>

      <Card>
        <H3 right={<Sub>{dx.filter((d) => d.ok).length} / {dx.length}종</Sub>}>어종 도감</H3>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {dx.map((d) => (
            <View key={d.species} style={{ width: '22.5%', alignItems: 'center', padding: 8, borderRadius: 12, backgroundColor: C.bg, opacity: d.ok ? 1 : 0.45 }}>
              <Fish color={d.ok ? speciesColor(d.species) : C.muted} />
              <Text style={{ fontSize: 11.5, fontWeight: '700', color: C.fg }}>{d.ok ? d.species : '???'}</Text>
              <Text style={{ fontSize: 10.5, color: C.muted }}>{d.ok ? `${d.best}cm` : '미발견'}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <H3 right={<Sub>{bd.filter((b) => b.ok).length} / {bd.length}</Sub>}>배지</H3>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {bd.map((b) => (
            <View key={b.name} style={{ width: '31%', alignItems: 'center', padding: 10, borderRadius: 12, backgroundColor: C.bg, opacity: b.ok ? 1 : 0.45 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: b.ok ? b.color : C.muted, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                <Text style={{ color: '#fff', fontWeight: '900' }}>{b.mark}</Text>
              </View>
              <Text style={{ fontSize: 11.5, color: C.fg, textAlign: 'center' }}>{b.name}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <H3>포인트 도착 알림</H3>
        <View style={ui.row}>
          <Sub style={{ flex: 1 }}>저장한 포인트 300m 안에 들어가면 그 자리의 시즌 족보를 알림으로 알려줘요. 위치 권한을 ‘항상 허용’으로 바꿔야 해요. 최근 포인트 20곳까지, 새 포인트도 자동으로 등록돼요.</Sub>
          <Switch
            value={store.arrivalOn}
            onValueChange={async (v) => {
              if (v) {
                const err = await enableArrivalAlerts(store.points).catch(() => '이 환경에서는 백그라운드 알림을 켤 수 없어요.');
                if (err) return Alert.alert('도착 알림', err);
              } else await disableArrivalAlerts().catch(() => {});
              store.setArrivalOn(v);
            }}
          />
        </View>
      </Card>

      <Card>
        <H3 right={<Sub>예시</Sub>}>금어기 · 포획 금지 체장</H3>
        {REGULATIONS.map((rg) => (
          <View key={rg.species} style={[ui.row, { borderTopWidth: 1, borderTopColor: C.line, paddingTop: 8 }]}>
            <Text style={[ui.body, { width: 70 }]}>{rg.species}</Text>
            <Text style={[ui.body, { flex: 1 }]}>{rg.closed ?? '-'}</Text>
            <Text style={ui.body}>{rg.minCm ? `${rg.minCm}cm 미만` : '-'}</Text>
          </View>
        ))}
        <Text style={{ color: C.crit, fontSize: 12.5, fontWeight: '700' }}>{REGULATION_NOTE}</Text>
      </Card>

      <Card>
        <H3>기록 백업</H3>
        <Sub>폰을 바꾸거나 앱을 지우기 전에 백업 파일을 만들어 카톡·드라이브에 보관하세요. 사진 파일은 담기지 않아요.</Sub>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button
            label="백업 내보내기"
            primary
            style={{ flex: 1 }}
            onPress={async () => {
              const { points, catches, trips, records, bonusXp, questClaims, arrivalOn } = store;
              const err = await exportBackup({ points, catches, trips, records, bonusXp, questClaims, arrivalOn }).catch(() => '백업 파일을 만들지 못했어요.');
              if (err) Alert.alert('백업', err);
            }}
          />
          <Button
            label="백업 불러오기"
            style={{ flex: 1 }}
            onPress={async () => {
              const r = await pickBackup().catch(() => ({ error: '파일을 열지 못했어요.' }));
              if (!r) return;
              if ('error' in r) return Alert.alert('백업 불러오기', r.error);
              Alert.alert('백업 불러오기', `포인트 ${r.data.points.length}곳, 조과 ${r.data.catches.length}건으로 바꿀까요? 지금 앱의 기록은 백업 내용으로 대체돼요.`, [
                { text: '취소', style: 'cancel' },
                { text: '불러오기', style: 'destructive', onPress: () => { disableArrivalAlerts().catch(() => {}); store.replaceAll(r.data); } },
              ]);
            }}
          />
        </View>
      </Card>

      {store.catches.some((c) => c.sample) ? (
        <Card>
          <H3>예시 데이터</H3>
          <Sub>처음 보여드린 부산 포인트와 기록은 예시예요. 내 기록만 남기고 지울 수 있어요.</Sub>
          <Button
            label="예시 데이터 지우기"
            onPress={() =>
              Alert.alert('예시 데이터 지우기', '예시 포인트와 기록을 지울까요? 내가 남긴 기록은 그대로예요.', [
                { text: '취소', style: 'cancel' },
                { text: '지우기', style: 'destructive', onPress: store.clearSamples },
              ])
            }
          />
        </Card>
      ) : null}

      <Sheet visible={recOpen} onClose={() => setRecOpen(false)}>
        <H2>기록고기 직접 입력</H2>
        <Sub>앱을 쓰기 전에 잡은 최대어도 남겨 두세요.</Sub>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {allSpecies(store.catches).map((x) => <Pill key={x} label={x} color={speciesColor(x)} active={r.species === x} onPress={() => setR({ ...r, species: x })} />)}
        </View>
        <View>
          <Text style={ui.label}>어종(목록에 없으면 직접)</Text>
          <TextInput value={r.species} onChangeText={(v) => setR({ ...r, species: v })} style={ui.input} />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={ui.label}>크기(cm)</Text>
            <TextInput keyboardType="numeric" value={r.size} onChangeText={(v) => setR({ ...r, size: v })} style={ui.input} placeholder="50" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ui.label}>날짜</Text>
            <TextInput value={r.date} onChangeText={(v) => setR({ ...r, date: v })} style={ui.input} placeholder="2025-12-03" />
          </View>
        </View>
        <View>
          <Text style={ui.label}>장소</Text>
          <TextInput value={r.place} onChangeText={(v) => setR({ ...r, place: v })} style={ui.input} placeholder="거제 지세포 갯바위" />
        </View>
        <Button
          label="기록고기 저장"
          primary
          disabled={!+r.size || !r.species.trim()}
          onPress={() => {
            store.addRecord({ species: r.species.trim(), sizeCm: +r.size, date: r.date || new Date().toISOString().slice(0, 10), place: r.place || '-' });
            setRecOpen(false);
            setR({ species: '감성돔', size: '', date: '', place: '' });
          }}
        />
      </Sheet>
    </ScrollView>
  );
}
