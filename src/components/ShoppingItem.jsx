import React, { useState, useRef, useEffect } from 'react';
import { IconCheck, IconTrash, IconEdit } from '../lib/icons';

export default function ShoppingItem({ item, onToggle, onDelete, onEdit, onUpdatePrice }) {
  const isDone = item.status === 'done';
  const [editingPrice, setEditingPrice] = useState(false);
  const [priceValue, setPriceValue] = useState('');
  const priceInputRef = useRef(null);

  useEffect(() => {
    if (editingPrice && priceInputRef.current) {
      priceInputRef.current.focus();
      priceInputRef.current.select();
    }
  }, [editingPrice]);

  const startPriceEdit = (e) => {
    e.stopPropagation();
    setPriceValue(parseFloat(item.estimated_price || 0).toFixed(2));
    setEditingPrice(true);
  };

  const savePriceEdit = () => {
    const newPrice = parseFloat(priceValue);
    if (!isNaN(newPrice) && newPrice >= 0) {
      onUpdatePrice(item.id, newPrice);
    }
    setEditingPrice(false);
  };

  const handlePriceKeyDown = (e) => {
    if (e.key === 'Enter') savePriceEdit();
    if (e.key === 'Escape') setEditingPrice(false);
  };

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
          width: 40, height: 40, minWidth: 40, borderRadius: '50%',
          border: isDone ? 'none' : '2.5px solid var(--gray-400)',
          background: isDone ? 'var(--green-500)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.2s', padding: 0, flexShrink: 0,
        }}
        aria-label={isDone ? 'Uncheck item' : 'Check item off'}
      >
        {isDone && <IconCheck size={20} style={{ color: 'white' }} />}
      </button>

      {/* Item info */}
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{
          fontSize: 16, fontWeight: 600,
          color: isDone ? 'var(--gray-400)' : 'var(--gray-50)',
          textDecoration: isDone ? 'line-through' : 'none',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          transition: 'color 0.2s',
        }}>
          {item.name}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
          <span style={{
            display: 'inline-block', padding: '1px 6px', borderRadius: 6,
            fontSize: 11, fontWeight: 700,
            background: item.added_by === 'T' ? 'rgba(96,165,250,0.2)' : 'rgba(244,114,182,0.2)',
            color: item.added_by === 'T' ? '#93bbfc' : '#f9a8d4',
          }}>
            {item.added_by}
          </span>

          {/* Editable price */}
          {editingPrice ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={e => e.stopPropagation()}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--green-300)' }}>$</span>
              <input
                ref={priceInputRef}
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={priceValue}
                onChange={e => setPriceValue(e.target.value)}
                onKeyDown={handlePriceKeyDown}
                onBlur={savePriceEdit}
                style={{
                  width: 70, fontSize: 14, fontWeight: 700,
                  color: 'var(--green-300)',
                  background: 'rgba(79,212,142,0.12)',
                  border: '1.5px solid var(--green-500)',
                  borderRadius: 8, padding: '2px 6px',
                  fontFamily: 'Nunito, sans-serif',
                  outline: 'none',
                }}
              />
            </div>
          ) : (
            <button
              onClick={startPriceEdit}
              style={{
                background: 'none', border: 'none', padding: '2px 4px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 2,
                borderRadius: 6, transition: 'background 0.15s',
              }}
              aria-label="Edit price"
            >
              <span style={{
                fontSize: 14, fontWeight: 700,
                color: isDone ? 'var(--gray-500)' : 'var(--green-300)',
                textDecoration: isDone ? 'line-through' : 'none',
              }}>
                ${parseFloat(item.estimated_price || 0).toFixed(2)}
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                style={{ color: 'var(--gray-500)', marginLeft: 2, opacity: 0.6 }}>
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        <button
          onClick={() => onEdit(item)}
          style={{
            width: 38, height: 38, borderRadius: 10, border: 'none',
            background: 'rgba(96,165,250,0.15)', color: '#93bbfc',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0, transition: 'background 0.15s',
          }}
          aria-label="Edit item"
        >
          <IconEdit size={18} />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          style={{
            width: 38, height: 38, borderRadius: 10, border: 'none',
            background: 'rgba(239,68,68,0.15)', color: '#fca5a5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', padding: 0, transition: 'all 0.15s',
          }}
          aria-label="Delete item"
        >
          <IconTrash size={18} />
        </button>
      </div>
    </div>
  );
}
