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
export const speciesColor = (s: string) => SPECIES[s] ?? '#8d9aa1';

/** 금어기·금지체장 (예시, 실제 앱은 해양수산부 고시로 갱신) */
export const REGULATIONS: { species: string; closed?: string; minCm?: number }[] = [
  { species: '감성돔', closed: '5.1 ~ 5.31', minCm: 25 },
  { species: '참돔', minCm: 24 },
  { species: '광어', minCm: 35 },
  { species: '쥐노래미', closed: '11.1 ~ 12.31 (일부 해역)', minCm: 20 },
  { species: '농어', minCm: 30 },
];
