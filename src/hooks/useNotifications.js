import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from './useHousehold';

export function useNotifications() {
  const { household, currentUser } = useHousehold();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const channelRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!household || !currentUser) return;
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('household_id', household.id)
        .eq('for_user', currentUser)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.read).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [household, currentUser]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time notifications
  useEffect(() => {
    if (!household || !currentUser) return;

    // Clean up any existing channel first
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    try {
      const channelName = `notifications-${household.id}-${Date.now()}`;
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `for_user=eq.${currentUser}`
        }, (payload) => {
          setNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
        })
        .subscribe();

      channelRef.current = channel;

      return () => {
        supabase.removeChannel(channel);
        channelRef.current = null;
      };
    } catch (err) {
      console.error('Error setting up notifications channel:', err);
    }
  }, [household, currentUser]);

  const markAllRead = useCallback(async () => {
    if (!household || !currentUser) return;
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('household_id', household.id)
      .eq('for_user', currentUser)
      .eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, [household, currentUser]);

  return { notifications, unreadCount, markAllRead, fetchNotifications };
}
