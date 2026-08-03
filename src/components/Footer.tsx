import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, ArrowRight } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import QRCodeComponent from './QRCode';
import { MarqueeAnimation } from '@/components/ui/marquee-effect';
import { Button } from '@/components/ui/button';

interface FooterProps {
  isAdminRoute?: boolean;
}

const Footer: React.FC<FooterProps> = ({ isAdminRoute = false }) => {
  if (isAdminRoute) {
    return null;
  }

  const { settings, loading } = useSettings();

  const contactInfo = {
    phone: settings?.store_phone || '+91 9996616153',
    email: settings?.store_email || 'hello@crownveil.com',
    address: settings?.store_address || 'Online menswear studio, India',
    storeName: 'crownveil'
  };

  return (
    <footer className="bg-[#FFFDF7] text-[#4A1C1F] pt-0 mt-0 border-t border-[#D4B6A2]/30">
      {/* Newsletter Section - Dark Background for Contrast */}
      <div className="bg-[#4A1C1F] py-12 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#B38B46] to-transparent opacity-40"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 max-w-6xl mx-auto">
            <div className="text-center md:text-left">
              <h3 className="text-xl font-serif text-[#FAF9F6] mb-2 font-medium tracking-wide">The crownveil list</h3>
              <p className="text-[#D4B6A2] font-sans tracking-wide text-xs">First access to new drops, considered edits and private offers.</p>
            </div>
            <div className="flex w-full md:w-auto gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="px-4 py-3 bg-[#FAF9F6]/10 text-white placeholder:text-gray-400 border border-[#D4B6A2]/30 w-full md:w-80 rounded-none outline-none focus:border-[#B38B46] transition-colors"
              />
              <Button className="bg-[#B38B46] hover:bg-[#967236] text-white px-8 py-6 rounded-none whitespace-nowrap uppercase tracking-widest text-[10px] font-orange-avenue font-normal">
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div>
                <h3 className="crownveil-wordmark text-lg">crownveil</h3>
                <p className="crownveil-kicker mt-1">Modern menswear</p>
              </div>
            </div>
            <p className="text-[#5C4638] text-xs leading-relaxed font-orange-avenue font-normal">
              A considered wardrobe for men: precise essentials, relaxed tailoring and pieces made to be worn on repeat.
            </p>
            <div className="flex space-x-4">
              <Facebook className="h-5 w-5 text-[#4A1C1F]/60 hover:text-[#B38B46] cursor-pointer transition-colors" />
              <Twitter className="h-5 w-5 text-[#4A1C1F]/60 hover:text-[#B38B46] cursor-pointer transition-colors" />
              <Instagram className="h-5 w-5 text-[#4A1C1F]/60 hover:text-[#B38B46] cursor-pointer transition-colors" />
              <Youtube className="h-5 w-5 text-[#4A1C1F]/60 hover:text-[#B38B46] cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-6">
            <h4 className="text-base font-orange-avenue font-normal text-[#4A1C1F]">Explore</h4>
            <div className="space-y-3">
              <Link to="/" className="block text-[#5C4638] hover:text-[#B38B46] transition-colors text-xs font-orange-avenue font-normal tracking-wide">Home</Link>
              <Link to="/products" className="block text-[#5C4638] hover:text-[#B38B46] transition-colors text-xs font-orange-avenue font-normal tracking-wide">Our Collection</Link>
              <Link to="/about" className="block text-[#5C4638] hover:text-[#B38B46] transition-colors text-xs font-orange-avenue font-normal tracking-wide">Our Story</Link>
              <Link to="/contact" className="block text-[#5C4638] hover:text-[#B38B46] transition-colors text-xs font-orange-avenue font-normal tracking-wide">Contact Us</Link>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-6">
            <h4 className="text-base font-orange-avenue font-normal text-[#4A1C1F]">Collections</h4>
            <div className="space-y-3">
              <Link to="/products?category=t-shirts" className="block text-[#5C4638] hover:text-[#B38B46] transition-colors text-xs font-orange-avenue font-normal tracking-wide">Essential Tees</Link>
              <Link to="/products?category=shirts" className="block text-[#5C4638] hover:text-[#B38B46] transition-colors text-xs font-orange-avenue font-normal tracking-wide">Shirts & Overshirts</Link>
              <Link to="/products?category=bottoms" className="block text-[#5C4638] hover:text-[#B38B46] transition-colors text-xs font-orange-avenue font-normal tracking-wide">Trousers</Link>
              <Link to="/products?category=outerwear" className="block text-[#5C4638] hover:text-[#B38B46] transition-colors text-xs font-orange-avenue font-normal tracking-wide">Outerwear</Link>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-6">
            <h4 className="text-base font-orange-avenue font-normal text-[#4A1C1F]">Contact Us</h4>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 group cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-[#4A1C1F]/5 flex items-center justify-center group-hover:bg-[#B38B46]/10 transition-colors">
                  <Phone className="h-4 w-4 text-[#4A1C1F] group-hover:text-[#B38B46]" />
                </div>
                <span className="text-[#5C4638] text-xs group-hover:text-[#B38B46] transition-colors font-orange-avenue font-normal">
                  {loading ? '...' : contactInfo.phone}
                </span>
              </div>
              <div className="flex items-center space-x-3 group cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-[#4A1C1F]/5 flex items-center justify-center group-hover:bg-[#B38B46]/10 transition-colors">
                  <Mail className="h-4 w-4 text-[#4A1C1F] group-hover:text-[#B38B46]" />
                </div>
                <span className="text-[#5C4638] text-xs group-hover:text-[#B38B46] transition-colors font-orange-avenue font-normal">
                  {loading ? '...' : contactInfo.email}
                </span>
              </div>
              <div className="flex items-start space-x-3 group">
                <div className="w-8 h-8 rounded-full bg-[#4A1C1F]/5 flex items-center justify-center mt-1 group-hover:bg-[#B38B46]/10 transition-colors">
                  <MapPin className="h-4 w-4 text-[#4A1C1F] group-hover:text-[#B38B46]" />
                </div>
                <span className="text-[#5C4638] text-xs leading-relaxed group-hover:text-[#B38B46] transition-colors font-orange-avenue font-normal">
                  {loading ? '...' : contactInfo.address}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-[#D4C3A3]/20 mt-16 pt-0 bg-white">
          <MarqueeAnimation
            direction="left"
            baseVelocity={-0.5}
            className="text-[#4A1C1F] py-6 text-xs font-orange-avenue font-normal tracking-[0.3em] uppercase opacity-80"
          >
            MODERN MENSWEAR • ELEVATED ESSENTIALS • DESIGNED WITH INTENTION • MADE FOR EVERYDAY •
          </MarqueeAnimation>

          <div className="flex flex-col md:flex-row justify-between items-center mt-8">
            <p className="text-[#5C4638]/70 text-xs font-orange-avenue font-normal">
              © 2026 crownveil. All rights reserved.
            </p>
            <div className="flex items-center gap-6 mt-4 md:mt-0">
              <Link to="/privacy" className="text-[#5C4638]/70 hover:text-[#B38B46] text-xs transition-colors font-orange-avenue font-normal">Privacy Policy</Link>
              <Link to="/terms" className="text-[#5C4638]/70 hover:text-[#B38B46] text-xs transition-colors font-orange-avenue font-normal">Terms of Service</Link>
              <QRCodeComponent />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
