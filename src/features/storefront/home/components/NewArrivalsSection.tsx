import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import QuickViewModal from '@/components/QuickViewModal';
import { useNewDrops } from '@/hooks/queries';
import { PLACEHOLDER_PRODUCT_IMAGE } from '@/lib/brandImages';

const CARDS_PER_VIEW = 4;

const NewArrivalsSection: React.FC = () => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);

  const { data: products = [], isLoading: loading } = useNewDrops(12);
  const maxIndex = Math.max(0, products.length - CARDS_PER_VIEW);

  const calculateDiscount = (price: number, originalPrice?: number) => {
    if (!originalPrice || originalPrice <= price) return null;
    const discount = Math.round(((originalPrice - price) / originalPrice) * 100);
    return `${discount}% OFF`;
  };

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
              className="w-10 h-10 rounded-full border border-brand-gray-200 bg-brand-white flex items-center justify-center text-brand-black hover:bg-brand-black hover:text-brand-white disabled:opacity-30 disabled:hover:bg-brand-white disabled:hover:text-brand-black transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentIndex((prev) => Math.min(maxIndex, prev + 1))}
              disabled={currentIndex >= maxIndex}
              className="w-10 h-10 rounded-full border border-brand-gray-200 bg-brand-white flex items-center justify-center text-brand-black hover:bg-brand-black hover:text-brand-white disabled:opacity-30 disabled:hover:bg-brand-white disabled:hover:text-brand-black transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Carousel Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="animate-pulse space-y-3">
                <div className="bg-brand-gray-100 aspect-[3/4] rounded-[12px]" />
                <div className="bg-brand-gray-100 h-4 w-3/4 rounded" />
                <div className="bg-brand-gray-100 h-4 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="overflow-hidden [--card-step:100%] sm:[--card-step:50%] lg:[--card-step:25%]"
          >
            <div
              className="flex transition-transform duration-500 ease-out will-change-transform"
              style={{ transform: `translateX(calc(-${currentIndex} * var(--card-step)))` }}
            >
              {products.map((product) => {
                const discount = calculateDiscount(product.price, product.original_price);
                const mainImage = product.images?.[0] || PLACEHOLDER_PRODUCT_IMAGE;

                return (
                  <div
                    key={product.id}
                    className="w-full sm:w-1/2 lg:w-1/4 flex-shrink-0 px-2.5"
                  >
                    <div
                      onClick={() => navigate(`/product/${product.sku || product.id}`)}
                      className="group cursor-pointer flex flex-col justify-between h-full"
                    >
                      {/* Aspect 3/4 Image Container */}
                      <div className="relative aspect-[3/4] w-full rounded-[12px] overflow-hidden bg-brand-offwhite mb-3">
                        <img
                          src={mainImage}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                          decoding="async"
                        />

                        {/* Quick View Hover Button */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickViewProduct(product);
                            }}
                            className="btn-label bg-brand-white text-brand-black px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 hover:bg-brand-yellow transition-all"
                          >
                            <Eye className="w-4 h-4" /> Quick View
                          </button>
                        </div>
                      </div>

                      {/* Product Name */}
                      <h3 className="card-title line-clamp-2 mb-2">
                        {product.name}
                      </h3>

                      {/* Pricing Row */}
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="price-now">₹{product.price}</span>
                        {product.original_price && product.original_price > product.price && (
                          <span className="price-was">₹{product.original_price}</span>
                        )}
                        {discount && <span className="price-off">{discount}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <QuickViewModal
          product={{
            ...quickViewProduct,
            image: quickViewProduct.images?.[0] || PLACEHOLDER_PRODUCT_IMAGE,
            slug: quickViewProduct.sku || quickViewProduct.id
          }}
          isOpen={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </section>
  );
};

export default NewArrivalsSection;
