import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from './useHousehold';

export function useWeekHistory() {
  const { household } = useHousehold();
  const [weeks, setWeeks] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchWeeks = useCallback(async () => {
    if (!household) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('weeks')
      .select('*')
      .eq('household_id', household.id)
      .order('week_start', { ascending: false })
      .limit(26); // ~6 months

    if (!error && data) setWeeks(data);
    setLoading(false);
  }, [household]);

  useEffect(() => {
    fetchWeeks();
  }, [fetchWeeks]);

  // Get items for a specific week
  const getWeekItems = useCallback(async (weekId) => {
    const { data } = await supabase
      .from('items')
      .select('*')
      .eq('week_id', weekId)
      .order('created_at', { ascending: true });
    return data || [];
  }, []);

  // Get last 8 weeks for the chart
  const chartData = weeks.slice(0, 8).reverse().map(w => ({
    week: new Date(w.week_start).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }),
    total: (parseFloat(w.aldi_actual) || 0) + (parseFloat(w.woolworths_actual) || 0),
    aldi: parseFloat(w.aldi_actual) || 0,
    woolworths: parseFloat(w.woolworths_actual) || 0
  }));

  const lastWeek = weeks.length > 1 ? weeks[1] : null;
  const lastWeekTotal = lastWeek
    ? (parseFloat(lastWeek.aldi_actual) || 0) + (parseFloat(lastWeek.woolworths_actual) || 0)
    : 0;

  return { weeks, chartData, lastWeek, lastWeekTotal, loading, fetchWeeks, getWeekItems };
}
