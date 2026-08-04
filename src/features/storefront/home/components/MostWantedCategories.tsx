import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategories } from '@/hooks/queries';
import { fallbackTileImage } from '@/lib/brandImages';

/**
 * Category grid. Tiles come from the live category list (one cached query shared
 * with the navbar), so renaming or re-imaging a category in admin updates the grid.
 * The two price-promo tiles are marketing, not categories, so they stay static.
 */

const promoTiles = [
  { title: 'Everything Under ₹799', link: '/products?max_price=799', slot: 5 },
  { title: 'Everything Under ₹999', link: '/products?max_price=999', slot: 11 },
];

type Tile = { kind: 'category' | 'promo'; title: string; link: string; image?: string };

const MostWantedCategories: React.FC = () => {
  const navigate = useNavigate();
  const { data: categories = [], isLoading } = useCategories();

  const categoryTiles: Tile[] = categories.map((cat) => ({
    kind: 'category',
    title: cat.name,
    link: `/products?category=${encodeURIComponent(cat.name)}`,
    image: cat.image_url || fallbackTileImage(cat.name),
  }));

  // Interleave the promo tiles at their slots; anything past the end of the category
  // list is appended, so a small catalogue still shows both offer tiles.
  const tiles: Tile[] = [];
  let next = 0;
  const promos = promoTiles.map((p) => ({ ...p, placed: false }));
  const total = categoryTiles.length + promos.length;
  for (let slot = 0; slot < total; slot++) {
    const promo = promos.find((p) => p.slot === slot && !p.placed);
    if (promo) {
      promo.placed = true;
      tiles.push({ kind: 'promo', title: promo.title, link: promo.link });
    } else if (next < categoryTiles.length) {
      tiles.push(categoryTiles[next++]);
    }
  }
  while (next < categoryTiles.length) tiles.push(categoryTiles[next++]);
  for (const promo of promos.filter((p) => !p.placed)) {
    tiles.push({ kind: 'promo', title: promo.title, link: promo.link });
  }

  // Fewer tiles deserve bigger tiles — do not stretch 4 items across 6 columns.
  const columnClass = tiles.length <= 4
    ? 'grid-cols-2 lg:grid-cols-4'
    : tiles.length <= 6
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6';

  return (
    <section className="bg-brand-white brand-section-padding">
      <div className="brand-container">
        {/* Header */}
        <div className="text-center mb-12 space-y-3">
          <p className="eyebrow">Shop by category</p>
          <h2 className="section-title">Most-Wanted Categories</h2>
          <p className="section-subtitle">Loved by all, selling out fast.</p>
        </div>

        {/* 6 columns desktop / 2 columns mobile */}
        <div className={`grid ${columnClass} gap-4`}>
          {isLoading
            ? Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="aspect-[4/5] rounded-[12px] bg-brand-gray-100 animate-pulse" />
              ))
            : tiles.map((tile) => (
                <div
                  key={`${tile.kind}-${tile.title}`}
                  onClick={() => navigate(tile.link)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(tile.link)}
                  className="relative aspect-[4/5] w-full rounded-[12px] overflow-hidden cursor-pointer group shadow-sm hover:shadow-md transition-all"
                >
                  {tile.kind === 'promo' ? (
                    <div className="w-full h-full bg-gradient-to-br from-brand-red to-brand-yellow p-4 flex flex-col justify-center items-center text-center">
                      <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-brand-white/90 mb-2">
                        Special offer
                      </span>
                      <h3 className="text-[17px] sm:text-[19px] font-medium text-brand-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.45)] leading-snug">
                        {tile.title}
                      </h3>
                    </div>
                  ) : (
                    <>
                      <img
                        src={tile.image}
                        alt={tile.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-black/80 via-transparent to-transparent" />
                      <span className="absolute bottom-3 left-3 right-3 text-brand-white text-[12px] sm:text-[13px] font-medium uppercase tracking-[0.16em] drop-shadow">
                        {tile.title}
                      </span>
                    </>
                  )}
                </div>
              ))}
        </div>
      </div>
    </section>
  );
};

export default MostWantedCategories;
