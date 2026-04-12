import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useHousehold } from '../hooks/useHousehold';
import { useItems } from '../hooks/useItems';
import { useWeekHistory } from '../hooks/useWeekHistory';
import { useNotifications } from '../hooks/useNotifications';
import { useStaples } from '../hooks/useStaples';
import { supabase } from '../lib/supabase';
import { IconBell, IconPlus, IconCart, IconTrendingUp, IconDollar } from '../lib/icons';
import NotificationPanel from '../components/NotificationPanel';

export default function Dashboard({ onOpenAddItem }) {
  const navigate = useNavigate();
  const { household, currentWeek, currentUser, logout } = useHousehold();
  const { combinedTotal, aldiTotal, woolworthsTotal, activeCount, doneCount, addItem } = useItems();
  const { chartData, lastWeek, lastWeekTotal } = useWeekHistory();
  const { unreadCount } = useNotifications();
  const { staples, shouldShow: showStaples, dismiss: dismissStaples } = useStaples();
  const [budget, setBudget] = useState(currentWeek?.budget || 200);
  const [editingBudget, setEditingBudget] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    if (currentWeek?.budget) setBudget(parseFloat(currentWeek.budget));
  }, [currentWeek]);

  const budgetPercent = budget > 0 ? Math.min((combinedTotal / budget) * 100, 100) : 0;
  const budgetStatus = budgetPercent >= 100 ? 'over' : budgetPercent >= 90 ? 'warning' : 'good';
  const budgetColor = budgetStatus === 'over' ? 'var(--budget-over)'
    : budgetStatus === 'warning' ? 'var(--budget-warning)'
    : 'var(--budget-good)';

  const handleBudgetSave = async () => {
    if (currentWeek) {
      await supabase.from('weeks').update({ budget }).eq('id', currentWeek.id);
    }
    setEditingBudget(false);
  };

  const handleAddAllStaples = async () => {
    for (const s of staples) {
      await addItem(s.product_name, s.store || 'aldi');
    }
    dismissStaples();
  };

  const otherUser = currentUser === 'T' ? 'Orla' : 'Toby';

  return (
    <div className="page-content">
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ fontSize: 14, color: 'var(--gray-300)', fontWeight: 700 }}>
            Hi {currentUser === 'T' ? 'Toby' : 'Orla'}
          </div>
          <h1 className="page-title">This Week</h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="notif-bell" onClick={() => setShowNotifs(true)} style={{ position: 'relative' }}>
            <IconBell size={20} />
            {unreadCount > 0 && <span className="notif-count">{unreadCount}</span>}
          </button>
          <button
            onClick={logout}
            style={{
              background: 'var(--green-700)', border: 'none', color: 'var(--gray-400)',
              padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontFamily: 'Nunito',
              fontWeight: 700, fontSize: 12, cursor: 'pointer'
            }}
          >
            Switch User
          </button>
        </div>
      </div>

      {/* Staples suggestion */}
      {showStaples && (
        <div className="staples-prompt">
          <h3>Add your usuals?</h3>
          <div className="staples-items">
            {staples.map(s => (
              <span key={s.id} className="staple-chip">{s.product_name}</span>
            ))}
          </div>
          <div className="staples-actions">
            <button className="btn btn-primary" style={{ flex: 1, padding: '10px 16px', fontSize: 14 }} onClick={handleAddAllStaples}>
              Add All
            </button>
            <button className="btn btn-secondary" style={{ padding: '10px 16px', fontSize: 14 }} onClick={dismissStaples}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Budget card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-300)' }}>WEEKLY BUDGET</div>
          {currentUser === 'T' && (
            <button
              onClick={() => editingBudget ? handleBudgetSave() : setEditingBudget(true)}
              style={{
                background: 'none', border: 'none', color: 'var(--green-400)',
                fontFamily: 'Nunito', fontWeight: 700, fontSize: 13, cursor: 'pointer'
              }}
            >
              {editingBudget ? 'Save' : 'Edit'}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: budgetColor }}>
            ${combinedTotal.toFixed(2)}
          </span>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-400)' }}>
            / {editingBudget ? (
              <input
                type="number"
                value={budget}
                onChange={e => setBudget(parseFloat(e.target.value) || 0)}
                onBlur={handleBudgetSave}
                onKeyDown={e => e.key === 'Enter' && handleBudgetSave()}
                style={{
                  width: 80, background: 'var(--green-700)', border: '1px solid var(--green-500)',
                  borderRadius: 6, padding: '4px 8px', color: 'var(--white)', fontFamily: 'Nunito',
                  fontSize: 16, fontWeight: 700
                }}
                inputMode="decimal"
                autoFocus
              />
            ) : (
              `$${budget.toFixed(0)}`
            )}
          </span>
        </div>

        <div className="budget-bar">
          <div className="budget-fill" style={{ width: `${budgetPercent}%`, background: budgetColor }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--gray-400)', fontWeight: 600 }}>
          <span>{budgetPercent.toFixed(0)}% of budget</span>
          <span style={{ color: budgetColor }}>
            {budgetStatus === 'over' ? 'Over budget!' : budgetStatus === 'warning' ? 'Almost there' : 'On track'}
          </span>
        </div>
      </div>

      {/* Stats row */}
      <div className="stat-row">
        <div className="stat-card">
          <div className="stat-label">Items</div>
          <div className="stat-value">{activeCount + doneCount}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600, marginTop: 2 }}>
            {doneCount} done
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Last Week</div>
          <div className="stat-value" style={{ color: 'var(--green-300)' }}>
            {lastWeekTotal > 0 ? `$${lastWeekTotal.toFixed(0)}` : '—'}
          </div>
          {lastWeek && (
            <div style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 600, marginTop: 2 }}>
              A: ${parseFloat(lastWeek.aldi_actual || 0).toFixed(0)} W: ${parseFloat(lastWeek.woolworths_actual || 0).toFixed(0)}
            </div>
          )}
        </div>
      </div>

      {/* Store totals */}
      <div className="stat-row">
        <div className="stat-card" style={{ borderLeft: '3px solid var(--aldi-blue)' }}>
          <div className="stat-label">Aldi Est.</div>
          <div className="stat-value" style={{ fontSize: 20 }}>${aldiTotal.toFixed(2)}</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--woolworths-green)' }}>
          <div className="stat-label">Woolworths Est.</div>
          <div className="stat-value" style={{ fontSize: 20 }}>${woolworthsTotal.toFixed(2)}</div>
        </div>
      </div>

      {/* Spend chart */}
      {chartData.length > 1 && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <IconTrendingUp size={18} style={{ color: 'var(--green-400)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-300)' }}>WEEKLY SPEND</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: 'var(--gray-400)' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--gray-400)' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={v => `$${v}`}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--green-700)',
                  border: 'none',
                  borderRadius: 8,
                  fontFamily: 'Nunito',
                  fontWeight: 700,
                  fontSize: 13
                }}
                formatter={(v) => [`$${v.toFixed(2)}`, '']}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke="var(--green-400)"
                strokeWidth={3}
                dot={{ fill: 'var(--green-400)', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quick actions */}
      <button
        className="btn btn-primary btn-full"
        style={{ marginTop: 8, fontSize: 18 }}
        onClick={() => navigate('/list')}
      >
        <IconCart size={22} />
        View Shopping List
      </button>

      {/* FAB */}
      <button className="fab" onClick={onOpenAddItem}>
        <IconPlus size={28} />
      </button>

      {/* Notification panel */}
      <NotificationPanel open={showNotifs} onClose={() => setShowNotifs(false)} />
    </div>
  );
}
