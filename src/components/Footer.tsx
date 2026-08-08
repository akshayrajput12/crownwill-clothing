import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Instagram, Linkedin, Facebook, Twitter, ShieldCheck, Mail, Phone, MapPin } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { useCategories } from '@/hooks/queries';

interface FooterProps {
  isAdminRoute?: boolean;
}

/**
 * Footer.
 *
 * Every link points at a route that exists and a contact detail that is real:
 * the shop columns come from the live category list, contact details from store
 * settings, and social icons only render for handles that have been filled in.
 * No placeholder cities, no dead policy pages.
 */
const Footer: React.FC<FooterProps> = ({ isAdminRoute = false }) => {
  const [openAccordion, setOpenAccordion] = useState<string | null>(null);
  const { settings } = useSettings();
  const { data: categories = [] } = useCategories();

  if (isAdminRoute) return null;

  const toggleAccordion = (title: string) => {
    setOpenAccordion((prev) => (prev === title ? null : title));
  };

  const email = settings?.store_email || 'hello@crownveil.com';
  const phone = settings?.store_phone || '';
  const address = settings?.store_address || '';
  const whatsapp = (settings?.whatsapp_number || phone).replace(/\D/g, '');

  const socials = [
    { href: settings?.instagram_url, Icon: Instagram, label: 'Instagram' },
    { href: settings?.facebook_url, Icon: Facebook, label: 'Facebook' },
    { href: settings?.twitter_url, Icon: Twitter, label: 'X' },
    { href: settings?.linkedin_url, Icon: Linkedin, label: 'LinkedIn' },
  ].filter((s) => typeof s.href === 'string' && s.href.trim().length > 0);

  const shopLinks = [
    { label: 'All Products', to: '/products' },
    { label: 'New Arrivals', to: '/products?sort=newest' },
    { label: 'Best Sellers', to: '/products?sort=bestseller' },
    { label: 'Under ₹799', to: '/products?max_price=799' },
  ];

  const accountLinks = [
    { label: 'My Orders', to: '/profile' },
    { label: 'My Account', to: '/profile' },
    { label: 'Shopping Bag', to: '/cart' },
    { label: 'Sign In / Register', to: '/auth' },
  ];

  const linkClass = 'text-white/60 hover:text-brand-yellow transition-colors';

  return (
    <footer className="w-full bg-brand-black text-brand-white pt-16 pb-8">
      <div className="max-w-[1280px] mx-auto px-4">

        {/* Brand line */}
        <div className="pb-10 border-b border-white/10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="space-y-3">
            {/* The full lockup, which was drawn for a dark ground, gets to be itself here. */}
            <Link to="/" className="inline-block" aria-label="Crownveil — home">
              <img
                src="/assets/logo-full.png"
                alt="Crownveil"
                width={307}
                height={236}
                className="h-14 w-auto"
                loading="lazy"
                decoding="async"
              />
            </Link>
            <p className="text-[14px] text-white/60 max-w-md leading-relaxed">
              Elevated menswear essentials — considered fabrics, precise proportions and
              pieces built for repeat wear.
            </p>
          </div>
          <Link
            to="/products"
            className="btn-label self-start md:self-auto bg-brand-yellow text-brand-black px-7 py-3.5 rounded-[8px] hover:bg-brand-yellow-dark transition-colors"
          >
            Shop the collection
          </Link>
        </div>

        {/* 4 columns desktop, stacked mobile */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10 py-10 border-b border-white/10">

          {/* Shop */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-medium uppercase tracking-[0.24em] text-brand-white">Shop</h4>
            <ul className="space-y-2.5 text-[14px]">
              {shopLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className={linkClass}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories — live from the catalogue */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-medium uppercase tracking-[0.24em] text-brand-white">Categories</h4>
            <ul className="space-y-2.5 text-[14px]">
              {categories.length === 0 ? (
                <li><Link to="/products" className={linkClass}>Browse all</Link></li>
              ) : (
                categories.map((cat) => (
                  <li key={cat.id}>
                    <Link to={`/products?category=${encodeURIComponent(cat.name)}`} className={linkClass}>
                      {cat.name}
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Account & help */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-medium uppercase tracking-[0.24em] text-brand-white">Account &amp; Help</h4>
            <ul className="space-y-2.5 text-[14px]">
              {accountLinks.map((link) => (
                <li key={link.label}>
                  <Link to={link.to} className={linkClass}>{link.label}</Link>
                </li>
              ))}
              <li><Link to="/contact" className={linkClass}>Contact &amp; Support</Link></li>
              <li><Link to="/about" className={linkClass}>About Crownveil</Link></li>
            </ul>
          </div>

          {/* Contact — real details from store settings */}
          <div className="space-y-4">
            <h4 className="text-[11px] font-medium uppercase tracking-[0.24em] text-brand-white">Get in Touch</h4>
            <ul className="space-y-3 text-[14px] text-white/60">
              <li>
                <a href={`mailto:${email}`} className={`${linkClass} flex items-start gap-2`}>
                  <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span className="break-all">{email}</span>
                </a>
              </li>
              {phone && (
                <li>
                  <a href={`tel:${phone.replace(/\s/g, '')}`} className={`${linkClass} flex items-start gap-2`}>
                    <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{phone}</span>
                  </a>
                </li>
              )}
              {whatsapp && (
                <li>
                  <a
                    href={`https://wa.me/${whatsapp.length === 10 ? `91${whatsapp}` : whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className={linkClass}
                  >
                    Chat on WhatsApp
                  </a>
                </li>
              )}
              {address && (
                <li className="flex items-start gap-2 leading-relaxed">
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Collapsible on mobile, open on desktop */}
        <div className="py-6 border-b border-white/10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              key: 'why',
              title: 'Why shop with us',
              body: 'Free shipping sitewide, cash on delivery available, and easy exchanges on every order. Fabrics chosen for hand feel and longevity, not for a price point.',
            },
            {
              key: 'shipping',
              title: 'Shipping & returns',
              body: 'Orders are dispatched within 24–48 hours and delivered by Delhivery. Check your pincode on any product page for an estimated delivery date.',
            },
          ].map((item) => (
            <div key={item.key} className="md:border-0">
              <button
                onClick={() => toggleAccordion(item.key)}
                aria-expanded={openAccordion === item.key}
                className="flex items-center justify-between w-full text-left text-[12px] font-medium uppercase tracking-[0.2em] text-brand-white md:cursor-default md:pointer-events-none"
              >
                <span>{item.title}</span>
                <ChevronDown
                  className={`w-4 h-4 md:hidden transition-transform ${openAccordion === item.key ? 'rotate-180' : ''}`}
                />
              </button>
              <p
                className={`mt-3 text-[13px] text-white/60 leading-relaxed ${
                  openAccordion === item.key ? 'block' : 'hidden md:block'
                }`}
              >
                {item.body}
              </p>
            </div>
          ))}
        </div>

        {/* Payments + social */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-wrap items-center justify-center gap-3">
            <ShieldCheck className="w-5 h-5 text-brand-success" />
            <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/80">
              100% Secure Payment
            </span>
            <div className="flex items-center gap-2">
              {['UPI', 'VISA', 'MASTERCARD', 'RAZORPAY', 'COD'].map((method) => (
                <span
                  key={method}
                  className="bg-white/10 text-white/80 text-[9px] font-medium tracking-[0.1em] px-2 py-1 rounded"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>

          {socials.length > 0 && (
            <div className="flex items-center gap-4">
              <span className="text-[12px] text-white/50 hidden sm:inline">Follow along</span>
              <div className="flex items-center gap-3">
                {socials.map(({ href, Icon, label }) => (
                  <a
                    key={label}
                    href={href as string}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={label}
                    className="w-8 h-8 rounded-full bg-white/10 text-brand-white flex items-center justify-center hover:bg-brand-yellow hover:text-brand-black transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 text-center text-[11px] tracking-[0.1em] text-white/35 uppercase">
          © {new Date().getFullYear()} Crownveil. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
