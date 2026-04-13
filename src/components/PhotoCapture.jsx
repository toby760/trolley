import React, { useRef, useState, useEffect } from 'react';
import { IconX, IconCamera, IconSearch } from '../lib/icons';

export default function PhotoCapture({ open, onClose, onProduct }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [ocrLines, setOcrLines] = useState([]); // lines found by OCR
  const [manualName, setManualName] = useState('');
  const [step, setStep] = useState('camera'); // 'camera' | 'results'
  const manualInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setStep('camera');
    setOcrLines([]);
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
        // Extract meaningful lines from OCR text
        const lines = text.split('\n')
          .map(l => l.trim())
          .filter(l => l.length > 2)
          .map(l => l.replace(/[^a-zA-Z0-9\s'&%-]/g, '').trim())
          .filter(l => l.length > 2 && /[a-zA-Z]{2,}/.test(l));

        // Stop camera to save battery
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
        }

        if (lines.length > 0) {
          setOcrLines(lines.slice(0, 10));
          // Pre-fill manual input with best guess (first text-heavy line)
          const bestGuess = lines.find(l => /[a-zA-Z]{3,}/.test(l) && !/^\d+$/.test(l)) || lines[0];
          setManualName(bestGuess);
          setStep('results');
        } else {
          setError('No readable text found. Try getting closer to the label.');
        }
      } else {
        setError('No text found in photo. Try getting closer to the product label.');
      }
    } catch (e) {
      console.error('OCR error:', e);
      setError('Failed to process image. Try again or type the product name.');
    }
    setProcessing(false);
  };

  const handleSelectLine = (line) => {
    setManualName(line);
    setTimeout(() => manualInputRef.current?.focus(), 100);
  };

  const handleAddProduct = () => {
    if (!manualName.trim()) return;
    onProduct({
      name: manualName.trim(),
      source: 'photo'
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
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Photo Product</h2>
            <p style={{ fontSize: 14, color: 'var(--gray-300)', marginTop: 4 }}>
              Point at a product label and tap the button
            </p>
          </div>

          {!processing && !error && (
            <button
              onClick={captureAndRecognise}
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
              <p style={{ fontWeight: 700 }}>Reading product label...</p>
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

      {/* OCR Results â let user pick or edit the product name */}
      {step === 'results' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--green-900)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 15,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px 20px',
            paddingTop: 'calc(16px + env(safe-area-inset-top))',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Text found on label</h2>
            <p style={{ fontSize: 14, color: 'var(--gray-300)', marginTop: 4, margin: 0 }}>
              Tap a line below or edit the product name
            </p>
          </div>

          {/* Manual input at top */}
          <div style={{ padding: '16px 20px 0' }}>
            <div style={{ position: 'relative' }}>
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
                placeholder="Product name"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddProduct(); }}
                autoComplete="off"
                autoCapitalize="words"
              />
            </div>
          </div>

          {/* OCR lines as tappable suggestions */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px 20px'
          }}>
            <div style={{
              fontSize: 12,
              fontWeight: 700,
              color: 'var(--gray-400)',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              marginBottom: 8,
              paddingLeft: 4
            }}>
              From label
            </div>
            {ocrLines.map((line, i) => (
              <button
                key={i}
                onClick={() => handleSelectLine(line)}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '14px 16px',
                  marginBottom: 8,
                  background: manualName === line ? 'var(--green-700)' : 'var(--green-800)',
                  border: manualName === line
                    ? '2px solid var(--green-400)'
                    : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: 'var(--white)',
                  fontFamily: 'Nunito, sans-serif',
                  fontWeight: 700,
                  fontSize: 16
                }}
              >
                {line}
              </button>
            ))}
          </div>

          {/* Bottom actions */}
          <div style={{
            padding: '0 20px 20px',
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom))'
          }}>
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
              {manualName.trim() ? `Add "${manualName.trim()}"` : 'Type or tap a product name'}
            </button>

            <button
              onClick={() => {
                setStep('camera');
                setOcrLines([]);
                setManualName('');
                // Restart camera
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
