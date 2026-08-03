# crownveil Frontend Architecture

This is a Vite + React application. It follows the feature-first principles in `BH-ATS-Engineering-Guide.md` without adopting that document's Next.js-only routing and server-action conventions.

## Top-level structure

```text
src/
  components/                 # Shared UI used across features
  components/ui/              # Reusable design-system primitives only
  contexts/                   # App-wide React context
  features/
    storefront/
      home/
        components/           # Homepage sections, grouped by domain
  hooks/                       # Reusable React hooks
  integrations/supabase/      # Supabase client and generated database types
  pages/                       # Route modules only
    admin/                     # Admin route modules
    Checkout/                  # Checkout route sections
    Home/                      # Home route composition
  store/                       # Client-side state
  utils/                       # Framework-independent helpers
```

## Naming rules

- React components use `PascalCase.tsx` and descriptive clothing-store names: `SeasonalHero`, `EssentialEdit`, `CollectionCarousel`.
- A route file stays in `pages/`; route-specific visual sections belong in `features/<area>/<domain>/components/`.
- Cross-feature UI belongs in `components/`. Design primitives belong in `components/ui/`.
- Utilities use lower camel case module names and must not render UI.

## Home feature

`src/pages/Home/Home.tsx` composes the page. Its individual editorial sections live under `src/features/storefront/home/components/`:

- `SeasonalHero`
- `BestSellersSection`
- `CollectionCarousel`
- `NewArrivalsSection`
- `BrandManifesto`
- `EditorialBanner`
- `EssentialEdit`
- `SeasonalEdit`
- `OfferStrip`
- `SocialGallery`
- `FeaturedProductWidget`

The previous food-specific, unused page components and obsolete product-detail copy have been removed.
