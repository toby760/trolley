import React, { useState, useEffect } from 'react';
import { IconX } from '../lib/icons';

export default function EditItemModal({ item, open, onClose, onSave }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [store, setStore] = useState('aldi');

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setPrice(item.estimated_price?.toString() || '');
      setStore(item.store || 'aldi');
    }
  }, [item]);

  const handleSave = () => {
    onSave(item.id, {
      name: name.trim(),
      estimated_price: parseFloat(price) || 0,
      store
    });
    onClose();
  };

  if (!open || !item) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>Edit Item</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gray-300)', cursor: 'pointer', padding: 8 }}>
            <IconX size={24} />
          </button>
        </div>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-300)', display: 'block', marginBottom: 6 }}>
            Product Name
          </span>
          <input
            className="input"
            value={name}
            onChange={e => setName(e.target.value)}
            autoCapitalize="words"
          />
        </label>

        <label style={{ display: 'block', marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-300)', display: 'block', marginBottom: 6 }}>
            Estimated Price (AUD)
          </span>
          <input
            className="input"
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={e => setPrice(e.target.value)}
            inputMode="decimal"
          />
        </label>

        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-300)', display: 'block', marginBottom: 6 }}>
          Store
        </span>
        <div className="store-picker" style={{ marginBottom: 20 }}>
          <button
            className={`store-picker-btn aldi ${store === 'aldi' ? 'selected' : ''}`}
            onClick={() => setStore('aldi')}
          >
            Aldi
          </button>
          <button
            className={`store-picker-btn woolworths ${store === 'woolworths' ? 'selected' : ''}`}
            onClick={() => setStore('woolworths')}
          >
            Woolworths
          </button>
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSave}>
          Save Changes
        </button>
      </div>
    </div>
  );
}
