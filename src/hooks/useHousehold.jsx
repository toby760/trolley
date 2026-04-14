import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { supabase } from '../lib/supabase';

const HouseholdContext = createContext(null);

// Household access PIN — locked to 2525
const HOUSEHOLD_PIN = '2525';

export function HouseholdProvider({ children }) {
  const [household, setHousehold] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // 'T' or 'O'
  const [currentWeek, setCurrentWeek] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check for saved session
  useEffect(() => {
    const saved = sessionStorage.getItem('trolley_session');
    if (saved) {
      try {
        const { household: h, user } = JSON.parse(saved);
        setHousehold(h);
        setCurrentUser(user);
      } catch (e) { /* ignore */ }
    }
    setLoading(false);
  }, []);

  // Get or create current week when household is set
  useEffect(() => {
    if (!household) return;
    getOrCreateWeek(household.id);
  }, [household]);

  const getOrCreateWeek = async (householdId) => {
    try {
      const { data, error } = await supabase.rpc('get_or_create_week', {
        p_household_id: householdId
      });
      if (error) throw error;

      // Fetch the full week record
      const { data: week } = await supabase
        .from('weeks')
        .select('*')
        .eq('id', data)
        .single();

      setCurrentWeek(week);
    } catch (err) {
      console.error('Error getting current week:', err);
      // Fallback: try direct query
      const today = new Date();
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      const weekStart = monday.toISOString().split('T')[0];

      const { data: existing } = await supabase
        .from('weeks')
        .select('*')
        .eq('household_id', householdId)
        .eq('week_start', weekStart)
        .single();

      if (existing) {
        setCurrentWeek(existing);
      } else {
        const { data: created } = await supabase
          .from('weeks')
          .insert({ household_id: householdId, week_start: weekStart })
          .select()
          .single();
        setCurrentWeek(created);
      }
    }
  };

  const loginWithPin = useCallback(async (pin) => {
    // PIN is locked to 2525 for this household
    if (pin !== HOUSEHOLD_PIN) {
      throw new Error('Invalid PIN');
    }

    const { data, error } = await supabase
      .from('households')
      .select('*')
      .eq('pin', pin)
      .single();

    if (error || !data) {
      // Try to create new household with the locked PIN
      const { data: newHousehold, error: createErr } = await supabase
        .from('households')
        .insert({ pin })
        .select()
        .single();

      if (createErr) throw new Error('Invalid PIN or could not create household');
      return newHousehold;
    }
    return data;
  }, []);

  const selectUser = useCallback((user, householdData) => {
    const h = householdData || household;
    setHousehold(h);
    setCurrentUser(user);
    sessionStorage.setItem('trolley_session', JSON.stringify({
      household: h, user
    }));
  }, [household]);

  const logout = useCallback(() => {
    setHousehold(null);
    setCurrentUser(null);
    setCurrentWeek(null);
    sessionStorage.removeItem('trolley_session');
  }, []);

  return (
    <HouseholdContext.Provider value={{
      household, currentUser, currentWeek, loading,
      loginWithPin, selectUser, logout, getOrCreateWeek
    }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (!context) throw new Error('useHousehold must be inside HouseholdProvider');
  return context;
}
