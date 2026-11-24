// 주변 편의시설: OpenStreetMap(Overpass, 키 없음)에서 화장실·식당·낚시점·주차장과 영업시간을 가져온다.
// 영업시간이 없는 곳은 카카오맵 검색 링크로 연결한다.
import { distanceM } from './geo';

export interface Amenity {
  kind: '화장실' | '식당' | '카페' | '편의점' | '낚시점' | '주차';
  name: string;
  dist: number;
  lat: number;
  lng: number;
  hours?: string;
  status?: { state: 'open' | 'soon' | 'closed' | 'unknown'; text: string };
}

const KIND = (t: Record<string, string>): Amenity['kind'] | null => {
  if (t.amenity === 'toilets') return '화장실';
  if (t.amenity === 'restaurant' || t.amenity === 'fast_food') return '식당';
  if (t.amenity === 'cafe') return '카페';
  if (t.shop === 'convenience') return '편의점';
  if (t.shop === 'fishing' || t.shop === 'outdoor') return '낚시점';
  if (t.amenity === 'parking') return '주차';
  return null;
};

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
/** opening_hours의 흔한 형태만 해석한다: "24/7", "10:00-21:00", "Mo-Fr 09:00-18:00; Sa,Su 10:00-20:00" */
export function openStatus(oh: string | undefined, now = new Date()): Amenity['status'] {
  if (!oh) return { state: 'unknown', text: '영업시간 정보 없음' };
  if (oh.trim() === '24/7') return { state: 'open', text: '24시간' };
  const kst = new Date(now.getTime() + 9 * 3600e3);
  const day = DAYS[kst.getUTCDay()];
  const mins = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  for (const part of oh.split(';').map((s) => s.trim())) {
    const m = part.match(/^(?:([A-Za-z,\- ]+)\s+)?(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    if (!m) continue;
    if (m[1] && !dayMatch(m[1], day)) continue;
    const open = +m[2] * 60 + +m[3];
    let close = +m[4] * 60 + +m[5];
    if (close <= open) close += 1440;
    const closeTxt = `${m[4].padStart(2, '0')}:${m[5]}`;
    if (mins < open) return { state: 'closed', text: `${m[2].padStart(2, '0')}:${m[3]} 영업 시작` };
    if (mins >= close) return { state: 'closed', text: `${closeTxt} 영업 종료` };
    if (close - mins <= 60) return { state: 'soon', text: `${closeTxt} 종료 · ${close - mins}분 남음` };
    return { state: 'open', text: `${closeTxt}까지 영업` };
  }
  return { state: 'unknown', text: oh };
}
function dayMatch(spec: string, day: string) {
  return spec.split(',').some((s) => {
    const [a, b] = s.trim().split('-');
    if (!b) return a === day;
    const ia = DAYS.indexOf(a === 'Su' ? 'Su' : a), ib = DAYS.indexOf(b), id = DAYS.indexOf(day);
    const order = (x: number) => (x + 6) % 7; // 월요일 시작
    return order(id) >= order(ia) && order(id) <= order(ib);
  });
}

export async function fetchAmenities(lat: number, lng: number, radius = 1000): Promise<Amenity[]> {
  const q = `[out:json][timeout:20];(
    node(around:${radius},${lat},${lng})[amenity~"^(toilets|restaurant|fast_food|cafe|parking)$"];
    node(around:${radius},${lat},${lng})[shop~"^(convenience|fishing|outdoor)$"];
    way(around:${radius},${lat},${lng})[amenity=parking];
  );out center 80;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(q) });
  const j = await res.json();
  const list: Amenity[] = [];
  for (const e of j.elements ?? []) {
    const t = e.tags ?? {};
    const kind = KIND(t);
    if (!kind) continue;
    const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon;
    if (la == null) continue;
    list.push({ kind, name: t['name:ko'] ?? t.name ?? (kind === '화장실' ? '공중화장실' : kind), dist: distanceM({ lat, lng }, { lat: la, lng: lo }), lat: la, lng: lo, hours: t.opening_hours, status: kind === '화장실' || kind === '주차' ? undefined : openStatus(t.opening_hours) });
  }
  return list.sort((a, b) => a.dist - b.dist);
}

export const kakaoSearchUrl = (name: string) => `https://map.kakao.com/link/search/${encodeURIComponent(name)}`;
export const kakaoMapUrl = (name: string, lat: number, lng: number) => `https://map.kakao.com/link/map/${encodeURIComponent(name)},${lat},${lng}`;
