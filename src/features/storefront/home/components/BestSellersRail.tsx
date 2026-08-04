import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import QuickViewModal from '@/components/QuickViewModal';
import { useBestSellers } from '@/hooks/queries';

/**
 * Bestseller grid. Uses the shared ProductCard so hover behaviour, badges and the
 * price treatment stay identical everywhere products are shown.
 */
const BestSellersRail: React.FC = () => {
  const navigate = useNavigate();
  const { data: products = [], isLoading } = useBestSellers(8);
  const [quickViewProduct, setQuickViewProduct] = useState<any | null>(null);

  if (!isLoading && products.length === 0) return null;

  return (
    <section className="bg-brand-offwhite brand-section-padding">
      <div className="brand-container">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
          <div className="space-y-3">
            <p className="eyebrow">Shop the icons</p>
            <h2 className="section-title">Most Coveted</h2>
            <p className="section-subtitle">The pieces our customers keep coming back for.</p>
          </div>

          <button
            onClick={() => navigate('/products?sort=bestseller')}
            className="btn-label inline-flex items-center gap-2 text-brand-black border-b border-brand-black/30 hover:border-brand-black pb-1 self-start"
          >
            View all <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-8">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="space-y-3">
                <div className="aspect-[4/5] rounded-[12px] bg-brand-gray-100 animate-pulse" />
                <div className="h-3.5 w-3/4 rounded bg-brand-gray-100 animate-pulse" />
                <div className="h-3.5 w-1/3 rounded bg-brand-gray-100 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 sm:gap-x-6 gap-y-10">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product as any}
                onViewDetail={() => navigate(`/product/${product.sku || product.id}`)}
                onQuickView={(p) => setQuickViewProduct(p)}
              />
            ))}
          </div>
        )}
      </div>

      {quickViewProduct && (
        <QuickViewModal
          product={{
            ...quickViewProduct,
            originalPrice: quickViewProduct.original_price ?? undefined,
            image: quickViewProduct.images?.[0],
            slug: quickViewProduct.sku || quickViewProduct.id,
          }}
          isOpen={!!quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}
    </section>
  );
};

export default BestSellersRail;
