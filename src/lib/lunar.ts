// 달 나이로 음력 날짜와 물때(남해 7물때식)를 근사 계산한다.
const SYNODIC = 29.530588853;
const NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14); // 2000-01-06 18:14 UTC 삭

export function moonAge(d: Date = new Date()): number {
  const days = (d.getTime() - NEW_MOON_REF) / 864e5;
  return ((days % SYNODIC) + SYNODIC) % SYNODIC;
}

/** 음력 날짜 1~30 (근사) */
export function lunarDay(d: Date = new Date()): number {
  // 한국 시간 기준 자정으로 맞춘다
  const kst = new Date(d.getTime() + 9 * 3600e3);
  const day0 = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate(), 3)); // KST 12시
  return Math.floor(moonAge(day0)) + 1;
}

const SEQ = ['8물', '9물', '10물', '11물', '12물', '13물', '조금', '무시', '1물', '2물', '3물', '4물', '5물', '6물', '7물'];
export const TIDE_ORDER = ['조금', '무시', '1물', '2물', '3물', '4물', '5물', '6물', '7물', '8물', '9물', '10물', '11물', '12물', '13물'];

export function tideName(d: Date = new Date()): string {
  return SEQ[(lunarDay(d) - 1) % 15];
}

export function moonPhase(d: Date = new Date()): string {
  const a = moonAge(d);
  if (a < 1.5 || a > 28) return '그믐·삭';
  if (a < 6.5) return '초승달';
  if (a < 8.5) return '상현달';
  if (a < 13.5) return '차오르는 달';
  if (a < 16) return '보름달';
  if (a < 21) return '기우는 달';
  if (a < 23) return '하현달';
  return '그믐달';
}

/** 물때 그룹 (족보 집계용) */
export function tideGroup(t: string): string {
  const i = TIDE_ORDER.indexOf(t);
  if (i < 0) return '-';
  if (i <= 4) return '조금~3물';
  if (i <= 7) return '4~6물';
  if (i <= 10) return '7~9물';
  return '10~13물';
}
