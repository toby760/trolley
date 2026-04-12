import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconHome, IconList, IconHistory, IconMeal } from '../lib/icons';

const tabs = [
  { path: '/', icon: IconHome, label: 'Home' },
  { path: '/list', icon: IconList, label: 'List' },
  { path: '/history', icon: IconHistory, label: 'History' },
  { path: '/meals', icon: IconMeal, label: 'Meals' },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="bottom-nav">
      {tabs.map(({ path, icon: Icon, label }) => (
        <button
          key={path}
          className={`nav-item ${location.pathname === path ? 'active' : ''}`}
          onClick={() => navigate(path)}
        >
          <Icon size={24} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
