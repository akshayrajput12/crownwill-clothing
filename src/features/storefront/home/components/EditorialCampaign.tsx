import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { brandImages, marketingImages } from '@/lib/brandImages';

/**
 * Full-width editorial break between product rails: one campaign image, one serif
 * statement, one link. Gives the page air and stops it reading as a wall of grids.
 */
const EditorialCampaign: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-brand-white">
      <div className="brand-container py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 rounded-[20px] overflow-hidden border border-brand-gray-200">
          {/* Statement */}
          <div className="bg-brand-cream/50 p-8 sm:p-12 lg:p-14 flex flex-col justify-center gap-6 order-2 lg:order-1">
            <p className="eyebrow">The heritage edit</p>
            <h2 className="display-statement text-brand-black">
              Royal prints, cut for the way you actually dress.
            </h2>
            <p className="text-[14px] sm:text-[15px] text-brand-gray-700 leading-[1.8] max-w-md">
              Jaipur-inspired artwork on breathable cotton, finished with the details that
              survive a hundred washes. Made in limited runs — once a print is gone, it stays gone.
            </p>
            <button
              onClick={() => navigate('/products?sort=newest')}
              className="btn-label inline-flex items-center gap-2 self-start border-b border-brand-black/30 hover:border-brand-black pb-1.5 text-brand-black"
            >
              Explore the edit <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Campaign imagery */}
          <div className="relative order-1 lg:order-2 grid grid-cols-2 gap-px bg-brand-gray-200 min-h-[280px] sm:min-h-[360px]">
            <img
              src={brandImages.limitedEditionAd}
              alt="Crownveil limited edition printed shirt"
              className="w-full h-full object-cover object-[center_20%]"
              loading="lazy"
              decoding="async"
            />
            <img
              src={marketingImages.pdpLifestyle}
              alt="Crownveil lifestyle campaign"
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default EditorialCampaign;
