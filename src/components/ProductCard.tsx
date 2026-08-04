import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Eye, Heart, ShoppingBag } from 'lucide-react';
import { useStore, Product as StoreProduct } from '../store/useStore';
import { formatPrice } from '../utils/currency';
import { PLACEHOLDER_PRODUCT_IMAGE } from '@/lib/brandImages';

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
  isNew?: boolean;
  new_arrival?: boolean;
  features?: string[];

  // Store compatibility fields
  category?: string;
  description?: string;
  inStock?: boolean;
  slug?: string;

  [key: string]: any;
}

interface ProductCardProps {
  product: Product;
  onViewDetail?: () => void;
  onQuickView?: (product?: Product) => void;
  variant?: 'grid' | 'list';
}

/**
 * Product card for a clothing catalogue.
 *
 * - The second product image takes over on hover (the standard apparel "flip"),
 *   falling back to a subtle zoom when only one shot exists.
 * - Price block always reads: current, was, % off, and how much is saved.
 * - Accepts either camelCase or the raw snake_case DB row, so callers do not have
 *   to remap before rendering.
 */
const ProductCard: React.FC<ProductCardProps> = ({ product, onViewDetail, onQuickView, variant = 'grid' }) => {
  const addToCart = useStore((state) => state.addToCart);
  const [isHovered, setIsHovered] = useState(false);
  const [isLiked, setIsLiked] = useState(false);

  const gallery = (product.images ?? []).filter(Boolean);
  const primaryImage = gallery[0] || product.image || PLACEHOLDER_PRODUCT_IMAGE;
  const secondaryImage = gallery.length > 1 ? gallery[1] : null;

  const originalPrice = product.originalPrice ?? product.original_price ?? undefined;
  const isBestSeller = product.isBestSeller ?? product.is_bestseller ?? false;
  const isNew = product.isNew ?? product.new_arrival ?? false;

  const discount = originalPrice && originalPrice > product.price
    ? Math.round(((originalPrice - product.price) / originalPrice) * 100)
    : 0;
  const savings = originalPrice && originalPrice > product.price ? originalPrice - product.price : 0;

  const isOutOfStock = product.stock_quantity !== undefined && product.stock_quantity <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cartProduct: StoreProduct = {
      ...product,
      originalPrice,
      image: primaryImage,
      category: product.category || 'General',
      description: product.description || '',
      inStock: product.inStock ?? !isOutOfStock,
      slug: product.slug || product.sku || product.id,
      weight: product.weight || '',
      pieces: product.pieces || '',
      rating: product.rating || 0,
      features: undefined,
    };
    addToCart(cartProduct);
  };

  const handleQuickView = (e: React.MouseEvent) => {
    e.stopPropagation();
    onQuickView?.(product);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  /** Stacked images: the second one cross-fades in on hover. */
  const Gallery = () => (
    <>
      <motion.img
        src={primaryImage}
        alt={product.name}
        className="absolute inset-0 w-full h-full object-cover"
        animate={{
          opacity: secondaryImage && isHovered ? 0 : 1,
          scale: !secondaryImage && isHovered ? 1.04 : 1,
        }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        loading="lazy"
        decoding="async"
      />
      {secondaryImage && (
        <motion.img
          src={secondaryImage}
          alt={`${product.name} — alternate view`}
          className="absolute inset-0 w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0, scale: isHovered ? 1.02 : 1 }}
          transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
          loading="lazy"
          decoding="async"
        />
      )}
    </>
  );

  const Badges = () => (
    <div className="absolute top-3 left-3 z-10 flex flex-col items-start gap-1.5">
      {isBestSeller && (
        <span className="bg-brand-black text-brand-white px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] font-medium">
          Bestseller
        </span>
      )}
      {isNew && !isBestSeller && (
        <span className="bg-brand-yellow text-brand-black px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] font-medium">
          New in
        </span>
      )}
      {discount > 0 && (
        <span className="bg-brand-white/95 text-brand-success px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] font-medium">
          {discount}% off
        </span>
      )}
      {isOutOfStock && (
        <span className="bg-brand-gray-700 text-brand-white px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] font-medium">
          Sold out
        </span>
      )}
    </div>
  );

  const PriceBlock = ({ compact = false }: { compact?: boolean }) => (
    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
      <span className="price-now">{formatPrice(product.price)}</span>
      {originalPrice && originalPrice > product.price && (
        <span className="price-was">{formatPrice(originalPrice)}</span>
      )}
      {discount > 0 && <span className="price-off">{discount}% off</span>}
      {!compact && savings > 0 && (
        <span className="w-full text-[11px] tracking-[0.04em] text-brand-gray-500">
          You save {formatPrice(savings)}
        </span>
      )}
    </div>
  );

  if (variant === 'list') {
    return (
      <motion.div
        className="premium-card group cursor-pointer overflow-hidden relative flex flex-col sm:flex-row"
        onClick={onViewDetail}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="relative w-full sm:w-48 aspect-[4/5] sm:aspect-auto sm:h-56 bg-brand-offwhite overflow-hidden flex-shrink-0">
          <Gallery />
          <Badges />
        </div>

        <div className="flex-1 p-5 sm:p-6 flex flex-col justify-between gap-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-2">
              <h3 className="card-title text-[16px] group-hover:text-brand-gray-700 transition-colors">
                {product.name}
              </h3>
              {product.rating ? (
                <div className="flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-brand-yellow fill-current" />
                  <span className="text-[12px] text-brand-gray-500">{product.rating}</span>
                </div>
              ) : null}
            </div>

            <button
              onClick={handleLike}
              aria-label="Add to wishlist"
              className={`p-2 rounded-full transition-colors ${
                isLiked ? 'text-brand-black bg-brand-gray-100' : 'text-brand-gray-500 hover:text-brand-black hover:bg-brand-gray-100'
              }`}
            >
              <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
            <PriceBlock />

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className="btn-label flex-1 sm:flex-none bg-brand-black text-brand-white px-6 py-3 rounded-[8px] hover:bg-brand-charcoal disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                {isOutOfStock ? 'Sold out' : 'Add to bag'}
              </button>
              {onQuickView && (
                <button
                  onClick={handleQuickView}
                  className="p-3 border border-brand-gray-200 rounded-[8px] hover:bg-brand-gray-100 transition-colors text-brand-black"
                  aria-label="Quick view"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="group cursor-pointer relative flex flex-col"
      onClick={onViewDetail}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="article"
      aria-label={product.name}
    >
      {/* Editorial 4:5 crop */}
      <div className="relative aspect-[4/5] w-full bg-brand-offwhite overflow-hidden rounded-[12px]">
        <Gallery />
        <Badges />

        {/* Wishlist + quick view, revealed on hover (always visible on touch) */}
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-2 sm:opacity-0 sm:translate-x-2 sm:group-hover:opacity-100 sm:group-hover:translate-x-0 transition-all duration-300">
          <button
            onClick={handleLike}
            aria-label="Add to wishlist"
            className={`p-2.5 rounded-full backdrop-blur-sm transition-colors ${
              isLiked ? 'bg-brand-black text-brand-white' : 'bg-brand-white/90 text-brand-black hover:bg-brand-yellow'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`} />
          </button>

          {onQuickView && (
            <button
              onClick={handleQuickView}
              aria-label="Quick view"
              className="p-2.5 rounded-full bg-brand-white/90 text-brand-black hover:bg-brand-yellow backdrop-blur-sm transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Add to bag slides up on hover; on mobile it sits inline below instead */}
        <div className="hidden sm:block absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
          <button
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className="btn-label w-full bg-brand-black text-brand-white py-3.5 flex items-center justify-center gap-2 hover:bg-brand-charcoal disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {isOutOfStock ? 'Sold out' : 'Add to bag'}
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="pt-3.5 pb-1 flex flex-col gap-1.5">
        <h3 className="card-title line-clamp-1">{product.name}</h3>

        {product.category && (
          <span className="text-[10px] uppercase tracking-[0.18em] text-brand-gray-500">
            {product.category}
          </span>
        )}

        <PriceBlock compact />

        {product.rating ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <Star className="w-3 h-3 text-brand-yellow fill-current" />
            <span className="text-[11px] text-brand-gray-500">{product.rating}</span>
          </div>
        ) : null}

        {/* Mobile add-to-bag: hover states do not exist on touch */}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className="btn-label sm:hidden mt-2 w-full border border-brand-black text-brand-black py-2.5 rounded-[8px] flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          {isOutOfStock ? 'Sold out' : 'Add to bag'}
        </button>
      </div>
    </motion.div>
  );
};

export default ProductCard;
