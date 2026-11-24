import type { Catch, FishingPoint, ManualRecord, Trip } from './types';
import { tripDates } from './jokbo';
import { hm, ymd } from './geo';
import { SPECIES_LIST } from './species';

export const LEVELS = ['입문', '손맛러', '생활낚시인', '출조꾼', '조사', '고수', '꾼', '명인', '전설'];

export function computeStats(points: FishingPoint[], trips: Trip[], catches: Catch[], bonus: number) {
  const dates = tripDates(trips, catches);
  const fish = catches.reduce((s, c) => s + c.count, 0);
  const pts = new Set(catches.map((c) => c.pointId)).size;
  const xp = catches.reduce((s, c) => s + 10 + c.count * 2 + (c.sizeCm >= 40 ? 20 : 0), 0) + dates.length * 30 + pts * 15 + bonus;
  const level = Math.min(9, Math.floor(Math.sqrt(xp / 60)) + 1);
  const cur = 60 * (level - 1) ** 2, next = 60 * level ** 2;
  const ym = ymd(new Date().toISOString()).slice(0, 7);
  const week = (d: string) => Math.floor((Date.parse(d) / 864e5 + 3) / 7);
  const weeks = new Set(dates.map(week));
  let w = week(ymd(new Date().toISOString())), streak = 0;
  if (!weeks.has(w)) w--;
  while (weeks.has(w)) { streak++; w--; }
  return {
    dates, fish, pts, xp, level, levelName: LEVELS[level - 1],
    progress: level >= 9 ? 1 : (xp - cur) / (next - cur),
    toNext: next - xp,
    month: dates.filter((d) => d.startsWith(ym)).length,
    streak,
  };
}

export function bestRecords(catches: Catch[], manual: ManualRecord[], pointName: (id: string) => string) {
  const m: Record<string, { species: string; sizeCm: number; date: string; place: string; manual?: boolean }> = {};
  catches.forEach((c) => {
    if (!m[c.species] || c.sizeCm > m[c.species].sizeCm) m[c.species] = { species: c.species, sizeCm: c.sizeCm, date: ymd(c.at), place: pointName(c.pointId) };
  });
  manual.forEach((r) => {
    if (!m[r.species] || r.sizeCm > m[r.species].sizeCm) m[r.species] = { ...r, manual: true };
  });
  return Object.values(m).sort((a, b) => b.sizeCm - a.sizeCm);
}

export function badges(catches: Catch[], points: number, trips: number) {
  const dawn = catches.filter((c) => +hm(c.at).slice(0, 2) < 7).length;
  const night = catches.filter((c) => +hm(c.at).slice(0, 2) >= 19).length;
  const got = new Set(catches.map((c) => c.species)).size;
  return [
    { name: '첫 감성돔', mark: '감', color: '#3a6ea5', ok: catches.some((c) => c.species === '감성돔') },
    { name: '40cm 돌파', mark: '40', color: '#ff6a2b', ok: catches.some((c) => c.sizeCm >= 40 && c.species !== '갈치') },
    { name: '새벽형 꾼', mark: '새', color: '#c9a227', ok: dawn >= 3 },
    { name: '포인트 개척자', mark: '5', color: '#1f9d8b', ok: points >= 5 },
    { name: '밤낚시 장인', mark: '밤', color: '#8a5cc2', ok: night >= 5 },
    { name: '출조 10회', mark: '10', color: '#15536a', ok: trips >= 10 },
    { name: '도감 10종', mark: '10', color: '#6b7a3a', ok: got >= 10 },
    { name: '출조 50회', mark: '50', color: '#15536a', ok: trips >= 50 },
    { name: '5짜 감성돔', mark: '50', color: '#d6453d', ok: catches.some((c) => c.species === '감성돔' && c.sizeCm >= 50) },
  ];
}

export function dex(catches: Catch[]) {
  const got = new Set(catches.map((c) => c.species));
  return SPECIES_LIST.map((s) => ({ species: s, ok: got.has(s), best: Math.max(0, ...catches.filter((c) => c.species === s).map((c) => c.sizeCm)) }));
}

export function weeklyQuests(trips: Trip[], catches: Catch[]) {
  const since = new Date(Date.now() - 7 * 864e5).toISOString();
  const wTrips = tripDates(trips.filter((t) => t.startAt >= since), catches.filter((c) => c.at >= since)).length;
  const wBol = catches.filter((c) => c.species === '볼락' && c.at >= since).reduce((s, c) => s + c.count, 0);
  const newSp = new Set(catches.filter((c) => c.at >= since).map((c) => c.species)).size;
  return [
    { title: '이번 주 출조 2회', value: wTrips, goal: 2, reward: '+60 XP' },
    { title: '이번 주 볼락 10마리', value: wBol, goal: 10, reward: '+40 XP' },
    { title: '이번 주 어종 3가지', value: newSp, goal: 3, reward: '+80 XP' },
  ];
}
