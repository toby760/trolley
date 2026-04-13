import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useWeekHistory } from '../hooks/useWeekHistory';
import { IconChevronRight, IconTrendingUp } from '../lib/icons';

export default function History() {
  const { weeks, chartData, loading, getWeekItems } = useWeekHistory();
  const [expandedWeek, setExpandedWeek] = useState(null);
  const [weekItems, setWeekItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);

  const handleExpandWeek = async (week) => {
    if (expandedWeek?.id === week.id) {
      setExpandedWeek(null);
      return;
    }
    setExpandedWeek(week);
    setLoadingItems(true);
    const items = await getWeekItems(week.id);
    setWeekItems(items);
    setLoadingItems(false);
  };

  const formatWeekDate = (dateStr) => {
    const date = new Date(dateStr);
    const end = new Date(date);
    end.setDate(end.getDate() + 6);
    return `${date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} â ${end.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}`;
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Spending History</h1>
      </div>

      {/* Chart */}
      {chartData.length > 1 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <IconTrendingUp size={18} style={{ color: 'var(--green-400)' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-300)' }}>LAST 8 WEEKS</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: 'var(--gray-400)' }}
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
                  background: 'var(--green-700)', border: 'none',
                  borderRadius: 8, fontFamily: 'Nunito', fontWeight: 700, fontSize: 13
                }}
                formatter={(v, name) => [`$${v.toFixed(2)}`, name === 'aldi' ? 'Aldi' : 'Woolworths']}
              />
              <Bar dataKey="aldi" stackId="a" fill="var(--aldi-blue)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="woolworths" stackId="a" fill="var(--woolworths-green)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--gray-300)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--aldi-blue)' }} />
              Aldi
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--gray-300)' }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--woolworths-green)' }} />
              Woolworths
            </div>
          </div>
        </div>
      )}

      {/* Week list */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      ) : weeks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--gray-400)' }}>
          <p style={{ fontWeight: 700, fontSize: 16 }}>No history yet</p>
          <p style={{ fontSize: 13, marginTop: 4 }}>
            Your weekly shopping data will appear here after you start using Trolley
          </p>
        </div>
      ) : (
        weeks.map(week => {
          const weekTotal = (parseFloat(week.aldi_actual) || 0) + (parseFloat(week.woolworths_actual) || 0);
          const isExpanded = expandedWeek?.id === week.id;

          return (
            <div key={week.id} className="week-history-item" onClick={() => handleExpandWeek(week)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="week-date">{formatWeekDate(week.week_start)}</div>
                  <div className="week-spend">
                    {parseFloat(week.aldi_actual) > 0 && (
                      <span style={{ fontSize: 13, fontWeight: 700 }}>
                        <span className="store-badge aldi" style={{ fontSize: 10, marginRight: 4 }}>A</span>
                        ${parseFloat(week.aldi_actual).toFixed(2)}
                      </span>
                    )}
                    {parseFloat(week.woolworths_actual) > 0 && (
                      <span style={{ fontSize: 13, fontWeight: 700 }}>
                        <span className="store-badge woolworths" style={{ fontSize: 10, marginRight: 4 }}>W</span>
                        ${parseFloat(week.woolworths_actual).toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {weekTotal > 0 && <div className="week-total">${weekTotal.toFixed(2)}</div>}
                  <IconChevronRight
                    size={20}
                    style={{
                      color: 'var(--gray-400)',
                      transform: isExpanded ? 'rotate(90deg)' : 'none',
                      transition: 'transform 0.2s'
                    }}
                  />
                </div>
              </div>

              {isExpanded && (
                <div className="animate-slide-up" style={{ marginTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 12 }}>
                  {loadingItems ? (
                    <div style={{ textAlign: 'center', padding: 16 }}>
                      <div className="spinner" style={{ margin: '0 auto', width: 24, height: 24 }} />
                    </div>
                  ) : weekItems.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--gray-400)', textAlign: 'center' }}>No items recorded</p>
                  ) : (
                    <div>
                      {weekItems.map(item => (
                        <div key={item.id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '6px 0', fontSize: 13
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span className={`user-badge ${item.added_by === 'T' ? 'toby' : 'orla'}`} style={{ width: 18, height: 18, fontSize: 10 }}>
                              {item.added_by}
                            </span>
                            <span style={{ fontWeight: 600, textDecoration: item.status === 'done' ? 'line-through' : 'none', color: item.status === 'done' ? 'var(--gray-400)' : 'var(--white)' }}>
                              {item.name}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span className={`store-badge ${item.store}`} style={{ fontSize: 9 }}>
                              {item.store === 'aldi' ? 'A' : 'W'}
                            </span>
                            <span style={{ fontWeight: 700, color: 'var(--green-300)' }}>
                              ${parseFloat(item.estimated_price || 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {week.budget && (
                    <div style={{
                      marginTop: 8, padding: '8px 0', borderTop: '1px solid rgba(255,255,255,0.05)',
                      fontSize: 12, color: 'var(--gray-400)', fontWeight: 600
                    }}>
                      Budget: ${parseFloat(week.budget).toFixed(2)}
                      {weekTotal > 0 && weekTotal > parseFloat(week.budget) && (
                        <span style={{ color: 'var(--red-400)', marginLeft: 8 }}>
                          Over by ${(weekTotal - parseFloat(week.budget)).toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
