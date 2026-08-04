import React from 'react';
import { Star, Quote } from 'lucide-react';
import { useTestimonials } from '@/hooks/queries';

/**
 * Testimonials, managed in admin (Testimonials table). Renders nothing when the
 * table is empty — an empty praise section is worse than no praise section.
 */
const CustomerVoices: React.FC = () => {
  const { data: testimonials = [], isLoading } = useTestimonials(6);

  if (!isLoading && testimonials.length === 0) return null;

  return (
    <section className="bg-brand-white brand-section-padding">
      <div className="brand-container">
        <div className="text-center mb-12 space-y-3">
          <p className="eyebrow">Testimonials</p>
          <h2 className="section-title">What Our Customers Say</h2>
          <p className="section-subtitle">Unedited words from people wearing Crownveil.</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-52 rounded-[16px] bg-brand-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {testimonials.map((item) => (
              <figure
                key={item.id}
                className="relative rounded-[16px] border border-brand-gray-200 bg-brand-offwhite/60 p-7 flex flex-col gap-5"
              >
                <Quote className="w-6 h-6 text-brand-yellow" />

                <blockquote className="text-[14px] text-brand-gray-700 leading-[1.75] flex-1">
                  {item.text}
                </blockquote>

                {item.rating ? (
                  <div className="flex items-center gap-1 text-brand-yellow">
                    {Array.from({ length: Math.min(5, Math.max(0, item.rating)) }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                ) : null}

                <figcaption className="flex items-center gap-3 pt-1 border-t border-brand-gray-200">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-brand-gray-100 flex items-center justify-center flex-shrink-0 mt-4">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="text-[12px] font-medium text-brand-gray-500">
                        {item.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-[13px] font-medium text-brand-black">{item.name}</p>
                    {(item.role || item.company) && (
                      <p className="text-[11px] text-brand-gray-500">
                        {[item.role, item.company].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CustomerVoices;
