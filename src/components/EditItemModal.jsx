import React, { useState, useEffect } from 'react';
import { IconX } from '../lib/icons';

export default function EditItemModal({ item, open, onClose, onSave }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [store, setStore] = useState('aldi');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item) {
      setName(item.name || '');
      setPrice(item.estimated_price?.toString() || '');
      setStore(item.store || 'aldi');
      setQuantity(item.quantity || 1);
    }
  }, [item]);

  const handleSave = () => {
    onSave(item.id, {
      name: name.trim(),
      estimated_price: parseFloat(price) || 0,
      store,
      quantity
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

        {/* Quantity */}
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gray-300)', display: 'block', marginBottom: 6 }}>
          Quantity
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
          <button
            onClick={() => setQuantity(q => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              border: 'none',
              background: quantity <= 1 ? 'var(--green-700)' : 'var(--green-600)',
              color: quantity <= 1 ? 'var(--gray-500)' : 'var(--white)',
              fontSize: 20, fontWeight: 900, cursor: quantity <= 1 ? 'default' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Nunito, sans-serif'
            }}
          >−</button>
          <span style={{ fontSize: 22, fontWeight: 900, minWidth: 28, textAlign: 'center' }}>{quantity}</span>
          <button
            onClick={() => setQuantity(q => Math.min(99, q + 1))}
            style={{
              width: 40, height: 40, borderRadius: '50%',
              border: 'none',
              background: 'var(--green-600)',
              color: 'var(--white)',
              fontSize: 20, fontWeight: 900, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Nunito, sans-serif'
            }}
          >+</button>
        </div>

        <button className="btn btn-primary btn-full" onClick={handleSave}>
          Save Changes
        </button>
      </div>
    </div>
  );
}
