// Marketing imagery for the storefront.
//
// Two sources, in priority order:
//  1. `marketingImages` — brand-generated campaign/lifestyle art shipped in /public
//     (WebP), used for structural sections that have no admin-managed record.
//  2. `brandImages` — shots living in the Crownveil Supabase instance, so product
//     and category art can be swapped from the dashboard without a redeploy.
//
// Admin-uploaded product/category images always win over both.

const PUBLIC_STORAGE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public`;

/** Generated brand art in /public/assets/images (WebP). */
export const marketingImages = {
  heroLinenShirts: '/assets/images/hero-linen-shirts.webp',
  heroPyjamaPants: '/assets/images/hero-pyjama-pants.webp',
  categoryShirts: '/assets/images/cat-shirts.webp',
  reviewAmbassadors: '/assets/images/review-ambassadors.webp',
  emptyCartBag: '/assets/images/empty-cart-bag.webp',
  pdpLifestyle: '/assets/images/pdp-lifestyle-example.webp',
} as const;

export const brandImages = {
  /** Landscape campaign shot (front + back of the Hawa Mahal heritage polo). */
  heritageCampaign: `${PUBLIC_STORAGE}/category-images/categories/1785836235026.jpeg`,
  /** Branded advertisement frame — CV logo lockup + "Limited Editions". */
  limitedEditionAd: `${PUBLIC_STORAGE}/category-images/categories/1785836356249.jpeg`,
  /** Back-print polo, "Heritage. Royalty. Legacy." */
  heritagePolo: `${PUBLIC_STORAGE}/category-images/categories/1785836526583.jpeg`,
  contrastPoloBeige: `${PUBLIC_STORAGE}/category-images/categories/1785836301334.jpeg`,
  contrastPoloNavy: `${PUBLIC_STORAGE}/category-images/categories/1785836329977.jpeg`,
  oxfordShirtBlue: `${PUBLIC_STORAGE}/category-images/categories/1785836376417.jpeg`,
  printedShirtOlive: `${PUBLIC_STORAGE}/product-images/products/1785838339195.jpeg`,
} as const;

/** Last-resort tile art when a product or category has no image at all. */
export const PLACEHOLDER_PRODUCT_IMAGE = brandImages.contrastPoloBeige;

/**
 * Home hero slides. Copy is per-slide because each one sells a different story;
 * `position` anchors the crop, since some shots are portrait.
 */
export const heroSlides = [
  {
    image: marketingImages.heroLinenShirts,
    position: 'center 30%',
    headline: 'LINEN TEXTURED SHIRTS',
    subheadline: 'For Men Who Wear Comfort',
    offer: 'FLAT AT ₹799',
    cta: 'SHOP NOW',
    link: '/products?sort=newest',
  },
  {
    image: brandImages.limitedEditionAd,
    position: 'center 15%',
    headline: 'THE LIMITED EDIT',
    subheadline: 'Heritage Prints, Modern Cuts',
    offer: 'UPTO 50% OFF',
    cta: 'SHOP THE EDIT',
    link: '/products?sort=bestseller',
  },
  {
    image: marketingImages.heroPyjamaPants,
    position: 'center 40%',
    headline: 'EVERYDAY COMFORT',
    subheadline: 'Maximum Airiness, Ultimate Style',
    offer: 'PICK ANY 2',
    cta: 'EXPLORE COMBOS',
    link: '/products',
  },
];

/** Rotating art for category tiles / collection rails that have no uploaded image. */
export const collectionFallbacks = [
  brandImages.contrastPoloNavy,
  brandImages.oxfordShirtBlue,
  brandImages.printedShirtOlive,
  brandImages.contrastPoloBeige,
  brandImages.heritagePolo,
  marketingImages.categoryShirts,
];

/** Deterministic fallback so a given tile keeps the same art between renders. */
export function fallbackTileImage(seed: string | number) {
  const n = typeof seed === 'number'
    ? seed
    : [...seed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return collectionFallbacks[n % collectionFallbacks.length];
}
