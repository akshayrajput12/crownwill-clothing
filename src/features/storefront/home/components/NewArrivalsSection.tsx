import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import QuickViewModal from '@/components/QuickViewModal';
import { useNewDrops } from '@/hooks/queries';
import { PLACEHOLDER_PRODUCT_IMAGE } from '@/lib/brandImages';

const CARDS_PER_VIEW = 4;

/**
 * New Drops carousel.
 *
 * The tiles are the shared ProductCard — this section used to hand-roll its own, which
 * meant it silently missed hover add-to-bag, size quick add, badges and the sold-out
 * state every other rail has.
 */
const NewArrivalsSection: React.FC = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);

  const { data: products = [], isLoading: loading } = useNewDrops(12);
  const maxIndex = Math.max(0, products.length - CARDS_PER_VIEW);

  if (!loading && products.length === 0) return null;

  return (
    <section className="bg-brand-white brand-section-padding">
      <div className="brand-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <p className="eyebrow">Just In</p>
            <h2 className="section-title">New Drops</h2>
            <p className="section-subtitle">Exclusive styles, fresh off the line.</p>
          </div>

          {/* Carousel Arrows */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              aria-label="Previous products"
              className="w-10 h-10 rounded-full border border-brand-gray-200 bg-brand-white flex items-center justify-center text-brand-black hover:bg-brand-black hover:text-brand-white disabled:opacity-30 disabled:hover:bg-brand-white disabled:hover:text-brand-black transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))}
              disabled={currentIndex >= maxIndex}
              aria-label="Next products"
              className="w-10 h-10 rounded-full border border-brand-gray-200 bg-brand-white flex items-center justify-center text-brand-black hover:bg-brand-black hover:text-brand-white disabled:opacity-30 disabled:hover:bg-brand-white disabled:hover:text-brand-black transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Carousel */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="animate-pulse space-y-3">
                <div className="bg-brand-gray-100 aspect-[4/5] rounded-[12px]" />
                <div className="bg-brand-gray-100 h-4 w-3/4 rounded" />
                <div className="bg-brand-gray-100 h-4 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-hidden [--card-step:100%] sm:[--card-step:50%] lg:[--card-step:25%]">
            <div
              className="flex transition-transform duration-500 ease-out will-change-transform"
              style={{ transform: `translateX(calc(-${currentIndex} * var(--card-step)))` }}
            >
              {products.map((product) => (
                <div key={product.id} className="w-full sm:w-1/2 lg:w-1/4 flex-shrink-0 px-2.5">
                  <ProductCard
                    product={{
                      ...product,
                      image: product.images?.[0] || PLACEHOLDER_PRODUCT_IMAGE,
                      slug: product.sku || product.id,
                    } as any}
                    onViewDetail={() => navigate(`/product/${product.sku || product.id}`)}
                    onQuickView={(p) => setQuickViewProduct(p)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <QuickViewModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </section>
  );
};

export default NewArrivalsSection;
