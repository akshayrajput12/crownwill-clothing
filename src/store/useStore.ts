import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  weight: string;
  pieces: string;
  rating: number;
  description: string;
  nutrition?: string;
  inStock: boolean;
  slug: string;
  /** Selected garment size. Cart lines are keyed by product id + size. */
  size?: string;
  serves?: number;
  nutritionalInfo?: {
    totalEnergy: string;
    carbohydrate: string;
    fat: string;
    protein: string;
  };
  marketingInfo?: {
    marketedBy: string;
    address: string;
    city: string;
    state: string;
    fssaiLicense: string;
  };
  features?: {
    handSelected?: boolean;
    temperatureControlled?: boolean;
    artisanalCut?: boolean;
    hygienicallyVacuumPacked?: boolean;
    qualityAndFoodsafetyChecks?: boolean;
    antibioticResidueFree?: boolean;
  };
  storageInstructions?: string;
}

export interface CartItem extends Product {
  quantity: number;
}


/** Drives the "added to bag" confirmation card. Not persisted. */
export interface LastAdded {
  item: CartItem;
  /** Bumped on every add so re-adding the same line re-triggers the card. */
  seq: number;
}

interface Store {
  // Cart
  cartItems: CartItem[];
  isCartOpen: boolean;
  lastAdded: LastAdded | null;
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string, size?: string) => void;
  updateQuantity: (productId: string, quantity: number, size?: string) => void;
  clearCart: () => void;
  toggleCart: () => void;
  dismissLastAdded: () => void;

  // Products
  products: Product[];
  selectedCategory: string;
  setProducts: (products: Product[]) => void;
  setSelectedCategory: (category: string) => void;

  // User
  isAuthenticated: boolean;
  user: null | { name: string; email: string };
  login: (user: { name: string; email: string }) => void;
  logout: () => void;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      // Cart state
      cartItems: [],
      isCartOpen: false,
      lastAdded: null,

      // Cart actions
      addToCart: (product, quantity = 1) => {
        const qty = Math.max(1, Math.round(quantity));
        const { cartItems, lastAdded } = get();
        // Same product in a different size is its own line.
        const isSameLine = (item: CartItem) =>
          item.id === product.id && (item.size ?? '') === (product.size ?? '');
        const existingItem = cartItems.find(isSameLine);

        const updatedCartItems = existingItem
          ? cartItems.map((item) =>
              isSameLine(item) ? { ...item, quantity: item.quantity + qty } : item
            )
          : [...cartItems, { ...product, quantity: qty }];

        set({
          cartItems: updatedCartItems,
          lastAdded: {
            item: updatedCartItems.find(isSameLine)!,
            seq: (lastAdded?.seq ?? 0) + 1,
          },
        });
      },

      removeFromCart: (productId, size) => {
        set({
          cartItems: get().cartItems.filter((item) =>
            size === undefined
              ? item.id !== productId
              : !(item.id === productId && (item.size ?? '') === size)
          ),
        });
      },

      updateQuantity: (productId, quantity, size) => {
        if (quantity <= 0) {
          get().removeFromCart(productId, size);
          return;
        }

        set({
          cartItems: get().cartItems.map((item) =>
            item.id === productId && (size === undefined || (item.size ?? '') === size)
              ? { ...item, quantity }
              : item
          ),
        });
      },

      clearCart: () => set({ cartItems: [], lastAdded: null }),

      toggleCart: () => set({ isCartOpen: !get().isCartOpen }),

      dismissLastAdded: () => set({ lastAdded: null }),

      // Products state
      products: [],
      selectedCategory: 'All',
      setProducts: (products) => set({ products }),
      setSelectedCategory: (category) => set({ selectedCategory: category }),

      // User state
      isAuthenticated: false,
      user: null,
      login: (user) => set({ isAuthenticated: true, user }),
      logout: () => set({ isAuthenticated: false, user: null }),
    }),
    {
      name: 'crownveil-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cartItems: state.cartItems,
        // We only persist cart items, not the entire state
      }),
    }
  )
);
