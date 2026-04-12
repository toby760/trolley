import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useHousehold } from './useHousehold';

export function useNotifications() {
  const { household, currentUser } = useHousehold();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    if (!household || !currentUser) return;
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
  }, [household, currentUser]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Real-time notifications
  useEffect(() => {
    if (!household || !currentUser) return;

    const channel = supabase
      .channel('notifications-changes')
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

    return () => supabase.removeChannel(channel);
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
