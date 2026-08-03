import React from 'react';
import SeasonalHero from '@/features/storefront/home/components/SeasonalHero';
import CollectionCarousel from '@/features/storefront/home/components/CollectionCarousel';
import BestSellersSection from '@/features/storefront/home/components/BestSellersSection';
import NewArrivalsSection from '@/features/storefront/home/components/NewArrivalsSection';
import BrandMarquee from '@/features/storefront/home/components/BrandMarquee';
import OfferStrip from '@/features/storefront/home/components/OfferStrip';
import SocialGallery from '@/features/storefront/home/components/SocialGallery';
import Testimonials from '@/components/ui/testimonials';
import EditorialBanner from '@/features/storefront/home/components/EditorialBanner';
import EssentialEdit from '@/features/storefront/home/components/EssentialEdit';
import SeasonalEdit from '@/features/storefront/home/components/SeasonalEdit';
import DeliverySection from './components/DeliverySection';
import BrandManifesto from '@/features/storefront/home/components/BrandManifesto';
import FeaturedProductWidget from '@/features/storefront/home/components/FeaturedProductWidget';

const Home = () => {
  return (
    <main className="min-h-screen">
      <SeasonalHero />
      <div className="flex flex-col">
        <BestSellersSection />
        <CollectionCarousel />
        <NewArrivalsSection />
        <BrandManifesto />

        <EditorialBanner />

        <BrandMarquee
          items={[
            "ELEVATED ESSENTIALS",
            "MODERN UNIFORM",
            "MADE TO LIVE IN",
            "REFINED FOR EVERYDAY",
            "DESIGNED WITH INTENTION",
            "THE CROWNVEIL EDIT"
          ]}
          className="py-6"
        />

        <EssentialEdit />
        <SeasonalEdit />
        <OfferStrip />
        <Testimonials />
    
        <SocialGallery />
      </div>
      <FeaturedProductWidget />
    </main>
  );
};

export default Home;
