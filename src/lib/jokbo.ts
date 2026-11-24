// 족보 계산: 모두 내 기록에서 나온다.
import type { Catch, FishingPoint, Trip } from './types';
import { hm, ymd } from './geo';
import { tideGroup } from './lunar';

export const sumBy = (cs: Catch[], key: (c: Catch) => string) => {
  const m: Record<string, number> = {};
  cs.forEach((c) => (m[key(c)] = (m[key(c)] ?? 0) + c.count));
  return Object.entries(m).sort((a, b) => b[1] - a[1]);
};

export const hourBucket = (iso: string) => {
  const h = +hm(iso).slice(0, 2);
  return h < 7 ? '새벽' : h < 10 ? '아침' : h < 16 ? '낮' : h < 19 ? '해질녘' : '밤';
};
export const HOUR_BUCKETS = ['새벽', '아침', '낮', '해질녘', '밤'];
export const TIDE_GROUPS = ['조금~3물', '4~6물', '7~9물', '10~13물'];

export function pointSummary(pointId: string, catches: Catch[]) {
  const cs = catches.filter((c) => c.pointId === pointId);
  const species = sumBy(cs, (c) => c.species);
  const top = species[0]?.[0];
  const topCs = cs.filter((c) => c.species === top);
  return {
    total: cs.reduce((s, c) => s + c.count, 0),
    species,
    top,
    rig: sumBy(topCs, (c) => c.rig)[0]?.[0],
    tide: sumBy(topCs, (c) => c.cond.tide)[0]?.[0],
    hour: sumBy(topCs, (c) => hourBucket(c.at))[0]?.[0],
    recent: cs.slice().sort((a, b) => b.at.localeCompare(a.at)),
  };
}

/** 이번 달 이 포인트에서 확률 높은 어종 (도착 알림용) */
export function seasonTip(pointId: string, catches: Catch[], month = new Date().getMonth() + 1) {
  const cs = catches.filter((c) => c.pointId === pointId && +ymd(c.at).slice(5, 7) === month);
  const pool = cs.length ? cs : catches.filter((c) => c.pointId === pointId);
  const sp = sumBy(pool, (c) => c.species)[0]?.[0];
  if (!sp) return null;
  const spCs = pool.filter((c) => c.species === sp);
  return { species: sp, rig: sumBy(spCs, (c) => c.rig)[0]?.[0], tide: sumBy(spCs, (c) => c.cond.tide)[0]?.[0], hour: sumBy(spCs, (c) => hourBucket(c.at))[0]?.[0], basis: spCs.length };
}

export function speciesSummary(species: string, catches: Catch[]) {
  const cs = catches.filter((c) => c.species === species);
  const temps = cs.map((c) => c.cond.waterTemp).filter((t): t is number => t != null);
  const tideMap = Object.fromEntries(sumBy(cs, (c) => tideGroup(c.cond.tide)));
  const hourMap = Object.fromEntries(sumBy(cs, (c) => hourBucket(c.at)));
  return {
    records: cs.length,
    points: sumBy(cs, (c) => c.pointId),
    rigs: sumBy(cs, (c) => c.rig),
    tides: TIDE_GROUPS.map((g) => [g, tideMap[g] ?? 0] as [string, number]),
    hours: HOUR_BUCKETS.map((g) => [g, hourMap[g] ?? 0] as [string, number]),
    tempRange: temps.length ? [Math.min(...temps), Math.max(...temps)] : null,
    recent: cs.slice().sort((a, b) => b.at.localeCompare(a.at)),
  };
}

/** 오늘과 물때·수온이 비슷했던 날 잘 된 포인트·어종 */
export function todayPicks(catches: Catch[], tide: string, waterTemp?: number) {
  const order = ['조금', '무시', '1물', '2물', '3물', '4물', '5물', '6물', '7물', '8물', '9물', '10물', '11물', '12물', '13물'];
  const i = order.indexOf(tide);
  const near = [order[i - 1], tide, order[i + 1]];
  const sim = catches.filter((c) => near.includes(c.cond.tide) && (waterTemp == null || c.cond.waterTemp == null || Math.abs(c.cond.waterTemp - waterTemp) < 2.5));
  return { basis: sim.length, picks: sumBy(sim, (c) => c.pointId + '|' + c.species).slice(0, 3).map(([k, n]) => ({ pointId: k.split('|')[0], species: k.split('|')[1], count: n })) };
}

/** 장소별 히스토리: 방문, 조과 있는 날, 꽝 */
export function placeHistory(points: FishingPoint[], trips: Trip[], catches: Catch[]) {
  const visits = new Map<string, { pointId: string; date: string; caught: boolean }>();
  trips.forEach((t) => visits.set(t.pointId + '|' + ymd(t.startAt), { pointId: t.pointId, date: ymd(t.startAt), caught: false }));
  catches.forEach((c) => visits.set(c.pointId + '|' + ymd(c.at), { pointId: c.pointId, date: ymd(c.at), caught: true }));
  const list = [...visits.values()];
  return points
    .map((p) => {
      const v = list.filter((x) => x.pointId === p.id);
      return { point: p, visits: v.length, caught: v.filter((x) => x.caught).length, last: v.map((x) => x.date).sort().pop() ?? '' };
    })
    .filter((h) => h.visits > 0)
    .sort((a, b) => b.visits - a.visits);
}

export function tripDates(trips: Trip[], catches: Catch[]) {
  return [...new Set([...trips.map((t) => ymd(t.startAt)), ...catches.map((c) => ymd(c.at))])].sort();
}
