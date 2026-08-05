import React from "react";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

export interface TestimonialCard {
  id?: string;
  name: string;
  text: string;
  role?: string | null;
  company?: string | null;
  image?: string | null;
  rating?: number | null;
}

/**
 * One vertically-marqueeing column of testimonials.
 *
 * The list is rendered twice and the track animates to -50%, so the loop is seamless:
 * by the time the first copy has scrolled off, the second is exactly where the first
 * started. Different `duration` values per column give the wall its parallax drift.
 */
export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: TestimonialCard[];
  duration?: number;
}) => {
  if (props.testimonials.length === 0) return null;

  return (
    <div className={props.className}>
      <motion.div
        animate={{ translateY: "-50%" }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6"
      >
        {[...new Array(2)].map((_, index) => (
          <div key={`testimonial-set-${index}`} className="flex flex-col gap-6">
            {props.testimonials.map(({ text, image, name, role, company, rating }, i) => (
              <figure
                key={`testimonial-${index}-${i}`}
                className="p-8 rounded-[16px] border border-brand-gray-200 shadow-sm hover:shadow-md transition-shadow duration-300 max-w-xs w-full bg-brand-white flex flex-col justify-between"
              >
                <div className="relative">
                  <span
                    aria-hidden
                    className="absolute -top-5 -left-2 text-6xl text-brand-gray-200 opacity-40 leading-none"
                  >
                    &ldquo;
                  </span>
                  <blockquote className="text-[14px] text-brand-gray-700 relative z-10 leading-[1.75] pt-4">
                    {text}
                  </blockquote>
                </div>

                {rating ? (
                  <div className="flex items-center gap-1 text-brand-yellow mt-5">
                    {Array.from({ length: Math.min(5, Math.max(0, rating)) }).map((_, star) => (
                      <Star key={star} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                ) : null}

                <figcaption className="flex items-center gap-4 mt-6 pt-5 border-t border-brand-gray-200">
                  <div className="h-11 w-11 rounded-full overflow-hidden bg-brand-gray-100 flex items-center justify-center flex-shrink-0">
                    {image ? (
                      <img
                        src={image}
                        alt=""
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="text-[13px] font-medium text-brand-gray-500">
                        {name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[14px] font-medium text-brand-black">{name}</span>
                    {(role || company) && (
                      <span className="text-[11px] uppercase tracking-[0.14em] text-brand-gray-500">
                        {[role, company].filter(Boolean).join(", ")}
                      </span>
                    )}
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  );
};
