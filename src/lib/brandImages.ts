// Storefront/marketing imagery served from the Crownveil Supabase instance,
// so campaign shots can be swapped in the dashboard without a redeploy.
const PUBLIC_STORAGE = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public`;

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

/**
 * Home hero slider. `position` is the object-position anchor: the shots are portrait,
 * so each one names where the garment sits in a wide hero crop.
 */
export const heroSlides = [
  { id: 1, image: brandImages.heritageCampaign, alt: 'Crownveil Hawa Mahal heritage polo', position: 'center 40%' },
  { id: 2, image: brandImages.limitedEditionAd, alt: 'Crownveil limited edition printed shirt', position: 'center 30%' },
  { id: 3, image: brandImages.heritagePolo, alt: 'Crownveil heritage back-print polo', position: 'center 35%' },
];

/** Used by the collection rail until a category has its own image uploaded. */
export const collectionFallbacks = [
  brandImages.contrastPoloNavy,
  brandImages.oxfordShirtBlue,
  brandImages.printedShirtOlive,
  brandImages.contrastPoloBeige,
  brandImages.heritagePolo,
];
