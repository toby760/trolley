import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from './useHousehold';

export function useShopTrips() {
  const { household } = useHousehold();
  const [pendingTrips, setPendingTrips] = useState([]);
  const [tripItems, setTripItems] = useState({});
  const [loading, setLoading] = useState(false);
  const channelRef = useRef(null);

  const fetchPendingTrips = useCallback(async () => {
    if (!household) return;
    setLoading(true);
    const { data: trips, error } = await supabase
      .from('shop_trips')
      .select('*')
      .eq('household_id', household.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (!error && trips) {
      setPendingTrips(trips);
      // fetch items for each trip
      if (trips.length > 0) {
        const { data: items } = await supabase
          .from('items')
          .select('*')
          .in('trip_id', trips.map(t => t.id));
        if (items) {
          const grouped = {};
          for (const it of items) {
            if (!grouped[it.trip_id]) grouped[it.trip_id] = [];
            grouped[it.trip_id].push(it);
          }
          setTripItems(grouped);
        }
      } else {
        setTripItems({});
      }
    }
    setLoading(false);
  }, [household]);

  useEffect(() => { fetchPendingTrips(); }, [fetchPendingTrips]);

  // Realtime: refetch whenever shop_trips or items change for this household
  useEffect(() => {
    if (!household) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    const channel = supabase
      .channel('shop_trips_' + household.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shop_trips', filter: 'household_id=eq.' + household.id }, () => fetchPendingTrips())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'items' }, () => fetchPendingTrips())
      .subscribe();
    channelRef.current = channel;
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [household, fetchPendingTrips]);

  const deleteTripItem = useCallback(async (itemId) => {
    setTripItems(prev => {
      const next = {};
      for (const tid of Object.keys(prev)) {
        next[tid] = prev[tid].filter(i => i.id !== itemId);
      }
      return next;
    });
    await supabase.from('items').delete().eq('id', itemId);
  }, []);

  const cancelTrip = useCallback(async (tripId) => {
    // un-assign items in trip (back to main list as 'done'), then delete the trip
    await supabase.from('items').update({ trip_id: null }).eq('trip_id', tripId);
    await supabase.from('shop_trips').delete().eq('id', tripId);
    fetchPendingTrips();
  }, [fetchPendingTrips]);

  return { pendingTrips, tripItems, loading, deleteTripItem, cancelTrip, refetch: fetchPendingTrips };
}
