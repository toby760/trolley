import React, { useEffect, useRef, useState } from 'react';
import { IconX } from '../lib/icons';

export default function BarcodeScanner({ open, onClose, onProduct }) {
  const scannerRef = useRef(null);
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

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
            // Look up product on Open Food Facts
            try {
              const res = await fetch(
                `https://world.openfoodfacts.org/api/v0/product/${decodedText}.json`
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
                setError('Product not found in database. Try typing the name instead.');
                setScanning(false);
              }
            } catch (e) {
              setError('Could not look up product. Check your internet connection.');
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

  if (!open) return null;

  return (
    <div className="camera-view">
      <button className="camera-close" onClick={onClose}>
        <IconX size={24} />
      </button>

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

      {scanning && (
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
