import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Catch, FishingPoint, ManualRecord, Trip } from './types';
import { SAMPLE_CATCHES, SAMPLE_POINTS, SAMPLE_TRIPS } from './sample';
import { uid } from './geo';
import { deletePhoto } from './photos';

export const STORAGE_KEY = 'jokbo-v1';

export interface AppData {
  points: FishingPoint[];
  catches: Catch[];
  trips: Trip[];
  records: ManualRecord[];
  bonusXp: number;
  activeTripId?: string;
  /** 받은 주간 퀘스트 보상: "주차키:퀘스트id" */
  questClaims: string[];
  /** 포인트 도착 알림(백그라운드) 켜짐 여부 */
  arrivalOn: boolean;
}

/** 백업 파일에서 읽은 값을 앱 데이터 모양으로 맞춘다. 모양이 틀리면 null */
export function normalizeData(raw: unknown): AppData | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Partial<AppData>;
  if (!Array.isArray(o.points) || !Array.isArray(o.catches)) return null;
  return {
    points: o.points,
    catches: o.catches,
    trips: Array.isArray(o.trips) ? o.trips : [],
    records: Array.isArray(o.records) ? o.records : [],
    bonusXp: typeof o.bonusXp === 'number' ? o.bonusXp : 0,
    activeTripId: undefined,
    questClaims: Array.isArray(o.questClaims) ? o.questClaims : [],
    arrivalOn: false,
  };
}

const initial: AppData = { points: SAMPLE_POINTS, catches: SAMPLE_CATCHES, trips: SAMPLE_TRIPS, records: [], bonusXp: 0, questClaims: [], arrivalOn: false };

interface Store extends AppData {
  ready: boolean;
  activeTrip?: Trip;
  addPoint: (p: Omit<FishingPoint, 'id' | 'createdAt'>) => FishingPoint;
  updatePoint: (id: string, patch: Partial<Omit<FishingPoint, 'id'>>) => void;
  /** 포인트와 그 포인트의 조과·출조 기록을 함께 지운다 */
  deletePoint: (id: string) => void;
  addCatch: (c: Omit<Catch, 'id'>) => Catch;
  updateCatch: (id: string, patch: Partial<Omit<Catch, 'id'>>) => void;
  deleteCatch: (id: string) => void;
  deleteRecord: (id: string) => void;
  claimQuest: (key: string, xp: number) => void;
  setArrivalOn: (on: boolean) => void;
  replaceAll: (d: AppData) => void;
  addRecord: (r: Omit<ManualRecord, 'id'>) => void;
  startTrip: (pointId: string) => Trip;
  endTrip: () => Trip | undefined;
  clearSamples: () => void;
  pointName: (id: string) => string;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(initial);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((s) => {
        if (s) setData({ ...initial, ...JSON.parse(s) });
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, []);

  useEffect(() => {
    if (loaded.current) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data]);

  const addPoint = useCallback((p: Omit<FishingPoint, 'id' | 'createdAt'>) => {
    const np = { ...p, id: uid('p'), createdAt: new Date().toISOString() };
    setData((d) => ({ ...d, points: [...d.points, np] }));
    return np;
  }, []);
  const updatePoint = useCallback((id: string, patch: Partial<Omit<FishingPoint, 'id'>>) => {
    setData((d) => ({ ...d, points: d.points.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));
  }, []);
  const deletePoint = useCallback((id: string) => {
    setData((d) => {
      d.catches.filter((c) => c.pointId === id).forEach((c) => deletePhoto(c.photoUri));
      const active = d.trips.find((t) => t.id === d.activeTripId);
      return {
        ...d,
        points: d.points.filter((p) => p.id !== id),
        catches: d.catches.filter((c) => c.pointId !== id),
        trips: d.trips.filter((t) => t.pointId !== id),
        activeTripId: active?.pointId === id ? undefined : d.activeTripId,
      };
    });
  }, []);
  const addCatch = useCallback((c: Omit<Catch, 'id'>) => {
    const nc = { ...c, id: uid('c') };
    setData((d) => ({ ...d, catches: [nc, ...d.catches] }));
    return nc;
  }, []);
  const updateCatch = useCallback((id: string, patch: Partial<Omit<Catch, 'id'>>) => {
    setData((d) => ({
      ...d,
      catches: d.catches.map((c) => {
        if (c.id !== id) return c;
        if ('photoUri' in patch && patch.photoUri !== c.photoUri) deletePhoto(c.photoUri);
        return { ...c, ...patch };
      }),
    }));
  }, []);
  const deleteCatch = useCallback((id: string) => {
    setData((d) => {
      deletePhoto(d.catches.find((c) => c.id === id)?.photoUri);
      return { ...d, catches: d.catches.filter((c) => c.id !== id) };
    });
  }, []);
  const deleteRecord = useCallback((id: string) => {
    setData((d) => ({ ...d, records: d.records.filter((r) => r.id !== id) }));
  }, []);
  const claimQuest = useCallback((key: string, xp: number) => {
    setData((d) => (d.questClaims.includes(key) ? d : { ...d, questClaims: [...d.questClaims, key], bonusXp: d.bonusXp + xp }));
  }, []);
  const setArrivalOn = useCallback((on: boolean) => setData((d) => ({ ...d, arrivalOn: on })), []);
  const replaceAll = useCallback((nd: AppData) => setData({ ...nd, arrivalOn: false }), []);
  const addRecord = useCallback((r: Omit<ManualRecord, 'id'>) => {
    setData((d) => ({ ...d, records: [{ ...r, id: uid('r') }, ...d.records] }));
  }, []);
  const startTrip = useCallback((pointId: string) => {
    const t: Trip = { id: uid('t'), pointId, startAt: new Date().toISOString() };
    setData((d) => ({ ...d, trips: [t, ...d.trips], activeTripId: t.id }));
    return t;
  }, []);
  const endTrip = useCallback(() => {
    let ended: Trip | undefined;
    setData((d) => {
      if (!d.activeTripId) return d;
      const endAt = new Date().toISOString();
      return {
        ...d,
        activeTripId: undefined,
        trips: d.trips.map((t) => (t.id === d.activeTripId ? (ended = { ...t, endAt }) : t)),
      };
    });
    return ended;
  }, []);
  const clearSamples = useCallback(() => {
    setData((d) => ({
      ...d,
      points: d.points.filter((p) => !p.sample),
      catches: d.catches.filter((c) => !c.sample),
      trips: d.trips.filter((t) => !t.sample),
    }));
  }, []);

  const value = useMemo<Store>(() => {
    const byId = new Map(data.points.map((p) => [p.id, p]));
    return {
      ...data,
      ready,
      activeTrip: data.trips.find((t) => t.id === data.activeTripId),
      addPoint,
      updatePoint,
      deletePoint,
      addCatch,
      updateCatch,
      deleteCatch,
      deleteRecord,
      claimQuest,
      setArrivalOn,
      replaceAll,
      addRecord,
      startTrip,
      endTrip,
      clearSamples,
      pointName: (id: string) => byId.get(id)?.name ?? '알 수 없는 포인트',
    };
  }, [data, ready, addPoint, updatePoint, deletePoint, addCatch, updateCatch, deleteCatch, deleteRecord, claimQuest, setArrivalOn, replaceAll, addRecord, startTrip, endTrip, clearSamples]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
