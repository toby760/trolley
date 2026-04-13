import React, { useRef, useState, useEffect } from 'react';
import { IconX, IconCamera, IconSearch } from '../lib/icons';

export default function PhotoCapture({ open, onClose, onProduct }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null); // Gemini result
  const [manualName, setManualName] = useState('');
  const [step, setStep] = useState('camera'); // 'camera' | 'results'
  const manualInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setStep('camera');
    setResult(null);
    setManualName('');
    setError('');

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (e) {
        setError('Camera access denied');
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, [open]);

  const captureAndIdentify = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setProcessing(true);
    setError('');

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    try {
      // Convert canvas to base64 JPEG
      const base64 = canvas.toDataURL('image/jpeg', 0.8);

      // Stop camera to save battery
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      // Call our serverless Gemini API
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mode: 'product' })
      });

      if (!res.ok) {
        throw new Error('API error');
      }

      const data = await res.json();
      // data = { item_name, brand, suggested_store }

      if (data.item_name) {
        setResult(data);
        setManualName(data.item_name);
        setStep('results');
      } else {
        setError('Could not identify this product. Try getting closer to the label.');
      }
    } catch (e) {
      console.error('Gemini product ID error:', e);
      setError('Failed to identify product. Check your connection and try again.');
    }
    setProcessing(false);
  };

  const handleAddProduct = () => {
    if (!manualName.trim()) return;
    onProduct({
      name: manualName.trim(),
      brand: result?.brand || '',
      suggested_store: result?.suggested_store || '',
      source: 'gemini-photo'
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="camera-view">
      <button className="camera-close" onClick={() => {
        if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
        onClose();
      }}>
        <IconX size={24} />
      </button>

      {step === 'camera' && (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div style={{
            position: 'absolute',
            top: 'env(safe-area-inset-top, 16px)',
            left: 0,
            right: 0,
            textAlign: 'center',
            paddingTop: 60,
            zIndex: 5
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Identify Product</h2>
            <p style={{ fontSize: 14, color: 'var(--gray-300)', marginTop: 4 }}>
              Point at a product and tap the button
            </p>
          </div>

          {!processing && !error && (
            <button
              onClick={captureAndIdentify}
              style={{
                position: 'absolute',
                bottom: 'calc(40px + env(safe-area-inset-bottom, 20px))',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'white',
                border: '5px solid var(--green-400)',
                cursor: 'pointer',
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
              }}
              aria-label="Take photo"
            >
              <IconCamera size={32} style={{ color: 'var(--green-800)' }} />
            </button>
          )}

          {processing && (
            <div style={{
              position: 'absolute',
              bottom: 100,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              zIndex: 10,
              background: 'rgba(0,0,0,0.7)',
              padding: 20,
              borderRadius: 'var(--radius-lg)'
            }}>
              <div className="spinner" />
              <p style={{ fontWeight: 700 }}>Identifying product...</p>
              <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>Powered by Gemini AI</p>
            </div>
          )}

          {error && (
            <div style={{
              position: 'absolute',
              bottom: 100,
              left: 20,
              right: 20,
              background: 'var(--red-500)',
              borderRadius: 'var(--radius-md)',
              padding: 16,
              textAlign: 'center',
              fontWeight: 700,
              zIndex: 10
            }}>
              {error}
              <button
                onClick={() => setError('')}
                className="btn btn-secondary btn-full"
                style={{ marginTop: 12 }}
              >
                Try Again
              </button>
            </div>
          )}
        </>
      )}

      {/* Gemini Result — show identified product with edit option */}
      {step === 'results' && result && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--green-900)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          zIndex: 15
        }}>
          {/* AI identification badge */}
          <div style={{
            background: 'var(--green-700)',
            borderRadius: 20,
            padding: '6px 16px',
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--green-300)',
            marginBottom: 24,
            letterSpacing: 0.5
          }}>
            AI IDENTIFIED
          </div>

          {/* Product name */}
          <h3 style={{
            fontSize: 24,
            fontWeight: 800,
            marginBottom: 8,
            textAlign: 'center',
            maxWidth: 300
          }}>
            {result.item_name}
          </h3>

          {/* Brand + Store suggestion */}
          <div style={{
            display: 'flex',
            gap: 12,
            marginBottom: 32,
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {result.brand && (
              <span style={{
                background: 'var(--green-800)',
                borderRadius: 12,
                padding: '6px 14px',
                fontSize: 14,
                fontWeight: 700,
                color: 'var(--gray-200)'
              }}>
                {result.brand}
              </span>
            )}
            {result.suggested_store && (
              <span style={{
                background: result.suggested_store === 'aldi'
                  ? 'rgba(59,130,246,0.15)' : 'rgba(34,197,94,0.15)',
                borderRadius: 12,
                padding: '6px 14px',
                fontSize: 14,
                fontWeight: 700,
                color: result.suggested_store === 'aldi'
                  ? '#93c5fd' : 'var(--green-300)'
              }}>
                {result.suggested_store === 'aldi' ? 'Aldi' : 'Woolies'}
              </span>
            )}
          </div>

          {/* Editable name input */}
          <div style={{ width: '100%', maxWidth: 340 }}>
            <div style={{ position: 'relative', marginBottom: 16 }}>
              <IconSearch size={20} style={{
                position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--gray-400)', pointerEvents: 'none'
              }} />
              <input
                ref={manualInputRef}
                type="text"
                className="input"
                style={{
                  paddingLeft: 46,
                  fontSize: 18,
                  height: 56,
                  borderRadius: 16,
                  background: 'var(--green-800)',
                  border: '2px solid var(--green-600)',
                  color: 'white',
                  caretColor: 'white',
                  width: '100%'
                }}
                placeholder="Edit product name"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddProduct(); }}
                autoComplete="off"
                autoCapitalize="words"
              />
            </div>

            <button
              onClick={handleAddProduct}
              disabled={!manualName.trim()}
              style={{
                width: '100%',
                padding: '18px 24px',
                borderRadius: 16,
                border: 'none',
                background: manualName.trim() ? 'var(--green-600)' : 'var(--green-800)',
                color: manualName.trim() ? 'var(--white)' : 'var(--gray-500)',
                fontFamily: 'Nunito, sans-serif',
                fontSize: 20,
                fontWeight: 800,
                cursor: manualName.trim() ? 'pointer' : 'default',
                minHeight: 60
              }}
            >
              {manualName.trim() ? `Add "${manualName.trim()}"` : 'Type a product name'}
            </button>

            <button
              onClick={() => {
                setStep('camera');
                setResult(null);
                setManualName('');
                const startCamera = async () => {
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                      video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
                    });
                    streamRef.current = stream;
                    if (videoRef.current) videoRef.current.srcObject = stream;
                  } catch (e) { setError('Camera access denied'); }
                };
                startCamera();
              }}
              style={{
                width: '100%',
                marginTop: 12,
                padding: '14px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: 'var(--gray-300)',
                fontFamily: 'Nunito, sans-serif',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Retake Photo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
