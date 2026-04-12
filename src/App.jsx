import React, { useState, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import { HouseholdProvider, useHousehold } from './hooks/useHousehold';
import SplashScreen from './components/SplashScreen';
import PinLogin from './components/PinLogin';
import BottomNav from './components/BottomNav';
import AddItemModal from './components/AddItemModal';
import BarcodeScanner from './components/BarcodeScanner';
import PhotoCapture from './components/PhotoCapture';
import Dashboard from './pages/Dashboard';
import ShoppingList from './pages/ShoppingList';
import History from './pages/History';
import MealPlanner from './pages/MealPlanner';

function AppContent() {
  const { household, currentUser, loading } = useHousehold();
  const [showSplash, setShowSplash] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [scannedProduct, setScannedProduct] = useState(null);

  const handleSplashComplete = useCallback(() => setShowSplash(false), []);
  const openAddItem = useCallback(() => setShowAddItem(true), []);
  const closeAddItem = useCallback(() => setShowAddItem(false), []);

  const handleProductScanned = useCallback((product) => {
    setScannedProduct(product);
    setShowScanner(false);
    setShowCamera(false);
    setShowAddItem(true);
  }, []);

  if (showSplash) {
    return <SplashScreen onComplete={handleSplashComplete} />;
  }

  if (loading) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!household || !currentUser) {
    return (
      <div className="app-container">
        <PinLogin />
      </div>
    );
  }

  return (
    <div className="app-container">
      <Routes>
        <Route path="/" element={<Dashboard onOpenAddItem={openAddItem} />} />
        <Route path="/list" element={<ShoppingList onOpenAddItem={openAddItem} />} />
        <Route path="/history" element={<History />} />
        <Route path="/meals" element={<MealPlanner />} />
      </Routes>
      <BottomNav />

      <AddItemModal
        open={showAddItem}
        onClose={closeAddItem}
        onOpenScanner={() => setShowScanner(true)}
        onOpenCamera={() => setShowCamera(true)}
        initialProduct={scannedProduct}
      />

      <BarcodeScanner
        open={showScanner}
        onClose={() => setShowScanner(false)}
        onProduct={handleProductScanned}
      />

      <PhotoCapture
        open={showCamera}
        onClose={() => setShowCamera(false)}
        onProduct={handleProductScanned}
      />
    </div>
  );
}

export default function App() {
  return (
    <HouseholdProvider>
      <AppContent />
    </HouseholdProvider>
  );
}
