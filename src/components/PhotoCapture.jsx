import React, { useRef, useState, useEffect } from 'react';
import { IconX, IconCamera } from '../lib/icons';

export default function PhotoCapture({ open, onClose, onProduct }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (e) {
      setError('Camera access denied');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    if (!open) return;
    setProcessing(false);
    setError('');
    startCamera();
    return () => stopCamera();
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
      const base64 = canvas.toDataURL('image/jpeg', 0.92);
      stopCamera();

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mode: 'product' })
      });

      if (!res.ok) throw new Error('API error');
      const data = await res.json();

      if (data.item_name) {
        onProduct({
          name: data.item_name,
          brand: data.brand || '',
          suggested_store: data.suggested_store || '',
          confidence: data.confidence || 'medium',
          category: data.category || '',
          source: 'gemini-photo'
        });
        onClose();
      } else {
        setError('Could not identify this product. Try getting closer to the label.');
        startCamera();
      }
    } catch (e) {
      console.error('Gemini product ID error:', e);
      setError('Failed to identify product. Check your connection and try again.');
      startCamera();
    }
    setProcessing(false);
  };

  if (!open) return null;

  return (
    <div className=\"camera-view\">
      <button className=\"camera-close\" onClick={() => { stopCamera(); onClose(); }}>
        <IconX size={24} />
      </button>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{
        position: 'absolute', top: 'env(safe-area-inset-top, 16px)',
        left: 0, right: 0, textAlign: 'center', paddingTop: 60, zIndex: 5
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Smart Add</h2>
        <p style={{ fontSize: 14, color: 'var(--gray-300)', marginTop: 4 }}>
          Point at a product label and tap to identify
        </p>
      </div>

      {!processing && !error && (
        <button
          onClick={captureAndIdentify}
          style={{
            position: 'absolute',
            bottom: 'calc(40px + env(safe-area-inset-bottom, 20px))',
            left: '50%', transform: 'translateX(-50%)',
            width: 80, height: 80, borderRadius: '50%',
            background: 'white',
            border: '5px solid var(--green-400)',
            cursor: 'pointer', zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
          aria-label=\"Take photo\"
        >
          <IconCamera size={32} style={{ color: 'var(--green-800)' }} />
        </button>
      )}

      {processing && (
        <div style={{
          position: 'absolute', bottom: 100, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
          zIndex: 10, background: 'rgba(0,0,0,0.7)',
          padding: 20, borderRadius: 'var(--radius-lg)'
        }}>
          <div className=\"spinner\" />
          <p style={{ fontWeight: 700 }}>Identifying product...</p>
          <p style={{ fontSize: 12, color: 'var(--gray-400)' }}>Powered by Gemini AI</p>
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute', bottom: 100, left: 20, right: 20,
          background: 'var(--red-500)', borderRadius: 'var(--radius-md)',
          padding: 16, textAlign: 'center', fontWeight: 700, zIndex: 10
        }}>
          {error}
          <button
            onClick={() => { setError(''); }}
            className=\"btn btn-secondary btn-full\"
            style={{ marginTop: 12 }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
