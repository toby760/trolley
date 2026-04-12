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

      // 2. Search Open Food Facts
      try {
        const res = await fetch(
          `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(debouncedQuery)}&search_simple=1&action=process&json=1&page_size=5&fields=product_name`
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
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-sheet">
        <div className="modal-handle" />

        {step === 'search' ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Add Item</h2>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gray-300)', cursor: 'pointer', padding: 8 }}>
                <IconX size={24} />
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <div style={{ position: 'relative' }}>
                <IconSearch size={20} style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--gray-400)', pointerEvents: 'none'
                }} />
                <input
                  ref={inputRef}
                  type="text"
                  className="input"
                  style={{ paddingLeft: 42 }}
                  placeholder="What do you need?"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                  autoCapitalize="words"
                />
              </div>

              {suggestions.length > 0 && (
                <div className="autocomplete-dropdown">
                  {suggestions.map((s, i) => (
                    <div
                      key={i}
                      className="autocomplete-item"
                      onClick={() => selectProduct(s.name)}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{s.name}</div>
                        {s.source === 'history' && (
                          <div style={{ fontSize: 12, color: 'var(--green-400)', fontWeight: 600 }}>
                            Previously bought {s.price ? `· $${s.price.toFixed(2)}` : ''}
                          </div>
                        )}
                      </div>
                      {s.source === 'history' && (
                        <span style={{ fontSize: 11, color: 'var(--green-400)', fontWeight: 700 }}>HISTORY</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{
              display: 'flex', gap: 12, marginTop: 16
            }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => { onClose(); onOpenScanner?.(); }}
              >
                <IconBarcode size={20} />
                Scan Barcode
              </button>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => { onClose(); onOpenCamera?.(); }}
              >
                <IconCamera size={20} />
                Photo
              </button>
            </div>

            {loadingSuggestions && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
                <div className="spinner" style={{ width: 24, height: 24 }} />
              </div>
            )}
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h2 className="modal-title" style={{ margin: 0 }}>Where to buy?</h2>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--gray-300)', cursor: 'pointer', padding: 8 }}>
                <IconX size={24} />
              </button>
            </div>

            <div style={{
              background: 'var(--green-700)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              marginBottom: 16,
              fontSize: 18,
              fontWeight: 800
            }}>
              {selectedName}
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--green-300)', marginTop: 4 }}>
                Est. ${getEstimatedPrice(selectedName, store || 'aldi').toFixed(2)}
              </div>
            </div>

            <div className="store-picker">
              <button
                className={`store-picker-btn aldi ${store === 'aldi' ? 'selected' : ''}`}
                onClick={() => setStore('aldi')}
              >
                Aldi
                {store !== 'aldi' && getSuggestedStore(selectedName) === 'aldi' && (
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, opacity: 0.7 }}>Suggested</div>
                )}
              </button>
              <button
                className={`store-picker-btn woolworths ${store === 'woolworths' ? 'selected' : ''}`}
                onClick={() => setStore('woolworths')}
              >
                Woolworths
                {store !== 'woolworths' && getSuggestedStore(selectedName) === 'woolworths' && (
                  <div style={{ fontSize: 11, fontWeight: 600, marginTop: 4, opacity: 0.7 }}>Suggested</div>
                )}
              </button>
            </div>

            <button
              className="btn btn-primary btn-full"
              style={{ marginTop: 8, fontSize: 18 }}
              onClick={handleAddItem}
              disabled={!store}
            >
              Add to {store === 'aldi' ? 'Aldi' : 'Woolworths'} List
            </button>

            <button
              className="btn btn-secondary btn-full"
              style={{ marginTop: 8 }}
              onClick={() => { setStep('search'); setSelectedName(''); }}
            >
              Back to Search
            </button>
          </>
        )}
      </div>
    </div>
  );
}
