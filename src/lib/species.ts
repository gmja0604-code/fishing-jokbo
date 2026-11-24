export const SPECIES: Record<string, string> = {
  감성돔: '#3a6ea5',
  볼락: '#8a5cc2',
  고등어: '#1f9d8b',
  갈치: '#8d9aa1',
  무늬오징어: '#e0794a',
  우럭: '#6b7a3a',
  학꽁치: '#c9a227',
  참돔: '#e0566b',
  벵에돔: '#2f5d50',
  농어: '#5a7fa3',
  광어: '#a07a4f',
  쥐노래미: '#7a6a3a',
  붕어: '#7d8f3c',
  배스: '#4f7a3a',
};
export const SPECIES_LIST = Object.keys(SPECIES);
const EXTRA = ['#b5651d', '#4a8c8c', '#9c4f96', '#5f7d2e', '#c0504d', '#3d6b99', '#8a6d3b', '#2e8b57'];
/** 기본 14종은 고정 색, 직접 입력한 어종은 이름으로 색을 정한다 */
export const speciesColor = (s: string) => {
  if (SPECIES[s]) return SPECIES[s];
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return EXTRA[h % EXTRA.length];
};
/** 기본 어종 + 내가 직접 입력해서 기록한 어종 */
export const allSpecies = (catches: { species: string }[]) => [...SPECIES_LIST, ...new Set(catches.map((c) => c.species).filter((x) => !SPECIES[x]))];

export const REGULATION_NOTE = '예시 데이터이며 최신 해양수산부 고시를 확인하세요.';

/** 금어기·금지체장 (예시, 실제 앱은 해양수산부 고시로 갱신) */
export const REGULATIONS: { species: string; closed?: string; minCm?: number }[] = [
  { species: '감성돔', closed: '5.1 ~ 5.31', minCm: 25 },
  { species: '참돔', minCm: 24 },
  { species: '광어', minCm: 35 },
  { species: '쥐노래미', closed: '11.1 ~ 12.31 (일부 해역)', minCm: 20 },
  { species: '농어', minCm: 30 },
];
