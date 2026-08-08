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

/**
 * Free stock photography for the category tiles the brand has no shot of yet.
 *
 * These are Unsplash photo ids (free licence, no attribution required). `auto=format`
 * makes Unsplash serve WebP/AVIF to browsers that accept it, and the width parameter
 * keeps the tile download small.
 *
 * Every id below was fetched and eyeballed before being used, so each one really shows
 * the menswear it is labelled with. Replace them with your own product photography as
 * it becomes available — an uploaded category image always wins over these.
 */
const unsplash = (id: string, width = 800) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=75`;

export const stockCategoryImages = {
  /** White crew-neck tee on a male model. */
  tshirts: unsplash('photo-1521572163474-6864f9cf17ab'),
  /** Three folded dress shirts, flat lay on wood. */
  shirts: unsplash('photo-1602810318383-e386cc2a3ccf'),
  /** Khaki cuffed joggers with white sneakers. */
  joggers: unsplash('photo-1473966968600-fa801b869a1a'),
  /** White crew sweatshirt, flat lay. */
  sweatshirts: unsplash('photo-1620799140408-edc6dcb6d633'),
  /** Male model in light distressed denim, street setting. */
  jeans: unsplash('photo-1516826957135-700dedea698c'),
  /** Male model in tailored black trousers. */
  trousers: unsplash('photo-1584865288642-42078afe6942'),
} as const;

/** Deterministic fallback so a given tile keeps the same art between renders. */
export function fallbackTileImage(seed: string | number) {
  const n = typeof seed === 'number'
    ? seed
    : [...seed].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return collectionFallbacks[n % collectionFallbacks.length];
}
