import React, { useState } from 'react';
import { useItems } from '../hooks/useItems';
import { useHousehold } from '../hooks/useHousehold';
import { supabase } from '../lib/supabase';
import ShoppingItem from '../components/ShoppingItem';
import EditItemModal from '../components/EditItemModal';
import ReceiptScanner from '../components/ReceiptScanner';
import { IconPlus } from '../lib/icons';

export default function ShoppingList({ onOpenAddItem }) {
  const { aldiItems, woolworthsItems, aldiTotal, woolworthsTotal, toggleItem, deleteItem, updateItem, moveToWoolworths } = useItems();
  const { currentWeek } = useHousehold();
  const [editingItem, setEditingItem] = useState(null);
  const [showReceipt, setShowReceipt] = useState(null); // 'aldi' | 'woolworths' | null
  const [finishingAldi, setFinishingAldi] = useState(false);
  const [finishingWoolworths, setFinishingWoolworths] = useState(false);

  const handleFinishAldi = async () => {
    setFinishingAldi(true);
    // Move unchecked Aldi items to Woolworths
    const unchecked = aldiItems.filter(i => i.status === 'active');
    if (unchecked.length > 0) {
      await moveToWoolworths(unchecked.map(i => i.id));
    }
    setFinishingAldi(false);
    // Prompt receipt scan
    setShowReceipt('aldi');
  };

  const handleFinishWoolworths = async () => {
    setFinishingWoolworths(true);
    // Mark week as complete
    if (currentWeek) {
      await supabase.from('weeks').update({ completed: true }).eq('id', currentWeek.id);
    }
    setFinishingWoolworths(false);
    // Prompt receipt scan
    setShowReceipt('woolworths');
  };

  const aldiActive = aldiItems.filter(i => i.status === 'active');
  const aldiDone = aldiItems.filter(i => i.status === 'done');
  const woolActive = woolworthsItems.filter(i => i.status === 'active');
  const woolDone = woolworthsItems.filter(i => i.status === 'done');

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Shopping List</h1>
      </div>

      {/* Aldi section */}
      <div className="store-section">
        <div className="store-header">
          <div className="store-name">
            <span className="store-badge aldi">ALDI</span>
            <span style={{ fontSize: 14, color: 'var(--gray-300)' }}>
              {aldiItems.length} item{aldiItems.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="store-total">${aldiTotal.toFixed(2)}</div>
        </div>

        {aldiActive.map(item => (
          <ShoppingItem
            key={item.id}
            item={item}
            onToggle={toggleItem}
            onDelete={deleteItem}
            onEdit={setEditingItem}
          />
        ))}

        {aldiDone.length > 0 && (
          <>
            <div style={{
              fontSize: 12, fontWeight: 700, color: 'var(--gray-400)',
              padding: '8px 0', textTransform: 'uppercase', letterSpacing: 0.5
            }}>
              Done ({aldiDone.length})
            </div>
            {aldiDone.map(item => (
              <ShoppingItem
                key={item.id}
                item={item}
                onToggle={toggleItem}
                onDelete={deleteItem}
                onEdit={setEditingItem}
              />
            ))}
          </>
        )}

        {aldiItems.length > 0 && (
          <button
            className="btn btn-aldi btn-full"
            style={{ marginTop: 12 }}
            onClick={handleFinishAldi}
            disabled={finishingAldi}
          >
            {finishingAldi ? 'Finishing...' : 'Finish Aldi Shop'}
          </button>
        )}

        {aldiItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>
            <p style={{ fontWeight: 700, fontSize: 15 }}>No Aldi items yet</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Add items and choose Aldi as the store</p>
          </div>
        )}
      </div>

      {/* Woolworths section */}
      <div className="store-section">
        <div className="store-header">
          <div className="store-name">
            <span className="store-badge woolworths">WOOLWORTHS</span>
            <span style={{ fontSize: 14, color: 'var(--gray-300)' }}>
              {woolworthsItems.length} item{woolworthsItems.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="store-total">${woolworthsTotal.toFixed(2)}</div>
        </div>

        {woolActive.map(item => (
          <ShoppingItem
            key={item.id}
            item={item}
            onToggle={toggleItem}
            onDelete={deleteItem}
            onEdit={setEditingItem}
          />
        ))}

        {woolDone.length > 0 && (
          <>
            <div style={{
              fontSize: 12, fontWeight: 700, color: 'var(--gray-400)',
              padding: '8px 0', textTransform: 'uppercase', letterSpacing: 0.5
            }}>
              Done ({woolDone.length})
            </div>
            {woolDone.map(item => (
              <ShoppingItem
                key={item.id}
                item={item}
                onToggle={toggleItem}
                onDelete={deleteItem}
                onEdit={setEditingItem}
              />
            ))}
          </>
        )}

        {woolworthsItems.length > 0 && (
          <button
            className="btn btn-woolworths btn-full"
            style={{ marginTop: 12 }}
            onClick={handleFinishWoolworths}
            disabled={finishingWoolworths}
          >
            {finishingWoolworths ? 'Finishing...' : 'Finish Woolworths Shop'}
          </button>
        )}

        {woolworthsItems.length === 0 && (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--gray-400)' }}>
            <p style={{ fontWeight: 700, fontSize: 15 }}>No Woolworths items yet</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Add items and choose Woolworths as the store</p>
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={onOpenAddItem}>
        <IconPlus size={28} />
      </button>

      {/* Edit modal */}
      <EditItemModal
        item={editingItem}
        open={!!editingItem}
        onClose={() => setEditingItem(null)}
        onSave={updateItem}
      />

      {/* Receipt scanner */}
      <ReceiptScanner
        open={!!showReceipt}
        store={showReceipt || 'aldi'}
        onClose={() => setShowReceipt(null)}
      />
    </div>
  );
}
