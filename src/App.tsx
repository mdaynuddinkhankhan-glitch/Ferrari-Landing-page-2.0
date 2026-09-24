import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { ProductCard } from './components/ProductCard';
import { InfoSection } from './components/InfoSection';
import { SizeChart } from './components/SizeChart';
import { DescriptionCard } from './components/DescriptionCard';
import { CommitmentCard } from './components/CommitmentCard';
import { ColorSelection } from './components/ColorSelection';
import { OrderForm } from './components/OrderForm';
import { OrderSuccessPage } from './components/OrderSuccessPage';
import { AdminLogin } from './components/AdminLogin';
import { AdminDashboard } from './components/AdminDashboard';
import { Footer } from './components/Footer';
import { ShirtColorId, ShirtSize, OrderConfirmation } from './types';
import { getStoredSettings, subscribeToSiteSettings, SiteSettings } from './utils/siteSettings';
import { testConnection } from './lib/firebase';
import { recordWebsiteVisit } from './services/visitorService';
import { syncPixelsFromSettings, trackPageView, trackViewContent } from './utils/pixelTracking';

export default function App() {
  // Dynamic editable site settings (products, images, prices, texts) synchronized with cloud database
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(getStoredSettings);

  // Synchronize site settings with cloud database in real-time
  useEffect(() => {
    const unsubSettings = subscribeToSiteSettings((newSettings) => {
      setSiteSettings(newSettings);
    });
    return () => {
      unsubSettings();
    };
  }, []);

  // Synchronize and initialize Meta (Facebook) and TikTok pixels for website visitors
  useEffect(() => {
    if (!checkIsAdminUrl() && siteSettings) {
      syncPixelsFromSettings(siteSettings);
      trackPageView();
      if (siteSettings.products && siteSettings.products.length > 0) {
        trackViewContent('Ferrari Racing Jacket', siteSettings.products[0].price);
      }
    }
  }, [
    siteSettings.fbPixelId,
    siteSettings.ttPixelId,
    siteSettings.fbTestEventCode,
    siteSettings.ttTestEventCode,
  ]);

  // Initialize and validate Firebase connection on startup & track visitor
  useEffect(() => {
    testConnection();
    if (!checkIsAdminUrl()) {
      recordWebsiteVisit();
    }
  }, []);

  // Helper to accurately detect admin route
  const checkIsAdminUrl = () => {
    try {
      const path = window.location.pathname.toLowerCase();
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      return (
        path.startsWith('/admin') ||
        hash.startsWith('#/admin') ||
        search.includes('admin=true') ||
        search.includes('admin=1') ||
        search === '?admin'
      );
    } catch {
      return false;
    }
  };

  // Admin Route state
  const [isAdminPath, setIsAdminPath] = useState(checkIsAdminUrl);

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    try {
      return sessionStorage.getItem('fz_admin_session') === 'true';
    } catch {
      return false;
    }
  });

  // Listen to popstate and hashchange
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminPath(checkIsAdminUrl());
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const navigateToStore = () => {
    try {
      window.history.pushState({}, '', '/');
    } catch {
      window.location.hash = '';
    }
    setIsAdminPath(false);
  };

  const handleAdminLoginSuccess = () => {
    try {
      sessionStorage.setItem('fz_admin_session', 'true');
    } catch {
      // ignore
    }
    setIsAdminLoggedIn(true);
  };

  const handleAdminLogout = () => {
    try {
      sessionStorage.removeItem('fz_admin_session');
    } catch {
      // ignore
    }
    setIsAdminLoggedIn(false);
  };

  // Color selection state: default with 'black' pre-selected as in typical sales funnels
  const [selectedColors, setSelectedColors] = useState<Record<ShirtColorId, boolean>>({
    black: true,
    white: false,
    red: false,
    pink: false,
  });

  // Quantities for each color
  const [colorQuantities, setColorQuantities] = useState<Record<ShirtColorId, number>>({
    black: 1,
    white: 1,
    red: 1,
    pink: 1,
  });

  // Size selection: default 'L'
  const [selectedSize, setSelectedSize] = useState<ShirtSize>('L');

  // Confirmation modal state
  const [confirmedOrder, setConfirmedOrder] = useState<OrderConfirmation | null>(null);

  // Smooth scroll to color selection
  const scrollToColorSection = () => {
    const el = document.getElementById('colorSection');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Smooth scroll to order form
  const scrollToOrderForm = () => {
    const el = document.getElementById('orderSection');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle clicking "অর্ডার করতে চাই" from individual product cards
  const handleProductCardOrder = (colorId: ShirtColorId) => {
    setSelectedColors((prev) => ({
      ...prev,
      [colorId]: true,
    }));
    scrollToColorSection();
  };

  // Toggle color checkbox
  const handleToggleColor = (colorId: ShirtColorId) => {
    setSelectedColors((prev) => ({
      ...prev,
      [colorId]: !prev[colorId],
    }));
  };

  // Update item quantity
  const handleUpdateQuantity = (colorId: ShirtColorId, delta: number) => {
    setColorQuantities((prev) => {
      const current = prev[colorId] || 1;
      const updated = Math.max(1, Math.min(20, current + delta));
      return {
        ...prev,
        [colorId]: updated,
      };
    });
  };

  // Admin panel rendering
  if (isAdminPath) {
    if (!isAdminLoggedIn) {
      return (
        <AdminLogin
          onLoginSuccess={handleAdminLoginSuccess}
          onBackToStore={navigateToStore}
        />
      );
    }
    return (
      <AdminDashboard
        initialSettings={siteSettings}
        onLogout={handleAdminLogout}
        onBackToStore={navigateToStore}
        onSettingsUpdate={(newSettings) => setSiteSettings(newSettings)}
      />
    );
  }

  if (confirmedOrder) {
    return (
      <div className="bg-neutral-950 min-h-screen text-white flex justify-center selection:bg-[#ff0870] selection:text-white">
        <main className="w-full max-w-[700px] bg-black min-h-screen shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden relative">
          <OrderSuccessPage
            order={confirmedOrder}
            products={siteSettings.products}
            onBackToHome={() => setConfirmedOrder(null)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="bg-neutral-950 min-h-screen text-white flex justify-center selection:bg-[#ff0870] selection:text-white">
      {/* Outer constraint to 700px exactly as specified in the reference CSS */}
      <main className="w-full max-w-[700px] bg-black min-h-screen shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden relative">
        {/* Header with secret 10-click admin trigger */}
        <Header
          brandNamePart1={siteSettings.brandNamePart1}
          brandNamePart2={siteSettings.brandNamePart2}
          onAdminTrigger={() => {
            try {
              window.history.pushState({}, '', '/admin');
            } catch {
              window.location.hash = '#/admin';
            }
            setIsAdminPath(true);
          }}
        />

        {/* Hero Banner & Announcement */}
        <Hero
          headline={siteSettings.heroHeadline}
          highlight={siteSettings.heroHighlight}
          bannerImg={siteSettings.heroBannerImg}
          banners={siteSettings.heroBanners}
          ctaButtonText={siteSettings.ctaButtonText}
          onOrderClick={scrollToColorSection}
        />

        {/* Info Highlights - Placed right below the banner order button */}
        <InfoSection
          badge={siteSettings.infoBadge}
          description={siteSettings.infoDescription}
          urgencyText={siteSettings.infoUrgencyText}
        />

        {/* Product Cards: Black, White, Pink */}
        <div className="divide-y divide-neutral-900">
          {siteSettings.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelectColor={handleProductCardOrder}
            />
          ))}
        </div>

        {/* Feature / Delivery & Viral Highlight Card (Placed above Size Chart) */}
        <DescriptionCard
          highlightHeadline={siteSettings.descriptionCardText}
          deliveryTime={siteSettings.deliveryTimeText}
          sizes={siteSettings.sizesRowText}
          colors={siteSettings.colorsRowText}
          ctaButtonText={siteSettings.ctaButtonText}
          onOrderClick={scrollToColorSection}
        />

        {/* Size Chart Table (Placed below the highlight card) */}
        <SizeChart
          title={siteSettings.sizeChartTitle}
          subtitle={siteSettings.sizeChartSubtitle}
        />

        {/* Commitment & Anti-Fake Order Notice (Placed right below Size Chart as requested) */}
        <CommitmentCard
          badge={siteSettings.commitmentBadge}
          description={siteSettings.commitmentDescription}
          pillText={siteSettings.commitmentPillText}
        />

        {/* Color Selection Section */}
        <ColorSelection
          products={siteSettings.products}
          title={siteSettings.colorSectionTitle}
          subtitle={siteSettings.colorSectionSubtitle}
          selectedColors={selectedColors}
          colorQuantities={colorQuantities}
          onToggleColor={handleToggleColor}
          onUpdateQuantity={handleUpdateQuantity}
        />

        {/* Order Form */}
        <OrderForm
          products={siteSettings.products}
          bannerTitle={siteSettings.orderFormBannerTitle}
          formNameLabel={siteSettings.formNameLabel}
          formPhoneLabel={siteSettings.formPhoneLabel}
          formAddressLabel={siteSettings.formAddressLabel}
          formSubmitButtonText={siteSettings.formSubmitButtonText}
          deliveryInsideDhakaCost={siteSettings.deliveryInsideDhakaCost}
          deliveryOutsideDhakaCost={siteSettings.deliveryOutsideDhakaCost}
          isFreeDeliveryEnabled={siteSettings.isFreeDeliveryEnabled}
          freeDeliveryText={siteSettings.freeDeliveryText}
          selectedColors={selectedColors}
          colorQuantities={colorQuantities}
          selectedSize={selectedSize}
          onSelectSize={setSelectedSize}
          onScrollToColors={scrollToColorSection}
          onOrderSuccess={(order) => setConfirmedOrder(order)}
        />

        {/* Footer with WhatsApp & Trust Info */}
        <Footer
          whatsappNumber={siteSettings.whatsappNumber}
          displayPhone={siteSettings.displayPhone}
          tagline={siteSettings.footerTagline}
          brandName={`${siteSettings.brandNamePart1} ${siteSettings.brandNamePart2}`}
          trustText={siteSettings.footerTrustText}
          copyrightText={siteSettings.footerCopyrightText}
        />
      </main>
    </div>
  );
}
