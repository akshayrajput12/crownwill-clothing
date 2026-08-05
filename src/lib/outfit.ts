/**
 * "Complete the outfit" — picks pieces that actually go *with* the product being
 * viewed instead of more of the same thing.
 *
 * The old related-products rail queried the anchor's own category, so a t-shirt PDP
 * recommended four more t-shirts. This classifies every candidate into a wardrobe slot
 * (top / bottom / outer / shoes / accessory), keeps only slots that complement the
 * anchor, then picks the single best piece per slot by price coherence, stock and
 * popularity — one product per slot, ordered by how much that slot matters.
 *
 * Pure module (no imports) so `scripts/checks.ts` can assert the ranking directly.
 */

export type OutfitSlot = 'topwear' | 'bottomwear' | 'outerwear' | 'footwear' | 'accessory';

export interface OutfitCandidate {
  id: string;
  name: string;
  price: number;
  original_price?: number | null;
  categoryId?: string | null;
  categoryName?: string | null;
  inStock?: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
}

export interface OutfitPick<T extends OutfitCandidate = OutfitCandidate> {
  slot: OutfitSlot;
  /** Shown above the tile, e.g. "Wear it with — Bottomwear". */
  slotLabel: string;
  product: T;
  score: number;
}

/**
 * Keyword → slot. Matched against the category name first (admin-controlled and
 * therefore the more reliable signal), then the product name.
 *
 * Order matters: the first hit wins, so put the specific words above the loose ones
 * ("jacket" before "shirt", or "shirt jacket" lands in topwear).
 */
const SLOT_KEYWORDS: Array<[OutfitSlot, string[]]> = [
  ['outerwear', ['jacket', 'overshirt', 'shacket', 'blazer', 'coat', 'hoodie', 'sweatshirt', 'sweater', 'cardigan', 'outerwear']],
  ['bottomwear', ['jean', 'denim', 'trouser', 'pant', 'chino', 'short', 'joggers', 'jogger', 'pyjama', 'pajama', 'cargo', 'skirt', 'bottom', 'lower']],
  ['footwear', ['shoe', 'sneaker', 'loafer', 'sandal', 'slipper', 'flip flop', 'boot', 'footwear']],
  ['accessory', ['belt', 'cap', 'hat', 'sock', 'watch', 'wallet', 'bag', 'sunglass', 'scarf', 'tie', 'accessor', 'perfume', 'fragrance']],
  ['topwear', ['t-shirt', 'tshirt', 'tee', 'shirt', 'polo', 'kurta', 'top', 'vest', 'topwear']],
];

/** Best-guess wardrobe slot, or `null` when nothing matches. */
export function classifySlot(categoryName?: string | null, productName?: string | null): OutfitSlot | null {
  for (const source of [categoryName, productName]) {
    const text = (source ?? '').toLowerCase();
    if (!text) continue;
    for (const [slot, keywords] of SLOT_KEYWORDS) {
      if (keywords.some((word) => text.includes(word))) return slot;
    }
  }
  return null;
}

/** Which slots complete each anchor, most important first. */
const PAIRING: Record<OutfitSlot, OutfitSlot[]> = {
  topwear: ['bottomwear', 'outerwear', 'footwear', 'accessory'],
  bottomwear: ['topwear', 'footwear', 'outerwear', 'accessory'],
  outerwear: ['topwear', 'bottomwear', 'footwear', 'accessory'],
  footwear: ['topwear', 'bottomwear', 'outerwear', 'accessory'],
  accessory: ['topwear', 'bottomwear', 'footwear', 'outerwear'],
};

const SLOT_LABELS: Record<OutfitSlot, string> = {
  topwear: 'Topwear',
  bottomwear: 'Bottomwear',
  outerwear: 'Layer it',
  footwear: 'Footwear',
  accessory: 'Finish it',
};

/** Fallback order when the anchor itself cannot be classified. */
const DEFAULT_ORDER: OutfitSlot[] = ['topwear', 'bottomwear', 'outerwear', 'footwear', 'accessory'];

/**
 * How well a candidate's price sits next to the anchor's. Same price band scores 3,
 * and it decays as the ratio moves away in either direction — a ₹300 pair of socks and
 * a ₹12,000 coat do not belong in the same look.
 */
export function priceAffinity(anchorPrice: number, candidatePrice: number): number {
  if (!(anchorPrice > 0) || !(candidatePrice > 0)) return 1;
  return 3 / (1 + Math.abs(Math.log(candidatePrice / anchorPrice)));
}

function scoreCandidate(anchor: OutfitCandidate, candidate: OutfitCandidate): number {
  let score = priceAffinity(anchor.price, candidate.price);
  if (candidate.inStock !== false) score += 3;
  if (candidate.isBestseller) score += 1.5;
  if (candidate.isNewArrival) score += 0.5;
  // A discounted piece makes the "add the whole look" total easier to say yes to.
  if (candidate.original_price && candidate.original_price > candidate.price) score += 0.5;
  return score;
}

/**
 * Builds the look: at most one piece per complementary slot, best first.
 *
 * Anything in the anchor's own category is excluded — that is a "similar products"
 * recommendation, not an outfit. Out-of-stock pieces are only used if a slot has
 * nothing else, and never as the reason a slot appears.
 */
export function buildOutfit<T extends OutfitCandidate>(
  anchor: OutfitCandidate,
  candidates: T[],
  limit = 4
): Array<OutfitPick<T>> {
  const anchorSlot = classifySlot(anchor.categoryName, anchor.name);
  const wanted = anchorSlot ? PAIRING[anchorSlot] : DEFAULT_ORDER;

  const bestPerSlot = new Map<OutfitSlot, OutfitPick<T>>();

  for (const candidate of candidates) {
    if (candidate.id === anchor.id) continue;
    // Same category can never complete an outfit — it *is* the outfit slot already.
    if (anchor.categoryId && candidate.categoryId && candidate.categoryId === anchor.categoryId) continue;

    const slot = classifySlot(candidate.categoryName, candidate.name);
    if (!slot || slot === anchorSlot || !wanted.includes(slot)) continue;

    const score = scoreCandidate(anchor, candidate);
    const current = bestPerSlot.get(slot);
    // Deterministic: score, then name, so the same catalogue always yields the same look.
    if (!current || score > current.score || (score === current.score && candidate.name < current.product.name)) {
      bestPerSlot.set(slot, { slot, slotLabel: SLOT_LABELS[slot], product: candidate, score });
    }
  }

  return wanted
    .map((slot) => bestPerSlot.get(slot))
    .filter((pick): pick is OutfitPick<T> => Boolean(pick))
    .slice(0, limit);
}

/** What the whole look costs, and what it would have cost at full price. */
export function outfitTotals<T extends OutfitCandidate>(anchor: OutfitCandidate, picks: Array<OutfitPick<T>>) {
  const pieces = [anchor, ...picks.map((pick) => pick.product)];
  const total = pieces.reduce((sum, piece) => sum + Number(piece.price || 0), 0);
  const wasTotal = pieces.reduce((sum, piece) => sum + Number(piece.original_price || piece.price || 0), 0);
  return { pieces: pieces.length, total, wasTotal, saving: Math.max(0, wasTotal - total) };
}
