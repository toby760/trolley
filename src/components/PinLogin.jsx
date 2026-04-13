import React, { useState, useRef, useEffect } from 'react';
import { TrolleyLogo } from '../lib/icons';
import { useHousehold } from '../hooks/useHousehold';

export default function PinLogin() {
  const { loginWithPin, selectUser } = useHousehold();
  const [pin, setPin] = useState(['', '', '', '']);
  const [step, setStep] = useState('pin'); // 'pin' | 'user'
  const [householdData, setHouseholdData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const hiddenInputRef = useRef(null);

  // Use a single hidden input to capture all digits — this is the most
  // reliable way to get the mobile keyboard to appear on page load.
  // The autoFocus attribute on the hidden input triggers the keyboard
  // on the initial page render (before any user gesture).
  useEffect(() => {
    // Multiple retry attempts for stubborn mobile browsers
    const el = hiddenInputRef.current;
    if (el) {
      el.focus();
      // Retry a few times for browsers that need a tick
      const t1 = setTimeout(() => el.focus(), 100);
      const t2 = setTimeout(() => el.focus(), 300);
      const t3 = setTimeout(() => el.focus(), 600);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, []);

  const handleHiddenInput = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    const digits = value.split('');
    const newPin = ['', '', '', ''];
    digits.forEach((d, i) => { newPin[i] = d; });
    setPin(newPin);
    setError('');

    // Auto-submit when all 4 digits entered
    if (digits.length === 4) {
      handlePinSubmit(value);
    }
  };

  const handlePinSubmit = async (pinCode) => {
    setLoading(true);
    setError('');
    try {
      const data = await loginWithPin(pinCode);
      setHouseholdData(data);
      setStep('user');
    } catch (err) {
      setError('Could not connect. Check your PIN.');
      setPin(['', '', '', '']);
      if (hiddenInputRef.current) {
        hiddenInputRef.current.value = '';
        setTimeout(() => hiddenInputRef.current?.focus(), 100);
      }
    }
    setLoading(false);
  };

  // Tap anywhere on PIN area to re-focus the hidden input
  const focusHiddenInput = () => {
    hiddenInputRef.current?.focus();
  };

  const handleUserSelect = (user) => {
    selectUser(user, householdData);
  };

  if (step === 'user') {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 32
      }}>
        <TrolleyLogo size={80} />
        <h1 style={{
          fontSize: 28, fontWeight: 900, marginTop: 20, marginBottom: 8,
          color: 'var(--green-400)'
        }}>Who's shopping?</h1>
        <p style={{ color: 'var(--gray-300)', marginBottom: 40, fontSize: 15 }}>
          Tap your name to get started
        </p>
        <div style={{ display: 'flex', gap: 16, width: '100%', maxWidth: 320 }}>
          <button
            onClick={() => handleUserSelect('T')}
            className="btn btn-full"
            style={{
              flex: 1, padding: '24px 16px', background: '#5B8DEF',
              borderRadius: 'var(--radius-lg)', fontSize: 20, fontWeight: 800,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
            }}
          >
            <span style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 900
            }}>T</span>
            Toby
          </button>
          <button
            onClick={() => handleUserSelect('O')}
            className="btn btn-full"
            style={{
              flex: 1, padding: '24px 16px', background: '#E87CA0',
              borderRadius: 'var(--radius-lg)', fontSize: 20, fontWeight: 800,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8
            }}
          >
            <span style={{
              width: 56, height: 56, borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 900
            }}>O</span>
            Orla
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 32
      }}
      onClick={focusHiddenInput}
    >
      <TrolleyLogo size={80} />
      <h1 style={{
        fontSize: 28, fontWeight: 900, marginTop: 20, marginBottom: 8,
        color: 'var(--green-400)'
      }}>Trolley</h1>
      <p style={{ color: 'var(--gray-300)', marginBottom: 8, fontSize: 15 }}>
        Enter your household PIN
      </p>
      <p style={{ color: 'var(--gray-400)', marginBottom: 32, fontSize: 13 }}>
        First time? Any 4-digit PIN creates a new household
      </p>

      {/* Hidden input that captures all keyboard input */}
      <input
        ref={hiddenInputRef}
        type="tel"
        inputMode="numeric"
        pattern="[0-9]*"
        autoFocus
        autoComplete="one-time-code"
        value={pin.join('')}
        onChange={handleHiddenInput}
        style={{
          position: 'absolute',
          opacity: 0,
          width: 1,
          height: 1,
          border: 'none',
          padding: 0,
          margin: 0,
          pointerEvents: 'none'
        }}
      />

      {/* Visual PIN display boxes */}
      <div className="pin-container" onClick={focusHiddenInput}>
        {pin.map((digit, i) => (
          <div
            key={i}
            className="pin-digit"
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28, fontWeight: 900, cursor: 'pointer',
              borderColor: !digit && pin.join('').length === i
                ? 'var(--green-400)' : undefined,
              boxShadow: !digit && pin.join('').length === i
                ? '0 0 0 2px var(--green-400)' : undefined
            }}
          >
            {digit || ''}
          </div>
        ))}
      </div>

      {error && (
        <p style={{
          color: 'var(--red-400)', fontSize: 14, fontWeight: 700,
          marginTop: 8, animation: 'bounceIn 0.3s ease-out'
        }}>{error}</p>
      )}
      {loading && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}
