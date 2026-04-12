import React, { useState, useRef } from 'react';
import { IconCheck, IconTrash, IconEdit } from '../lib/icons';

export default function ShoppingItem({ item, onToggle, onDelete, onEdit }) {
  const [swipeX, setSwipeX] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const startX = useRef(0);
  const startY = useRef(0);
  const swiping = useRef(false);

  const isDone = item.status === 'done';

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    swiping.current = false;
  };

  const handleTouchMove = (e) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // Only swipe if horizontal movement is dominant
    if (!swiping.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      swiping.current = true;
    }

    if (swiping.current && dx < 0) {
      setSwipeX(Math.max(dx, -120));
    }
  };

  const handleTouchEnd = () => {
    if (swipeX < -60) {
      setShowActions(true);
      setSwipeX(-120);
    } else {
      setShowActions(false);
      setSwipeX(0);
    }
  };

  const handleTap = () => {
    if (showActions) {
      setShowActions(false);
      setSwipeX(0);
      return;
    }
    if (!swiping.current) {
      onToggle(item.id);
    }
  };

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
      {/* Swipe-revealed actions */}
      <div style={{
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        display: 'flex',
        zIndex: 1
      }}>
        <button
          onClick={() => { onEdit(item); setSwipeX(0); setShowActions(false); }}
          style={{
            width: 60,
            background: 'var(--aldi-blue)',
            border: 'none',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <IconEdit size={20} />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          style={{
            width: 60,
            background: 'var(--red-500)',
            border: 'none',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <IconTrash size={20} />
        </button>
      </div>

      {/* Main item */}
      <div
        className={`shopping-item ${isDone ? 'done item-done' : ''}`}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: swiping.current ? 'none' : 'transform 0.3s ease-out',
          zIndex: 2,
          position: 'relative'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleTap}
      >
        <div className={`item-check ${isDone ? 'checked' : ''}`}>
          {isDone && <IconCheck size={16} style={{ color: 'white' }} />}
        </div>

        <div className="item-info">
          <div className="item-name">{item.name}</div>
          <div className="item-meta">
            <span className={`user-badge ${item.added_by === 'T' ? 'toby' : 'orla'}`}>
              {item.added_by}
            </span>
            {item.category && item.category !== 'general' && (
              <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                {item.category}
              </span>
            )}
          </div>
        </div>

        <div className="item-price">
          ${parseFloat(item.estimated_price || 0).toFixed(2)}
        </div>
      </div>
    </div>
  );
}
