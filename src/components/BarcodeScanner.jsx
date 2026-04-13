import React, { useEffect, useRef, useState } from 'react';
import { IconX, IconSearch } from '../lib/icons';

export default function BarcodeScanner({ open, onClose, onProduct }) {
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [notFound, setNotFound] = useState(null); // stores barcode when product not found
  const [manualName, setManualName] = useState('');
  const manualInputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    let scanner = null;

    const startScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        scanner = new Html5Qrcode('barcode-scanner');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 280, height: 150 },
            aspectRatio: 1.0
          },
          async (decodedText) => {
            setScanning(true);
            setNotFound(null);
            // Look up product on Open Food Facts (try AU first)
            try {
              const res = await fetch(
                `https://au.openfoodfacts.org/api/v0/product/${decodedText}.json?fields=product_name,brands,image_url`
              );
              const data = await res.json();
              if (data.status === 1 && data.product?.product_name) {
                onProduct({
                  name: data.product.product_name,
                  barcode: decodedText,
                  brands: data.product.brands || '',
                  image: data.product.image_url || null
                });
                await scanner.stop();
                onClose();
              } else {
                // Product not in database â let user add manually
                await scanner.stop();
                setNotFound(decodedText);
                setScanning(false);
                setTimeout(() => manualInputRef.current?.focus(), 300);
              }
            } catch (e) {
              // Actual network error
              setError('Network error â check your internet connection and try again.');
              setScanning(false);
            }
          },
          () => {} // ignore scan failures
        );
      } catch (e) {
        setError('Camera access denied. Please allow camera permissions and try again.');
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [open, onClose, onProduct]);

  const handleManualAdd = () => {
    if (!manualName.trim()) return;
    onProduct({
      name: manualName.trim(),
      barcode: notFound,
      source: 'manual-barcode'
    });
    onClose();
  };

  if (!open) return null;

  return (
    <div className="camera-view">
      <button className="camera-close" onClick={onClose}>
        <IconX size={24} />
      </button>

      {!notFound && (
        <>
          <div style={{
            position: 'absolute',
            top: 'env(safe-area-inset-top, 16px)',
            left: 0,
            right: 0,
            textAlign: 'center',
            paddingTop: 60,
            zIndex: 5
          }}>
            <h2 style={{ fontSize: 20, fontWeight: 800 }}>Scan Barcode</h2>
            <p style={{ fontSize: 14, color: 'var(--gray-300)', marginTop: 4 }}>
              Point your camera at a barcode
            </p>
          </div>

          <div id="barcode-scanner" style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0
          }} />
        </>
      )}

      {scanning && !notFound && (
        <div style={{
          position: 'absolute',
          bottom: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          zIndex: 10
        }}>
          <div className="spinner" />
          <p style={{ fontWeight: 700 }}>Looking up product...</p>
        </div>
      )}

      {/* Product not found â manual entry screen */}
      {notFound && (
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
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }}>&#128722;</div>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>
            Barcode not recognised
          </h3>
          <p style={{
            fontSize: 14, color: 'var(--gray-300)', textAlign: 'center',
            marginBottom: 24, maxWidth: 280
          }}>
            This product isn't in the database yet. Type the product name to add it to your list.
          </p>

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
                placeholder="e.g. Vegemite 380g"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleManualAdd(); }}
                autoComplete="off"
                autoCapitalize="words"
              />
            </div>

            <button
              onClick={handleManualAdd}
              disabled={!manualName.trim()}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: 16,
                border: 'none',
                background: manualName.trim() ? 'var(--green-600)' : 'var(--green-800)',
                color: manualName.trim() ? 'var(--white)' : 'var(--gray-500)',
                fontFamily: 'Nunito, sans-serif',
                fontSize: 18,
                fontWeight: 800,
                cursor: manualName.trim() ? 'pointer' : 'default',
                marginBottom: 12
              }}
            >
              Add to List
            </button>

            <button
              onClick={onClose}
              style={{
                width: '100%',
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
              Cancel
            </button>
          </div>

          <p style={{
            fontSize: 12, color: 'var(--gray-500)', marginTop: 16,
            fontFamily: 'monospace'
          }}>
            Barcode: {notFound}
          </p>
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
    </div>
  );
}
