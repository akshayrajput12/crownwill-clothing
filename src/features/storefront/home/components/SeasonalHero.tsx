import React, { useState, useEffect } from 'react';
import { heroSlides as sliderData } from '@/lib/brandImages';

const SeasonalHero = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % sliderData.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const currentSlideData = sliderData[currentSlide];

  return (
    <section className="relative h-[50dvh] md:h-[60dvh] w-full overflow-hidden bg-hero-bg">
      <div className="absolute inset-0 z-0">
        <img
          src={currentSlideData.image}
          alt={currentSlideData.alt}
          className="w-full h-full object-cover"
          style={{ objectPosition: currentSlideData.position }}
          loading={currentSlide === 0 ? "eager" : "lazy"}
        />
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-12 flex space-x-3 z-30 justify-center w-full">
        {sliderData.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-1 transition-all duration-500 rounded-full ${index === currentSlide ? 'w-12 bg-secondary' : 'w-4 bg-white/30 hover:bg-white/60'
              }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
};

export default SeasonalHero;
