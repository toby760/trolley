import React, { useState } from 'react';
import { useItems } from '../hooks/useItems';
import { useHousehold } from '../hooks/useHousehold';
import { supabase } from '../lib/supabase';
import ShoppingItem from '../components/ShoppingItem';
import EditItemModal from '../components/EditItemModal';
import ReceiptScanner from '../components/ReceiptScanner';
import { IconPlus } from '../lib/icons';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';

export default function ShoppingList({ onOpenAddItem }) {
  const { aldiItems, woolworthsItems, aldiTotal, woolworthsTotal, toggleItem, deleteItem, updateItem, moveToWoolworths, reorderItem, finishShop } = useItems();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 250, tolerance: 6 } })
  );
  const handleDragEndAldi = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const ids = aldiActive.map(i => i.id);
    const oldIdx = ids.indexOf(active.id);
    const newIdx = ids.indexOf(over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    reorderItem('aldi', arrayMove(ids, oldIdx, newIdx));
  };
  const handleDragEndWool = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const ids = woolActive.map(i => i.id);
    const oldIdx = ids.indexOf(active.id);
    const newIdx = ids.indexOf(over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    reorderItem('woolworths', arrayMove(ids, oldIdx, newIdx));
  };
  const { currentWeek } = useHousehold();
  const [editingItem, setEditingItem] = useState(null);
  const [showReceipt, setShowReceipt] = useState(null);
  const [finishingAldi, setFinishingAldi] = useState(false);
  const [finishingWoolworths, setFinishingWoolworths] = useState(false);

  const handleFinishAldi = async () => {
    setFinishingAldi(true);
    const result = await finishShop('aldi');
    setFinishingAldi(false);
    if (result && !result.error) {
      setShowReceipt('aldi');
    }
  };

  const handleFinishWoolworths = async () => {
    setFinishingWoolworths(true);
    const result = await finishShop('woolworths');
    if (currentWeek) {
      await supabase.from('weeks').update({ completed: true }).eq('id', currentWeek.id);
    }
    setFinishingWoolworths(false);
    if (result && !result.error) {
      setShowReceipt('woolworths');
    }
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
      <div className="store-card">
        <div className="store-header">
          <div className="store-header-left">
            <span className="store-name-badge aldi">ALDI</span>
            <span className="store-item-count">
              {aldiItems.length} item{aldiItems.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="store-total">${aldiTotal.toFixed(2)}</div>
        </div>

        {aldiActive.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndAldi}>
            <SortableContext items={aldiActive.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="store-items-list">
                {aldiActive.map(item => (
                  <ShoppingItem
                    key={item.id}
                    item={item}
                    onToggle={toggleItem}
                    onDelete={deleteItem}
                    onEdit={setEditingItem}
                    sortable
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {aldiDone.length > 0 && (
          <>
            <div className="store-done-label">Done ({aldiDone.length})</div>
            <div className="store-items-list">
              {aldiDone.map(item => (
                <ShoppingItem
                  key={item.id}
                  item={item}
                  onToggle={toggleItem}
                  onDelete={deleteItem}
                  onEdit={setEditingItem}
                />
              ))}
            </div>
          </>
        )}

        {aldiItems.length > 0 && (
          <button
            className="btn-finish aldi"
            onClick={handleFinishAldi}
            disabled={finishingAldi}
          >
            {finishingAldi ? 'Finishing...' : 'Finish Aldi Shop'}
          </button>
        )}

        {aldiItems.length === 0 && (
          <div className="store-empty">
            <div className="store-empty-title">No Aldi items yet</div>
            <div className="store-empty-sub">Add items and choose Aldi as the store</div>
          </div>
        )}
      </div>

      {/* Woolworths section */}
      <div className="store-card">
        <div className="store-header">
          <div className="store-header-left">
            <span className="store-name-badge woolworths">WOOLWORTHS</span>
            <span className="store-item-count">
              {woolworthsItems.length} item{woolworthsItems.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="store-total">${woolworthsTotal.toFixed(2)}</div>
        </div>

        {woolActive.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndWool}>
            <SortableContext items={woolActive.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="store-items-list">
                {woolActive.map(item => (
                  <ShoppingItem
                    key={item.id}
                    item={item}
                    onToggle={toggleItem}
                    onDelete={deleteItem}
                    onEdit={setEditingItem}
                    sortable
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {woolDone.length > 0 && (
          <>
            <div className="store-done-label">Done ({woolDone.length})</div>
            <div className="store-items-list">
              {woolDone.map(item => (
                <ShoppingItem
                  key={item.id}
                  item={item}
                  onToggle={toggleItem}
                  onDelete={deleteItem}
                  onEdit={setEditingItem}
                />
              ))}
            </div>
          </>
        )}

        {woolworthsItems.length > 0 && (
          <button
            className="btn-finish woolworths"
            onClick={handleFinishWoolworths}
            disabled={finishingWoolworths}
          >
            {finishingWoolworths ? 'Finishing...' : 'Finish Woolworths Shop'}
          </button>
        )}

        {woolworthsItems.length === 0 && (
          <div className="store-empty">
            <div className="store-empty-title">No Woolworths items yet</div>
            <div className="store-empty-sub">Add items and choose Woolworths as the store</div>
          </div>
        )}
      </div>

      {/* FAB */}
      <button className="fab" onClick={onOpenAddItem}>
        <IconPlus size={26} />
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
