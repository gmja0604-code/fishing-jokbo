import { useCallback, useEffect, useState } from 'react';
import { fetchMarine, type MarineNow } from './marine';

const REFRESH_MS = 10 * 60 * 1000; // 10분마다 자동 갱신

export function useMarine(lat?: number, lng?: number) {
  const [data, setData] = useState<MarineNow | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null) return;
    let alive = true;
    const run = () => fetchMarine(lat, lng).then((d) => alive && setData(d));
    run();
    const t = setInterval(run, REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [lat, lng]);

  const refresh = useCallback(async () => {
    if (lat == null || lng == null) return;
    setLoading(true);
    setData(await fetchMarine(lat, lng));
    setLoading(false);
  }, [lat, lng]);

  return { data, loading, refresh };
}
