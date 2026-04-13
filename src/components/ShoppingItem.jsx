import React from 'react';
import { IconCheck, IconTrash, IconEdit } from '../lib/icons';

export default function ShoppingItem({ item, onToggle, onDelete, onEdit }) {
  const isDone = item.status === 'done';

  return (
    <div className={`shopping-item ${isDone ? 'done' : ''}`}>
      {/* Check button */}
      <button
        className={`item-check ${isDone ? 'checked' : ''}`}
        onClick={() => onToggle(item.id)}
        aria-label={isDone ? 'Uncheck item' : 'Check item off'}
      >
        {isDone && <IconCheck size={16} />}
      </button>

      {/* Item info */}
      <div className="item-info">
        <div className="item-name">{item.name}</div>
        <div className="item-meta">
          <span className={`item-user-badge ${item.added_by === 'T' ? 'toby' : 'orla'}`}>
            {item.added_by}
          </span>
          <span className="item-price">
            ${parseFloat(item.estimated_price || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="item-actions">
        <button
          className="item-action-btn edit"
          onClick={() => onEdit(item)}
          aria-label="Edit item"
        >
          <IconEdit size={16} />
        </button>
        <button
          className="item-action-btn delete"
          onClick={() => onDelete(item.id)}
          aria-label="Delete item"
        >
          <IconTrash size={16} />
        </button>
      </div>
    </div>
  );
}
