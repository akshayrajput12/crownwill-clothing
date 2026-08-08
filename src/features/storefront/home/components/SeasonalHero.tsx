import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { heroSlides as slides } from '@/lib/brandImages';


const SeasonalHero: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  /**
   * Only the current slide and the one after it get a `src`, and a frame keeps its src
   * once it has had one. With six slides, loading every hero-width frame up front would
   * cost several megabytes before the shopper has scrolled at all.
   */
  const [primed, setPrimed] = useState<Set<number>>(() => new Set([0, 1 % slides.length]));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPrimed((prev) => {
      const next = (currentSlide + 1) % slides.length;
      if (prev.has(currentSlide) && prev.has(next)) return prev;
      const updated = new Set(prev);
      updated.add(currentSlide);
      updated.add(next);
      return updated;
    });
  }, [currentSlide]);

  const slide = slides[currentSlide];

  return (
    <section className="relative w-full h-[350px] sm:h-[450px] lg:h-[550px] bg-brand-black overflow-hidden">
      {/* Background Image Carousel */}
      <div className="absolute inset-0 z-0">
        {slides.map((s, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
            style={{ willChange: 'transform, opacity' }}
          >
            {primed.has(idx) && (
              <img
                src={s.image}
                alt={s.headline}
                className="w-full h-full object-cover"
                style={{ objectPosition: s.position }}
                loading={idx === 0 ? 'eager' : 'lazy'}
                fetchPriority={idx === 0 ? 'high' : 'auto'}
                decoding="async"
              />
            )}
            {/* Gradient Overlay for Text Readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-black/80 via-brand-black/40 to-transparent" />
          </div>
        ))}
      </div>

      {/* Content Overlay */}
      <div className="relative z-20 max-w-[1280px] mx-auto h-full px-6 flex flex-col justify-center text-white">
        <div className="max-w-2xl space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
          <p className="eyebrow text-brand-white/80">
            {slide.subheadline}
          </p>

          <h1 className="display-hero text-brand-white">
            {slide.headline}
          </h1>

          <div className="flex items-center gap-4">
            <span className="text-[15px] sm:text-[17px] font-medium tracking-[0.18em] uppercase text-brand-yellow">
              {slide.offer}
            </span>
            <span className="hidden sm:block h-px w-16 bg-brand-white/30" />
          </div>

          <div className="pt-3">
            <button
              onClick={() => navigate(slide.link)}
              className="btn-label bg-brand-yellow hover:bg-brand-yellow-dark text-brand-black px-9 py-4 rounded-[8px] shadow-lg hover:-translate-y-0.5 transition-all"
            >
              {slide.cta}
            </button>
          </div>
        </div>
      </div>

      {/* Carousel Dots: 40px up from bottom */}
      <div className="absolute bottom-[32px] sm:bottom-[40px] left-0 right-0 z-30 flex items-center justify-center gap-2">
        {slides.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentSlide(idx)}
            className={`transition-all duration-300 ${
              idx === currentSlide
                ? 'w-[24px] h-[4px] bg-brand-white rounded-full'
                : 'w-[8px] h-[8px] bg-brand-white/50 rounded-full hover:bg-brand-white/80'
            }`}
            aria-label={`Slide ${idx + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default SeasonalHero;
