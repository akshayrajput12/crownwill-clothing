import { TestimonialsColumn } from "@/components/ui/testimonials-columns-1";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { fetchTestimonials, Testimonial } from "@/data/testimonials";

const Testimonials = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTestimonials = async () => {
      try {
        const data = await fetchTestimonials();
        setTestimonials(data);
      } catch (error) {
        console.error("Error loading testimonials:", error);
      } finally {
        setLoading(false);
      }
    };

    loadTestimonials();
  }, []);

  if (loading) {
    return (
      <section className="py-24 relative bg-brand-offwhite overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center justify-center max-w-[800px] mx-auto text-center mb-16">
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-brand-black mb-4 block">TESTIMONIALS</span>
            <h2 className="text-3xl md:text-4xl font-instrument font-normal text-brand-black mb-6 uppercase">
              WHAT OUR CUSTOMERS SAY
            </h2>
          </div>
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-black"></div>
          </div>
        </div>
      </section>
    );
  }

  if (testimonials.length === 0) {
    return null;
  }

  const firstColumn = testimonials.slice(0, 3);
  const secondColumn = testimonials.slice(3, 6);
  const thirdColumn = testimonials.slice(6, 9);

  return (
    <section className="py-24 relative bg-brand-offwhite overflow-hidden">
      {/* Warm neutral background accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-cream rounded-full filter blur-[120px] opacity-40 pointer-events-none"></div>

      <div className="max-w-[1600px] mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[800px] mx-auto text-center mb-16"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="w-8 h-[1px] bg-brand-black"></span>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-black">TESTIMONIALS</div>
            <span className="w-8 h-[1px] bg-brand-black"></span>
          </div>

          <h2 className="text-3xl md:text-5xl font-instrument font-normal text-brand-black mb-6 uppercase">
            WORN & WELL SAID
          </h2>
          <p className="text-lg text-brand-gray-700 max-w-2xl mx-auto font-light leading-relaxed">
            See why crownveil customers return for the fit, feel and considered finish of every piece.
          </p>
        </motion.div>

        <div className="flex justify-center gap-2 md:gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={25} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={35} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={30} />
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
