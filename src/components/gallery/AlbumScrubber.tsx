import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WebHaptics } from "web-haptics";

interface AlbumScrubberProps {
    sortedFolders: string[];
}

export default function AlbumScrubber({ sortedFolders }: AlbumScrubberProps) {
    const [activeSection, setActiveSection] = useState<string>("");
    const [isHovered, setIsHovered] = useState(false);
    const [isInteracting, setIsInteracting] = useState(false);
    const [scrollProgress, setScrollProgress] = useState(0);
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const [tooltipOpacity, setTooltipOpacity] = useState(1);
    // State (not ref) so flipping it triggers a re-render and hides the tooltip
    const [hasDiscovered, setHasDiscovered] = useState(false);
    // Cached absolute top of the first album section — populated after layout
    const firstSectionTopRef = useRef<number | null>(null);

    const haptics = useRef<WebHaptics | null>(null);
    const isAutoScrollingRef = useRef(false);
    const autoScrollRequestRef = useRef<number | null>(null);

    useEffect(() => {
        haptics.current = new WebHaptics();
    }, []);

    // Cache the first section's absolute top after layout settles.
    // offsetTop is unreliable with contentVisibility:auto — use scrollY + getBCR instead.
    useEffect(() => {
        const measure = () => {
            const firstSection = document.querySelector('.section-folder') as HTMLElement | null;
            if (firstSection) {
                firstSectionTopRef.current = window.scrollY + firstSection.getBoundingClientRect().top;
            }
        };
        // Two attempts: one on next frame, one after fonts/images may have shifted layout
        requestAnimationFrame(measure);
        const t = setTimeout(measure, 600);
        window.addEventListener('resize', measure, { passive: true });
        return () => {
            clearTimeout(t);
            window.removeEventListener('resize', measure);
        };
    }, []);

    // Keep ref in sync with state
    useEffect(() => {
        isAutoScrollingRef.current = isAutoScrolling;
    }, [isAutoScrolling]);

    const stopAutoScroll = useCallback(() => {
        if (autoScrollRequestRef.current) {
            cancelAnimationFrame(autoScrollRequestRef.current);
            autoScrollRequestRef.current = null;
        }
        isAutoScrollingRef.current = false;
        setIsAutoScrolling(false);
    }, []);

    const scrollLoop = useCallback(() => {
        window.scrollBy({ top: 1.2, left: 0 });
        autoScrollRequestRef.current = requestAnimationFrame(scrollLoop);
    }, []);

    const toggleAutoScroll = () => {
        if (isAutoScrollingRef.current) {
            stopAutoScroll();
            haptics.current?.trigger("light");
        } else {
            isAutoScrollingRef.current = true;
            setIsAutoScrolling(true);
            autoScrollRequestRef.current = requestAnimationFrame(scrollLoop);
            haptics.current?.trigger("medium");
        }
    };

    useEffect(() => {
        const stopOnManualScroll = () => {
            if (isAutoScrollingRef.current) stopAutoScroll();
        };
        window.addEventListener('wheel', stopOnManualScroll, { passive: true });
        window.addEventListener('touchmove', stopOnManualScroll, { passive: true });
        return () => {
            window.removeEventListener('wheel', stopOnManualScroll);
            window.removeEventListener('touchmove', stopOnManualScroll);
            if (autoScrollRequestRef.current) cancelAnimationFrame(autoScrollRequestRef.current);
        };
    }, [stopAutoScroll]);

    useEffect(() => {
        const handleScroll = () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            if (totalHeight <= 0) return;
            setScrollProgress(window.scrollY / totalHeight);

            // Active section tracking
            const triggerY = window.innerHeight * 0.3;
            let closestId = "";
            let closestDist = Infinity;
            for (const folder of sortedFolders) {
                const id = folder.toLowerCase().replace(/\s+/g, '-');
                const el = document.getElementById(id);
                if (!el) continue;
                const dist = Math.abs(el.getBoundingClientRect().top - triggerY);
                if (dist < closestDist) { closestDist = dist; closestId = id; }
            }
            if (closestId) setActiveSection(closestId);

            // Tooltip fade
            const sectionTop = firstSectionTopRef.current;
            if (sectionTop !== null && sectionTop > 0) {
                const fadeStart = sectionTop * 0.05;
                const fadeEnd   = sectionTop * 0.25;
                const raw = 1 - (window.scrollY - fadeStart) / (fadeEnd - fadeStart);
                setTooltipOpacity(Math.min(1, Math.max(0, raw)));
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, [sortedFolders]);

    const discover = () => {
        if (!hasDiscovered) {
            setHasDiscovered(true);
            setTooltipOpacity(0);
        }
    };

    const scrollToSection = (folder: string) => {
        const id = folder.toLowerCase().replace(/\s+/g, '-');
        const el = document.getElementById(id);
        if (el) {
            haptics.current?.trigger("medium");
            const lenis = (window as any).lenis;
            if (lenis) {
                lenis.scrollTo(el, { immediate: false, duration: 1.2, easing: (t: number) => 1 - Math.pow(1 - t, 4) });
            } else {
                el.scrollIntoView({ behavior: 'smooth' });
            }
            setIsInteracting(false);
        }
    };

    const isOpen = isHovered || isInteracting;
    const showTooltip = !hasDiscovered && !isOpen && tooltipOpacity > 0;

    return (
        <>
            {/* Tooltip — rendered in its own fixed layer, completely outside the
                zero-width scrubber container so it actually has room to appear */}
            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        key="scrubber-tooltip"
                        className="fixed z-[99] pointer-events-none select-none"
                        style={{
                            opacity: tooltipOpacity,
                            right: '1.25rem',
                            top: '50%',
                            transform: 'translateY(-50%)',
                        }}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: tooltipOpacity, x: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.4 }}
                    >
                        <div className="hidden md:flex items-center gap-2 text-[11px] font-mono tracking-widest text-[var(--color-on-surface)] opacity-30">
                            navigate albums →
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Scrubber container */}
            <div
                className="fixed right-0 top-0 h-full z-[100] flex items-center"
                onMouseEnter={() => { discover(); setIsHovered(true); }}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Radial frosted glass overlay */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            key="scrubber-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className="fixed inset-0 pointer-events-none"
                            style={{
                                zIndex: -1,
                                background: 'radial-gradient(ellipse 60% 100% at 100% 50%, rgba(14,14,14,0.95) 0%, rgba(14,14,14,0.55) 45%, transparent 100%)',
                                backdropFilter: 'blur(14px)',
                                WebkitBackdropFilter: 'blur(14px)',
                                WebkitMaskImage: 'linear-gradient(to left, black 0%, black 30%, transparent 75%)',
                                maskImage: 'linear-gradient(to left, black 0%, black 30%, transparent 75%)',
                            }}
                        />
                    )}
                </AnimatePresence>

                {/* Tap-outside-to-close for mobile */}
                {isInteracting && (
                    <div
                        className="fixed inset-0"
                        style={{ zIndex: -1 }}
                        onTouchStart={() => setIsInteracting(false)}
                        onClick={() => setIsInteracting(false)}
                    />
                )}

                {/* The Rail */}
                <div className={`absolute right-0 top-1/2 -translate-y-1/2 h-[70vh] w-[2px] bg-[var(--color-outline-variant)] transition-all duration-700 ${isOpen ? 'opacity-100 scale-y-100' : 'opacity-40 scale-y-90'}`}>
                    <motion.div
                        className="absolute left-1/2 -translate-x-1/2 w-4 h-[2px] bg-[var(--color-primary-container)] shadow-[0_0_20px_rgba(207,252,0,0.8)]"
                        animate={{ top: `${scrollProgress * 100}%` }}
                        transition={{ type: "spring", stiffness: 400, damping: 40 }}
                    />
                    {sortedFolders.map((_, i) => (
                        <div
                            key={i}
                            className="absolute left-1/2 -translate-x-1/2 w-2 h-[1px] bg-[var(--color-outline)] opacity-30"
                            style={{ top: `${(i / (sortedFolders.length - 1)) * 100}%` }}
                        />
                    ))}
                </div>

                {/* Labels panel */}
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            key="scrubber-panel"
                            initial={{ x: 30, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 30, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="mr-6 lg:mr-10 flex flex-col items-end py-8 overflow-y-auto max-h-screen no-scrollbar"
                        >
                            {/* Auto-scroll control */}
                            <button
                                onClick={toggleAutoScroll}
                                className={`mb-10 flex items-center gap-4 cursor-pointer outline-none group/auto transition-all duration-300 ${
                                    isAutoScrolling
                                        ? 'text-[var(--color-primary-container)]'
                                        : 'text-[var(--color-on-surface-variant)] opacity-60 hover:opacity-100'
                                }`}
                            >
                                <span className="font-mono text-[9px] tracking-[0.4em] uppercase">
                                    {isAutoScrolling ? '[ AUTO_SCROLL: ON ]' : 'AUTO_SCROLL'}
                                </span>
                                <div className={`w-8 h-8 flex items-center justify-center border transition-all duration-300 ${
                                    isAutoScrolling
                                        ? 'bg-[var(--color-primary-container)] border-[var(--color-primary-container)] text-black'
                                        : 'border-[var(--color-outline)] group-hover/auto:border-white text-white'
                                }`}>
                                    {isAutoScrolling ? (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                            <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
                                        </svg>
                                    ) : (
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                            <polygon points="5 3 19 12 5 21 5 3" />
                                        </svg>
                                    )}
                                </div>
                            </button>

                            {/* Album list */}
                            <div className="flex flex-col items-end space-y-8">
                                {sortedFolders.map((folder, idx) => {
                                    const id = folder.toLowerCase().replace(/\s+/g, '-');
                                    const isActive = id === activeSection;
                                    return (
                                        <button
                                            key={folder}
                                            onClick={() => scrollToSection(folder)}
                                            className="flex items-center group/item cursor-pointer outline-none text-right"
                                        >
                                            <div className="flex flex-col items-end mr-6">
                                                <span className={`font-mono text-[10px] tracking-[0.4em] mb-1.5 transition-all duration-300 ${
                                                    isActive ? 'text-[var(--color-primary-container)]' : 'text-[var(--color-on-surface-variant)] opacity-40'
                                                }`}>
                                                    {`SEC_${(idx + 1).toString().padStart(2, '0')}`}
                                                </span>
                                                <span className={`font-heading text-lg font-medium leading-none uppercase tracking-widest transition-all duration-300 ${
                                                    isActive ? 'text-[#f4ffc8]' : 'text-white opacity-60 group-hover/item:opacity-100 translate-x-2 group-hover/item:translate-x-0'
                                                }`}>
                                                    {folder}
                                                </span>
                                            </div>
                                            <div className={`w-[4px] h-6 transition-all duration-500 ${
                                                isActive
                                                    ? 'bg-[var(--color-primary-container)] shadow-[0_0_10px_rgba(207,252,0,0.3)]'
                                                    : 'bg-white/10 group-hover/item:bg-white/40'
                                            }`} />
                                        </button>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Touch hitbox */}
                <div
                    className="absolute right-0 top-0 w-10 h-full cursor-crosshair"
                    onTouchStart={(e) => {
                        e.stopPropagation();
                        discover();
                        haptics.current?.trigger("medium");
                        setIsInteracting(true);
                    }}
                />
            </div>
        </>
    );
}
