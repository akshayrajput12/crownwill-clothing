import React from 'react';

interface BrandMarqueeProps {
  text?: string;
  className?: string;
}

const BrandMarquee: React.FC<BrandMarqueeProps> = ({
  text = "Making Global Fashion Accessible",
  className = ""
}) => {
  const items = Array(8).fill(text);

  return (
    <div className={`w-full bg-brand-yellow py-4 overflow-hidden select-none border-y border-brand-yellow-dark ${className}`}>
      <div className="flex w-max animate-marquee">
        <div className="flex items-center gap-12 pr-12">
          {items.map((item, idx) => (
            <div key={`a-${idx}`} className="flex items-center gap-12 flex-shrink-0">
              <span className="text-brand-black text-[13px] font-medium uppercase tracking-[0.28em] whitespace-nowrap">
                {item}
              </span>
              <span className="text-brand-black/40 text-[13px]">•</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-12 pr-12">
          {items.map((item, idx) => (
            <div key={`b-${idx}`} className="flex items-center gap-12 flex-shrink-0">
              <span className="text-brand-black text-[13px] font-medium uppercase tracking-[0.28em] whitespace-nowrap">
                {item}
              </span>
              <span className="text-brand-black/40 text-[13px]">•</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BrandMarquee;
