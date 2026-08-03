import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import hero5 from '@/assets/2.jpeg';
import hero3 from '@/assets/3.jpeg';

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
        <section ref={targetRef} className="relative bg-hero-bg">
            <div className="flex flex-col lg:flex-row">

                {/* Left Side - Sticky Image (The Process/Craft) */}
                <div className="lg:w-1/2 h-screen sticky top-0 overflow-hidden z-0">
                    <div className="absolute inset-0 bg-black/10 z-10" />
                    <img
                        src={hero5}
                        alt="crownveil menswear collection"
                        className="w-full h-full object-cover"
                    />
                    {/* Optional: Add a subtle overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent z-10" />
                </div>

                {/* Right Side - Scrollable Text with Background */}
                <div className="lg:w-1/2 relative bg-hero-bg">

                    {/* Fixed Background for the Right Side */}
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        <img
                            src={hero3}
                            alt="Background Texture"
                            className="w-full h-full object-cover opacity-10 blur-sm scale-110 mix-blend-overlay"
                        />
                        <div className="absolute inset-0 bg-hero-bg/95" />
                    </div>

                    {/* Scrollable Text Columns */}
                    <div className="relative z-10">
                        {content.map((item, index) => (
                            <div
                                key={item.id}
                                className="h-screen flex flex-col justify-center px-8 md:px-16 lg:px-24 border-l border-[#B38B46]/10"
                            >
                                <motion.div
                                    initial={{ opacity: 0, y: 50 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.8, ease: "easeOut" }}
                                    viewport={{ once: false, margin: "-20% 0px -20% 0px" }}
                                >
                                    {/* Small Accent Line */}
                                    <div className="w-12 h-[2px] bg-[#B38B46] mb-6" />

                                    <h2 className="text-xl md:text-2xl lg:text-3xl font-instrument font-normal text-[#FAF9F6] mb-4 tracking-wide leading-tight uppercase">
                                        {item.title}
                                    </h2>

                                    {item.subtitle && (
                                        <p className="text-[#B38B46] font-instrument font-normal tracking-[0.2em] uppercase text-sm mb-6">
                                            {item.subtitle}
                                        </p>
                                    )}

                                    <p className="text-[#D4B6A2] text-lg md:text-xl font-light leading-relaxed max-w-md">
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
