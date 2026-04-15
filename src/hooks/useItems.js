import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from './useHousehold';
import { estimatePrice, suggestStore } from '../lib/prices';
import { getPriceWithGatekeeper } from '../lib/priceLookup';

export function useItems() {
  const { household, currentWeek, currentUser } = useHousehold();
  const [items, setItems] = useState([]);
  const [priceMemory, setPriceMemory] = useState([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef(null);

  // Fetch items for current week
  const fetchItems = useCallback(async () => {
    if (!household || !currentWeek) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('household_id', household.id)
      .eq('week_id', currentWeek.id)
      .is('trip_id', null)
      .order('sort_order', { ascending: true }).order('created_at', { ascending: true });
    if (!error && data) setItems(data);
    setLoading(false);
  }, [household, currentWeek]);

  // Fetch price memory
  const fetchPriceMemory = useCallback(async () => {
    if (!household) return;
    const { data } = await supabase
      .from('price_memory')
      .select('*')
      .eq('household_id', household.id);
    if (data) setPriceMemory(data);
  }, [household]);

  // Initial fetch
  useEffect(() => {
    fetchItems();
    fetchPriceMemory();
  }, [fetchItems, fetchPriceMemory]);

  // Real-time subscription
  useEffect(() => {
    if (!household || !currentWeek) return;
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    try {
      const channelName = `items-${currentWeek.id}-${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'items',
          filter: `week_id=eq.${currentWeek.id}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems(prev => [...prev, payload.new]);
            if (payload.new.added_by !== currentUser) {
              createNotification(
                `${payload.new.added_by === 'T' ? 'Toby' : 'Orla'} added ${payload.new.name}`,
                currentUser
              );
            }
          } else if (payload.eventType === 'UPDATE') {
            setItems(prev => prev.map(i =>
              i.id === payload.new.id ? payload.new : i
            ));
          } else if (payload.eventType === 'DELETE') {
            setItems(prev => prev.filter(i => i.id !== payload.old.id));
          }
        })
        .subscribe();
      channelRef.current = channel;
      return () => {
        supabase.removeChannel(channel);
        channelRef.current = null;
      };
    } catch (err) {
      console.error('Error setting up items channel:', err);
    }
  }, [household, currentWeek, currentUser]);

  const createNotification = async (message, forUser) => {
    if (!household) return;
    await supabase.from('notifications').insert({
      household_id: household.id,
      type: 'item_added',
      message,
      for_user: forUser
    });
  };

  // Add item - inserts immediately with null price, then resolves price in
  // background. Realtime subscription picks up the UPDATE and refreshes.
  //
  // options.mode: 'typed' | 'photo' (default 'typed').
  //   'typed' -> Gatekeeper tries receipt memory + SERP memory only; on
  //              miss, we fall back to estimatePrice. NO live SerpApi.
  //   'photo' -> Gatekeeper can make a live SerpApi call after the two
  //              cache tiers miss, because Smart Photo gives us exact
  //              brand + size which justifies the credit.
  const addItem = useCallback(async (name, store, options = {}) => {
    if (!household || !currentWeek || !currentUser) return null;
    const { brand = '', weight = '', mode = 'typed' } = options || {};

    // Insert row immediately with null price so the modal can close.
    const { data, error } = await supabase
      .from('items')
      .insert({
        household_id: household.id,
        week_id: currentWeek.id,
        name,
        store,
        added_by: currentUser,
        estimated_price: null,
        status: 'active',
        sort_order: Date.now()
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding item:', error);
      return null;
    }

    // Fire-and-forget: resolve price in background, then update row.
    if (data) {
      const itemId = data.id;
      (async () => {
        let resolved = null;
        try {
          const result = await getPriceWithGatekeeper({
            name, brand, weight, store,
            householdId: household.id,
            mode
          });
          if (result && typeof result.price === 'number' && result.price > 0) {
            resolved = result.price;
          }
          if (result && result.source === 'serpapi-fresh') {
            fetchPriceMemory?.();
          }
        } catch (err) {
          console.warn('Background price lookup failed:', err && err.message);
        }
        // Fallback to heuristic estimate so the row never stays stuck.
        if (resolved == null) {
          resolved = estimatePrice(name, store, priceMemory);
        }
        try {
          await supabase
            .from('items')
            .update({
              estimated_price: resolved,
              updated_at: new Date().toISOString()
            })
            .eq('id', itemId);
        } catch (err) {
          console.warn('Failed to update item price:', err && err.message);
        }
      })();
    }

    return data;
  }, [household, currentWeek, currentUser, priceMemory, fetchPriceMemory]);

  const toggleItem = useCallback(async (itemId) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const newStatus = item.status === 'done' ? 'active' : 'done';
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, status: newStatus } : i
    ));
    supabase
      .from('items')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .then(({ error }) => {
        if (error) {
          setItems(prev => prev.map(i =>
            i.id === itemId ? { ...i, status: item.status } : i
          ));
        }
      });
  }, [items]);

  const deleteItem = useCallback(async (itemId) => {
    await supabase.from('items').delete().eq('id', itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const updateItem = useCallback(async (itemId, updates) => {
    await supabase
      .from('items')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', itemId);
  }, []);

  const moveToWoolworths = useCallback(async (itemIds) => {
    await supabase
      .from('items')
      .update({
        store: 'woolworths',
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .in('id', itemIds);
  }, []);

  const finishShop = useCallback(async (store) => {
    if (!household || !currentWeek) return { error: 'no household/week' };
    const storeItems = items.filter(i => i.store === store && i.trip_id == null);
    const ticked = storeItems.filter(i => i.status === 'done');
    const unticked = storeItems.filter(i => i.status === 'active');
    if (ticked.length === 0 && unticked.length === 0) return { error: 'no items' };
    // 1. Create the pending trip
    const { data: trip, error: tripErr } = await supabase
      .from('shop_trips')
      .insert({
        household_id: household.id,
        week_id: currentWeek.id,
        store,
        status: 'pending'
      })
      .select()
      .single();
    if (tripErr) return { error: tripErr };
    // 2. Assign ticked items to the trip (they disappear from active list)
    if (ticked.length > 0) {
      await supabase
        .from('items')
        .update({ trip_id: trip.id, updated_at: new Date().toISOString() })
        .in('id', ticked.map(i => i.id));
    }
    // 3. If finishing Aldi, roll unticked items to Woolworths
    if (store === 'aldi' && unticked.length > 0) {
      await supabase
        .from('items')
        .update({ store: 'woolworths', updated_at: new Date().toISOString() })
        .in('id', unticked.map(i => i.id));
    }
    // Optimistic local removal of ticked items + rolled items
    setItems(prev => prev.filter(i => {
      if (ticked.find(t => t.id === i.id)) return false;
      return true;
    }).map(i => {
      if (store === 'aldi' && unticked.find(u => u.id === i.id)) {
        return { ...i, store: 'woolworths' };
      }
      return i;
    }));
    return { trip };
  }, [household, currentWeek, items]);

  const getSuggestedStore = useCallback((productName) => {
    return suggestStore(productName, priceMemory);
  }, [priceMemory]);

  const getEstimatedPrice = useCallback((productName, store) => {
    return estimatePrice(productName, store, priceMemory);
  }, [priceMemory]);

  const aldiItems = items.filter(i => i.store === 'aldi');
  const woolworthsItems = items.filter(i => i.store === 'woolworths');
  const aldiTotal = aldiItems.reduce((sum, i) =>
    sum + (parseFloat(i.estimated_price) || 0), 0);
  const woolworthsTotal = woolworthsItems.reduce((sum, i) =>
    sum + (parseFloat(i.estimated_price) || 0), 0);
  const combinedTotal = aldiTotal + woolworthsTotal;
  const activeCount = items.filter(i => i.status === 'active').length;
  const doneCount = items.filter(i => i.status === 'done').length;

  // Reorder items within a single store by writing new sort_order values
  // in one bulk update. Optimistic UI: mutate local state first, then sync.
  const reorderItem = async (store, orderedIds) => {
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) return;
    // Optimistic local reorder
    setItems(prev => {
      const byId = new Map(prev.map(i => [i.id, i]));
      const reordered = orderedIds.map((id, idx) => {
        const it = byId.get(id);
        return it ? { ...it, sort_order: idx + 1 } : null;
      }).filter(Boolean);
      const others = prev.filter(i => !orderedIds.includes(i.id));
      return [...others, ...reordered];
    });
    // Persist: one UPDATE per id (Supabase has no bulk update by pk list)
    const updates = orderedIds.map((id, idx) =>
      supabase.from('items').update({ sort_order: idx + 1 }).eq('id', id)
    );
    const results = await Promise.all(updates);
    const failed = results.filter(r => r.error);
    if (failed.length > 0) {
      console.error('reorderItem failed:', failed.map(r => r.error));
      // Re-fetch to recover from partial failure
      fetchItems();
    }
  };

  return {
    items, aldiItems, woolworthsItems, loading,
    aldiTotal, woolworthsTotal, combinedTotal,
    activeCount, doneCount, priceMemory,
    addItem, toggleItem, deleteItem, updateItem, reorderItem,
    moveToWoolworths,
    finishShop, getSuggestedStore, getEstimatedPrice,
    fetchItems, fetchPriceMemory
  };
}
