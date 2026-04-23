import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform, useSpring, animate, useMotionValue } from "framer-motion";
import type { Photo } from "../../types/photo";

interface PhotoCardProps {
    photo: Photo;
    isFirstFolder: boolean;
    pIdx: number;
    setFocusedPhoto: (p: Photo) => void;
}

const itemVariants: any = {
    hidden: { opacity: 0, y: 50 },
    show: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 100, damping: 20 }
    }
};

const PhotoCard = React.memo(({ photo, isFirstFolder, pIdx, setFocusedPhoto }: PhotoCardProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const imgRef = useRef<HTMLImageElement>(null);
    const [phase, setPhase] = useState<"loading" | "revealing" | "done">("loading");
    const isLoadedRef = useRef(false);

    const progress = useMotionValue(0);
    const lineTop = useTransform(progress, p => `${p}%`);
    const imgClipPath = useTransform(progress, p => `inset(0 0 ${100 - p}% 0)`);

    useEffect(() => {
        let isCancelled = false;
        let controls: any;

        const scan = async () => {
            if (!isLoadedRef.current) {
                while (!isLoadedRef.current && !isCancelled) {
                    controls = animate(progress, 100, { duration: 1.5, ease: "linear" });
                    await controls;
                    if (isLoadedRef.current || isCancelled) break;
                    controls = animate(progress, 0, { duration: 1.5, ease: "linear" });
                    await controls;
                }
            }
            if (isCancelled) return;
            
            if (progress.get() > 0) {
                controls = animate(progress, 0, { duration: 0.8 * (progress.get() / 100), ease: "linear" });
                await controls;
            }
            if (isCancelled) return;
            
            setPhase("revealing");
            controls = animate(progress, 100, { duration: 1.2, ease: "easeInOut" });
            await controls;
            if (isCancelled) return;
            
            setPhase("done");
        };
        
        scan();

        return () => {
            isCancelled = true;
            controls?.stop?.();
        };
    }, [progress]);

    const handleImgLoad = () => {
        isLoadedRef.current = true;
    };

    useEffect(() => {
        if (imgRef.current?.complete) {
            handleImgLoad();
        }
    }, []);

    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"]
    });

    // Smooth the scroll progress to avoid jitter during rapid scrolling
    const smoothProgress = useSpring(scrollYProgress, { stiffness: 400, damping: 90 });

    // Pronounced vertical parallax shift
    const y = useTransform(smoothProgress, [0, 1], ["-10%", "10%"]);

    // Generate unique noise ID once
    const filterId = useRef(`placeholder-noise-${photo.id.replace(/[^a-zA-Z0-9]/g, '-')}`).current;

    return (
        <motion.div
            ref={ref}
            variants={itemVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="break-inside-avoid relative group cursor-pointer mb-8"
            onClick={() => {
                (window as any).haptics?.trigger("medium");
                setFocusedPhoto(photo);
            }}
        >
            <motion.div
                layoutId={`photo-${photo.id}`}
                className="relative bg-[var(--color-surface)] overflow-hidden"
                whileHover={{ scale: 1.0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
                <motion.div
                    style={{
                        clipPath: phase === "done" ? "none" : imgClipPath,
                        opacity: phase === "loading" ? 0 : 1, // Only visible during revealing and done
                    }}
                    className="relative z-10"
                >
                    <motion.img
                        ref={imgRef}
                        style={{
                            y,
                            scale: 1.25,
                            willChange: "transform",
                        }}
                        onLoad={handleImgLoad}
                        src={photo.thumbnailUrl || photo.data.image.src}
                        alt={photo.data.title || photo.id}
                        className="w-full h-auto object-cover contrast-[1.15]"
                        loading={isFirstFolder && pIdx < 3 ? "eager" : "lazy"}
                        decoding={isFirstFolder && pIdx < 3 ? "auto" : "async"}
                        fetchPriority={isFirstFolder && pIdx < 3 ? "high" : "low"}
                        width={photo.data.image.width}
                        height={photo.data.image.height}
                    />
                </motion.div>

                <AnimatePresence>
                    {phase !== "done" && (
                        <motion.div 
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.6 }}
                            className="absolute inset-0 z-20 pointer-events-none"
                        >
                            <div className="absolute inset-0 border border-white/5 pointer-events-none"></div>

                            {/* Option 5: SVG Noise */}
                            {phase === "loading" && (
                                <svg className="absolute inset-0 w-full h-full opacity-20 mix-blend-overlay pointer-events-none">
                                    <filter id={filterId}>
                                        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/>
                                    </filter>
                                    <rect width="100%" height="100%" filter={`url(#${filterId})`}/>
                                </svg>
                            )}

                            {/* Scanner Line */}
                            <motion.div 
                                style={{ top: lineTop }}
                                className="absolute left-0 right-0 h-[1px] bg-[#cffc00] shadow-[0_0_10px_#cffc00] opacity-50 z-30"
                            />

                            {/* Ticker and EXIF */}
                            {phase === "loading" && (
                                <div className="absolute inset-x-0 bottom-0 p-6 flex flex-col items-start z-10" style={{ background: 'linear-gradient(to top, rgba(14,14,14,0.95), transparent)' }}>
                                    {photo.data.iso && <div className="text-[#adaaaa] text-[9px] font-mono uppercase tracking-[0.1em] mb-1">ISO {photo.data.iso}</div>}
                                    {photo.data.aperture && <div className="text-[#adaaaa] text-[9px] font-mono uppercase tracking-[0.1em] mb-1">F/{photo.data.aperture.replace('f/', '')}</div>}
                                    {photo.data.shutter && <div className="text-[#adaaaa] text-[9px] font-mono uppercase tracking-[0.1em] mb-1">{photo.data.shutter}S</div>}
                                    <DataTicker />
                                </div>
                            )}

                            {/* Tactical Corners */}
                            {phase === "loading" && (
                                <>
                                    <div className="absolute top-4 left-4 w-4 h-4 border-t border-l border-[#cffc00] opacity-70"></div>
                                    <div className="absolute bottom-4 right-4 w-4 h-4 border-b border-r border-[#cffc00] opacity-70"></div>
                                    <div className="absolute top-4 right-4 text-[#cffc00] text-[8px] font-mono tracking-widest uppercase">
                                        [ AWAITING VISUAL DATA ]
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </motion.div>
    );
});

PhotoCard.displayName = "PhotoCard";

function DataTicker() {
    const [hex, setHex] = useState("0x00000000");
    useEffect(() => {
        const interval = setInterval(() => {
            setHex("0x" + Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0').toUpperCase());
        }, 75);
        return () => clearInterval(interval);
    }, []);
    return <div className="text-[#cffc00] text-[10px] font-mono tracking-widest mt-2 bg-[var(--color-surface)]/80 inline-block px-1">[{hex}]</div>
}

export default PhotoCard;
