import React, { useState, useRef, useEffect, useCallback } from 'react';
import { IconX, IconBarcode, IconCamera, IconSearch } from '../lib/icons';
import { useItems } from '../hooks/useItems';

// Debounce helper
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function AddItemModal({ open, onClose, onOpenScanner, onOpenCamera }) {
  const { addItem, getSuggestedStore, getEstimatedPrice, priceMemory } = useItems();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedName, setSelectedName] = useState('');
  const [store, setStore] = useState(null);
  const [step, setStep] = useState('search'); // 'search' | 'store'
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const inputRef = useRef();
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedName('');
      setStore(null);
      setStep('search');
      setSuggestions([]);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  // Autocomplete: search household history first, then Open Food Facts
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const search = async () => {
      setLoadingSuggestions(true);
      const results = [];

      // 1. Search price memory (household's own items)
      const lower = debouncedQuery.toLowerCase();
      const householdMatches = priceMemory
        .filter(p => p.product_name.toLowerCase().includes(lower))
        .slice(0, 3)
        .map(p => ({ name: p.product_name, source: 'history', price: p.last_known_price }));
      results.push(...householdMatches);

      // 2. Search Open Food Facts (filtered to Australian products)
      try {
        const res = await fetch(
          `https://au.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(debouncedQuery)}&search_simple=1&action=process&json=1&page_size=8&fields=product_name`
        );
        const data = await res.json();
        if (data.products) {
          const offResults = data.products
            .filter(p => p.product_name)
            .map(p => ({ name: p.product_name, source: 'openfoodfacts' }))
            .filter(p => !results.some(r => r.name.toLowerCase() === p.name.toLowerCase()));
          results.push(...offResults.slice(0, 5));
        }
      } catch (e) {
        // Open Food Facts unavailable, continue with local results
      }

      // 3. Always include the raw query as an option
      if (!results.some(r => r.name.toLowerCase() === lower)) {
        results.unshift({ name: debouncedQuery, source: 'custom' });
      }

      setSuggestions(results.slice(0, 8));
      setLoadingSuggestions(false);
    };

    search();
  }, [debouncedQuery, priceMemory]);

  const selectProduct = (name) => {
    setSelectedName(name);
    const suggested = getSuggestedStore(name);
    setStore(suggested);
    setStep('store');
  };

  const handleAddItem = async () => {
    if (!selectedName || !store) return;
    await addItem(selectedName, store);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      selectProduct(query.trim());
    }
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'var(--green-900)',
      zIndex: 200,
      display: 'flex',
      flexDirection: 'column',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      {step === 'search' ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Top bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            paddingTop: 'calc(16px + env(safe-area-inset-top))',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Add Item</h2>
            <button onClick={onClose} style={{
              background: 'var(--green-700)',
              border: 'none',
              color: 'var(--white)',
              cursor: 'pointer',
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IconX size={22} />
            </button>
          </div>

          {/* Search input */}
          <div style={{ padding: '16px 20px 0' }}>
            <div style={{ position: 'relative' }}>
              <IconSearch size={20} style={{
                position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--gray-400)', pointerEvents: 'none'
              }} />
              <input
                ref={inputRef}
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
                  caretColor: 'white'
                }}
                placeholder="What do you need?"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                autoCapitalize="words"
              />
            </div>
          </div>

          {/* Scan / Photo buttons - prominent */}
          <div style={{ display: 'flex', gap: 12, padding: '16px 20px' }}>
            <button
              onClick={() => { onClose(); onOpenScanner?.(); }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '16px 12px',
                background: 'var(--green-800)',
                border: '2px solid var(--green-600)',
                borderRadius: 16,
                color: 'var(--green-300)',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                minHeight: 80
              }}
            >
              <IconBarcode size={28} />
              Scan Barcode
            </button>
            <button
              onClick={() => { onClose(); onOpenCamera?.(); }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                padding: '16px 12px',
                background: 'var(--green-800)',
                border: '2px solid var(--green-600)',
                borderRadius: 16,
                color: 'var(--green-300)',
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                minHeight: 80
              }}
            >
              <IconCamera size={28} />
              Photo Product
            </button>
          </div>

          {/* Suggestions list - fills remaining space */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
            {loadingSuggestions && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                <div className="spinner" style={{ width: 28, height: 28 }} />
              </div>
            )}

            {suggestions.length > 0 && (
              <div style={{ marginTop: 4 }}>
                <div style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'var(--gray-400)',
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  marginBottom: 8,
                  paddingLeft: 4
                }}>
                  Suggestions
                </div>
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => selectProduct(s.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '16px',
                      marginBottom: 8,
                      background: 'var(--green-800)',
                      border: s.source === 'history' ? '1px solid var(--green-600)' : '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 14,
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: 'var(--white)',
                      fontFamily: 'Nunito, sans-serif',
                      minHeight: 56
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{s.name}</div>
                      {s.source === 'history' && (
                        <div style={{ fontSize: 13, color: 'var(--green-400)', fontWeight: 600, marginTop: 2 }}>
                          Previously bought {s.price ? `Â· $${s.price.toFixed(2)}` : ''}
                        </div>
                      )}
                    </div>
                    {s.source === 'history' && (
                      <span style={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: 'var(--green-400)',
                        background: 'rgba(79,212,142,0.12)',
                        padding: '4px 8px',
                        borderRadius: 8
                      }}>
                        HISTORY
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!loadingSuggestions && suggestions.length === 0 && query.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '32px 20px',
                color: 'var(--gray-400)'
              }}>
                <div style={{ fontSize: 40, marginBottom: 12, opacity: 0.4 }}>&#128269;</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>Type to search</div>
                <div style={{ fontSize: 14, marginTop: 4, color: 'var(--gray-500)' }}>
                  Or scan a barcode / photo a label
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* STORE PICKER - step 2 */
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Top bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            paddingTop: 'calc(16px + env(safe-area-inset-top))',
            borderBottom: '1px solid rgba(255,255,255,0.08)'
          }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Where to buy?</h2>
            <button onClick={onClose} style={{
              background: 'var(--green-700)',
              border: 'none',
              color: 'var(--white)',
              cursor: 'pointer',
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IconX size={22} />
            </button>
          </div>

          {/* Product info */}
          <div style={{ padding: '20px 20px 0' }}>
            <div style={{
              background: 'var(--green-800)',
              borderRadius: 16,
              padding: '20px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{selectedName}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--green-400)', marginTop: 6 }}>
                Est. ${getEstimatedPrice(selectedName, store || 'aldi').toFixed(2)}
              </div>
            </div>
          </div>

          {/* Store buttons - BIG and easy to tap */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            padding: '24px 20px',
            justifyContent: 'center'
          }}>
            <button
              onClick={() => setStore('aldi')}
              style={{
                width: '100%',
                padding: '28px 24px',
                borderRadius: 20,
                border: store === 'aldi' ? '3px solid #6EAAEF' : '3px solid rgba(0,68,139,0.3)',
                background: store === 'aldi' ? 'var(--aldi-blue)' : 'rgba(0,68,139,0.15)',
                color: store === 'aldi' ? 'var(--white)' : '#6EAAEF',
                fontFamily: 'Nunito, sans-serif',
                fontSize: 24,
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                minHeight: 90
              }}
            >
              ALDI
              {getSuggestedStore(selectedName) === 'aldi' && (
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  background: 'rgba(255,255,255,0.15)',
                  padding: '4px 10px',
                  borderRadius: 20
                }}>
                  Suggested
                </span>
              )}
            </button>

            <button
              onClick={() => setStore('woolworths')}
              style={{
                width: '100%',
                padding: '28px 24px',
                borderRadius: 20,
                border: store === 'woolworths' ? '3px solid #5EDB8A' : '3px solid rgba(0,155,58,0.3)',
                background: store === 'woolworths' ? 'var(--woolworths-green)' : 'rgba(0,155,58,0.15)',
                color: store === 'woolworths' ? 'var(--white)' : '#5EDB8A',
                fontFamily: 'Nunito, sans-serif',
                fontSize: 24,
                fontWeight: 900,
                cursor: 'pointer',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
                minHeight: 90
              }}
            >
              WOOLWORTHS
              {getSuggestedStore(selectedName) === 'woolworths' && (
                <span style={{
                  fontSize: 13,
                  fontWeight: 700,
                  background: 'rgba(255,255,255,0.15)',
                  padding: '4px 10px',
                  borderRadius: 20
                }}>
                  Suggested
                </span>
              )}
            </button>
          </div>

          {/* Bottom actions */}
          <div style={{
            padding: '0 20px 20px',
            paddingBottom: 'calc(20px + env(safe-area-inset-bottom))'
          }}>
            <button
              onClick={handleAddItem}
              disabled={!store}
              style={{
                width: '100%',
                padding: '18px 24px',
                borderRadius: 16,
                border: 'none',
                background: store ? 'var(--green-600)' : 'var(--green-800)',
                color: store ? 'var(--white)' : 'var(--gray-500)',
                fontFamily: 'Nunito, sans-serif',
                fontSize: 20,
                fontWeight: 800,
                cursor: store ? 'pointer' : 'default',
                transition: 'all 0.15s',
                minHeight: 60
              }}
            >
              {store ? `Add to ${store === 'aldi' ? 'Aldi' : 'Woolworths'} List` : 'Pick a store above'}
            </button>

            <button
              onClick={() => { setStep('search'); setSelectedName(''); }}
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
              Back to Search
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
