import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from './useHousehold';

export function useStaples() {
  const { household, currentWeek } = useHousehold();
  const [staples, setStaples] = useState([]);
  const [dismissed, setDismissed] = useState(false);

  const fetchStaples = useCallback(async () => {
    if (!household) return;
    const { data } = await supabase
      .from('staples')
      .select('*')
      .eq('household_id', household.id)
      .gte('frequency_count', 3) // Only suggest items bought 3+ times
      .order('frequency_count', { ascending: false })
      .limit(5);

    if (data) setStaples(data);
  }, [household]);

  useEffect(() => {
    fetchStaples();
    // Check if already dismissed this week
    const dismissKey = `trolley_staples_dismissed_${currentWeek?.id}`;
    if (sessionStorage.getItem(dismissKey)) setDismissed(true);
  }, [fetchStaples, currentWeek]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    if (currentWeek) {
      sessionStorage.setItem(`trolley_staples_dismissed_${currentWeek.id}`, 'true');
    }
  }, [currentWeek]);

  const shouldShow = staples.length > 0 && !dismissed && currentWeek;

  return { staples, shouldShow, dismiss };
}
