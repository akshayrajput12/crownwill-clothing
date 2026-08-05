import React from 'react';
import { motion } from 'framer-motion';
import { TestimonialsColumn } from '@/components/ui/testimonials-columns-1';
import { useTestimonials } from '@/hooks/queries';

/**
 * Testimonials, managed in admin (Testimonials table).
 *
 * Three columns marquee vertically at different speeds behind a top/bottom fade — the
 * motion treatment this section shipped with. Renders nothing when the table is empty:
 * an empty praise section is worse than no praise section.
 */
const CustomerVoices: React.FC = () => {
  const { data: testimonials = [], isLoading } = useTestimonials(9);

  if (!isLoading && testimonials.length === 0) return null;

  // Deal the rows across as many columns as there is content for, so two testimonials
  // do not leave one column empty and the wall lopsided.
  const columnCount = testimonials.length >= 6 ? 3 : testimonials.length >= 3 ? 2 : 1;
  const columns: typeof testimonials[] = Array.from({ length: columnCount }, () => []);
  testimonials.forEach((item, index) => columns[index % columnCount].push(item));

  const DURATIONS = [25, 35, 30];

  return (
    <section className="relative overflow-hidden bg-brand-offwhite brand-section-padding">
      {/* Warm neutral background accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-cream rounded-full blur-[120px] opacity-40 pointer-events-none" />

      <div className="brand-container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12 space-y-3"
        >
          <div className="flex items-center justify-center gap-3">
            <span className="w-8 h-px bg-brand-black" />
            <p className="eyebrow">Testimonials</p>
            <span className="w-8 h-px bg-brand-black" />
          </div>
          <h2 className="section-title">Worn &amp; Well Said</h2>
          <p className="section-subtitle">
            Unedited words from people wearing Crownveil.
          </p>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-52 rounded-[16px] bg-brand-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="flex justify-center gap-4 md:gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_18%,black_82%,transparent)] max-h-[680px] overflow-hidden">
            {columns.map((column, index) => (
              <TestimonialsColumn
                key={index}
                testimonials={column}
                duration={DURATIONS[index] ?? 30}
                className={index === 1 ? 'hidden md:block' : index === 2 ? 'hidden lg:block' : undefined}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CustomerVoices;
