import React, { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { useReviews } from '@/hooks/queries';
import { marketingImages, PLACEHOLDER_PRODUCT_IMAGE } from '@/lib/brandImages';

/** Shown until the store has verified reviews of its own. */
const seedReviews = [
  {
    id: 'seed-1',
    name: 'Mayank Sethi',
    comment:
      'The fabric quality of Crownveil linen shirts is unmatched. Super breathable, fits perfectly, and looks premium for every occasion!',
    rating: 5,
    productImage: null as string | null,
  },
  {
    id: 'seed-2',
    name: 'Rohan Verma',
    comment:
      'Ordered the heritage polo. Honestly the best everyday piece I have bought online this year. 10/10 recommend!',
    rating: 5,
    productImage: null as string | null,
  },
];

const CrownveilstersApproved: React.FC = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(false);

  // Reviews sit far below the fold — only query once the section is approaching.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || inView) return;
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setInView(true),
      { rootMargin: '200px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [inView]);

  const { data: fetched = [] } = useReviews(0, inView);
  const reviews = fetched.length > 0 ? fetched.slice(0, 2) : seedReviews;

  return (
    <section ref={sectionRef} className="bg-brand-white brand-section-padding">
      <div className="brand-container">
        {/* Header */}
        <div className="text-center mb-12 space-y-3">
          <p className="eyebrow">Social proof</p>
          <h2 className="section-title">Crownveilsters Approved</h2>
          <p className="section-subtitle">Real reviews from real people.</p>
        </div>

        {/* Asymmetric 3-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

          {/* Left: brand ambassadors */}
          <div className="bg-brand-yellow rounded-[16px] p-6 flex flex-col justify-between shadow-sm min-h-[320px]">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-brand-black bg-brand-white/60 px-3 py-1 rounded-full">
                Ambassadors
              </span>
              <h3 className="display-statement text-brand-black mt-5">
                Meet our loyal shoppers &amp; brand ambassadors
              </h3>
            </div>
            <div className="relative rounded-[12px] overflow-hidden aspect-[4/3] mt-4">
              <img
                src={marketingImages.reviewAmbassadors}
                alt="Crownveil brand ambassadors"
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute bottom-0 inset-x-0 bg-brand-black text-brand-yellow py-1.5 text-center text-[10px] font-medium uppercase tracking-[0.24em]">
                Crownveil Community
              </div>
            </div>
          </div>

          {/* Center: quote */}
          <div className="bg-brand-yellow rounded-[16px] p-8 flex flex-col justify-center text-center shadow-sm min-h-[320px]">
            <span className="font-serif text-[56px] text-brand-black/70 leading-none mb-1">&ldquo;</span>
            <p className="display-statement text-brand-black">
              Big dreams don't belong only to big cities.
            </p>
            <span className="text-[10px] font-medium text-brand-black/70 uppercase tracking-[0.24em] mt-5">
              Crownveil Manifesto
            </span>
          </div>

          {/* Right: review cards */}
          <div className="flex flex-col gap-4 justify-between">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="bg-brand-white border border-brand-gray-200 rounded-[16px] p-6 shadow-sm flex flex-col justify-between flex-1"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-1 text-brand-yellow">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                  <img
                    src={rev.productImage || PLACEHOLDER_PRODUCT_IMAGE}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-brand-gray-200"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                <p className="text-[14px] text-brand-gray-700 leading-[1.7] mb-4">
                  {rev.comment}
                </p>

                <div className="text-right">
                  <span className="text-[13px] font-medium tracking-[0.06em] text-brand-black">— {rev.name}</span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

export default CrownveilstersApproved;
