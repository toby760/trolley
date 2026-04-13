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
  const inputRefs = useRef([]);

  useEffect(() => {
    // Auto-focus first input immediately + retry for mobile keyboards
    const el = inputRefs.current[0];
    if (el) {
      el.focus();
      // Retry after a tick for mobile browsers that need it
      requestAnimationFrame(() => el.focus());
    }
  }, []);

  const handleDigit = (index, value) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);
    setError('');

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits entered
    if (value && index === 3 && newPin.every(d => d)) {
      handlePinSubmit(newPin.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
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
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    }
    setLoading(false);
  };

  const handleUserSelect = (user) => {
    selectUser(user, householdData);
  };

  if (step === 'user') {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32
      }}>
        <TrolleyLogo size={80} />
        <h1 style={{
          fontSize: 28,
          fontWeight: 900,
          marginTop: 20,
          marginBottom: 8,
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
              flex: 1,
              padding: '24px 16px',
              background: '#5B8DEF',
              borderRadius: 'var(--radius-lg)',
              fontSize: 20,
              fontWeight: 800,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 900
            }}>T</span>
            Toby
          </button>
          <button
            onClick={() => handleUserSelect('O')}
            className="btn btn-full"
            style={{
              flex: 1,
              padding: '24px 16px',
              background: '#E87CA0',
              borderRadius: 'var(--radius-lg)',
              fontSize: 20,
              fontWeight: 800,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8
            }}
          >
            <span style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 900
            }}>O</span>
            Orla
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 32
    }}>
      <TrolleyLogo size={80} />
      <h1 style={{
        fontSize: 28,
        fontWeight: 900,
        marginTop: 20,
        marginBottom: 8,
        color: 'var(--green-400)'
      }}>Trolley</h1>
      <p style={{ color: 'var(--gray-300)', marginBottom: 8, fontSize: 15 }}>
        Enter your household PIN
      </p>
      <p style={{ color: 'var(--gray-400)', marginBottom: 32, fontSize: 13 }}>
        First time? Any 4-digit PIN creates a new household
      </p>

      <div className="pin-container">
        {pin.map((digit, i) => (
          <input
            key={i}
            ref={el => inputRefs.current[i] = el}
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            className="pin-digit"
            value={digit}
            onChange={e => handleDigit(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            autoComplete="off"
          />
        ))}
      </div>

      {error && (
        <p style={{
          color: 'var(--red-400)',
          fontSize: 14,
          fontWeight: 700,
          marginTop: 8,
          animation: 'bounceIn 0.3s ease-out'
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
