import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../hooks/useSettings';
import { toNumber, formatCurrency, calculatePercentage, meetsThreshold } from '../utils/settingsHelpers';

interface CartSidebarProps {
  isAdminRoute?: boolean;
}

const CartSidebar: React.FC<CartSidebarProps> = ({ isAdminRoute = false }) => {
  // Don't render cart sidebar content for admin routes
  if (isAdminRoute) {
    return null;
  }

  const {
    cartItems,
    isCartOpen,
    toggleCart,
    updateQuantity,
    removeFromCart
  } = useStore();

  const navigate = useNavigate();
  const { settings, loading: settingsLoading } = useSettings();

  // Show loading state while settings are being fetched
  if (settingsLoading) {
    return (
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={toggleCart}
            />
            <motion.div
              className="fixed right-0 top-0 h-full w-full max-w-md bg-background shadow-large z-50 flex flex-col items-center justify-center"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">Loading cart...</p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  // Safe calculations using helper functions
  const subtotal = cartItems.reduce((total, item) => {
    const price = toNumber(item.price);
    const quantity = toNumber(item.quantity);
    return total + (price * quantity);
  }, 0);

  const tax = calculatePercentage(subtotal, settings.tax_rate);

  // For the cart sidebar, we don't have pincode information, so we use standard delivery charge
  // In a real implementation, you might store the pincode in localStorage or get it from user profile
  const deliveryFee = meetsThreshold(subtotal, settings.free_delivery_threshold) ? 0 : toNumber(settings.delivery_charge);
  const total = subtotal + tax + deliveryFee;

  const handleCheckout = () => {
    toggleCart();
    navigate('/cart');
  };

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleCart}
          />

          {/* Sidebar */}
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-md bg-brand-offwhite shadow-2xl z-50 flex flex-col border-l border-brand-gray-200"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-brand-gray-200 bg-brand-cream">
              <h2 className="text-xl text-brand-black uppercase font-instrument font-normal tracking-wide">Shopping Bag</h2>
              <button
                onClick={toggleCart}
                className="p-2 hover:bg-brand-gray-200/50 rounded-full transition-colors text-brand-black"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto p-6 bg-brand-offwhite">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="p-6 bg-brand-cream rounded-full mb-6">
                    <ShoppingBag className="w-12 h-12 text-brand-black" />
                  </div>
                  <h3 className="text-lg text-brand-black uppercase font-instrument font-normal tracking-wide mb-2">Your Bag is Empty</h3>
                  <p className="text-brand-gray-700">
                    Explore elevated essentials made for your everyday.
                  </p>
                  <button
                    onClick={() => { toggleCart(); navigate('/products'); }}
                    className="mt-6 px-6 py-2 border border-brand-black text-brand-black hover:bg-brand-black hover:text-brand-offwhite transition-colors rounded-none uppercase tracking-widest text-sm"
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {cartItems.map((item) => (
                    <motion.div
                      key={`${item.id}-${item.size ?? ''}`}
                      className="flex space-x-4 pb-6 border-b border-brand-gray-200 last:border-0"
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-sm shadow-md border border-brand-gray-200"
                      />

                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-base text-brand-black uppercase font-instrument font-normal tracking-wide line-clamp-2 leading-tight">
                            {item.name}
                          </h4>
                          <p className="text-sm text-brand-gray-700 mt-1">
                            {item.weight}
                          </p>
                          {item.size && (
                            <span className="inline-block mt-1 text-[10px] font-semibold uppercase tracking-wider bg-brand-gray-100 text-brand-black px-2 py-0.5 rounded">
                              Size: {item.size}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center border border-brand-gray-200 rounded-sm">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)}
                              className="p-1.5 hover:bg-brand-cream text-brand-black transition-colors"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-brand-black">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}
                              className="p-1.5 hover:bg-brand-cream text-brand-black transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-medium text-brand-black">
                              {formatCurrency(item.price * item.quantity, settings.currency_symbol)}
                            </span>
                            <button
                              onClick={() => removeFromCart(item.id, item.size)}
                              className="text-brand-gray-700/60 hover:text-brand-black transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {cartItems.length > 0 && (
              <div className="border-t border-brand-gray-200 bg-brand-offwhite p-6 space-y-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
                <div className="space-y-2">
                  <div className="flex justify-between text-brand-gray-700 font-medium">
                    <span>Subtotal</span>
                    <span>{formatCurrency(subtotal, settings.currency_symbol)}</span>
                  </div>

                  <div className="flex justify-between text-brand-black text-xl pt-2 border-t border-brand-gray-200">
                    <span className="text-brand-black uppercase font-instrument font-normal tracking-wide">Total</span>
                    <span className="text-brand-black font-semibold">{formatCurrency(total, settings.currency_symbol)}</span>
                  </div>
                  <p className="text-xs text-brand-gray-700/80 text-center pt-1">
                    Shipping & Taxes calculated at checkout
                  </p>
                </div>

                <motion.button
                  onClick={handleCheckout}
                  className="w-full bg-brand-black text-brand-offwhite py-4 rounded-sm uppercase tracking-[0.1em] font-medium hover:bg-brand-charcoal transition-all shadow-lg hover:shadow-xl"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  Checkout
                </motion.button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CartSidebar;
