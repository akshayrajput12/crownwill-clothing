import { useParams, useNavigate, Link } from 'react-router-dom';
import { useMemo, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Star, Heart, ChevronRight, Truck, CheckCircle2, Shield,
  ChevronDown, Tag, Copy, Check, BadgeIndianRupee, RefreshCcw, ShoppingBag
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ProductCard';
import QuickViewModal from '@/components/QuickViewModal';
import { useStore } from '@/store/useStore';
import {
  useProductDetail,
  useRelatedProducts,
  useCompleteTheOutfit,
  useProductCoupons,
  useProductReviews,
} from '@/hooks/queries';
import { useSettings } from '@/hooks/useSettings';
import { parseSizes } from '@/lib/productSizes';
import { describeCoupon } from '@/lib/coupons';
import { outfitTotals } from '@/lib/outfit';
import { marketingImages, PLACEHOLDER_PRODUCT_IMAGE } from '@/lib/brandImages';
import { formatPrice } from '@/utils/currency';
import { scrollToTopInstant } from '@/utils/scrollToTop';

/** Shared entrance for the buy-panel blocks, driven by the column's stagger. */
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] as const } },
};

const ProductDetail: React.FC = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useStore();
  const { settings } = useSettings();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sizeError, setSizeError] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [openAccordion, setOpenAccordion] = useState<string | null>('details');
  const [quickViewProduct, setQuickViewProduct] = useState<any>(null);

  // Product + size rows + review ratings in one cached query (see hooks/queries.ts).
  const { data: product, isLoading: loading } = useProductDetail(slug);

  // Outfit anchor: what this product is, in the terms the ranking algorithm needs.
  const anchor = useMemo(
    () =>
      product
        ? {
            id: product.id,
            name: product.name,
            price: Number(product.price),
            original_price: product.original_price,
            categoryId: product.category_id,
            categoryName: product.categories?.name ?? null,
          }
        : null,
    [product]
  );

  const { data: outfit = [], isLoading: outfitLoading } = useCompleteTheOutfit(anchor, 4);
  const { data: relatedProducts = [] } = useRelatedProducts(product?.category_id, product?.id);
  const { data: coupons = [] } = useProductCoupons(product?.id, 3);
  const { data: reviews = [] } = useProductReviews(product?.id, 5);

  const similarProducts = relatedProducts.slice(0, 5);

  useEffect(() => {
    scrollToTopInstant();
    setSelectedImageIndex(0);
    setSelectedSize(null);
    setSizeError(false);
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-12 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="bg-brand-gray-100 aspect-square rounded-[12px]" />
          <div className="space-y-4">
            <div className="bg-brand-gray-100 h-6 w-1/3 rounded" />
            <div className="bg-brand-gray-100 h-10 w-3/4 rounded" />
            <div className="bg-brand-gray-100 h-8 w-1/2 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-[1280px] mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-medium uppercase mb-4">Product Not Found</h2>
        <Button onClick={() => navigate('/products')}>Back to Products</Button>
      </div>
    );
  }

  const images = product.images && product.images.length > 0
    ? product.images
    : [marketingImages.pdpLifestyle];

  const discountPercent = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0;
  const savings = product.original_price && product.original_price > product.price
    ? product.original_price - product.price
    : 0;

  // Size grid comes from product_sizes; a product with none configured is sold as
  // one-size and the stock column decides availability.
  const sizeRows = parseSizes(product.product_sizes);
  const hasSizeGrid = sizeRows.length > 0;
  const inStock = hasSizeGrid
    ? sizeRows.some((row) => row.stock > 0)
    : (product.stock_quantity ?? 0) > 0;

  const selectedStock = hasSizeGrid
    ? sizeRows.find((row) => row.size === selectedSize)?.stock ?? 0
    : product.stock_quantity ?? 0;
  const lowStock = selectedStock > 0 && selectedStock <= 5;

  const categoryName = product.categories?.name ?? 'All products';

  // Specs the admin filled in (products.nutritional_info), falling back to the
  // attributes every garment has.
  const specSource: Record<string, string> = {
    ...(typeof product.nutritional_info === 'object' && product.nutritional_info ? product.nutritional_info : {}),
  };
  const specEntries: Array<[string, string]> = Object.entries(specSource)
    .filter(([, value]) => typeof value === 'string' && value.trim().length > 0)
    .map(([key, value]) => [key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), value as string]);
  if (product.storage_instructions) specEntries.push(['Care', product.storage_instructions]);
  if (product.weight) specEntries.push(['Weight', product.weight]);
  if (product.sku) specEntries.push(['SKU', product.sku]);
  if (hasSizeGrid) specEntries.push(['Sizes', sizeRows.map((row) => row.size).join(', ')]);

  const ratings: number[] = (product.reviews ?? [])
    .map((review: any) => review.rating)
    .filter((rating: any) => typeof rating === 'number');
  const reviewCount = ratings.length;
  const averageRating = reviewCount
    ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / reviewCount) * 10) / 10
    : 0;

  const lookTotals = outfitTotals(
    { id: product.id, name: product.name, price: Number(product.price), original_price: product.original_price },
    outfit
  );

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Clipboard blocked (insecure context) — the code is still selectable on screen.
    }
  };

  const handleAddToCart = () => {
    if (!inStock) return;
    // A garment line without a size cannot be picked in the warehouse.
    if (hasSizeGrid && !selectedSize) {
      setSizeError(true);
      return;
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.original_price ?? undefined,
      description: product.description ?? '',
      size: selectedSize ?? undefined,
      image: images[0],
      slug: product.sku || product.id,
      category: categoryName,
      weight: product.weight ?? '',
      pieces: '',
      rating: averageRating,
      inStock: true,
    });
    return true;
  };

  const handleBuyNow = () => {
    if (handleAddToCart()) navigate('/checkout');
  };

  return (
    <div className="bg-brand-white min-h-screen py-6">
      <div className="max-w-[1280px] mx-auto px-4">

        {/* Breadcrumb Trail — real category, not a hardcoded aisle */}
        <div className="flex items-center gap-2 text-[12px] text-brand-gray-500 mb-6 overflow-x-auto">
          <Link to="/" className="hover:text-brand-black">Home</Link>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          <Link
            to={`/products?category=${encodeURIComponent(categoryName)}`}
            className="hover:text-brand-black whitespace-nowrap"
          >
            {categoryName}
          </Link>
          <ChevronRight className="w-3 h-3 flex-shrink-0" />
          <span className="text-brand-black font-medium truncate">{product.name}</span>
        </div>

        {/* 2-Column Desktop (50/50), Stacked Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 mb-16">

          {/* Left Column — Image Gallery */}
          <div className="flex flex-col sm:flex-row gap-4 lg:sticky lg:top-24 lg:self-start">
            {/* Vertical Thumbnails Stack */}
            <div className="flex sm:flex-col gap-3 order-2 sm:order-1 overflow-x-auto sm:overflow-y-auto max-h-[500px]">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  aria-label={`View image ${idx + 1}`}
                  className={`w-[70px] h-[70px] sm:w-[80px] sm:h-[80px] rounded-[8px] overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedImageIndex === idx ? 'border-brand-black' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>

            {/* Main Image Container */}
            <div className="relative flex-1 aspect-[3/4] sm:aspect-[4/5] rounded-[20px] overflow-hidden bg-brand-offwhite order-1 sm:order-2">
              {/* Cross-fade between shots instead of a hard swap */}
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedImageIndex}
                  src={images[selectedImageIndex]}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover"
                  initial={{ opacity: 0, scale: 1.03 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                  loading="eager"
                />
              </AnimatePresence>

              {discountPercent > 0 && (
                <motion.span
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="absolute top-4 left-4 z-10 bg-brand-black/90 backdrop-blur-sm text-brand-white px-3.5 py-1.5 rounded-full text-[10px] uppercase tracking-[0.18em]"
                >
                  {discountPercent}% off
                </motion.span>
              )}

              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setIsWishlisted(!isWishlisted)}
                className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-brand-white/95 backdrop-blur-sm shadow-md flex items-center justify-center text-brand-black hover:scale-110 transition-transform"
                aria-label="Wishlist"
              >
                <Heart className={`w-5 h-5 transition-colors ${isWishlisted ? 'fill-brand-red text-brand-red' : ''}`} />
              </motion.button>
            </div>
          </div>

          {/* Right Column — Product Info. Children stagger in on mount, so the panel
              assembles rather than appearing all at once. */}
          <motion.div
            className="space-y-6"
            initial="hidden"
            animate="shown"
            variants={{ shown: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } } }}
          >

            {/* Rating */}
            <motion.div variants={fadeUp} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {reviewCount > 0 ? (
                  <>
                    <div className="flex items-center gap-1 bg-brand-cream px-2.5 py-1 rounded text-[12px] font-medium text-brand-black">
                      <Star className="w-3.5 h-3.5 fill-brand-yellow text-brand-yellow" />
                      <span>{averageRating}</span>
                    </div>
                    <span className="text-[12px] text-brand-gray-500">
                      {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}
                    </span>
                  </>
                ) : (
                  <span className="text-[11px] uppercase tracking-[0.2em] text-brand-gray-500">
                    Be the first to review
                  </span>
                )}
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-brand-gray-500">
                {categoryName}
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1 variants={fadeUp} className="text-[26px] sm:text-[34px] lg:text-[38px] font-normal tracking-[-0.02em] text-brand-black leading-tight">
              {product.name}
            </motion.h1>

            {/* Price Row */}
            <motion.div variants={fadeUp} className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[26px] sm:text-[30px] font-normal text-brand-black tracking-[-0.01em]">{formatPrice(product.price)}</span>
                {product.original_price && product.original_price > product.price && (
                  <span className="text-[16px] text-brand-gray-500 line-through">
                    {formatPrice(product.original_price)}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="bg-brand-success-light text-brand-success text-[12px] font-medium px-2.5 py-1 rounded-[4px]">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
              {savings > 0 && (
                <p className="text-[12px] text-brand-gray-500">
                  You save {formatPrice(savings)} on this piece
                </p>
              )}
            </motion.div>

            {/* Live offers — codes the admin is actually running */}
            {coupons.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[12px] font-medium uppercase tracking-[0.12em] text-brand-black">
                  Offers available
                </h4>
                {coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="border border-brand-yellow rounded-[12px] p-3.5 bg-brand-cream/40 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Tag className="w-4 h-4 text-brand-black flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-brand-black truncate">
                          {describeCoupon(coupon, settings.currency_symbol)}
                        </p>
                        <p className="text-[11px] text-brand-gray-500">
                          {coupon.min_order_amount
                            ? `On orders above ${formatPrice(Number(coupon.min_order_amount))}`
                            : 'Apply at checkout'}
                          {coupon.valid_until
                            ? ` · till ${new Date(coupon.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => copyCode(coupon.code)}
                      className="flex items-center gap-1.5 bg-brand-black text-brand-yellow font-medium text-[11px] px-3 py-2 rounded flex-shrink-0 hover:bg-brand-charcoal transition-colors"
                    >
                      {copiedCode === coupon.code ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {coupon.code}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Size Selector */}
            {hasSizeGrid ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[14px] font-medium uppercase text-brand-black">Select Size</label>
                  {lowStock && (
                    <span className="text-[12px] font-medium text-brand-red">
                      Only {selectedStock} left in {selectedSize}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {sizeRows.map(({ size, stock }) => (
                    <motion.button
                      key={size}
                      whileTap={stock > 0 ? { scale: 0.94 } : undefined}
                      onClick={() => {
                        setSelectedSize(size);
                        setSizeError(false);
                      }}
                      disabled={stock <= 0}
                      aria-pressed={selectedSize === size}
                      title={stock > 0 ? `Size ${size}` : `Size ${size} is out of stock`}
                      className={`relative min-w-[52px] h-12 px-4 rounded-full text-[14px] transition-colors ${
                        selectedSize === size
                          ? 'bg-brand-black text-brand-white'
                          : stock > 0
                            ? 'border border-brand-gray-200 text-brand-black hover:border-brand-black'
                            : 'border border-brand-gray-200 text-brand-gray-500 line-through cursor-not-allowed opacity-60'
                      }`}
                    >
                      {size}
                    </motion.button>
                  ))}
                </div>

                <AnimatePresence>
                  {sizeError && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[13px] text-brand-red"
                    >
                      Please select a size to continue.
                    </motion.p>
                  )}
                </AnimatePresence>
                {!inStock && (
                  <p className="text-[13px] font-medium text-brand-red">
                    Every size is sold out right now — check back shortly.
                  </p>
                )}
              </div>
            ) : (
              <p className={`text-[13px] font-medium ${inStock ? 'text-brand-success' : 'text-brand-red'}`}>
                {inStock ? 'In stock, ready to ship' : 'Currently sold out'}
              </p>
            )}

            {/* Standing delivery promises. No pincode lookup — the shipping window is the
                same nationwide, so asking for a pincode only added a step. */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-4 border-t border-brand-gray-200 text-[13px] text-brand-gray-700">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-brand-black" />
                <span>
                  {Number(settings.free_delivery_threshold) > 0
                    ? `Free shipping above ${formatPrice(Number(settings.free_delivery_threshold))}`
                    : 'Free shipping'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-success" />
                <span>Delivered in {settings.delivery_time_estimate || '3-5 business days'}</span>
              </div>
              {settings.cod_enabled && (
                <div className="flex items-center gap-2">
                  <BadgeIndianRupee className="w-4 h-4 text-brand-black" />
                  <span>Cash on delivery</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <RefreshCcw className="w-4 h-4 text-brand-black" />
                <span>Easy size exchange</span>
              </div>
            </div>

            {/* Add to Cart / Buy Now */}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button
                onClick={handleAddToCart}
                disabled={!inStock}
                className="flex-1 bg-brand-black hover:bg-brand-black/90 text-brand-white font-medium h-[50px] text-[15px] uppercase tracking-wider rounded-[8px] disabled:opacity-50"
              >
                {inStock ? 'Add to Cart' : 'Sold Out'}
              </Button>
              <Button
                onClick={handleBuyNow}
                disabled={!inStock}
                className="flex-1 bg-brand-yellow hover:bg-brand-yellow-dark text-brand-black font-medium h-[50px] text-[15px] uppercase tracking-wider rounded-[8px] disabled:opacity-50"
              >
                Buy Now
              </Button>
            </div>

            {product.description && (
              <p className="text-[14px] text-brand-gray-700 leading-relaxed pt-2">
                {product.description}
              </p>
            )}
          </motion.div>
        </div>

        {/* Complete the outfit — complementary wardrobe slots, not more of the same */}
        {(outfitLoading || outfit.length > 0) && (
          <div className="border-t border-brand-gray-200 pt-12 mb-12 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="text-[22px] font-medium uppercase text-brand-black">Complete the outfit</h3>
                <p className="text-[13px] text-brand-gray-500 mt-1">
                  Picked to go with this piece — one option per wardrobe slot.
                </p>
              </div>
              {outfit.length > 0 && (
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-brand-gray-500">
                    {lookTotals.pieces}-piece look
                  </p>
                  <p className="text-[18px] font-medium text-brand-black">{formatPrice(lookTotals.total)}</p>
                  {lookTotals.saving > 0 && (
                    <p className="text-[12px] text-brand-success">Saves {formatPrice(lookTotals.saving)}</p>
                  )}
                </div>
              )}
            </div>

            {outfitLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="aspect-[4/5] rounded-[12px] bg-brand-gray-100 animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                {outfit.map((pick) => (
                  <div key={pick.product.id} className="space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-brand-gray-500">
                      {pick.slotLabel}
                    </p>
                    <ProductCard
                      product={{
                        ...pick.product,
                        image: pick.product.images?.[0] || PLACEHOLDER_PRODUCT_IMAGE,
                        slug: pick.product.sku || pick.product.id,
                        category: pick.product.categories?.name || '',
                      }}
                      onViewDetail={() => navigate(`/product/${pick.product.sku || pick.product.id}`)}
                      onQuickView={(p) => setQuickViewProduct(p)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Below Fold: Accordion, reviews & trust badges */}
        <div className="border-t border-brand-gray-200 pt-12 space-y-12">

          {/* Product Details Accordion */}
          {specEntries.length > 0 && (
            <div className="max-w-3xl space-y-4">
              <div className="border-b border-brand-gray-200 pb-4">
                <button
                  onClick={() => setOpenAccordion(openAccordion === 'details' ? null : 'details')}
                  className="flex items-center justify-between w-full text-left font-medium text-[18px] uppercase text-brand-black"
                >
                  <span>Product Specifications &amp; Details</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${openAccordion === 'details' ? 'rotate-180' : ''}`} />
                </button>

                {openAccordion === 'details' && (
                  <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-[14px] text-brand-gray-700">
                    {specEntries.map(([label, value]) => (
                      <div key={label}>
                        <span className="font-medium text-brand-black">{label}:</span> {value}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Real customer reviews for this product */}
          {reviews.length > 0 && (
            <div className="space-y-5">
              <h3 className="text-[22px] font-medium uppercase text-brand-black">
                What buyers say
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {reviews.map((review) => (
                  <figure
                    key={review.id}
                    className="rounded-[12px] border border-brand-gray-200 bg-brand-offwhite/60 p-5 space-y-3"
                  >
                    <div className="flex items-center gap-1 text-brand-yellow">
                      {Array.from({ length: Math.min(5, Math.max(0, review.rating)) }).map((_, i) => (
                        <Star key={i} className="w-3.5 h-3.5 fill-current" />
                      ))}
                    </div>
                    <blockquote className="text-[13px] text-brand-gray-700 leading-relaxed">
                      {review.comment}
                    </blockquote>
                    <figcaption className="text-[12px] font-medium text-brand-black">
                      {review.name}
                      {review.createdAt && (
                        <span className="font-normal text-brand-gray-500">
                          {' · '}
                          {new Date(review.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          )}

          {/* Trust Badges Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-brand-offwhite rounded-[16px] p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Shield className="w-8 h-8 text-brand-black" />
              <h4 className="font-medium text-[15px] uppercase text-brand-black">Genuine Product</h4>
              <p className="text-[12px] text-brand-gray-500">Sold directly by Crownveil</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <RefreshCcw className="w-8 h-8 text-brand-black" />
              <h4 className="font-medium text-[15px] uppercase text-brand-black">Easy Exchange</h4>
              <p className="text-[12px] text-brand-gray-500">Swap sizes without the hassle</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Truck className="w-8 h-8 text-brand-black" />
              <h4 className="font-medium text-[15px] uppercase text-brand-black">
                {settings.cod_enabled ? 'Pay on Delivery' : 'Secure Checkout'}
              </h4>
              <p className="text-[12px] text-brand-gray-500">
                {settings.cod_enabled ? 'COD across serviceable pincodes' : 'Encrypted payments via Razorpay'}
              </p>
            </div>
          </div>

          {/* Similar Products */}
          {similarProducts.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-[22px] font-medium uppercase text-brand-black">
                More from {categoryName}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5">
                {similarProducts.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={{
                      ...prod,
                      image: prod.images?.[0] || PLACEHOLDER_PRODUCT_IMAGE,
                      slug: prod.sku || prod.id,
                      category: prod.categories?.name || categoryName,
                    }}
                    onViewDetail={() => navigate(`/product/${prod.sku || prod.id}`)}
                    onQuickView={(p) => setQuickViewProduct(p)}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Mobile sticky buy bar — the desktop CTA scrolls away on phones */}
      <div className="lg:hidden sticky bottom-0 left-0 right-0 z-40 bg-brand-white border-t border-brand-gray-200 px-4 py-3 flex items-center gap-3 shadow-[0_-6px_20px_rgba(0,0,0,0.08)]">
        <div className="min-w-0">
          <p className="text-[15px] font-medium text-brand-black leading-none">{formatPrice(product.price)}</p>
          {hasSizeGrid && (
            <p className="text-[11px] text-brand-gray-500 mt-1">
              {selectedSize ? `Size ${selectedSize}` : 'Select a size'}
            </p>
          )}
        </div>
        <Button
          onClick={handleAddToCart}
          disabled={!inStock}
          className="flex-1 bg-brand-black text-brand-white h-11 text-[13px] uppercase tracking-wider rounded-[8px] disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <ShoppingBag className="w-4 h-4" />
          {inStock ? 'Add to Cart' : 'Sold Out'}
        </Button>
      </div>

      <QuickViewModal
        product={quickViewProduct}
        isOpen={!!quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
};

export default ProductDetail;
