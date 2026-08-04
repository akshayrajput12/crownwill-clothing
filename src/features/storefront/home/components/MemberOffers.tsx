import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, Truck, BadgeIndianRupee, RefreshCcw, Clock } from 'lucide-react';
import { useCoupons } from '@/hooks/queries';
import { useSettings } from '@/hooks/useSettings';
import { brandImages } from '@/lib/brandImages';
import { formatPrice } from '@/utils/currency';

/**
 * Offers section.
 *
 * Shows live coupons from the admin panel with a copy-to-clipboard action. When no
 * coupon is running it falls back to the store's standing promises (free shipping,
 * COD, exchanges) rather than inventing discounts that do not exist.
 */
const MemberOffers: React.FC = () => {
  const navigate = useNavigate();
  const { data: coupons = [], isLoading } = useCoupons(4);
  const { settings } = useSettings();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Clipboard blocked (insecure context / permissions) — selecting the code still works.
    }
  };

  const describe = (coupon: (typeof coupons)[number]) => {
    if (coupon.description) return coupon.description;
    if (coupon.discount_type === 'percentage' && coupon.discount_value) {
      return `${coupon.discount_value}% off your order`;
    }
    if (coupon.discount_value) return `${formatPrice(coupon.discount_value)} off your order`;
    return 'Members-only saving';
  };

  const freeShippingThreshold = Number(settings?.free_delivery_threshold ?? 0);

  const promises = [
    {
      Icon: Truck,
      title: 'Free shipping sitewide',
      body: freeShippingThreshold > 0
        ? `On every order above ${formatPrice(freeShippingThreshold)}.`
        : 'On every order, no minimum spend.',
    },
    {
      Icon: BadgeIndianRupee,
      title: 'Cash on delivery',
      body: 'Pay when it reaches your door, across serviceable pincodes.',
    },
    {
      Icon: RefreshCcw,
      title: 'Easy exchanges',
      body: 'Wrong size? Swap it — check the size grid on any product page.',
    },
  ];

  return (
    <section className="relative overflow-hidden bg-brand-black text-brand-white brand-section-padding">
      {/* Campaign shot, heavily dimmed so type stays readable */}
      <div className="absolute inset-0">
        <img
          src={brandImages.heritagePolo}
          alt=""
          className="w-full h-full object-cover object-[center_25%] opacity-25"
          loading="lazy"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-black via-brand-black/90 to-brand-black/60" />
      </div>

      <div className="brand-container relative">
        <div className="max-w-xl space-y-3 mb-10">
          <p className="eyebrow text-brand-yellow">Members' edit</p>
          <h2 className="section-title text-brand-white">Offers &amp; Privileges</h2>
          <p className="section-subtitle text-white/60">
            {coupons.length > 0
              ? 'Apply a code at checkout — private pricing on the pieces that define your rotation.'
              : 'What every Crownveil order comes with, no code needed.'}
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-32 rounded-[16px] bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : coupons.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.map((coupon) => (
              <div
                key={coupon.id}
                className="relative rounded-[16px] border border-brand-yellow/30 bg-white/[0.04] backdrop-blur-sm p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-2">
                  <p className="text-[15px] text-brand-white leading-relaxed">{describe(coupon)}</p>
                  {coupon.min_order_amount ? (
                    <p className="text-[12px] text-white/50">
                      On orders above {formatPrice(coupon.min_order_amount)}
                    </p>
                  ) : null}
                  {coupon.valid_until ? (
                    <p className="flex items-center gap-1.5 text-[12px] text-white/50">
                      <Clock className="w-3.5 h-3.5" />
                      Valid till {new Date(coupon.valid_until).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  ) : null}
                </div>

                <button
                  onClick={() => copy(coupon.code)}
                  className="group flex items-center justify-between gap-3 border border-dashed border-brand-yellow/50 rounded-[8px] px-4 py-3 hover:border-brand-yellow transition-colors"
                >
                  <span className="text-[15px] font-medium tracking-[0.16em] text-brand-yellow uppercase">
                    {coupon.code}
                  </span>
                  <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-white/60 group-hover:text-brand-white">
                    {copiedCode === coupon.code ? (
                      <><Check className="w-3.5 h-3.5 text-brand-success" /> Copied</>
                    ) : (
                      <><Copy className="w-3.5 h-3.5" /> Copy</>
                    )}
                  </span>
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {promises.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="rounded-[16px] border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 space-y-3"
              >
                <Icon className="w-5 h-5 text-brand-yellow" />
                <h3 className="text-[13px] font-medium uppercase tracking-[0.16em] text-brand-white">{title}</h3>
                <p className="text-[13px] text-white/60 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-10">
          <button
            onClick={() => navigate('/products')}
            className="btn-label bg-brand-yellow text-brand-black px-8 py-4 rounded-[8px] hover:bg-brand-yellow-dark transition-colors"
          >
            Shop now
          </button>
        </div>
      </div>
    </section>
  );
};

export default MemberOffers;
