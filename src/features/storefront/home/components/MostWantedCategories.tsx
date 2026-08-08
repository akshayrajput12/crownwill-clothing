import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCategories, useCatalogueKeywords } from '@/hooks/queries';
import { brandImages, marketingImages, stockCategoryImages, fallbackTileImage } from '@/lib/brandImages';

/**
 * Category grid.
 *
 * Three kinds of tile, in this order:
 *  - live categories from the DB (renaming or re-imaging one in admin updates the grid),
 *  - curated menswear tiles below, shot on the brand's own campaign art, and
 *  - the two price-promo tiles, which are marketing rather than categories.
 *
 * A curated tile only renders when the catalogue actually carries something matching its
 * keywords, and drops out if the admin creates a real category with the same name. So the
 * grid fills out as the catalogue grows and no tile ever leads to an empty results page.
 */

/**
 * Curated tiles — a full 2×6 grid whether or not the admin has created categories yet.
 *
 * Brand campaign art is used wherever it exists; the rest use free stock photography
 * that was checked shot-by-shot (see `stockCategoryImages`). `keywords` are matched
 * against live product names to decide where the tile points.
 */
const curatedTiles = [
  { title: 'Polos', keywords: ['polo'], image: brandImages.contrastPoloNavy },
  { title: 'Shirts', keywords: ['shirt'], image: stockCategoryImages.shirts },
  { title: 'Linen Shirts', keywords: ['linen'], image: marketingImages.heroLinenShirts },
  { title: 'Oxford Shirts', keywords: ['oxford'], image: brandImages.oxfordShirtBlue },
  { title: 'Printed Shirts', keywords: ['print'], image: brandImages.printedShirtOlive },
  { title: 'T-Shirts', keywords: ['t-shirt', 'tshirt', 'tee'], image: stockCategoryImages.tshirts },
  { title: 'Sweatshirts', keywords: ['sweatshirt', 'hoodie', 'sweater'], image: stockCategoryImages.sweatshirts },
  { title: 'Trousers', keywords: ['trouser', 'chino'], image: stockCategoryImages.trousers },
  { title: 'Joggers', keywords: ['jogger', 'track'], image: stockCategoryImages.joggers },
  { title: 'Jeans', keywords: ['jean', 'denim'], image: stockCategoryImages.jeans },
  { title: 'Pyjamas', keywords: ['pyjama', 'pajama'], image: marketingImages.heroPyjamaPants },
  { title: 'Overshirts & Layers', keywords: ['overshirt', 'shacket', 'jacket'], image: brandImages.heritagePolo },
];

const promoTiles = [
  { title: 'Everything Under ₹799', link: '/products?max_price=799', slot: 5 },
  { title: 'Everything Under ₹999', link: '/products?max_price=999', slot: 11 },
];

type Tile = { kind: 'category' | 'promo'; title: string; link: string; image?: string };

const MostWantedCategories: React.FC = () => {
  const navigate = useNavigate();
  const { data: categories = [], isLoading } = useCategories();
  const { data: productNames = [] } = useCatalogueKeywords();

  const liveNames = new Set(categories.map((cat) => cat.name.trim().toLowerCase()));

  const categoryTiles: Tile[] = categories.map((cat) => ({
    kind: 'category',
    title: cat.name,
    link: `/products?category=${encodeURIComponent(cat.name)}`,
    image: cat.image_url || fallbackTileImage(cat.name),
  }));

  // Curated tiles search the catalogue instead of filtering by category id, because the
  // pieces they describe may not have a category row of their own yet. A tile whose
  // keyword matches nothing still renders — the grid stays full — but it points at the
  // full catalogue rather than a search that would land on "no products found".
  for (const tile of curatedTiles) {
    if (liveNames.has(tile.title.toLowerCase())) continue;
    const matches = productNames.some((name) => tile.keywords.some((word) => name.includes(word)));

    categoryTiles.push({
      kind: 'category',
      title: tile.title,
      link: matches ? `/products?search=${encodeURIComponent(tile.keywords[0])}` : '/products',
      image: tile.image,
    });
  }

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
                        className="w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-500 ease-out"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-brand-black/85 via-brand-black/15 to-transparent" />

                      <div className="absolute bottom-3 left-3 right-3">
                        <span className="block text-brand-white text-[12px] sm:text-[13px] font-medium uppercase tracking-[0.16em] drop-shadow">
                          {tile.title}
                        </span>
                        {/* Hover CTA slides in under the label on pointer devices */}
                        <span className="hidden sm:flex items-center gap-1 text-brand-yellow text-[10px] uppercase tracking-[0.18em] mt-1 opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                          Shop now <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
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
