import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconCheck, IconTrash, IconEdit } from '../lib/icons';

export default function ShoppingItem({ item, onToggle, onDelete, onEdit, sortable = false }) {
  const isDone = item.status === 'done';
  const price = parseFloat(item.estimated_price || 0);
  const hasPrice = price > 0;

  // Drag-and-drop wiring via @dnd-kit — only active items are draggable.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id, disabled: !sortable });

  const style = sortable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        zIndex: isDragging ? 10 : 'auto',
        touchAction: 'none',
      }
    : undefined;

  // Stops long-press on interactive child buttons from initiating a drag.
  const stop = (e) => e.stopPropagation();

  return (
    <div
      ref={sortable ? setNodeRef : undefined}
      style={style}
      className={`shopping-item ${isDone ? 'done' : ''} ${isDragging ? 'dragging' : ''}`}
      {...(sortable ? attributes : {})}
      {...(sortable ? listeners : {})}
    >
      {/* Check button */}
      <button
        className={`item-check ${isDone ? 'checked' : ''}`}
        onClick={() => onToggle(item.id)}
        onPointerDown={stop}
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
          {hasPrice ? (
            <span className="item-price">
              ${price.toFixed(2)}
            </span>
          ) : (
            <span className="item-price item-price-checking">
              💭 Checking price...
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="item-actions">
        <button
          className="item-action-btn edit"
          onClick={() => onEdit(item)}
          onPointerDown={stop}
          aria-label="Edit item"
        >
          <IconEdit size={16} />
        </button>
        <button
          className="item-action-btn delete"
          onClick={() => onDelete(item.id)}
          onPointerDown={stop}
          aria-label="Delete item"
        >
          <IconTrash size={16} />
        </button>
      </div>
    </div>
  );
}
