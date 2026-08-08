import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, Star, ShoppingBag, ArrowRight, Truck, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { formatPrice } from '../utils/currency';
import { PLACEHOLDER_PRODUCT_IMAGE } from '@/lib/brandImages';
import { parseSizes } from '@/lib/productSizes';

interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  original_price?: number;
  image?: string;
  images?: string[];
  weight?: string;
  pieces?: string;
  rating?: number;
  stock_quantity?: number;
  isBestSeller?: boolean;
  is_bestseller?: boolean;
  new_arrival?: boolean;
  features?: string[];
  product_sizes?: Array<{ size: string; stock_quantity: number }>;
  [key: string]: any;
}

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

const MAX_QUANTITY = 10;

/**
 * Quick view: enough of the PDP to buy without leaving the grid.
 *
 * Size selection is mandatory when the product has a size grid — the modal used to add
 * a sizeless line to the cart, which no warehouse can pick. Per-size stock drives both
 * the disabled chips and the "only N left" nudge.
 */
const QuickViewModal: React.FC<QuickViewModalProps> = ({ product, isOpen, onClose }) => {
  const addToCart = useStore((state) => state.addToCart);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Lock body scroll while open.
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape — a modal that traps you is worse than no modal.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    setSelectedImageIndex(0);
    setQuantity(1);
    setSelectedSize(null);
    setSizeError(false);
  }, [product?.id]);

  const sizes = useMemo(() => parseSizes(product?.product_sizes), [product?.product_sizes]);

  if (!product) return null;

  const images = (product.images ?? []).filter(Boolean).length
    ? (product.images as string[]).filter(Boolean)
    : [product.image || PLACEHOLDER_PRODUCT_IMAGE];

  const originalPrice = product.originalPrice ?? product.original_price ?? undefined;
  const discount = originalPrice && originalPrice > product.price
    ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
    : 0;
  const savings = originalPrice && originalPrice > product.price ? originalPrice - product.price : 0;
  const isBestSeller = product.isBestSeller ?? product.is_bestseller ?? false;

  const inStockSizes = sizes.filter((size) => size.stock > 0);
  const isOutOfStock = sizes.length > 0
    ? inStockSizes.length === 0
    : product.stock_quantity !== undefined && product.stock_quantity <= 0;

  const selectedStock = sizes.find((size) => size.size === selectedSize)?.stock ?? product.stock_quantity ?? undefined;
  const lowStock = typeof selectedStock === 'number' && selectedStock > 0 && selectedStock <= 5;
  const quantityCeiling = Math.min(MAX_QUANTITY, typeof selectedStock === 'number' && selectedStock > 0 ? selectedStock : MAX_QUANTITY);
  const productHref = `/product/${product.sku || product.slug || product.id}`;

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    if (sizes.length > 0 && !selectedSize) {
      setSizeError(true);
      return;
    }

    addToCart(
      {
        ...product,
        size: selectedSize ?? undefined,
        originalPrice,
        image: images[0],
        category: product.category || product.categories?.name || 'General',
        description: product.description || '',
        inStock: !isOutOfStock,
        slug: product.sku || product.slug || product.id,
        weight: product.weight || '',
        pieces: product.pieces || '',
        rating: product.rating || 0,
        features: undefined,
      } as any,
      quantity
    );
    onClose();
  };

  const changeQuantity = (delta: number) => {
    setQuantity((current) => Math.min(quantityCeiling, Math.max(1, current + delta)));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div
            className="absolute inset-0 bg-brand-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={product.name}
            /* Flex at every breakpoint, never grid. A grid row sizes to its content, so a
               column set to h-full could grow past the dialog's max-height and get clipped
               — which is what cut the buy bar off. Flex children with min-h-0 shrink to
               the capped height instead and scroll inside it.
               Mobile: fixed-height bottom sheet. Desktop: height follows the content up to
               86vh, so short products get a short dialog rather than a wall of whitespace. */
            className="relative bg-brand-white w-full h-[90vh] sm:h-auto sm:max-h-[86vh] sm:max-w-4xl rounded-t-[20px] sm:rounded-[16px] shadow-[0_30px_80px_rgba(0,0,0,0.35)] overflow-hidden flex flex-col sm:flex-row sm:items-stretch"
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
          >
            <button
              onClick={onClose}
              aria-label="Close quick view"
              className="absolute top-3 right-3 z-30 p-2 bg-brand-white/95 text-brand-black hover:bg-brand-black hover:text-brand-white rounded-full shadow-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Sheet grab handle — mobile only */}
            <div className="sm:hidden absolute top-2 left-1/2 -translate-x-1/2 z-30 w-10 h-1 rounded-full bg-brand-white/70" />

            {/* Visuals — half the dialog on desktop, stretched to whatever height the
                details column settles on. The min-height stops a sparse product from
                producing a letterbox sliver. */}
            <div className="relative bg-brand-offwhite flex-shrink-0 sm:w-1/2 sm:min-h-[460px]">
              <div
                className="relative h-[34vh] sm:absolute sm:inset-0 sm:h-full overflow-hidden"
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                <motion.img
                  key={selectedImageIndex}
                  src={images[selectedImageIndex]}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, scale: isHovered ? 1.04 : 1 }}
                  transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                />

                <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
                  {isBestSeller && (
                    <span className="bg-brand-black text-brand-white px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] font-medium">
                      Bestseller
                    </span>
                  )}
                  {discount > 0 && (
                    <span className="bg-brand-yellow text-brand-black px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] font-medium">
                      {discount}% off
                    </span>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="absolute bottom-3 left-3 right-3 flex gap-2 overflow-x-auto no-scrollbar">
                    {images.map((img, idx) => (
                      <button
                        key={`${img}-${idx}`}
                        onClick={() => setSelectedImageIndex(idx)}
                        aria-label={`View image ${idx + 1}`}
                        className={`w-9 h-11 sm:w-12 sm:h-14 flex-shrink-0 rounded-[6px] overflow-hidden border-2 transition-all ${
                          selectedImageIndex === idx
                            ? 'border-brand-white shadow-md'
                            : 'border-white/40 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Details. `min-h-0` is what lets this column shrink to the dialog's capped
                height so the scroll area actually scrolls, instead of growing and pushing
                the buy bar out of the clipped container. */}
            <div className="flex-1 min-h-0 flex flex-col sm:w-1/2">
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-8 space-y-4 sm:space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-brand-gray-500">
                      {product.category || product.categories?.name || 'Crownveil'}
                    </span>
                    {product.rating ? (
                      <span className="flex items-center gap-1 text-[11px] text-brand-gray-700">
                        <Star className="w-3 h-3 text-brand-yellow fill-current" />
                        {product.rating}
                      </span>
                    ) : null}
                  </div>

                  <h2 className="text-[21px] sm:text-[26px] font-normal tracking-[-0.01em] text-brand-black leading-tight">
                    {product.name}
                  </h2>
                </div>

                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[24px] font-normal text-brand-black">{formatPrice(product.price)}</span>
                  {originalPrice && originalPrice > product.price && (
                    <span className="text-[15px] text-brand-gray-500 line-through">{formatPrice(originalPrice)}</span>
                  )}
                  {savings > 0 && (
                    <span className="text-[12px] font-medium text-brand-success">
                      You save {formatPrice(savings)}
                    </span>
                  )}
                </div>

                {product.description && (
                  <p className="text-[13px] text-brand-gray-700 leading-relaxed line-clamp-4">
                    {product.description}
                  </p>
                )}

                {/* Sizes */}
                {sizes.length > 0 ? (
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-brand-black">
                        Select size
                      </span>
                      {lowStock && (
                        <span className="text-[11px] font-medium text-brand-red">
                          Only {selectedStock} left
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {sizes.map(({ size, stock }) => (
                        <button
                          key={size}
                          onClick={() => {
                            setSelectedSize(size);
                            setSizeError(false);
                            setQuantity(1);
                          }}
                          disabled={stock <= 0}
                          aria-pressed={selectedSize === size}
                          title={stock > 0 ? `Size ${size}` : `Size ${size} is sold out`}
                          /* Same pill treatment as the product page, so the two never look
                             like different stores. */
                          className={`min-w-[50px] h-11 px-4 text-[13px] rounded-full transition-colors ${
                            selectedSize === size
                              ? 'bg-brand-black text-brand-white'
                              : stock > 0
                                ? 'border border-brand-gray-200 text-brand-black hover:border-brand-black'
                                : 'border border-brand-gray-200 text-brand-gray-500 line-through cursor-not-allowed opacity-60'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>

                    {sizeError && (
                      <p className="text-[12px] font-medium text-brand-red">Please select a size to continue.</p>
                    )}
                  </div>
                ) : (
                  <span
                    className={`inline-block text-[11px] font-medium uppercase tracking-[0.12em] px-2.5 py-1 rounded ${
                      isOutOfStock ? 'bg-brand-gray-100 text-brand-gray-500' : 'bg-brand-success-light text-brand-success'
                    }`}
                  >
                    {isOutOfStock ? 'Out of stock' : 'In stock'}
                  </span>
                )}

                {/* Quantity */}
                <div className="flex items-center gap-4">
                  <span className="text-[12px] font-medium uppercase tracking-[0.12em] text-brand-black">
                    Quantity
                  </span>
                  <div className="flex items-center border border-brand-gray-200 rounded-[8px]">
                    <button
                      onClick={() => changeQuantity(-1)}
                      disabled={quantity <= 1}
                      aria-label="Decrease quantity"
                      className="p-2.5 text-brand-black hover:bg-brand-gray-100 disabled:opacity-30 transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center text-[14px] font-medium text-brand-black">{quantity}</span>
                    <button
                      onClick={() => changeQuantity(1)}
                      disabled={quantity >= quantityCeiling}
                      aria-label="Increase quantity"
                      className="p-2.5 text-brand-black hover:bg-brand-gray-100 disabled:opacity-30 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-brand-gray-500 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-brand-black" /> Free shipping available
                  </span>
                  <span className="flex items-center gap-1.5">
                    <RefreshCcw className="w-3.5 h-3.5 text-brand-black" /> Easy size exchange
                  </span>
                </div>
              </div>

              {/* Buy bar — outside the scroll area, so it is always reachable */}
              <div className="flex-shrink-0 border-t border-brand-gray-200 bg-brand-white p-4 sm:p-6 space-y-2.5">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock}
                  className="btn-label w-full h-12 bg-brand-black text-brand-white rounded-[8px] flex items-center justify-center gap-2 hover:bg-brand-charcoal disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ShoppingBag className="w-4 h-4" />
                  {isOutOfStock ? 'Sold out' : 'Add to bag'}
                </button>

                <Link
                  to={productHref}
                  onClick={onClose}
                  className="btn-label w-full h-11 border border-brand-black text-brand-black rounded-[8px] flex items-center justify-center gap-2 hover:bg-brand-gray-100 transition-colors"
                >
                  View full details
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default QuickViewModal;
