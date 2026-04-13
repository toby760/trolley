import React, { useRef, useState, useEffect } from 'react';
import { IconX, IconCamera } from '../lib/icons';

export default function PhotoCapture({ open, onClose, onProduct }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; }
      } catch (e) { setError('Camera access denied'); }
    };
    startCamera();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop()); };
  }, [open]);

  const captureAndRecognise = async () => {
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
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8));
      const { data: { text } } = await worker.recognize(blob);
      await worker.terminate();
      if (text && text.trim().length > 2) {
        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
        const productLine = lines.find(l => /[a-zA-Z]{3,}/.test(l) && !/^\d+$/.test(l)) || lines[0];
        if (productLine) {
          onProduct({ name: productLine.replace(/[^a-zA-Z0-9\s'-]/g, '').trim(), source: 'photo' });
          if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
          onClose();
        } else { setError('Could not identify product from photo. Try typing the name instead.'); }
      } else { setError('No text found in photo. Try getting closer to the product label.'); }
    } catch (e) {
      console.error('OCR error:', e);
      setError('Failed to process image. Try again or type the product name.');
    }
    setProcessing(false);
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
      <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <div style={{ position: 'absolute', top: 'env(safe-area-inset-top, 16px)', left: 0, right: 0, textAlign: 'center', paddingTop: 60, zIndex: 5 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800 }}>Photo Product</h2>
        <p style={{ fontSize: 14, color: 'var(--gray-300)', marginTop: 4 }}>Point at a product and tap the button to identify it</p>
      </div>
      {!processing && !error && (
        <button
          onClick={captureAndRecognise}
          style={{
            position: 'absolute',
            bottom: 'calc(40px + env(safe-area-inset-bottom, 20px))',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 80, height: 80,
            borderRadius: '50%',
            background: 'white',
            border: '5px solid var(--green-400)',
            cursor: 'pointer',
            zIndex: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 0,
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
          aria-label="Take photo"
        >
          <IconCamera size={32} style={{ color: 'var(--green-800)' }} />
        </button>
      )}
      {processing && (
        <div style={{ position: 'absolute', bottom: 100, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, zIndex: 10, background: 'rgba(0,0,0,0.7)', padding: 20, borderRadius: 'var(--radius-lg)' }}>
          <div className="spinner" />
          <p style={{ fontWeight: 700 }}>Reading product label...</p>
        </div>
      )}
      {error && (
        <div style={{ position: 'absolute', bottom: 100, left: 20, right: 20, background: 'var(--red-500)', borderRadius: 'var(--radius-md)', padding: 16, textAlign: 'center', fontWeight: 700, zIndex: 10 }}>
          {error}
          <button onClick={() => setError('')} className="btn btn-secondary btn-full" style={{ marginTop: 12 }}>Try Again</button>
        </div>
      )}
    </div>
  );
}
