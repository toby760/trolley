import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from './useHousehold';
import { estimatePrice, suggestStore } from '../lib/prices';

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
      .order('created_at', { ascending: true });

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

    // Clean up any existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    try {
      const channelName = `items-${currentWeek.id}-${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `week_id=eq.${currentWeek.id}`
        }, (payload) => {
          if (payload.eventType === 'INSERT') {
            setItems(prev => [...prev, payload.new]);
            // Create notification for other user
            if (payload.new.added_by !== currentUser) {
              createNotification(
                `${payload.new.added_by === 'T' ? 'Toby' : 'Orla'} added ${payload.new.name}`,
                currentUser
              );
            }
          } else if (payload.eventType === 'UPDATE') {
            setItems(prev => prev.map(i => i.id === payload.new.id ? payload.new : i));
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

  const addItem = useCallback(async (name, store, customPrice) => {
    if (!household || !currentWeek || !currentUser) return;

    const price = customPrice ?? estimatePrice(name, store, priceMemory);

    const { data, error } = await supabase
      .from('items')
      .insert({
        household_id: household.id,
        week_id: currentWeek.id,
        name,
        store,
        added_by: currentUser,
        estimated_price: price,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding item:', error);
      return null;
    }
    return data;
  }, [household, currentWeek, currentUser, priceMemory]);

  const toggleItem = useCallback(async (itemId) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const newStatus = item.status === 'done' ? 'active' : 'done';

    // Optimistic update - instant UI feedback
    setItems(prev => prev.map(i =>
      i.id === itemId ? { ...i, status: newStatus } : i
    ));

    // Then sync to server in background (no await blocking UI)
    supabase
      .from('items')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', itemId)
      .then(({ error }) => {
        if (error) {
          // Revert on failure
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
      .update({ store: 'woolworths', status: 'active', updated_at: new Date().toISOString() })
      .in('id', itemIds);
  }, []);

  const getSuggestedStore = useCallback((productName) => {
    return suggestStore(productName, priceMemory);
  }, [priceMemory]);

  const getEstimatedPrice = useCallback((productName, store) => {
    return estimatePrice(productName, store, priceMemory);
  }, [priceMemory]);

  // Computed values
  const aldiItems = items.filter(i => i.store === 'aldi');
  const woolworthsItems = items.filter(i => i.store === 'woolworths');
  const aldiTotal = aldiItems.reduce((sum, i) => sum + (parseFloat(i.estimated_price) || 0), 0);
  const woolworthsTotal = woolworthsItems.reduce((sum, i) => sum + (parseFloat(i.estimated_price) || 0), 0);
  const combinedTotal = aldiTotal + woolworthsTotal;
  const activeCount = items.filter(i => i.status === 'active').length;
  const doneCount = items.filter(i => i.status === 'done').length;

  return {
    items, aldiItems, woolworthsItems, loading,
    aldiTotal, woolworthsTotal, combinedTotal,
    activeCount, doneCount, priceMemory,
    addItem, toggleItem, deleteItem, updateItem,
    moveToWoolworths, getSuggestedStore, getEstimatedPrice,
    fetchItems, fetchPriceMemory
  };
}
