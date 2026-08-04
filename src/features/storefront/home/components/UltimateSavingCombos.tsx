import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useCombos } from '@/hooks/queries';
import { fallbackTileImage } from '@/lib/brandImages';

/**
 * Combo rail. Bundles are derived from live catalogue data (see useCombos) rather
 * than hardcoded, so prices and variant counts follow the products in each category.
 */
const UltimateSavingCombos: React.FC = () => {
  const navigate = useNavigate();
  const { data: combos = [], isLoading } = useCombos();

  if (!isLoading && combos.length === 0) return null;

  return (
    <section className="bg-brand-offwhite brand-section-padding">
      <div className="brand-container">
        {/* Header */}
        <div className="text-center mb-12 space-y-3">
          <p className="eyebrow">Bundles</p>
          <h2 className="section-title">Ultimate Saving Combos</h2>
          <p className="section-subtitle max-w-xl mx-auto">
            Bundle up and save on the pieces you wear most.
          </p>
        </div>

        {/* Horizontal scroll on mobile, 4-up grid on desktop */}
        <div className="flex gap-5 overflow-x-auto snap-x pb-2 sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible sm:pb-0">
          {isLoading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="bg-brand-white rounded-[16px] p-4 min-w-[75%] sm:min-w-0">
                  <div className="aspect-[4/3] rounded-[12px] bg-brand-gray-100 animate-pulse mb-4" />
                  <div className="h-4 w-2/3 mx-auto rounded bg-brand-gray-100 animate-pulse mb-3" />
                  <div className="h-8 w-3/4 mx-auto rounded-full bg-brand-gray-100 animate-pulse" />
                </div>
              ))
            : combos.map((combo) => (
                <div
                  key={combo.categoryId}
                  onClick={() => navigate(`/products?category=${encodeURIComponent(combo.name)}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && navigate(`/products?category=${encodeURIComponent(combo.name)}`)
                  }
                  className="bg-brand-white rounded-[16px] p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between min-w-[75%] snap-start sm:min-w-0"
                >
                  {/* Image well with cream tint */}
                  <div className="relative w-full aspect-[4/3] bg-brand-cream rounded-[12px] overflow-hidden mb-4">
                    <span className="absolute top-2 left-0 right-0 text-center text-[10px] font-medium tracking-[0.2em] text-brand-black uppercase bg-brand-cream/90 py-1 border-b border-brand-yellow/30 z-10">
                      AVAILABLE IN {combo.variantCount}+ STYLES
                    </span>
                    <img
                      src={combo.image || fallbackTileImage(combo.name)}
                      alt={combo.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>

                  {/* Category name */}
                  <h3 className="text-[15px] font-medium uppercase tracking-[0.14em] text-brand-black text-center mb-3">
                    {combo.name}
                  </h3>

                  {/* Two-part offer pill */}
                  <div className="flex items-center justify-center mb-1">
                    <div className="inline-flex items-center rounded-full overflow-hidden border border-brand-teal text-[11px] font-medium tracking-[0.08em]">
                      <span className="bg-brand-cream text-brand-black px-3 py-1.5 uppercase">
                        PICK ANY {combo.pickCount}
                      </span>
                      <span className="bg-brand-teal text-brand-white px-3 py-1.5 uppercase">
                        AT ₹{combo.bundlePrice}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
        </div>

        {/* View all */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate('/products')}
            className="btn-label flex items-center gap-2 bg-brand-white hover:bg-brand-black text-brand-black hover:text-brand-white border border-brand-gray-200 px-7 py-3.5 rounded-full shadow-sm transition-all"
          >
            <span>Explore All Combos</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default UltimateSavingCombos;
