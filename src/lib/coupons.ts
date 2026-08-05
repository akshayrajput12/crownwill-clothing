/**
 * Coupon validation and discount maths — the single place the storefront decides
 * whether a code applies and what it is worth.
 *
 * Checkout previously only checked `is_active`, so an expired or fully-redeemed code
 * still discounted the order. Every rule the admin can set is enforced here.
 *
 * Pure module (no imports) so `scripts/checks.ts` can assert on the money path.
 */

export interface CouponLike {
  code: string;
  description?: string | null;
  discount_type?: string | null;
  discount_value?: number | null;
  min_order_amount?: number | null;
  max_discount_amount?: number | null;
  valid_from?: string | null;
  valid_until?: string | null;
  usage_limit?: number | null;
  used_count?: number | null;
  is_active?: boolean | null;
}

export type CouponRejection =
  | 'inactive'
  | 'not-started'
  | 'expired'
  | 'exhausted'
  | 'min-order'
  | 'no-value';

/**
 * Flat result rather than a discriminated union: this project compiles with
 * `strict: false`, where narrowing on a boolean discriminant does not work, so callers
 * would not be able to read `message` off a rejected result.
 */
export interface CouponResult {
  ok: boolean;
  /** 0 whenever `ok` is false. */
  discount: number;
  reason?: CouponRejection;
  /** Shopper-facing explanation; empty when the coupon applied. */
  message: string;
}

const money = (value: number) => Math.round(value * 100) / 100;

/** Percentage coupons are capped by `max_discount_amount`; nothing exceeds the subtotal. */
export function couponDiscount(coupon: CouponLike, subtotal: number): number {
  const value = Number(coupon.discount_value ?? 0);
  if (!(value > 0) || !(subtotal > 0)) return 0;

  const raw =
    coupon.discount_type === 'percentage' ? (subtotal * value) / 100 : value;

  const capped =
    coupon.discount_type === 'percentage' && coupon.max_discount_amount
      ? Math.min(raw, Number(coupon.max_discount_amount))
      : raw;

  // A coupon can zero an order out but never make it negative.
  return money(Math.min(capped, subtotal));
}

/**
 * Full eligibility check. `subtotal` is goods only — a coupon must never eat into
 * shipping, tax or the COD fee.
 */
export function validateCoupon(
  coupon: CouponLike | null | undefined,
  subtotal: number,
  now: Date = new Date(),
  currencySymbol = '₹'
): CouponResult {
  const reject = (reason: CouponRejection, message: string): CouponResult => ({
    ok: false,
    discount: 0,
    reason,
    message,
  });

  if (!coupon || coupon.is_active === false) {
    return reject('inactive', 'This coupon is no longer active.');
  }

  if (coupon.valid_from && new Date(coupon.valid_from) > now) {
    const starts = new Date(coupon.valid_from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return reject('not-started', `This coupon is valid from ${starts}.`);
  }

  if (coupon.valid_until && new Date(coupon.valid_until) < now) {
    return reject('expired', 'This coupon has expired.');
  }

  if (coupon.usage_limit && Number(coupon.used_count ?? 0) >= Number(coupon.usage_limit)) {
    return reject('exhausted', 'This coupon has reached its usage limit.');
  }

  const minOrder = Number(coupon.min_order_amount ?? 0);
  if (minOrder > 0 && subtotal < minOrder) {
    return reject(
      'min-order',
      `Add ${currencySymbol}${money(minOrder - subtotal).toLocaleString('en-IN')} more to use this code.`
    );
  }

  const discount = couponDiscount(coupon, subtotal);
  if (discount <= 0) {
    return reject('no-value', 'This coupon has no discount attached.');
  }

  return { ok: true, discount, message: '' };
}

/** One-line summary for offer cards: "10% off, up to ₹500". */
export function describeCoupon(coupon: CouponLike, currencySymbol = '₹'): string {
  if (coupon.description) return coupon.description;

  const value = Number(coupon.discount_value ?? 0);
  if (!(value > 0)) return 'Limited-time saving';

  if (coupon.discount_type === 'percentage') {
    const cap = coupon.max_discount_amount
      ? `, up to ${currencySymbol}${Number(coupon.max_discount_amount).toLocaleString('en-IN')}`
      : '';
    return `${value}% off${cap}`;
  }
  return `${currencySymbol}${value.toLocaleString('en-IN')} off`;
}

/** Codes still worth showing on a product page. */
export function isCouponLive(coupon: CouponLike, now: Date = new Date()): boolean {
  if (coupon.is_active === false) return false;
  if (coupon.valid_until && new Date(coupon.valid_until) < now) return false;
  if (coupon.valid_from && new Date(coupon.valid_from) > now) return false;
  if (coupon.usage_limit && Number(coupon.used_count ?? 0) >= Number(coupon.usage_limit)) return false;
  return true;
}
