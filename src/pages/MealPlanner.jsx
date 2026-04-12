import React from 'react';
import { IconMeal } from '../lib/icons';

export default function MealPlanner() {
  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Meal Planner</h1>
      </div>

      <div className="coming-soon">
        <div style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: 'var(--green-800)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24
        }}>
          <IconMeal size={48} style={{ color: 'var(--green-400)', opacity: 0.6 }} />
        </div>
        <h2>Coming Soon</h2>
        <p style={{ maxWidth: 280, lineHeight: 1.5, marginTop: 8 }}>
          Add a whole meal and we'll add all the ingredients to your shopping list automatically.
        </p>
        <div style={{
          marginTop: 32,
          padding: '12px 24px',
          background: 'var(--green-800)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--green-700)',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--green-400)'
        }}>
          Feature in development
        </div>
      </div>
    </div>
  );
}
