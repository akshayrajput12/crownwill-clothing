/**
 * Self-checks for the pure storefront logic: the outfit ranking and the coupon money
 * path. No test framework — `npm run check` bundles this with the esbuild that already
 * ships with Vite and runs it.
 *
 * Anything that can silently give a shopper the wrong price or the wrong garment gets an
 * assertion here.
 */
import assert from 'node:assert/strict';

import { buildOutfit, classifySlot, outfitTotals, priceAffinity } from '../src/lib/outfit';
import { couponDiscount, describeCoupon, isCouponLive, validateCoupon } from '../src/lib/coupons';

/* ---------------------------------------------------------------- outfit ---- */

assert.equal(classifySlot('T-Shirts', 'Heavyweight Tee'), 'topwear');
assert.equal(classifySlot('Bottomwear', 'Slim Chinos'), 'bottomwear');
assert.equal(classifySlot(null, 'Denim Jacket'), 'outerwear', 'jacket must beat the loose "denim" bottom keyword');
assert.equal(classifySlot('Footwear', 'White Sneakers'), 'footwear');
assert.equal(classifySlot('Belts', 'Leather Belt'), 'accessory');
assert.equal(classifySlot('Homeware', 'Ceramic Mug'), null, 'unclassifiable products stay out of outfits');

const anchor = {
  id: 'tee',
  name: 'Heavyweight Tee',
  price: 1200,
  categoryId: 'cat-tops',
  categoryName: 'T-Shirts',
};

const catalogue = [
  { id: 'tee-2', name: 'Another Tee', price: 1300, categoryId: 'cat-tops', categoryName: 'T-Shirts', inStock: true },
  { id: 'chino', name: 'Slim Chinos', price: 1600, categoryId: 'cat-bottoms', categoryName: 'Bottomwear', inStock: true },
  { id: 'chino-lux', name: 'Silk Trousers', price: 24000, categoryId: 'cat-bottoms', categoryName: 'Bottomwear', inStock: true },
  { id: 'sneaker', name: 'White Sneakers', price: 2400, categoryId: 'cat-shoes', categoryName: 'Footwear', inStock: true },
  { id: 'sneaker-oos', name: 'Court Sneakers', price: 2300, categoryId: 'cat-shoes', categoryName: 'Footwear', inStock: false, isBestseller: true },
  { id: 'jacket', name: 'Denim Jacket', price: 3400, categoryId: 'cat-outer', categoryName: 'Jackets', inStock: true },
  { id: 'mug', name: 'Ceramic Mug', price: 400, categoryId: 'cat-home', categoryName: 'Homeware', inStock: true },
];

const look = buildOutfit(anchor, catalogue, 4);
const slots = look.map((pick) => pick.slot);

assert.deepEqual(slots, ['bottomwear', 'outerwear', 'footwear'], 'a top pairs bottom → layer → shoes, in that order');
assert.ok(!look.some((pick) => pick.product.categoryId === anchor.categoryId), 'never recommends the anchor category');
assert.ok(!look.some((pick) => pick.product.id === 'mug'), 'unclassifiable products are excluded');

const bottomPick = look.find((pick) => pick.slot === 'bottomwear')!;
assert.equal(bottomPick.product.id, 'chino', '₹1.6k chinos beat ₹24k trousers next to a ₹1.2k tee');

const shoePick = look.find((pick) => pick.slot === 'footwear')!;
assert.equal(shoePick.product.id, 'sneaker', 'in-stock beats an out-of-stock bestseller');

assert.ok(priceAffinity(1000, 1000) > priceAffinity(1000, 4000), 'same price band scores highest');
assert.equal(priceAffinity(1000, 1000), 3);
assert.ok(
  Math.abs(priceAffinity(1000, 2000) - priceAffinity(1000, 500)) < 1e-9,
  'affinity is symmetric: double and half are equally far'
);

// One product per slot, even when a slot has many candidates.
assert.equal(new Set(slots).size, slots.length);

const totals = outfitTotals({ id: 'tee', name: 'Tee', price: 1200, original_price: 1500 }, look);
assert.equal(totals.pieces, 4);
assert.equal(totals.total, 1200 + 1600 + 3400 + 2400);
assert.equal(totals.saving, 300, 'only the anchor was discounted');

// An anchor nothing complements yields an empty look rather than junk.
assert.deepEqual(buildOutfit({ id: 'x', name: 'Ceramic Mug', price: 400 }, [], 4), []);

/* --------------------------------------------------------------- coupons ---- */

const now = new Date('2026-08-05T10:00:00Z');
const live = {
  code: 'SAVE10',
  discount_type: 'percentage',
  discount_value: 10,
  max_discount_amount: 500,
  is_active: true,
};

assert.equal(couponDiscount(live, 2000), 200);
assert.equal(couponDiscount(live, 20000), 500, 'percentage discount is capped');
assert.equal(couponDiscount({ code: 'FLAT200', discount_type: 'fixed', discount_value: 200 }, 1000), 200);
assert.equal(
  couponDiscount({ code: 'FLAT500', discount_type: 'fixed', discount_value: 500 }, 300),
  300,
  'a discount never exceeds the subtotal'
);
assert.equal(couponDiscount({ code: 'ZERO', discount_value: 0 }, 1000), 0);

const applied = validateCoupon(live, 2000, now);
assert.ok(applied.ok && applied.discount === 200);

assert.equal(validateCoupon({ ...live, is_active: false }, 2000, now).ok, false);
assert.equal(
  validateCoupon({ ...live, valid_until: '2026-08-01T00:00:00Z' }, 2000, now).reason,
  'expired',
  'an expired code must not discount the order'
);
assert.equal(
  validateCoupon({ ...live, valid_from: '2026-09-01T00:00:00Z' }, 2000, now).reason,
  'not-started'
);
assert.equal(
  validateCoupon({ ...live, usage_limit: 5, used_count: 5 }, 2000, now).reason,
  'exhausted'
);
assert.equal(
  validateCoupon({ ...live, min_order_amount: 3000 }, 2000, now).reason,
  'min-order'
);
assert.ok(validateCoupon({ ...live, min_order_amount: 2000 }, 2000, now).ok, 'minimum is inclusive');
assert.equal(validateCoupon(null, 2000, now).ok, false);

// An open-ended coupon (no valid_until) is live, not expired.
assert.equal(isCouponLive(live, now), true);
assert.equal(isCouponLive({ ...live, valid_until: '2026-08-01T00:00:00Z' }, now), false);
assert.equal(isCouponLive({ ...live, usage_limit: 1, used_count: 1 }, now), false);

assert.equal(describeCoupon(live), '10% off, up to ₹500');
assert.equal(describeCoupon({ code: 'F', discount_type: 'fixed', discount_value: 300 }), '₹300 off');
assert.equal(describeCoupon({ code: 'D', description: 'Launch offer' }), 'Launch offer');

console.log('✓ all storefront logic checks passed');
