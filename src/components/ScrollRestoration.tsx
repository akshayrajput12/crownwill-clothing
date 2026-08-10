import { useEffect, useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/**
 * Scroll restoration for the SPA.
 *
 * New navigations start at the top; going back or forward returns you to exactly where
 * you were. This replaces the old ScrollToTop, which turned off the browser's own
 * restoration and then forced `scrollTo(0, 0)` on every location change — so clicking a
 * product from the bestseller rail and pressing back dumped you at the top of the home
 * page instead of back at the rail.
 *
 * React Router only ships `<ScrollRestoration />` for data routers (createBrowserRouter);
 * this app uses `<BrowserRouter>` + `<Routes>`, so the bookkeeping lives here.
 */

/** scrollY per history entry, keyed by location.key (unique per entry). */
const positions = new Map<string, number>();

/** How long to keep trying to reach a restored offset while async content lands. */
const MAX_RESTORE_FRAMES = 60;

const ScrollRestoration = () => {
  const { key } = useLocation();
  const navigationType = useNavigationType();

  // We do the restoring, so stop the browser from also having a go.
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  // Record the offset as the shopper scrolls. Throttled to one write per frame — a
  // listener that writes on every scroll event is how pages start to feel heavy.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        positions.set(key, window.scrollY);
        frame = 0;
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [key]);

  useLayoutEffect(() => {
    const saved = positions.get(key);
    let frames = 0;
    let raf = 0;
    let cancelled = false;

    if (navigationType === 'POP' && saved && saved > 0) {
      /**
       * The page we are returning to renders its data from the React Query cache, but
       * images and lazily-mounted sections still change the document height for a few
       * frames. Ask for the offset repeatedly until the page is tall enough to honour it
       * (or we run out of patience), otherwise the scroll silently clamps to the bottom
       * of a half-built page.
       */
      const restore = () => {
        if (cancelled) return;
        window.scrollTo(0, saved);
        frames += 1;
        if (Math.abs(window.scrollY - saved) > 2 && frames < MAX_RESTORE_FRAMES) {
          raf = window.requestAnimationFrame(restore);
        }
      };
      restore();
    } else {
      // A fresh navigation starts at the top.
      window.scrollTo(0, 0);
    }

    // Runs before the next entry's layout effect, so this still sees the outgoing
    // page's offset rather than the incoming one's.
    return () => {
      cancelled = true;
      if (raf) window.cancelAnimationFrame(raf);
      positions.set(key, window.scrollY);
    };
  }, [key, navigationType]);

  return null;
};

export default ScrollRestoration;
