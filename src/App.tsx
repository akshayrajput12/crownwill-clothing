import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import ScrollToTop from '@/components/ScrollToTop';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartSidebar from '@/components/CartSidebar';
import AddedToCartPopup from '@/components/AddedToCartPopup';
import { useStorefrontRealtime } from '@/hooks/queries';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { PageLoader } from '@/components/LoadingSpinner';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import Index from '@/pages/Index';
import Products from '@/pages/Products';
import NotFound from '@/pages/NotFound';


// Code-split: every route below the landing page loads as its own chunk.
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const Auth = lazy(() => import('@/pages/Auth'));
const Profile = lazy(() => import('@/pages/Profile'));
const Contact = lazy(() => import('@/pages/Contact'));
const About = lazy(() => import('@/pages/About'));
const UserOrderDetail = lazy(() => import('@/pages/OrderDetail'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('@/pages/admin/Products'));
const ProductForm = lazy(() => import('@/pages/admin/ProductForm'));
const ProductImport = lazy(() => import('@/pages/admin/ProductImport'));
const Categories = lazy(() => import('@/pages/admin/Categories'));
const CategoryForm = lazy(() => import('@/pages/admin/CategoryForm'));
const Orders = lazy(() => import('@/pages/admin/Orders'));
const OrderDetail = lazy(() => import('@/pages/admin/OrderDetail'));
const Customers = lazy(() => import('@/pages/admin/Customers'));
const Coupons = lazy(() => import('@/pages/admin/Coupons'));
const CouponForm = lazy(() => import('@/pages/admin/CouponForm'));
const CouponAssignment = lazy(() => import('@/pages/admin/CouponAssignment'));
const BestSellers = lazy(() => import('@/pages/admin/BestSellers'));
const Analytics = lazy(() => import('@/pages/admin/Analytics'));
const Settings = lazy(() => import('@/pages/admin/Settings'));
const InstagramPosts = lazy(() => import('@/pages/admin/InstagramPosts'));
const Testimonials = lazy(() => import('@/pages/admin/Testimonials'));

// Protected Route Component
function ProtectedRoute({ children, requireAdmin = false }: { children: React.ReactNode; requireAdmin?: boolean }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return <PageLoader text="Authenticating..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const AppContent = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Catalogue, coupon and testimonial edits invalidate the cached storefront queries, so
  // open tabs stay current without a refresh.
  useStorefrontRealtime();

  if (loading) {
    return <PageLoader text="Loading crownveil..." />;
  }

  return (
    <ErrorBoundary>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <ScrollToTop />
          <Header isAdminRoute={isAdminRoute} />
          <Suspense fallback={<PageLoader text="Loading crownveil..." />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />

            {/* Auth routes */}
            <Route
              path="/auth"
              element={user ? <Navigate to="/" replace /> : <Auth />}
            />

            {/* Checkout route - accessible to both guests and authenticated users */}
            <Route path="/checkout" element={<Checkout />} />

            {/* Protected routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/order-detail/:id"
              element={
                <ProtectedRoute>
                  <UserOrderDetail />
                </ProtectedRoute>
              }
            />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="products/add" element={<ProductForm />} />
              <Route path="products/import" element={<ProductImport />} />
              <Route path="products/edit/:id" element={<ProductForm isEdit={true} />} />
              <Route path="categories" element={<Categories />} />
              <Route path="categories/add" element={<CategoryForm />} />
              <Route path="categories/edit/:id" element={<CategoryForm isEdit={true} />} />
              <Route path="orders" element={<Orders />} />
              <Route path="orders/:id" element={<OrderDetail />} />
              <Route path="customers" element={<Customers />} />
              <Route path="coupons" element={<Coupons />} />
              <Route path="coupons/add" element={<CouponForm />} />
              <Route path="coupons/edit/:id" element={<CouponForm isEdit={true} />} />
              <Route path="coupons/assign" element={<CouponAssignment />} />
              <Route path="bestsellers" element={<BestSellers />} />
              <Route path="instagram-posts" element={<InstagramPosts />} />
              <Route path="testimonials" element={<Testimonials />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          <Footer isAdminRoute={isAdminRoute} />
          <CartSidebar isAdminRoute={isAdminRoute} />
          <AddedToCartPopup isAdminRoute={isAdminRoute} />
          <FloatingWhatsApp />
          <Toaster />
          <Sonner />
        </div>
      </TooltipProvider>
    </ErrorBoundary>
  );
};

export default function App() {
  return <AppContent />;
}
