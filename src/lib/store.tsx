import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Catch, FishingPoint, ManualRecord, Trip } from './types';
import { SAMPLE_CATCHES, SAMPLE_POINTS, SAMPLE_TRIPS } from './sample';
import { uid } from './geo';

export const STORAGE_KEY = 'jokbo-v1';

export interface AppData {
  points: FishingPoint[];
  catches: Catch[];
  trips: Trip[];
  records: ManualRecord[];
  bonusXp: number;
  activeTripId?: string;
}

const initial: AppData = { points: SAMPLE_POINTS, catches: SAMPLE_CATCHES, trips: SAMPLE_TRIPS, records: [], bonusXp: 0 };

interface Store extends AppData {
  ready: boolean;
  activeTrip?: Trip;
  addPoint: (p: Omit<FishingPoint, 'id' | 'createdAt'>) => FishingPoint;
  addCatch: (c: Omit<Catch, 'id'>) => Catch;
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
  const addCatch = useCallback((c: Omit<Catch, 'id'>) => {
    const nc = { ...c, id: uid('c') };
    setData((d) => ({ ...d, catches: [nc, ...d.catches] }));
    return nc;
  }, []);
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
        bonusXp: d.bonusXp + 30,
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
      addCatch,
      addRecord,
      startTrip,
      endTrip,
      clearSamples,
      pointName: (id: string) => byId.get(id)?.name ?? '알 수 없는 포인트',
    };
  }, [data, ready, addPoint, addCatch, addRecord, startTrip, endTrip, clearSamples]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
