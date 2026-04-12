import React from 'react';
import { IconX, IconBell } from '../lib/icons';
import { useNotifications } from '../hooks/useNotifications';

export default function NotificationPanel({ open, onClose }) {
  const { notifications, markAllRead } = useNotifications();

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet" style={{ maxHeight: '60vh' }}>
        <div className="modal-handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Notifications</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {notifications.some(n => !n.read) && (
              <button
                onClick={markAllRead}
                style={{
                  background: 'none', border: 'none', color: 'var(--green-400)',
                  fontFamily: 'Nunito', fontWeight: 700, fontSize: 14, cursor: 'pointer'
                }}
              >
                Mark all read
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gray-300)', cursor: 'pointer', padding: 8 }}>
              <IconX size={24} />
            </button>
          </div>
        </div>

        {notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--gray-400)' }}>
            <IconBell size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <p style={{ fontWeight: 700 }}>No notifications yet</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>
              You'll see updates here when {'\n'}the other person adds items
            </p>
          </div>
        ) : (
          <div style={{ maxHeight: '40vh', overflowY: 'auto' }}>
            {notifications.map(notif => (
              <div
                key={notif.id}
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  opacity: notif.read ? 0.5 : 1
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  {!notif.read && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: 'var(--green-400)', flexShrink: 0
                    }} />
                  )}
                  <p style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{notif.message}</p>
                </div>
                <p style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4, marginLeft: notif.read ? 0 : 16 }}>
                  {formatTimeAgo(notif.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
