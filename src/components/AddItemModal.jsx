import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { IconX, IconCamera, IconSearch, IconPlus, IconClock } from '../lib/icons';
import { useItems } from '../hooks/useItems';
import { useHousehold } from '../hooks/useHousehold';
import { searchGroceryDatabase } from '../lib/groceryData';
import { getPriceWithGatekeeper } from '../lib/priceLookup';

// Fast debounce hook - 120ms for near-instant feel with local search
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function AddItemModal({ open, onClose, onOpenCamera, initialProduct }) {
  const { addItem, getSuggestedStore, getEstimatedPrice, priceMemory, fetchPriceMemory } = useItems();
  const { household } = useHousehold();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedName, setSelectedName] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedWeight, setSelectedWeight] = useState('');
  const [store, setStore] = useState(null);
  const [step, setStep] = useState('search'); // 'search' | 'store'
  const [checkingPrice, setCheckingPrice] = useState(false);
  const inputRef = useRef();

  const debouncedQuery = useDebounce(query, 120);

  // Pre-index household history for fast search
  const historyIndex = useMemo(() => {
    return priceMemory.map(p => ({
      name: p.product_name,
      lower: p.product_name.toLowerCase(),
      price: p.last_known_price,
      source: 'history'
    }));
  }, [priceMemory]);

  // Handle initial product from camera (Smart Add)
  useEffect(() => {
    if (open && initialProduct) {
      setSelectedName(initialProduct.name || '');
      setSelectedBrand(initialProduct.brand || '');
      setSelectedWeight(initialProduct.volume_weight || initialProduct.weight || '');
      setStore(initialProduct.suggested_store || getSuggestedStore(initialProduct.name));
      setStep('store');
      setQuery('');
      setSuggestions([]);
    } else if (open) {
      setQuery('');
      setSelectedName('');
      setSelectedBrand('');
      setSelectedWeight('');
      setStore(null);
      setStep('search');
      setSuggestions([]);
      setCheckingPrice(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open, initialProduct]);

  // Smart local-first suggestion engine
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 1) {
      setSuggestions([]);
      return;
    }

    const lower = debouncedQuery.toLowerCase().trim();
    const results = [];
    const seen = new Set();

    // 1. Household history - highest priority (items you've bought before)
    for (const item of historyIndex) {
      if (item.lower.includes(lower)) {
        results.push(item);
        seen.add(item.lower);
      }
      if (results.length >= 3) break;
    }

    // 2. Curated Australian grocery database - instant, no API
    const dbResults = searchGroceryDatabase(debouncedQuery, 8);
    for (const r of dbResults) {
      const rLower = r.name.toLowerCase();
      if (!seen.has(rLower)) {
        results.push({ ...r, source: 'database' });
        seen.add(rLower);
      }
    }

    // 3. Always include the user's typed query as a custom option
    if (!seen.has(lower) && debouncedQuery.trim().length >= 2) {
      results.push({ name: debouncedQuery.trim(), source: 'custom' });
    }

    setSuggestions(results.slice(0, 10));
  }, [debouncedQuery, historyIndex]);

  const selectProduct = useCallback((name) => {
    setSelectedName(name);
    setSelectedBrand('');
    setSelectedWeight('');
    const suggested = getSuggestedStore(name);
    setStore(suggested);
    setStep('store');
  }, [getSuggestedStore]);

  const handleAddItem = useCallback(async () => {
    if (!selectedName || !store || checkingPrice) return;

    setCheckingPrice(true);
    let resolvedPrice = null;

    try {
      const result = await getPriceWithGatekeeper({
        name: selectedName,
        brand: selectedBrand,
        weight: selectedWeight,
        store,
        householdId: household?.id
      });
      if (result && typeof result.price === 'number' && result.price > 0) {
        resolvedPrice = result.price;
      }
      // If gatekeeper wrote a fresh SerpApi result, refresh local cache view
      if (result && result.source === 'serpapi-fresh') {
        fetchPriceMemory?.();
      }
    } catch (err) {
      console.warn('Price gatekeeper failed, falling back to estimate:', err && err.message);
    }

    await addItem(selectedName, store, resolvedPrice);
    setCheckingPrice(false);
    onClose();
  }, [selectedName, selectedBrand, selectedWeight, store, checkingPrice, household, addItem, onClose, fetchPriceMemory]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && query.trim()) {
      selectProduct(query.trim());
    }
  }, [query, selectProduct]);

  if (!open) return null;

  return (
    <div className="modal-fullscreen">
      {step === 'search' ? (
        <div className="modal-inner">
          {/* Header */}
          <div className="modal-header">
            <h2 className="modal-title">Add Item</h2>
            <button className="btn-icon-close" onClick={onClose}>
              <IconX size={20} />
            </button>
          </div>

          {/* Search input */}
          <div className="modal-search-wrap">
            <div className="search-input-container">
              <IconSearch size={18} className="search-icon" />
              <input
                ref={inputRef}
                type="text"
                className="search-input"
                placeholder="What do you need?"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                autoCapitalize="words"
              />
              {query && (
                <button className="search-clear" onClick={() => setQuery('')}>
                  <IconX size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Smart Add button */}
          <div className="smart-add-row">
            <button
              className="smart-add-btn smart-add-full"
              onClick={() => {
                onClose();
                onOpenCamera?.();
              }}
            >
              <div className="smart-add-icon">
                <IconCamera size={22} />
              </div>
              <span>Smart Add with Camera</span>
            </button>
          </div>

          {/* Suggestions list */}
          <div className="suggestions-scroll">
            {suggestions.length > 0 && (
              <div className="suggestions-list">
                {suggestions.map((s, i) => (
                  <button
                    key={`${s.name}-${i}`}
                    className={`suggestion-item ${s.source === 'history' ? 'suggestion-history' : ''}`}
                    onClick={() => selectProduct(s.name)}
                  >
                    <div className="suggestion-left">
                      {s.source === 'history' && (
                        <span className="suggestion-badge history-badge">
                          <IconClock size={12} />
                        </span>
                      )}
                      {s.source === 'custom' && (
                        <span className="suggestion-badge custom-badge">
                          <IconPlus size={12} />
                        </span>
                      )}
                      <div className="suggestion-text">
                        <span className="suggestion-name">{s.name}</span>
                        {s.source === 'history' && s.price && (
                          <span className="suggestion-meta">
                            Last bought &middot; ${s.price.toFixed(2)}
                          </span>
                        )}
                        {s.source === 'custom' && (
                          <span className="suggestion-meta">Add custom item</span>
                        )}
                      </div>
                    </div>
                    <IconPlus size={18} className="suggestion-add-icon" />
                  </button>
                ))}
              </div>
            )}

            {suggestions.length === 0 && query.length === 0 && (
              <div className="suggestions-empty">
                <div className="empty-icon">&#128722;</div>
                <div className="empty-title">Search or scan</div>
                <div className="empty-subtitle">
                  Type a product name or snap a photo with Smart Add
                </div>
              </div>
            )}

            {suggestions.length === 0 && query.length >= 2 && (
              <div className="suggestions-list">
                <button
                  className="suggestion-item"
                  onClick={() => selectProduct(query.trim())}
                >
                  <div className="suggestion-left">
                    <span className="suggestion-badge custom-badge">
                      <IconPlus size={12} />
                    </span>
                    <div className="suggestion-text">
                      <span className="suggestion-name">{query.trim()}</span>
                      <span className="suggestion-meta">Add custom item</span>
                    </div>
                  </div>
                  <IconPlus size={18} className="suggestion-add-icon" />
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* STORE PICKER - step 2 */
        <div className="modal-inner">
          {/* Header */}
          <div className="modal-header">
            <button className="btn-back" onClick={() => { setStep('search'); setSelectedName(''); setSelectedBrand(''); setSelectedWeight(''); }}>
              &#8592; Back
            </button>
            <button className="btn-icon-close" onClick={onClose}>
              <IconX size={20} />
            </button>
          </div>

          {/* Product card */}
          <div className="store-pick-product">
            <h3 className="store-pick-name">{selectedName}</h3>
            <div className="store-pick-price">
              Est. ${getEstimatedPrice(selectedName, store || 'aldi').toFixed(2)}
            </div>
          </div>

          {/* Store label */}
          <div className="store-pick-label">Where to buy?</div>

          {/* Store buttons */}
          <div className="store-pick-options">
            <button
              className={`store-pick-btn store-aldi ${store === 'aldi' ? 'active' : ''}`}
              onClick={() => setStore('aldi')}
            >
              <span className="store-name">ALDI</span>
              {getSuggestedStore(selectedName) === 'aldi' && (
                <span className="store-suggested-tag">Suggested</span>
              )}
            </button>
            <button
              className={`store-pick-btn store-woolworths ${store === 'woolworths' ? 'active' : ''}`}
              onClick={() => setStore('woolworths')}
            >
              <span className="store-name">WOOLWORTHS</span>
              {getSuggestedStore(selectedName) === 'woolworths' && (
                <span className="store-suggested-tag">Suggested</span>
              )}
            </button>
          </div>

          {/* Bottom action */}
          <div className="store-pick-actions">
            <button
              className={`btn-add-final ${store && !checkingPrice ? 'active' : ''}`}
              onClick={handleAddItem}
              disabled={!store || checkingPrice}
            >
              {checkingPrice
                ? 'Checking price...'
                : store
                  ? `Add to ${store === 'aldi' ? 'Aldi' : 'Woolworths'} List`
                  : 'Pick a store above'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
