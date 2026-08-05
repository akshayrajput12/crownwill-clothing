import React from 'react';
import { Truck, RefreshCcw, BadgeIndianRupee, ShieldCheck } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { formatPrice } from '@/utils/currency';

/**
 * Service strip under the hero — the four questions every first-time shopper has before
 * they scroll (shipping, returns, payment, trust), answered from the store's real
 * settings instead of invented copy. COD only appears when it is actually enabled.
 */
const ServicePromises: React.FC = () => {
  const { settings } = useSettings();

  const freeShippingThreshold = Number(settings.free_delivery_threshold ?? 0);

  const promises = [
    {
      Icon: Truck,
      title: 'Free shipping',
      body: freeShippingThreshold > 0
        ? `On orders above ${formatPrice(freeShippingThreshold)}`
        : 'On every order, no minimum',
    },
    {
      Icon: RefreshCcw,
      title: 'Easy exchange',
      body: 'Swap sizes without the hassle',
    },
    settings.cod_enabled
      ? {
          Icon: BadgeIndianRupee,
          title: 'Cash on delivery',
          body: 'Pay when it reaches your door',
        }
      : {
          Icon: BadgeIndianRupee,
          title: 'Secure payments',
          body: 'UPI, cards and netbanking',
        },
    {
      Icon: ShieldCheck,
      title: 'Delivered in ' + (settings.delivery_time_estimate || '3-5 business days'),
      body: 'Tracked end to end',
    },
  ];

  return (
    <section className="border-y border-brand-gray-200 bg-brand-offwhite">
      <div className="brand-container">
        <ul className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-brand-gray-200">
          {promises.map(({ Icon, title, body }) => (
            <li key={title} className="flex items-start gap-3 px-4 py-6 sm:px-6">
              <Icon className="w-5 h-5 text-brand-black flex-shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-brand-black leading-snug">
                  {title}
                </p>
                <p className="text-[12px] text-brand-gray-500 mt-1 leading-snug">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default ServicePromises;
