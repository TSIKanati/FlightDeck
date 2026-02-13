import { useState, useEffect, useCallback } from 'react';

export interface UseMetricsOptions<T> {
  fetchFn: () => Promise<T>;
  interval?: number;
  enabled?: boolean;
}

export interface UseMetricsReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

export function useMetrics<T>({
  fetchFn,
  interval = 30000,
  enabled = true
}: UseMetricsOptions<T>): UseMetricsReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFn();
      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch metrics'));
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (!enabled) return;

    fetchData();

    if (interval > 0) {
      const timer = setInterval(fetchData, interval);
      return () => clearInterval(timer);
    }
  }, [fetchData, interval, enabled]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    lastUpdated
  };
}
