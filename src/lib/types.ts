export type PlaceType = '방파제' | '갯바위' | '선상' | '해변 원투' | '저수지' | '강' | '기타';

export interface FishingPoint {
  id: string;
  name: string;
  type: PlaceType;
  lat: number;
  lng: number;
  createdAt: string;
  sample?: boolean;
}

/** 기록하는 순간 자동으로 붙는 환경 정보 */
export interface Conditions {
  tide: string; // 물때 (예: 7물)
  waterTemp?: number; // 수온 °C
  airTemp?: number;
  wind?: number; // m/s
  wave?: number; // m
  moon?: string;
}

export interface Catch {
  id: string;
  pointId: string;
  at: string; // ISO
  species: string;
  count: number;
  sizeCm: number;
  rig: string;
  bait: string;
  memo?: string;
  photoUri?: string;
  cond: Conditions;
  sessionId?: string;
  sample?: boolean;
}

/** 출조 시작~종료 한 번 */
export interface Trip {
  id: string;
  pointId: string;
  startAt: string;
  endAt?: string;
  sample?: boolean;
}

/** 앱 쓰기 전 기록 등 직접 입력한 기록고기 */
export interface ManualRecord {
  id: string;
  species: string;
  sizeCm: number;
  date: string;
  place: string;
}
