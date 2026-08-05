import { Link } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useStore } from '@/store/useStore';
import { marketingImages } from '@/lib/brandImages';
import { formatPrice } from '@/utils/currency';
import { useSettings } from '@/hooks/useSettings';
import { toNumber, formatCurrency, calculatePercentage, meetsThreshold } from '@/utils/settingsHelpers';

const Cart = () => {
  const { cartItems, updateQuantity, removeFromCart } = useStore();
  const { settings, loading: settingsLoading, error: settingsError } = useSettings();

  // Early return if settings are still loading
  if (settingsLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-black mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Preparing your bag...</p>
      </div>
    );
  }

  // Show error if settings failed to load
  if (settingsError) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="text-red-500 mb-4">⚠️ Settings Error</div>
        <p className="text-muted-foreground mb-4">{settingsError}</p>
        <Button onClick={() => window.location.reload()} className="bg-brand-black text-white hover:bg-brand-charcoal">
          Refresh Page
        </Button>
      </div>
    );
  }

  const subtotal = cartItems.reduce((sum, item) => sum + (toNumber(item.price) * toNumber(item.quantity)), 0);
  const tax = calculatePercentage(subtotal, settings.tax_rate);

  // Delivery fee calculation based on settings
  const deliveryFee = meetsThreshold(subtotal, settings.free_delivery_threshold) ? 0 : toNumber(settings.delivery_charge);
  const total = subtotal + tax + deliveryFee;

  // Check if minimum order amount is met
  const minOrderAmount = toNumber(settings.min_order_amount);
  const isMinOrderMet = subtotal >= minOrderAmount;
  const minOrderShortfall = Math.max(0, minOrderAmount - subtotal);

  if (cartItems.length === 0) {
    return (
      <div className="min-h-[60vh] bg-brand-white flex flex-col items-center justify-center p-6 text-center">
        {/* 3D Yellow Shopping Bag Graphic */}
        <div className="relative w-48 h-48 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 bg-brand-yellow/20 rounded-full blur-xl scale-95" />
          <img
            src={marketingImages.emptyCartBag}
            alt="Empty Shopping Bag"
            className="w-40 h-40 object-contain relative z-10 drop-shadow-lg"
            decoding="async"
          />
        </div>

        {/* Text Container in Rounded Pill Outline Border */}
        <div className="border-2 border-brand-yellow rounded-full px-8 py-4 mb-6 max-w-md bg-brand-cream/30 flex flex-col items-center">
          <h1 className="text-[20px] font-medium uppercase text-brand-black mb-1 tracking-tight">
            Uh Oh... it's empty!
          </h1>
          <p className="text-[14px] text-brand-gray-500 font-medium">
            Make a wish and add your favorites now!
          </p>
        </div>

        {/* CTA Button */}
        <Button
          asChild
          className="bg-brand-black hover:bg-brand-black/90 text-brand-white font-semibold text-[14px] px-8 py-3.5 rounded-[8px] uppercase tracking-wider transition-all"
        >
          <Link to="/products">Continue Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-offwhite">
      <div className="container mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-brand-gray-200">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild className="sm:hidden text-brand-black">
              <Link to="/products">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl text-brand-black uppercase font-instrument font-normal tracking-wide">Shopping Cart</h1>
              <p className="text-sm text-brand-gray-700 mt-1 tracking-wide font-instrument">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)} ITEMS
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="hidden sm:flex border-brand-black text-brand-black hover:bg-brand-black hover:text-white uppercase tracking-wider text-xs font-instrument font-normal">
            <Link to="/products">Continue Shopping</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {cartItems.map((item) => (
              <Card key={`${item.id}-${item.size ?? ''}`} className="overflow-hidden border border-brand-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    {/* Image */}
                    <div className="w-full sm:w-48 aspect-video sm:aspect-square bg-brand-offwhite">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 flex flex-col justify-between">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-xl text-brand-black uppercase font-instrument font-normal tracking-wide mb-1">{item.name}</h3>
                          <p className="text-sm text-brand-gray-700 font-medium uppercase tracking-wide">
                            {item.weight}{item.pieces && ` • ${item.pieces}`}
                          </p>
                          {item.size && (
                            <span className="inline-block mt-2 text-[11px] font-semibold uppercase tracking-wider bg-brand-gray-100 text-brand-black px-2 py-1 rounded">
                              Size: {item.size}
                            </span>
                          )}
                        </div>
                        <p className="font-instrument text-xl text-brand-black font-normal">
                          {formatCurrency(item.price, settings.currency_symbol)}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-brand-offwhite">
                        {/* Quantity Controls */}
                        <div className="flex items-center border border-brand-gray-200 rounded-sm bg-brand-offwhite">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)}
                            className="h-9 w-9 p-0 hover:bg-brand-cream text-brand-black"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="font-normal min-w-[2.5rem] text-center text-brand-black text-sm font-instrument">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}
                            className="h-9 w-9 p-0 hover:bg-brand-cream text-brand-black"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-6">
                          <p className="font-normal text-brand-black font-instrument">
                            Total: <span className="text-brand-black">{formatCurrency(toNumber(item.price) * toNumber(item.quantity), settings.currency_symbol)}</span>
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.id, item.size)}
                            className="text-brand-gray-700/60 hover:text-brand-red hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24 border border-brand-gray-200 bg-white shadow-lg">
              <CardHeader className="bg-brand-offwhite border-b border-brand-gray-200 py-5">
                <CardTitle className="text-lg text-brand-black uppercase font-instrument font-normal tracking-wide">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-brand-gray-700">
                    <span>Subtotal</span>
                    <span className="font-normal text-brand-black font-instrument">{formatPrice(subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-brand-gray-700">
                    <span>Tax ({toNumber(settings.tax_rate).toFixed(0)}%)</span>
                    <span className="font-normal text-brand-black font-instrument">{formatPrice(tax)}</span>
                  </div>

                  <div className="flex justify-between text-brand-gray-700">
                    <span>Delivery Fee</span>
                    <span className="font-normal text-brand-black font-instrument">
                      {deliveryFee === 0 ? (
                        <span className="text-brand-success font-semibold tracking-wide">FREE</span>
                      ) : (
                        formatPrice(deliveryFee)
                      )}
                    </span>
                  </div>
                </div>

                {deliveryFee > 0 && (
                  <div className="bg-brand-success-light border border-brand-success-light rounded-sm p-3 text-center">
                    <p className="text-sm text-brand-black font-medium">
                      Add {formatPrice(toNumber(settings.free_delivery_threshold) - subtotal)} more for <span className="font-semibold">FREE DELIVERY</span>
                    </p>
                  </div>
                )}

                {/* COD Fee Information */}
                {settings.cod_enabled && (
                  <div className="bg-brand-success-light border border-brand-success-light rounded-sm p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-brand-blue font-medium">COD Available</span>
                    </div>
                    <p className="text-xs text-brand-blue mt-1">
                      Additional {formatCurrency(settings.cod_charge, settings.currency_symbol)} fee for Cash on Delivery.
                      {settings.cod_threshold && ` Valid up to ${formatCurrency(settings.cod_threshold, settings.currency_symbol)}.`}
                    </p>
                  </div>
                )}

                <div className="border-t border-brand-gray-200 pt-4 mt-2">
                  <div className="flex justify-between font-instrument font-normal text-lg text-brand-black">
                    <span>Total</span>
                    <span className="text-brand-black">{formatPrice(total)}</span>
                  </div>
                  <p className="text-xs text-brand-gray-700 mt-2 italic text-right">
                    Calculated at checkout based on location
                  </p>
                </div>

                {/* Minimum Order Validation */}
                {!isMinOrderMet && (
                  <div className="bg-brand-offwhite border border-brand-cream rounded-sm p-4 animate-pulse">
                    <p className="text-sm text-brand-yellow-dark font-semibold text-center">
                      Minimum order: {formatCurrency(minOrderAmount, settings.currency_symbol)}
                    </p>
                    <p className="text-xs text-brand-yellow-dark mt-1 text-center">
                      Please add items worth {formatPrice(minOrderShortfall)} more.
                    </p>
                  </div>
                )}

                {/* `disabled` does nothing on an <a>, so a blocked checkout must not render
                    a link at all — it used to navigate straight past the minimum order. */}
                {isMinOrderMet ? (
                  <Button
                    asChild
                    className="w-full bg-brand-black hover:bg-brand-charcoal text-white h-12 text-base uppercase tracking-widest font-normal shadow-md hover:shadow-lg transition-all font-instrument"
                    size="lg"
                  >
                    <Link to="/checkout">Proceed to Checkout</Link>
                  </Button>
                ) : (
                  <Button
                    disabled
                    className="w-full bg-brand-black text-white h-12 text-base uppercase tracking-widest font-normal font-instrument"
                    size="lg"
                  >
                    Add More Items
                  </Button>
                )}

                <Button asChild variant="outline" className="w-full border-brand-gray-200 text-brand-gray-700 hover:bg-brand-cream hover:text-brand-black">
                  <Link to="/products">
                    Continue Shopping
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Mobile Sticky Bottom Bar */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-gray-200 p-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="container mx-auto">
            {!isMinOrderMet && (
              <div className="bg-brand-offwhite border border-brand-cream rounded-sm p-2 mb-3 text-center">
                <p className="text-xs text-brand-yellow-dark font-medium">
                  Add {formatPrice(minOrderShortfall)} more to checkout
                </p>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs text-brand-gray-700 uppercase tracking-wide font-instrument">Total</p>
                <p className="font-instrument font-normal text-xl text-brand-black">{formatPrice(total)}</p>
              </div>
              {isMinOrderMet ? (
                <Button
                  asChild
                  className="bg-brand-black hover:bg-brand-charcoal text-white px-8 uppercase tracking-widest text-sm font-normal font-instrument"
                >
                  <Link to="/checkout">Checkout</Link>
                </Button>
              ) : (
                <Button
                  disabled
                  className="bg-brand-black text-white px-8 uppercase tracking-widest text-sm font-normal font-instrument"
                >
                  Add Items
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Add bottom padding to prevent content from being hidden behind sticky bar */}
        <div className="lg:hidden h-32"></div>
      </div>
    </div>
  );
};

export default Cart;
