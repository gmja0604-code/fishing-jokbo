// 실시간 바다·날씨 정보: Open-Meteo (키 없음). 정식 출시 때 기상청·바다누리로 교체 가능하도록 이 파일에만 모아 둔다.
import { tideName, moonPhase } from './lunar';

export interface HourPoint { time: string; value: number }
export interface MarineNow {
  fetchedAt: string;
  airTemp?: number;
  wind?: number;
  windDir?: number;
  weatherCode?: number;
  waterTemp?: number;
  wave?: number;
  tide: string;
  moon: string;
  seaLevel: HourPoint[]; // 오늘 시간별 해수면 높이(m) → 조석 곡선
  hourly: { time: string; wind?: number; wave?: number; code?: number; temp?: number }[];
  sunrise?: string;
  sunset?: string;
  error?: string;
}

const pick = (times: string[], arr: (number | null)[] | undefined, now: Date) => {
  if (!arr) return undefined;
  const key = now.toISOString().slice(0, 13);
  // times는 Asia/Seoul 현지 시각 문자열 → 현지 시각 기준으로 비교
  const local = new Date(now.getTime() + 9 * 3600e3).toISOString().slice(0, 13);
  const i = times.findIndex((t) => t.startsWith(local) || t.startsWith(key));
  const v = arr[i >= 0 ? i : 0];
  return v ?? undefined;
};

export async function fetchMarine(lat: number, lng: number): Promise<MarineNow> {
  const now = new Date();
  const base: MarineNow = { fetchedAt: now.toISOString(), tide: tideName(now), moon: moonPhase(now), seaLevel: [], hourly: [] };
  try {
    const wUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
      `&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code` +
      `&hourly=temperature_2m,wind_speed_10m,weather_code&daily=sunrise,sunset` +
      `&wind_speed_unit=ms&timezone=Asia%2FSeoul&forecast_days=2`;
    const mUrl =
      `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lng}` +
      `&hourly=wave_height,sea_surface_temperature,sea_level_height_msl&timezone=Asia%2FSeoul&forecast_days=2`;
    const [w, m] = await Promise.all([fetch(wUrl).then((r) => r.json()), fetch(mUrl).then((r) => r.json())]);
    const mt: string[] = m?.hourly?.time ?? [];
    const wt: string[] = w?.hourly?.time ?? [];
    const today = new Date(now.getTime() + 9 * 3600e3).toISOString().slice(0, 10);
    const hourNow = new Date(now.getTime() + 9 * 3600e3).toISOString().slice(0, 13);
    return {
      ...base,
      airTemp: w?.current?.temperature_2m,
      wind: w?.current?.wind_speed_10m,
      windDir: w?.current?.wind_direction_10m,
      weatherCode: w?.current?.weather_code,
      waterTemp: pick(mt, m?.hourly?.sea_surface_temperature, now),
      wave: pick(mt, m?.hourly?.wave_height, now),
      seaLevel: mt
        .map((t, i) => ({ time: t, value: m.hourly.sea_level_height_msl?.[i] }))
        .filter((p): p is HourPoint => p.time.startsWith(today) && typeof p.value === 'number'),
      hourly: wt
        .map((t, i) => ({
          time: t,
          wind: w.hourly.wind_speed_10m?.[i],
          temp: w.hourly.temperature_2m?.[i],
          code: w.hourly.weather_code?.[i],
          wave: m?.hourly?.wave_height?.[mt.indexOf(t)] ?? undefined,
        }))
        .filter((h) => h.time >= hourNow)
        .filter((_, i) => i % 3 === 0)
        .slice(0, 8),
      sunrise: w?.daily?.sunrise?.[0]?.slice(11, 16),
      sunset: w?.daily?.sunset?.[0]?.slice(11, 16),
    };
  } catch {
    return { ...base, error: '바다 정보를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.' };
  }
}

export function weatherText(code?: number): string {
  if (code == null) return '-';
  if (code === 0) return '맑음';
  if (code <= 2) return '구름 조금';
  if (code === 3) return '흐림';
  if (code <= 48) return '안개';
  if (code <= 67) return '비';
  if (code <= 77) return '눈';
  if (code <= 82) return '소나기';
  return '뇌우';
}

export function windDirText(deg?: number): string {
  if (deg == null) return '';
  const d = ['북', '북동', '동', '남동', '남', '남서', '서', '북서'];
  return d[Math.round(deg / 45) % 8];
}

/** 간단한 오늘 낚시 지수 (0~100). 2차에서 족보와 어종별 입질 확률을 더한다. */
export function fishingIndex(m: Pick<MarineNow, 'tide' | 'wind' | 'wave' | 'waterTemp'>): number {
  const order = ['조금', '무시', '1물', '2물', '3물', '4물', '5물', '6물', '7물', '8물', '9물', '10물', '11물', '12물', '13물'];
  const t = order.indexOf(m.tide);
  const tideS = t >= 6 && t <= 10 ? 40 : t >= 4 && t <= 12 ? 28 : 15;
  const w = m.wind ?? 3;
  const windS = w < 4 ? 30 : w < 7 ? 18 : 5;
  const wave = m.wave ?? 0.5;
  const waveS = wave < 1 ? 30 : wave < 2 ? 15 : 0;
  return Math.min(100, tideS + windS + waveS);
}
