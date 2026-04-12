import React, { useEffect, useState } from 'react';
import { TrolleyLogo } from '../lib/icons';

export default function SplashScreen({ onComplete }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 300);
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="splash-screen" style={{
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.3s ease-out'
    }}>
      <div className="splash-logo">
        <TrolleyLogo size={120} />
      </div>
      <div className="splash-title">Trolley</div>
      <p style={{
        color: 'var(--gray-300)',
        marginTop: 8,
        fontSize: 14,
        fontWeight: 600
      }}>Smart shopping for your household</p>
    </div>
  );
}
