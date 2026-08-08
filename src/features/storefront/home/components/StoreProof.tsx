import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Proof band — the numbers, taken from the database rather than written by hand.
 *
 * Every figure here is a real count: nothing says "2M+ happy customers" unless 2M
 * customers exist. If a figure is not meaningful yet (no reviews, no orders) that tile
 * is dropped, and if none of them are the whole section hides itself. A shop with three
 * orders should not advertise its order count.
 */

interface ProofNumbers {
  products: number;
  categories: number;
  orders: number;
  reviews: number;
  rating: number | null;
}

/** Counts only — `head: true` means no rows cross the wire, just the totals. */
function useProofNumbers() {
  return useQuery({
    queryKey: ['store-proof'] as const,
    staleTime: 30 * 60 * 1000,
    queryFn: async (): Promise<ProofNumbers> => {
      const [products, categories, orders, reviews] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('categories').select('id', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('orders').select('id', { count: 'exact', head: true }),
        supabase.from('reviews').select('rating'),
      ]);

      const ratings = ((reviews.data ?? []) as Array<{ rating: number | null }>)
        .map((row) => Number(row.rating))
        .filter((rating) => Number.isFinite(rating) && rating > 0);

      return {
        products: products.count ?? 0,
        categories: categories.count ?? 0,
        orders: orders.count ?? 0,
        reviews: ratings.length,
        rating: ratings.length
          ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length) * 10) / 10
          : null,
      };
    },
  });
}

/** 1400 → "1,400"; 12400 → "12.4k". Keeps small honest numbers exact. */
function compact(value: number): string {
  if (value < 1000) return String(value);
  if (value < 10000) return value.toLocaleString('en-IN');
  return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`;
}

const StoreProof: React.FC = () => {
  const { data, isLoading } = useProofNumbers();

  if (isLoading || !data) return null;

  const tiles: Array<{ value: string; label: string; suffix?: React.ReactNode }> = [];

  if (data.products > 0) {
    tiles.push({ value: compact(data.products), label: 'Pieces in the collection' });
  }
  if (data.categories > 1) {
    tiles.push({ value: String(data.categories), label: 'Categories to shop' });
  }
  // Order and review counts only earn a tile once they are worth saying out loud.
  if (data.orders >= 25) {
    tiles.push({ value: `${compact(data.orders)}+`, label: 'Orders shipped' });
  }
  if (data.rating !== null && data.reviews >= 5) {
    tiles.push({
      value: data.rating.toFixed(1),
      label: `Average rating from ${data.reviews} reviews`,
      suffix: <Star className="w-4 h-4 fill-brand-yellow text-brand-yellow" />,
    });
  }

  if (tiles.length < 2) return null;

  return (
    <section className="bg-brand-black text-brand-white">
      <div className="brand-container py-10 sm:py-14">
        <div
          className={`grid gap-y-8 gap-x-4 text-center ${
            tiles.length === 2 ? 'grid-cols-2' : tiles.length === 3 ? 'grid-cols-3' : 'grid-cols-2 lg:grid-cols-4'
          }`}
        >
          {tiles.map((tile, index) => (
            <motion.div
              key={tile.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ duration: 0.5, delay: index * 0.08, ease: [0.4, 0, 0.2, 1] }}
              className="px-1"
            >
              <p className="flex items-center justify-center gap-1.5 text-[28px] sm:text-[36px] font-medium leading-none tracking-tight">
                {tile.value}
                {tile.suffix}
              </p>
              <p className="mt-2.5 text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-white/55 leading-relaxed">
                {tile.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StoreProof;
