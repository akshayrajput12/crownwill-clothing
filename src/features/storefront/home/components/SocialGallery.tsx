import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import { Instagram, Sparkles } from 'lucide-react';

interface InstagramPost {
  id: string;
  embed_html: string;
  caption: string;
}

const SocialGallery = () => {
  const [instagramPosts, setInstagramPosts] = useState<InstagramPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchInstagramPosts();
  }, []);

  const fetchInstagramPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('instagram_posts')
        .select('id, embed_html, caption')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      setInstagramPosts(data || []);
    } catch (error) {
      console.error('Error fetching Instagram posts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Set up the API reference
  useEffect(() => {
    if (!api) {
      return;
    }

    // Auto-scroll functionality
    const startAutoScroll = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      intervalRef.current = setInterval(() => {
        if (api) {
          api.scrollNext();
        }
      }, 4000); // Auto-scroll every 4 seconds
    };

    startAutoScroll();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [api]);

  // Load Instagram embed script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '//www.instagram.com/embed.js';
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      if (window.instgrm) {
        // @ts-ignore
        window.instgrm.Embeds.process();
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, [instagramPosts]);

  if (loading) {
    return (
      <section className="brand-section-padding bg-brand-offwhite relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-12">
            <span className="text-xs font-medium uppercase tracking-[0.3em] text-brand-black mb-4 block">
              @CROWNVEIL
            </span>
            <div className="flex items-center justify-center gap-2 mb-4">
              <h2 className="text-2xl md:text-3xl font-instrument font-normal text-brand-black">
                Trending on Instagram
              </h2>
            </div>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-black"></div>
          </div>
        </div>
      </section>
    );
  }

  if (instagramPosts.length === 0) {
    return null;
  }

  return (
    <section className="brand-section-padding bg-brand-offwhite relative overflow-hidden">
      {/* Royal Background Accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-cream rounded-full filter blur-[100px] opacity-60 pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-gray-200 rounded-full filter blur-[100px] opacity-30 pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

      {/* brand-container so the gutters line up with every other section on a phone */}
      <div className="brand-container relative z-10">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="eyebrow mb-3">@crownveil</p>

          <h2 className="section-title mb-4">Follow the Journey</h2>

          <p className="section-subtitle max-w-xl mx-auto">
            New drops, styling notes and behind-the-scenes edits.
          </p>
        </motion.div>

        {/* Instagram Carousel */}
        <div className="max-w-7xl mx-auto">
          <Carousel
            setApi={setApi}
            opts={{
              align: "center",
              loop: true,
            }}
            className="w-full"
            onMouseEnter={() => {
              if (intervalRef.current) clearInterval(intervalRef.current);
            }}
            onMouseLeave={() => {
              if (intervalRef.current) clearInterval(intervalRef.current);
              intervalRef.current = setInterval(() => {
                if (api) api.scrollNext();
              }, 4000);
            }}
          >
            <CarouselContent className="-ml-4">
              {instagramPosts.map((post) => (
                <CarouselItem key={post.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                  <motion.div
                    className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 border border-brand-offwhite h-full"
                    whileHover={{ y: -8 }}
                  >
                    <div className="relative group">
                      <div className="h-[360px] sm:h-[450px] overflow-hidden bg-gray-50 flex items-center justify-center">
                        <div dangerouslySetInnerHTML={{ __html: post.embed_html }} className="w-full h-full flex items-center justify-center [&>iframe]:!w-full [&>iframe]:!h-full [&>iframe]:!border-0" />
                        {/* Overlay for interaction hint */}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300 pointer-events-none" />
                      </div>
                    </div>
                  </motion.div>
                </CarouselItem>
              ))}
            </CarouselContent>

            {/* Custom Navigation */}
            <div className="hidden md:block">
              <CarouselPrevious className="left-[-50px] w-12 h-12 border-brand-gray-200 bg-transparent hover:bg-brand-black hover:text-white hover:border-brand-black transition-all duration-300 text-brand-black" />
              <CarouselNext className="right-[-50px] w-12 h-12 border-brand-gray-200 bg-transparent hover:bg-brand-black hover:text-white hover:border-brand-black transition-all duration-300 text-brand-black" />
            </div>
          </Carousel>
        </div>

        {/* Instagram Profile Link */}
        <div className="text-center mt-12">
          <a
            href="https://www.instagram.com/crownveil"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-label group inline-flex items-center gap-3 bg-brand-black text-brand-white px-8 py-4 rounded-[8px] hover:bg-brand-charcoal transition-colors"
          >
            <Instagram className="w-4 h-4" />
            <span>Follow @crownveil</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default SocialGallery;
