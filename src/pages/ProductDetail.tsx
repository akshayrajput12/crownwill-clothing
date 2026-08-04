import { useParams, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Star, Heart, ChevronRight, Truck, CheckCircle2, Shield,
  Award, ChevronDown, Tag, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStore } from '@/store/useStore';
import { useProductDetail, useRelatedProducts } from '@/hooks/queries';
import { parseSizes, SIZE_PRESETS } from '@/lib/productSizes';
import { marketingImages, PLACEHOLDER_PRODUCT_IMAGE } from '@/lib/brandImages';
import { scrollToTopInstant } from '@/utils/scrollToTop';

const ProductDetail: React.FC = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useStore();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [pincode, setPincode] = useState('');
  const [pincodeChecked, setPincodeChecked] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>('details');

  // Product + size rows + review ratings in one cached query (see hooks/queries.ts).
  const { data: product, isLoading: loading } = useProductDetail(slug);
  const { data: relatedProducts = [] } = useRelatedProducts(product?.category_id, product?.id);
  const similarProducts = relatedProducts.slice(0, 5);
  const pairWithProducts = relatedProducts.slice(0, 4);

  useEffect(() => {
    scrollToTopInstant();
    setSelectedImageIndex(0);
    setSelectedSize(null);
    setPincodeChecked(false);
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
        <h2 className="text-2xl font-semibold uppercase mb-4">Product Not Found</h2>
        <Button onClick={() => navigate('/products')}>Back to Products</Button>
      </div>
    );
  }

  const images = product.images && product.images.length > 0
    ? product.images
    : [marketingImages.pdpLifestyle];

  const discountPercent = product.original_price && product.original_price > product.price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 55;

  // Size grid comes from product_sizes. Presets are only a fallback for products
  // whose size inventory has not been configured in admin yet.
  const sizeRows = parseSizes(product.product_sizes);
  const sizeOptions = sizeRows.length > 0
    ? sizeRows.map((row) => ({ size: row.size, available: row.stock > 0 }))
    : SIZE_PRESETS.slice(0, 5).map((size) => ({ size, available: (product.stock_quantity ?? 0) > 0 }));

  const activeSize = selectedSize ?? sizeOptions.find((option) => option.available)?.size ?? null;
  const inStock = sizeOptions.some((option) => option.available);

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
  if (specEntries.length === 0) {
    specEntries.push(
      ['Fit', 'Regular Fit'],
      ['Care', 'Machine wash cold, do not bleach'],
      ['Origin', 'Made in India']
    );
  }

  const ratings: number[] = (product.reviews ?? [])
    .map((review: any) => review.rating)
    .filter((rating: any) => typeof rating === 'number');
  const reviewCount = ratings.length;
  const averageRating = reviewCount
    ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / reviewCount) * 10) / 10
    : 4.7;

  const handleAddToCart = () => {
    if (!inStock || !activeSize) return;
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.original_price ?? undefined,
      description: product.description ?? '',
      size: activeSize,
      image: images[0],
      slug: product.sku || product.id,
      category: product.categories?.name || 'Topwear',
      weight: product.weight ?? '',
      pieces: '',
      rating: averageRating,
      inStock: true,
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/checkout');
  };

  return (
    <div className="bg-brand-white min-h-screen py-6">
      <div className="max-w-[1280px] mx-auto px-4">

        {/* Breadcrumb Trail */}
        <div className="flex items-center gap-2 text-[12px] text-brand-gray-500 mb-6 overflow-x-auto">
          <Link to="/" className="hover:text-brand-black">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/products" className="hover:text-brand-black">Men's New Arrival</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-brand-black font-medium truncate">{product.name}</span>
        </div>

        {/* 2-Column Desktop (50/50), Stacked Mobile */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 mb-16">

          {/* Left Column — Image Gallery */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Vertical Thumbnails Stack (up to 6 thumbnails, 80x80) */}
            <div className="flex sm:flex-col gap-3 order-2 sm:order-1 overflow-x-auto sm:overflow-y-auto max-h-[500px]">
              {images.map((img: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-[70px] h-[70px] sm:w-[80px] sm:h-[80px] rounded-[8px] overflow-hidden border-2 flex-shrink-0 transition-all ${
                    selectedImageIndex === idx ? 'border-brand-black' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Thumb ${idx}`} className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>

            {/* Main Image Container */}
            <div className="relative flex-1 aspect-[3/4] sm:aspect-[4/5] rounded-[12px] overflow-hidden bg-brand-offwhite order-1 sm:order-2">
              <img
                src={images[selectedImageIndex]}
                alt={product.name}
                className="w-full h-full object-cover"
                loading="eager"
              />

              {/* Wishlist Heart Icon Top-Right */}
              <button
                onClick={() => setIsWishlisted(!isWishlisted)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-brand-white shadow-md flex items-center justify-center text-brand-black hover:scale-110 transition-transform"
                aria-label="Wishlist"
              >
                <Heart className={`w-5 h-5 ${isWishlisted ? 'fill-brand-red text-brand-red' : ''}`} />
              </button>
            </div>
          </div>

          {/* Right Column — Product Info */}
          <div className="space-y-6">

            {/* Rating + everydayXclusives Badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-brand-cream px-2.5 py-1 rounded text-[12px] font-semibold text-brand-black">
                  <Star className="w-3.5 h-3.5 fill-brand-yellow text-brand-yellow" />
                  <span>{averageRating}</span>
                </div>
                <span className="text-[12px] text-brand-gray-500 underline cursor-pointer">
                  ({reviewCount} {reviewCount === 1 ? 'Review' : 'Reviews'})
                </span>
              </div>
              <span className="text-[11px] font-medium uppercase tracking-widest text-brand-yellow bg-brand-black px-2.5 py-1 rounded">
                everydayXclusives
              </span>
            </div>

            {/* Title */}
            <h1 className="text-[24px] sm:text-[28px] font-semibold text-brand-black leading-tight">
              {product.name}
            </h1>

            {/* Price Row */}
            <div className="flex items-center gap-3">
              <span className="text-[24px] font-semibold text-brand-black">
                ₹{product.price}
              </span>
              {product.original_price && (
                <span className="text-[16px] text-brand-gray-500 line-through">
                  ₹{product.original_price}
                </span>
              )}
              <span className="bg-brand-success-light text-brand-success text-[12px] font-semibold px-2.5 py-1 rounded-[4px]">
                {discountPercent}% OFF
              </span>
            </div>

            {/* Cashback Pill */}
            <div className="inline-flex items-center gap-2 bg-brand-success-light text-brand-success px-3 py-1.5 rounded-full text-[12px] font-semibold">
              <span>₹ Earn 10% CASHBACK</span>
            </div>

            {/* Offer Cards Horizontal Scroll */}
            <div className="border border-brand-yellow rounded-[12px] p-4 bg-brand-cream/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-brand-black" />
                <div>
                  <h4 className="text-[13px] font-semibold text-brand-black">Get Flat 5% OFF</h4>
                  <p className="text-[11px] text-brand-gray-500">Add items worth ₹1999+ to unlock this offer</p>
                </div>
              </div>
              <span className="bg-brand-black text-brand-yellow font-semibold text-[11px] px-3 py-1 rounded">
                BYNG5
              </span>
            </div>

            {/* Size Selector */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[14px] font-semibold uppercase text-brand-black">Select Size</label>
                <button className="text-[12px] font-semibold text-brand-blue hover:underline">
                  Sizes Not Available? Notify Me
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {sizeOptions.map(({ size, available }) => (
                  <button
                    key={size}
                    onClick={() => available && setSelectedSize(size)}
                    disabled={!available}
                    aria-pressed={activeSize === size}
                    title={available ? `Size ${size}` : `Size ${size} is out of stock`}
                    className={`min-w-[48px] h-12 px-3 rounded-[8px] font-semibold text-[14px] transition-all ${
                      activeSize === size
                        ? 'bg-brand-black text-brand-white'
                        : available
                          ? 'bg-brand-gray-100 text-brand-black hover:bg-brand-gray-200'
                          : 'bg-brand-gray-100 text-brand-gray-500 line-through cursor-not-allowed'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              {!inStock && (
                <p className="text-[13px] font-semibold text-brand-red">
                  Currently sold out — tap Notify Me and we will email you when it is back.
                </p>
              )}
            </div>

            {/* Delivery Pincode Check */}
            <div className="space-y-3 pt-2">
              <h4 className="text-[14px] font-semibold uppercase text-brand-black">Check Delivery Date</h4>
              <div className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  placeholder="Enter Pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  className="flex-1 border border-brand-gray-200 rounded-[8px] px-4 py-2.5 text-[14px] outline-none focus:border-brand-black"
                />
                <button
                  onClick={() => setPincodeChecked(true)}
                  className="bg-brand-black text-brand-white font-semibold px-6 py-2.5 rounded-[8px] text-[13px] uppercase hover:bg-brand-black/90"
                >
                  Check
                </button>
              </div>

              {pincodeChecked && (
                <p className="text-[12px] font-medium text-brand-success flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Delivery by Thursday | Free Shipping Available
                </p>
              )}

              <div className="flex items-center gap-6 text-[13px] text-brand-gray-700 pt-2">
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-brand-black" />
                  <span>Free Shipping</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-success" />
                  <span>Cash on Delivery Available</span>
                </div>
              </div>
            </div>

            {/* Add to Cart / Buy Now */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
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

          </div>
        </div>

        {/* You may pair it with — complementary pieces, add straight to cart */}
        {pairWithProducts.length > 0 && (
          <div className="border-t border-brand-gray-200 pt-12 mb-12 space-y-6">
            <h3 className="text-[22px] font-medium uppercase text-brand-black">
              You may pair it with
            </h3>
            <div className="flex gap-4 overflow-x-auto snap-x pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
              {pairWithProducts.map((pair) => (
                <div
                  key={pair.id}
                  className="border border-brand-gray-200 rounded-[12px] p-3 min-w-[70%] snap-start sm:min-w-0 flex flex-col"
                >
                  <div
                    onClick={() => navigate(`/product/${pair.sku || pair.id}`)}
                    className="cursor-pointer group"
                  >
                    <div className="aspect-[3/4] rounded-[8px] overflow-hidden bg-brand-offwhite mb-2">
                      <img
                        src={pair.images?.[0] || PLACEHOLDER_PRODUCT_IMAGE}
                        alt={pair.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <h4 className="text-[13px] font-semibold text-brand-black line-clamp-2 mb-1">{pair.name}</h4>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[14px] font-semibold text-brand-black">₹{pair.price}</span>
                      {pair.original_price && pair.original_price > pair.price && (
                        <span className="text-[12px] text-brand-gray-500 line-through">₹{pair.original_price}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => addToCart({
                      id: pair.id,
                      name: pair.name,
                      price: pair.price,
                      originalPrice: pair.original_price ?? undefined,
                      image: pair.images?.[0] || PLACEHOLDER_PRODUCT_IMAGE,
                      category: product.categories?.name || 'Topwear',
                      weight: '',
                      pieces: '',
                      rating: 0,
                      description: '',
                      inStock: true,
                      slug: pair.sku || pair.id,
                    })}
                    className="mt-auto w-full bg-brand-white hover:bg-brand-black text-brand-black hover:text-brand-white border border-brand-black font-semibold text-[12px] uppercase tracking-wider h-9 rounded-[8px]"
                  >
                    Add to Cart
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Below Fold: Accordion & Trust Badges */}
        <div className="border-t border-brand-gray-200 pt-12 space-y-12">

          {/* Product Details Accordion */}
          <div className="max-w-3xl space-y-4">
            <div className="border-b border-brand-gray-200 pb-4">
              <button
                onClick={() => setOpenAccordion(openAccordion === 'details' ? null : 'details')}
                className="flex items-center justify-between w-full text-left font-semibold text-[18px] uppercase text-brand-black"
              >
                <span>Product Specifications & Details</span>
                <ChevronDown className={`w-5 h-5 transition-transform ${openAccordion === 'details' ? 'rotate-180' : ''}`} />
              </button>

              {openAccordion === 'details' && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4 text-[14px] text-brand-gray-700">
                  {specEntries.map(([label, value]) => (
                    <div key={label}>
                      <span className="font-semibold text-brand-black">{label}:</span> {value}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Trust Badges Row (3 icons) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-brand-offwhite rounded-[16px] p-6 text-center">
            <div className="flex flex-col items-center gap-2">
              <Shield className="w-8 h-8 text-brand-black" />
              <h4 className="font-semibold text-[15px] uppercase text-brand-black">Genuine Product</h4>
              <p className="text-[12px] text-brand-gray-500">100% Authentic Quality Guaranteed</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Award className="w-8 h-8 text-brand-black" />
              <h4 className="font-semibold text-[15px] uppercase text-brand-black">2M+ Happy Customers</h4>
              <p className="text-[12px] text-brand-gray-500">Trusted across India</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Truck className="w-8 h-8 text-brand-black" />
              <h4 className="font-semibold text-[15px] uppercase text-brand-black">Made in India</h4>
              <p className="text-[12px] text-brand-gray-500">Crafted with pride locally</p>
            </div>
          </div>

          {/* Similar Products Carousel */}
          {similarProducts.length > 0 && (
            <div className="space-y-6">
              <h3 className="text-[22px] font-medium uppercase text-brand-black">
                Similar Products
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {similarProducts.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => navigate(`/product/${prod.sku || prod.id}`)}
                    className="cursor-pointer group border border-brand-gray-200 rounded-[12px] p-3 hover:shadow-md transition-all"
                  >
                    <div className="aspect-[3/4] rounded-[8px] overflow-hidden bg-brand-offwhite mb-2">
                      <img
                        src={prod.images?.[0] || PLACEHOLDER_PRODUCT_IMAGE}
                        alt={prod.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <h4 className="text-[13px] font-semibold text-brand-black line-clamp-1">{prod.name}</h4>
                    <span className="text-[14px] font-semibold text-brand-black">₹{prod.price}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default ProductDetail;
