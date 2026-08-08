import React, { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { brandImages } from '@/lib/brandImages';

/**
 * Brand story: the copy panels scroll while the imagery stays pinned — and the image
 * swaps to match whichever panel you are reading. Each panel names its own shot, and
 * the cross-fade is driven by the section's scroll progress rather than a timer, so the
 * picture and the words can never drift apart.
 */

const FADE = 0.07; // how much of the section's scroll a cross-fade occupies

/**
 * Scroll window in which panel `index` is the active one. The first entry starts fully
 * on and the last stays on to the end, so the section never opens or closes mid-fade.
 */
const panelRange = (index: number, total: number): [number, number, number, number] => {
    const start = index / total;
    const end = (index + 1) / total;
    return [
        index === 0 ? -2 : start - FADE,
        index === 0 ? -1 : start + FADE,
        index === total - 1 ? 2 : end - FADE,
        index === total - 1 ? 3 : end + FADE,
    ];
};

/**
 * One pinned frame. Fades in as its panel arrives and out as the next one does; the
 * first frame starts fully visible and the last stays visible to the end, so the
 * section never opens or closes on a half-faded image.
 */
const PanelImage: React.FC<{
    src: string;
    alt: string;
    index: number;
    total: number;
    progress: MotionValue<number>;
}> = ({ src, alt, index, total, progress }) => {
    const opacity = useTransform(progress, panelRange(index, total), [0, 1, 1, 0]);
    // A touch of drift so the pinned column never feels frozen.
    const scale = useTransform(progress, [index / total - 0.2, (index + 1) / total + 0.2], [1.06, 1]);

    return (
        <motion.img
            src={src}
            alt={alt}
            style={{ opacity, scale }}
            className="absolute inset-0 w-full h-full object-cover object-top will-change-[opacity,transform]"
            loading="lazy"
            decoding="async"
        />
    );
};

/** Progress tick: widens and brightens while its panel is the one on screen. */
const PanelTick: React.FC<{ index: number; total: number; progress: MotionValue<number> }> = ({
    index,
    total,
    progress,
}) => {
    const active = useTransform(progress, panelRange(index, total), [0, 1, 1, 0]);
    const width = useTransform(active, [0, 1], [8, 26]);
    const opacity = useTransform(active, [0, 1], [0.35, 1]);

    return <motion.span style={{ width, opacity }} className="h-[3px] rounded-full bg-brand-yellow block" />;
};

const BrandManifesto = () => {
    // Scroll progress for the entire section
    const targetRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: targetRef,
        offset: ["start start", "end end"]
    });

    // Each panel carries the shot that belongs to it.
    const content = [
        {
            id: 1,
            title: "THE FOUNDATION",
            subtitle: "#WearWithIntent",
            text: "crownveil is built around a sharper everyday uniform: considerate fabrics, precise proportions and confidence without noise.",
            // Crown-embroidered contrast polo in warm afternoon light — the craft panel.
            image: brandImages.contrastPoloBeige,
        },
        {
            id: 2,
            title: "THE POINT OF VIEW",
            subtitle: "",
            text: "Modern menswear should make life easier. We build adaptable layers with relaxed confidence and a sharp finish.",
            // The double-pocket overshirt: the "adaptable layer" the copy is describing.
            image: brandImages.oxfordShirtBlue,
        },
        {
            id: 3,
            title: "OUR PROMISE",
            subtitle: "Every time you wear it.",
            text: "Thoughtful materials, clear silhouettes and pieces that earn their place in your daily rotation.",
            // Heritage back print — "Heritage. Royalty. Legacy."
            image: brandImages.heritagePolo,
        }
    ];

    return (
        <section ref={targetRef} className="relative bg-brand-black">
            <div className="flex flex-col lg:flex-row">

                {/* Left Side — pinned imagery that changes with the copy.
                    Desktop only: once the columns stack, a sticky image would be scrolled
                    over by the text column beneath it. Mobile gets a per-panel image
                    inline instead, which reads better anyway. */}
                <div className="hidden lg:block sticky top-0 lg:w-1/2 h-screen overflow-hidden z-0">
                    {content.map((item, index) => (
                        <PanelImage
                            key={item.id}
                            src={item.image}
                            alt={item.title}
                            index={index}
                            total={content.length}
                            progress={scrollYProgress}
                        />
                    ))}

                    {/* Legibility wash over whichever frame is showing */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/25 to-transparent z-10 pointer-events-none" />

                    {/* Which panel you are on — the same progress value, as a counter */}
                    <div className="absolute bottom-4 left-4 lg:bottom-8 lg:left-8 z-20 flex items-center gap-2">
                        {content.map((item, index) => (
                            <PanelTick
                                key={item.id}
                                index={index}
                                total={content.length}
                                progress={scrollYProgress}
                            />
                        ))}
                    </div>
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
                                {/* Mobile: each panel carries its own shot, so the picture
                                    still changes with the words without needing a pin. */}
                                <motion.img
                                    src={item.image}
                                    alt={item.title}
                                    initial={{ opacity: 0, scale: 1.04 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    transition={{ duration: 0.7, ease: 'easeOut' }}
                                    viewport={{ once: true, margin: '-15% 0px' }}
                                    className="lg:hidden w-full h-[30vh] object-cover object-top rounded-[12px] mb-7"
                                    loading="lazy"
                                    decoding="async"
                                />

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
