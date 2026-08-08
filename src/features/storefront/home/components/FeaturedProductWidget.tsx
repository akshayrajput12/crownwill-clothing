import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye } from 'lucide-react';
import QuickViewModal from '@/components/QuickViewModal';
import { useBestSellers, useNewDrops } from '@/hooks/queries';
import { PLACEHOLDER_PRODUCT_IMAGE } from '@/lib/brandImages';
import { formatPrice } from '@/utils/currency';

const ROTATE_MS = 5000;

/**
 * Floating spotlight card, bottom-left of the storefront.
 *
 * Rotates through bestsellers and new arrivals; clicking opens the same quick-view
 * modal the product grids use. Sits opposite the WhatsApp button so the two never
 * overlap, and shrinks rather than covering content on small screens.
 */
const FeaturedProductWidget: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);

  const { data: bestSellers = [] } = useBestSellers(4);
  const { data: newDrops = [] } = useNewDrops(12);

  // Bestsellers first, then genuinely new arrivals, de-duplicated.
  const seen = new Set<string>();
  const spotlight = [
    ...bestSellers.map((p) => ({ product: p, label: 'Bestseller' })),
    ...newDrops.filter((p) => p.new_arrival).map((p) => ({ product: p, label: 'New arrival' })),
  ]
    .filter(({ product }) => {
      if (seen.has(product.id)) return false;
      seen.add(product.id);
      return true;
    })
    .slice(0, 6);

  useEffect(() => {
    if (spotlight.length < 2 || paused || quickViewProduct) return;
    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % spotlight.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, [spotlight.length, paused, quickViewProduct]);

  if (dismissed || spotlight.length === 0) return null;

  const current = spotlight[index % spotlight.length];
  const product = current.product as any;
  const image = product.images?.[0] || PLACEHOLDER_PRODUCT_IMAGE;
  const discount = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;

  return (
    <>
      <motion.aside
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        aria-label="Featured product"
        /* Mobile: a slim pill that clears the sticky bottom bars and leaves room for the
           WhatsApp button on the opposite side. Desktop: the full card. */
        className="fixed bottom-24 left-4 right-auto max-w-[calc(100vw-6.5rem)] w-[230px] sm:bottom-6 sm:left-6 sm:w-[280px] sm:max-w-none z-40 bg-brand-white border border-brand-gray-200 rounded-[14px] sm:rounded-[16px] shadow-[0_12px_40px_rgba(0,0,0,0.14)] overflow-hidden"
      >
        {/* Rotation progress */}
        {spotlight.length > 1 && (
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-brand-gray-200 z-20">
            <motion.div
              key={index}
              initial={{ width: '0%' }}
              animate={{ width: paused ? '0%' : '100%' }}
              transition={{ duration: ROTATE_MS / 1000, ease: 'linear' }}
              className="h-full bg-brand-yellow"
            />
          </div>
        )}

        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss featured product"
          className="absolute top-2.5 right-2.5 z-20 bg-brand-white/90 hover:bg-brand-black hover:text-brand-white text-brand-black rounded-full p-1.5 shadow-sm transition-colors"
        >
          <X className="w-3 h-3" />
        </button>

        <button onClick={() => setQuickViewProduct(product)} className="w-full text-left group">
          <div className="flex items-stretch">
            {/* Thumbnail */}
            <div className="relative w-[68px] sm:w-[96px] flex-shrink-0 bg-brand-offwhite overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={product.id}
                  src={image}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  loading="lazy"
                  decoding="async"
                />
              </AnimatePresence>
            </div>

            {/* Copy */}
            <div className="flex-1 px-3 py-2.5 pt-4 sm:p-3.5 sm:pt-5 flex flex-col gap-1 sm:gap-1.5 min-w-0">
              <span className="text-[9px] uppercase tracking-[0.22em] text-brand-gray-500 truncate">
                {current.label}
              </span>

              <h4 className="card-title text-[12px] sm:text-[13px] line-clamp-1 sm:line-clamp-2 leading-snug">
                {product.name}
              </h4>

              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[13px] sm:text-[14px] font-medium text-brand-black">
                  {formatPrice(product.price)}
                </span>
                {discount > 0 && (
                  <>
                    {/* The struck-through price is the first thing to go when space is tight */}
                    <span className="price-was text-[11px] hidden sm:inline">{formatPrice(product.original_price)}</span>
                    <span className="price-off text-[10px] sm:text-[11px]">{discount}% off</span>
                  </>
                )}
              </div>

              <span className="mt-1 hidden sm:inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-brand-black/70 group-hover:text-brand-black">
                <Eye className="w-3 h-3" /> Quick view
              </span>
            </div>
          </div>
        </button>

        {/* Dots */}
        {spotlight.length > 1 && (
          <div className="hidden sm:flex items-center justify-center gap-1.5 pb-2.5">
            {spotlight.map((_, dot) => (
              <button
                key={dot}
                onClick={() => setIndex(dot)}
                aria-label={`Show featured product ${dot + 1}`}
                className={`h-1 rounded-full transition-all ${
                  dot === index % spotlight.length ? 'w-4 bg-brand-black' : 'w-1 bg-brand-gray-200'
                }`}
              />
            ))}
          </div>
        )}
      </motion.aside>

      {quickViewProduct && (
        <QuickViewModal
          product={{
            ...quickViewProduct,
            originalPrice: quickViewProduct.original_price ?? undefined,
            image: quickViewProduct.images?.[0] || PLACEHOLDER_PRODUCT_IMAGE,
            slug: quickViewProduct.sku || quickViewProduct.id,
          }}
          isOpen={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </>
  );
};

export default FeaturedProductWidget;
