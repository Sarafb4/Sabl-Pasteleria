import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import TortasPage from './pages/TortasPage';
import PostresPage from './pages/PostresPage';
import GalletasPage from './pages/GalletasPage';
import CheckoutPage from './pages/CheckoutPage';
import PaymentPage from './pages/PaymentPage';
import OrderStatusPage from './pages/OrderStatusPage';
import AdminPanel from './pages/AdminPanel';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsPage from './pages/TermsPage';
import CartSidebar from './components/CartSidebar';
import ScrollToTop from './components/ScrollToTop';
import CookieBanner from './components/CookieBanner';
import { useMenuStore } from './store/menuStore';
import { useOrderStore } from './store/orderStore';

const App: React.FC = () => {
  useEffect(() => {
    // Sincronizar catálogo y pedidos con Supabase en segundo plano al abrir la pastelería
    useMenuStore.getState().syncWithSupabase();
    useOrderStore.getState().syncWithSupabase();
  }, []);

  return (
    <>
      <ScrollToTop />
      <Toaster 
        position="bottom-center"
        containerStyle={{
          bottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
        }}
        toastOptions={{
          duration: 3500,
          style: {
            background: 'var(--wine, #7B1A10)',
            color: 'var(--blush, #FFF0F3)',
            fontFamily: 'Jost, sans-serif',
            fontSize: '1rem',
            fontWeight: 600,
            borderRadius: '99px',
            padding: '14px 26px',
            boxShadow: '0 12px 30px rgba(68, 14, 9, 0.3)',
            border: '1.5px solid rgba(254, 221, 226, 0.25)',
          },
          success: {
            iconTheme: {
              primary: 'var(--blush, #FFF0F3)',
              secondary: 'var(--wine, #7B1A10)',
            },
          },
          error: {
            style: {
              background: 'var(--wine2, #440E09)',
              color: 'var(--blush, #FFF0F3)',
              borderRadius: '99px',
              padding: '14px 26px',
              border: '1.5px solid #962A1D',
            },
            iconTheme: {
              primary: '#FCDCE1',
              secondary: 'var(--wine2, #440E09)',
            },
          },
        }}
      />
      <CartSidebar />
      <CookieBanner />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/tortas" element={<TortasPage />} />
        <Route path="/postres" element={<PostresPage />} />
        <Route path="/galletas" element={<GalletasPage />} />
        {/* Compatibilidad con rutas anteriores */}
        <Route path="/flan" element={<PostresPage />} />
        <Route path="/cupcakes" element={<PostresPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/payment" element={<PaymentPage />} />
        <Route path="/pago" element={<PaymentPage />} />
        <Route path="/order-status" element={<OrderStatusPage />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/terminos" element={<TermsPage />} />
        <Route path="/terminos-y-condiciones" element={<TermsPage />} />
        <Route path="/politica-de-privacidad" element={<PrivacyPolicyPage />} />
        <Route path="/privacidad" element={<PrivacyPolicyPage />} />
        <Route path="/tratamiento-de-datos" element={<PrivacyPolicyPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </>
  );
};

export default App;
