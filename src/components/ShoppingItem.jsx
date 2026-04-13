import React from 'react';
import { IconCheck, IconTrash, IconEdit } from '../lib/icons';

export default function ShoppingItem({ item, onToggle, onDelete, onEdit }) {
  const isDone = item.status === 'done';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 10px',
      background: isDone ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
      borderRadius: 12,
      marginBottom: 8,
      minHeight: 56,
      opacity: isDone ? 0.6 : 1,
      transition: 'opacity 0.2s, background 0.2s',
    }}>
      {/* Tick / Check button */}
      <button
        onClick={() => onToggle(item.id)}
        style={{
          width: 40,
          height: 40,
          minWidth: 40,
          borderRadius: '50%',
          border: isDone ? 'none' : '2.5px solid var(--gray-400)',
          background: isDone ? 'var(--green-500)' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.2s',
          padding: 0,
          flexShrink: 0,
        }}
        aria-label={isDone ? 'Uncheck item' : 'Check item off'}
      >
        {isDone && <IconCheck size={20} style={{ color: 'white' }} />}
      </button>

      {/* Item info - grows to fill space */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{
          fontSize: 16,
          fontWeight: 600,
          color: isDone ? 'var(--gray-400)' : 'var(--gray-50)',
          textDecoration: isDone ? 'line-through' : 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          transition: 'color 0.2s',
        }}>
          {item.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{
            display: 'inline-block',
            padding: '1px 6px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            background: item.added_by === 'T' ? 'rgba(96,165,250,0.2)' : 'rgba(244,114,182,0.2)',
            color: item.added_by === 'T' ? '#93bbfc' : '#f9a8d4',
          }}>
            {item.added_by}
          </span>
          <span style={{
            fontSize: 14,
            fontWeight: 700,
            color: isDone ? 'var(--gray-500)' : 'var(--green-300)',
            textDecoration: isDone ? 'line-through' : 'none',
          }}>
            ${parseFloat(item.estimated_price || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Action buttons - always visible */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {/* Edit (pencil) */}
        <button
          onClick={() => onEdit(item)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            border: 'none',
            background: 'rgba(96,165,250,0.15)',
            color: '#93bbfc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            transition: 'background 0.15s',
          }}
          aria-label="Edit item"
        >
          <IconEdit size={18} />
        </button>

        {/* Delete (trash) - deletes immediately */}
        <button
          onClick={() => onDelete(item.id)}
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            border: 'none',
            background: 'rgba(239,68,68,0.15)',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 0.15s',
          }}
          aria-label="Delete item"
        >
          <IconTrash size={18} />
        </button>
      </div>
    </div>
  );
}
