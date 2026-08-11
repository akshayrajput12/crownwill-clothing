import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Menu, Search, Heart, X, ChevronDown, ChevronRight, LogOut } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

import {
  DropdownMenu as MobileDropdown,
  DropdownMenuContent as MobileDropdownContent,
  DropdownMenuItem as MobileDropdownItem,
  DropdownMenuTrigger as MobileDropdownTrigger,
} from '@/components/ui/dropdown-menu';
import SearchSidebar from './SearchSidebar';
import { useCategories } from '@/hooks/queries';

interface HeaderProps {
  isAdminRoute?: boolean;
}

const Header: React.FC<HeaderProps> = ({ isAdminRoute = false }) => {
  const navigate = useNavigate();
  const { cartItems, toggleCart } = useStore();
  const { user, signOut, isAdmin } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [activeMegaMenu, setActiveMegaMenu] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  /**
   * Auto-hiding header: slides away as you scroll down and comes straight back on the
   * first upward scroll, so the catalogue gets the full screen without costing anyone a
   * trip to the top to reach search or the bag.
   *
   * Reads are throttled to one per animation frame — a scroll listener that calls
   * setState on every event is the classic way to make a page feel heavy.
   */
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;

      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        const delta = y - lastY;

        // Ignore rubber-banding at the very top, and jitter below the noise floor.
        if (y < 96) setHidden(false);
        else if (Math.abs(delta) > 6) setHidden(delta > 0);

        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Never hide the bar while a menu that hangs off it is open.
  const isHidden = hidden && !activeMegaMenu && !isMobileMenuOpen && !isSearchOpen;

  // Nav categories: one cached query for the whole app (see hooks/queries.ts),
  // so route changes never refetch it.
  const { data: categories = [] } = useCategories();

  const cartItemsCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  /**
   * Mega menu built from live categories, chunked into columns. Every link filters
   * by a category name that actually exists, so no dropdown lands on an empty grid.
   */
  const megaMenuColumns: Array<{ title: string; items: Array<{ label: string; link: string }> }> = [];
  const perColumn = Math.max(1, Math.ceil(categories.length / 3));
  for (let i = 0; i < categories.length; i += perColumn) {
    const group = categories.slice(i, i + perColumn);
    megaMenuColumns.push({
      title: group[0]?.name ?? 'SHOP',
      items: group.map((cat) => ({
        label: cat.name,
        link: `/products?category=${encodeURIComponent(cat.name)}`,
      })),
    });
  }
  megaMenuColumns.push({
    title: 'SHOP BY EDIT',
    items: [
      { label: 'New Arrivals', link: '/products?sort=newest' },
      { label: 'Best Sellers', link: '/products?sort=bestseller' },
      { label: 'Under ₹799', link: '/products?max_price=799' },
      { label: 'View All', link: '/products' },
    ],
  });

  if (isAdminRoute) return null;

  return (
    <>
      {/*
        The sliding header is deliberately kept separate from the drawer and the search
        panel below. Any transform — including translate-y-0 — makes an element the
        containing block for its position:fixed descendants, so a drawer nested in here
        would size itself against the 112px header instead of the viewport.
      */}
      <header
        className={`w-full z-50 sticky top-0 bg-brand-white transition-transform duration-300 ease-out ${
          isHidden ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
      {/* PART 2.A: ANNOUNCEMENT BAR — the full sentence needs two lines on a 360px screen,
          which a fixed 36px bar simply clips. Short copy on phones, full copy from sm up. */}
      <div className="w-full bg-brand-black h-[36px] md:h-[40px] flex items-center justify-center text-brand-white text-[11px] sm:text-[12px] font-medium tracking-wide px-4 overflow-hidden">
        <span className="whitespace-nowrap sm:hidden">Free Shipping on Every Order</span>
        <span className="hidden sm:inline whitespace-nowrap">
          Free Shipping Sitewide on Every Order, Don't Miss Out!!
        </span>
      </div>

      {/* PART 2.B: NAVBAR (Sticky Header) */}
      <div className="w-full bg-brand-white border-b border-brand-gray-200 backdrop-blur-md sticky top-0 z-40 transition-all duration-200">
        <div className="max-w-[1280px] mx-auto px-4 flex items-center justify-between h-[64px] md:h-[72px]">

          {/* Left: Brand Logo — the real crown/CV mark, cut out of public/logo.png so it
              sits on the white navbar without its original dark tile. */}
          {/* Tracked-out serif wordmark is wide; it steps down on small screens so the
              search / bag / menu controls keep their tap targets. */}
          <Link
            to="/"
            className="flex items-center gap-2 sm:gap-2.5 group min-w-0 flex-shrink"
            aria-label="Crownveil — home"
          >
            <img
              src="/assets/logo-mark.png"
              alt=""
              width={173}
              height={184}
              className="h-7 sm:h-8 md:h-10 w-auto flex-shrink-0 group-hover:scale-105 transition-transform"
              decoding="async"
            />
            <span className="crownveil-wordmark text-[14px] sm:text-[17px] md:text-[22px] truncate">
              Crownveil
            </span>
          </Link>

          {/* Center: Navigation Links with Mega Menu */}
          <nav className="hidden lg:flex items-center gap-8 h-full">
            {/* Topwear Link + Mega Menu Trigger */}
            <div
              className="relative h-full flex items-center cursor-pointer group"
              onMouseEnter={() => setActiveMegaMenu('topwear')}
              onMouseLeave={() => setActiveMegaMenu(null)}
            >
              <button className="flex items-center gap-1 text-[14px] font-semibold uppercase tracking-[0.05em] text-brand-black hover:text-brand-gray-500">
                SHOP <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
              </button>

              {/* Mega Menu Dropdown */}
              <AnimatePresence>
                {activeMegaMenu === 'topwear' && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="fixed top-[104px] left-0 w-full bg-brand-white border-t border-brand-gray-200 shadow-[0_8px_24px_rgba(0,0,0,0.08)] py-8 z-50"
                  >
                    <div className="max-w-[1280px] mx-auto px-4 grid grid-cols-4 gap-8">
                      {megaMenuColumns.map((col, idx) => (
                        <div key={idx} className="space-y-3">
                          <h4 className="font-semibold text-[13px] tracking-wider text-brand-black uppercase border-b border-brand-gray-100 pb-2">
                            {col.title}
                          </h4>
                          <ul className="space-y-2">
                            {col.items.map((item) => (
                              <li key={item.label}>
                                <button
                                  onClick={() => {
                                    setActiveMegaMenu(null);
                                    navigate(item.link);
                                  }}
                                  className="text-[14px] text-brand-gray-700 hover:text-brand-black hover:translate-x-1 transition-all inline-block text-left"
                                >
                                  {item.label}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottomwear Link */}
            <Link
              to="/products?sort=bestseller"
              className="text-[14px] font-semibold uppercase tracking-[0.05em] text-brand-black hover:text-brand-gray-500"
            >
              BEST SELLERS
            </Link>

            {/* Combos Link */}
            <Link
              to="/products"
              className="text-[14px] font-semibold uppercase tracking-[0.05em] text-brand-black hover:text-brand-gray-500"
            >
              COMBOS
            </Link>

            {/* New Arrivals Link */}
            <Link
              to="/products?sort=newest"
              className="text-[14px] font-semibold uppercase tracking-[0.05em] text-brand-black hover:text-brand-gray-500"
            >
              NEW ARRIVALS
            </Link>
          </nav>

          {/* Right: Search, Cart, Login/Signup. Tighter gaps on phones, but each control
              keeps a 44px tap target thanks to the padding on the buttons themselves. */}
          <div className="flex items-center gap-2 sm:gap-4 md:gap-5 flex-shrink-0">
            {/* Search Icon */}
            <button
              onClick={() => setIsSearchOpen(true)}
              className="text-brand-black hover:text-brand-gray-500 p-2 -m-1"
              aria-label="Search"
            >
              <Search className="w-5 h-5 stroke-[2]" />
            </button>

            {/* Cart Icon with Yellow Circular Badge */}
            <button
              onClick={toggleCart}
              className="relative text-brand-black hover:text-brand-gray-500 p-2 -m-1"
              aria-label="Cart"
            >
              <ShoppingCart className="w-5 h-5 stroke-[2]" />
              {cartItemsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-brand-yellow text-brand-black text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                  {cartItemsCount}
                </span>
              )}
            </button>

            {/* User Auth Buttons */}
            {user ? (
              <MobileDropdown>
                <MobileDropdownTrigger className="outline-none">
                  <div className="w-8 h-8 rounded-full bg-brand-gray-100 flex items-center justify-center text-brand-black cursor-pointer hover:bg-brand-gray-200">
                    <User className="w-4 h-4" />
                  </div>
                </MobileDropdownTrigger>
                <MobileDropdownContent align="end" className="w-56 bg-brand-white border border-brand-gray-200 shadow-lg rounded-xl p-2 z-50">
                  {isAdmin && (
                    <MobileDropdownItem className="text-[13px] font-semibold py-2.5 cursor-pointer text-brand-black" onClick={() => navigate('/admin')}>
                      Admin Dashboard
                    </MobileDropdownItem>
                  )}
                  <MobileDropdownItem className="text-[13px] font-semibold py-2.5 cursor-pointer text-brand-black" onClick={() => navigate('/profile')}>
                    Profile & Orders
                  </MobileDropdownItem>
                  <MobileDropdownItem className="text-[13px] font-semibold py-2.5 cursor-pointer text-brand-gray-500" onClick={signOut}>
                    Sign Out
                  </MobileDropdownItem>
                </MobileDropdownContent>
              </MobileDropdown>
            ) : (
              <div className="hidden md:flex items-center gap-3">
                <button
                  onClick={() => navigate('/auth')}
                  className="text-[12px] font-semibold text-brand-black hover:text-brand-gray-500 uppercase tracking-wider"
                >
                  LOGIN
                </button>
                <span className="text-brand-gray-200">|</span>
                <button
                  onClick={() => navigate('/auth')}
                  className="text-[12px] font-semibold text-brand-black hover:text-brand-gray-500 uppercase tracking-wider"
                >
                  SIGNUP
                </button>
              </div>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden text-brand-black p-2 -m-1"
              aria-label="Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      </header>

      {/* Mobile Drawer Navigation — fixed to the viewport, outside the transformed header */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-brand-black/50 backdrop-blur-sm z-50 lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.3 }}
              className="fixed top-0 left-0 bottom-0 w-[85%] max-w-[320px] bg-brand-white z-50 shadow-2xl p-6 overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-4 border-b border-brand-gray-200">
                <div className="flex items-center gap-2">
                  <img src="/assets/logo-mark.png" alt="" className="h-7 w-auto" decoding="async" />
                  <span className="crownveil-wordmark text-[17px]">Crownveil</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="text-brand-black">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="py-4 space-y-4">
                <Link
                  to="/products"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-base font-semibold text-brand-black uppercase tracking-wide"
                >
                  SHOP ALL
                </Link>
                <Link
                  to="/products?sort=bestseller"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-base font-semibold text-brand-black uppercase tracking-wide"
                >
                  BEST SELLERS
                </Link>
                <Link
                  to="/products"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-base font-semibold text-brand-black uppercase tracking-wide"
                >
                  COMBOS
                </Link>
                <Link
                  to="/products?sort=newest"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="block text-base font-semibold text-brand-black uppercase tracking-wide"
                >
                  NEW ARRIVALS
                </Link>

                {!user && (
                  <div className="pt-6 border-t border-brand-gray-200 space-y-3">
                    <button
                      onClick={() => { navigate('/auth'); setIsMobileMenuOpen(false); }}
                      className="w-full bg-brand-yellow text-brand-black font-semibold py-3 rounded-lg uppercase tracking-wider text-sm"
                    >
                      Login / Sign Up
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <SearchSidebar isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};

export default Header;
