import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { brandImages } from '@/lib/brandImages';

const BrandManifesto = () => {
    // Scroll progress for the entire section
    const targetRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: ["start start", "end end"]
    });

    // Content Data based on user images
    const content = [
        {
            id: 1,
            title: "THE FOUNDATION",
            subtitle: "#WearWithIntent",
            text: "crownveil is built around a sharper everyday uniform: considerate fabrics, precise proportions and confidence without noise."
        },
        {
            id: 2,
            title: "THE POINT OF VIEW",
            subtitle: "",
            text: "Modern menswear should make life easier. We build adaptable layers with relaxed confidence and a sharp finish."
        },
        {
            id: 3,
            title: "OUR PROMISE",
            subtitle: "Every time you wear it.",
            text: "Thoughtful materials, clear silhouettes and pieces that earn their place in your daily rotation."
        }
    ];

    return (
        <section ref={targetRef} className="relative bg-brand-black">
            <div className="flex flex-col lg:flex-row">

                {/* Left Side — sticky on desktop only. On a phone the column stacks, so a
                    sticky full-height image plus three full-height panels would cost four
                    screens of scrolling to read one brand story. */}
                <div className="relative lg:sticky lg:top-0 lg:w-1/2 h-[45vh] lg:h-screen overflow-hidden z-0">
                    <div className="absolute inset-0 bg-black/10 z-10" />
                    <img
                        src={brandImages.contrastPoloNavy}
                        alt="crownveil menswear collection"
                        className="w-full h-full object-cover"
                    />
                    {/* Optional: Add a subtle overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent z-10" />
                </div>

                {/* Right Side - Scrollable Text with Background */}
                <div className="lg:w-1/2 relative bg-brand-black">

                    {/* Fixed Background for the Right Side */}
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        <img
                            src={brandImages.limitedEditionAd}
                            alt=""
                            className="w-full h-full object-cover opacity-10 blur-sm scale-110 mix-blend-overlay"
                        />
                        <div className="absolute inset-0 bg-brand-black/95" />
                    </div>

                    {/* Scrollable Text Columns */}
                    <div className="relative z-10">
                        {content.map((item, index) => (
                            <div
                                key={item.id}
                                className="min-h-[52vh] lg:h-screen flex flex-col justify-center px-6 py-12 md:px-16 lg:px-24 lg:py-0 border-t lg:border-t-0 lg:border-l border-brand-yellow-dark/10"
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    viewport={{ once: false, margin: "-20% 0px -20% 0px" }}
                                >
                                    {/* Small Accent Line */}
                                    <div className="w-12 h-[2px] bg-brand-yellow-dark mb-6" />

                                    <h2 className="text-xl md:text-2xl lg:text-3xl font-instrument font-normal text-brand-white mb-4 tracking-wide leading-tight uppercase">
                                        {item.title}
                                    </h2>

                                    {item.subtitle && (
                                        <p className="text-brand-yellow-dark font-instrument font-normal tracking-[0.2em] uppercase text-sm mb-6">
                                            {item.subtitle}
                                        </p>
                                    )}

                                    <p className="text-brand-gray-200 text-lg md:text-xl font-light leading-relaxed max-w-md">
                                        {item.text}
                                    </p>
                                </motion.div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default BrandManifesto;
