import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ShoppingBag, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import { formatPrice } from '@/utils/currency';

/**
 * "Added to bag" confirmation card.
 *
 * Every add-to-cart in the app goes through the store, so this is mounted once at the
 * app root and reacts to `lastAdded` — cards, quick view, the PDP and the outfit rail
 * all get the same confirmation without wiring a callback through each one.
 */
const DISMISS_AFTER_MS = 5000;

const AddedToCartPopup: React.FC<{ isAdminRoute?: boolean }> = ({ isAdminRoute = false }) => {
  const navigate = useNavigate();
  const lastAdded = useStore((state) => state.lastAdded);
  const dismissLastAdded = useStore((state) => state.dismissLastAdded);
  const toggleCart = useStore((state) => state.toggleCart);
  const cartCount = useStore((state) =>
    state.cartItems.reduce((sum, item) => sum + item.quantity, 0)
  );
  const [paused, setPaused] = useState(false);

  // Restart the timer on every add — `lastAdded` is a fresh object each time, including
  // when the same line is re-added, so the card never dismisses early.
  useEffect(() => {
    if (!lastAdded || paused) return;
    const timer = window.setTimeout(dismissLastAdded, DISMISS_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [lastAdded, paused, dismissLastAdded]);

  if (isAdminRoute) return null;

  const item = lastAdded?.item;

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key={lastAdded!.seq}
          role="status"
          aria-live="polite"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className="fixed z-[70] bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[360px]"
        >
          <div className="bg-brand-white border border-brand-gray-200 rounded-[14px] shadow-[0_18px_50px_rgba(0,0,0,0.18)] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-brand-black text-brand-white">
              <span className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] font-medium">
                <Check className="w-3.5 h-3.5 text-brand-yellow" />
                Added to bag
              </span>
              <button
                onClick={dismissLastAdded}
                aria-label="Dismiss"
                className="p-1 rounded-full hover:bg-white/15 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Line */}
            <div className="flex gap-3 p-4">
              <div className="w-16 h-20 rounded-[8px] overflow-hidden bg-brand-offwhite flex-shrink-0">
                <img src={item.image} alt="" className="w-full h-full object-cover" decoding="async" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-[13px] font-medium text-brand-black line-clamp-2 leading-snug">
                  {item.name}
                </p>
                <div className="flex items-center gap-2 text-[11px] text-brand-gray-500">
                  {item.size && (
                    <span className="uppercase tracking-[0.12em] bg-brand-gray-100 text-brand-black px-1.5 py-0.5 rounded">
                      {item.size}
                    </span>
                  )}
                  <span>Qty {item.quantity}</span>
                </div>
                <p className="text-[14px] font-semibold text-brand-black">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 px-4 pb-4">
              <button
                onClick={() => {
                  dismissLastAdded();
                  toggleCart();
                }}
                className="btn-label flex-1 border border-brand-black text-brand-black py-2.5 rounded-[8px] hover:bg-brand-gray-100 transition-colors flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Bag ({cartCount})
              </button>
              <button
                onClick={() => {
                  dismissLastAdded();
                  navigate('/checkout');
                }}
                className="btn-label flex-1 bg-brand-black text-brand-white py-2.5 rounded-[8px] hover:bg-brand-charcoal transition-colors"
              >
                Checkout
              </button>
            </div>

            {/* Auto-dismiss progress */}
            <motion.div
              key={`bar-${lastAdded!.seq}-${paused}`}
              className="h-[3px] bg-brand-yellow origin-left"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: paused ? 1 : 0 }}
              transition={{ duration: paused ? 0 : DISMISS_AFTER_MS / 1000, ease: 'linear' }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AddedToCartPopup;
