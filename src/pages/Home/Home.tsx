import React from 'react';
import SeasonalHero from '@/features/storefront/home/components/SeasonalHero';
import ServicePromises from '@/features/storefront/home/components/ServicePromises';
import UltimateSavingCombos from '@/features/storefront/home/components/UltimateSavingCombos';
import NewArrivalsSection from '@/features/storefront/home/components/NewArrivalsSection';
import MostWantedCategories from '@/features/storefront/home/components/MostWantedCategories';
import BrandMarquee from '@/features/storefront/home/components/BrandMarquee';
import EditorialBanner from '@/features/storefront/home/components/EditorialBanner';
import BestSellersRail from '@/features/storefront/home/components/BestSellersRail';
import StoreProof from '@/features/storefront/home/components/StoreProof';
import EditorialCampaign from '@/features/storefront/home/components/EditorialCampaign';
import BrandManifesto from '@/features/storefront/home/components/BrandManifesto';
import MemberOffers from '@/features/storefront/home/components/MemberOffers';
import CrownveilstersApproved from '@/features/storefront/home/components/CrownveilstersApproved';
import CustomerVoices from '@/features/storefront/home/components/CustomerVoices';
import SocialGallery from '@/features/storefront/home/components/SocialGallery';
import FeaturedProductWidget from '@/features/storefront/home/components/FeaturedProductWidget';

/**
 * Home page composition. Product rails alternate with editorial breaks so the page
 * never reads as one long grid, and every section hides itself when it has no data.
 */
const Home: React.FC = () => {
  return (
    <main className="min-h-screen bg-brand-white">
      {/* 1. Hero carousel */}
      <SeasonalHero />

      {/* 2. Shipping / payment / returns answered up front */}
      <ServicePromises />

      {/* 3. Bundles */}
      <UltimateSavingCombos />

      {/* 4. New drops */}
      <NewArrivalsSection />

      {/* 5. Category grid */}
      <MostWantedCategories />

      {/* 6. Full-bleed campaign asset */}
      <EditorialBanner />

      {/* 7. Brand marquee */}
      <BrandMarquee text="Making global fashion accessible" />

      {/* 8. Bestsellers */}
      <BestSellersRail />

      {/* 9. The numbers, straight from the database */}
      <StoreProof />

      {/* 10. Editorial break */}
      <EditorialCampaign />

      {/* 11. Brand story — sticky imagery on desktop, stacked on mobile */}
      <BrandManifesto />

      {/* 12. Coupons / standing offers */}
      <MemberOffers />

      {/* 13. Reviews + ambassadors */}
      <CrownveilstersApproved />

      {/* 14. Testimonials — marquee columns */}
      <CustomerVoices />

      {/* 15. Instagram */}
      <SocialGallery />

      {/* Floating spotlight */}
      <FeaturedProductWidget />
    </main>
  );
};

export default Home;
