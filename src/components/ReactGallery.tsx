import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import AutoScrollButton from "./AutoScrollButton";

interface Photo {
    id: string;
    body?: string;
    thumbnailUrl?: string;
    fullUrl?: string;
    data: {
        title?: string;
        date?: string;
        camera?: string;
        lens?: string;
        aperture?: string;
        shutter?: string;
        iso?: string;
        image: {
            src: string;
            width: number;
            height: number;
        };
    };
}

interface ReactGalleryProps {
    groupedPhotos: Record<string, Photo[]>;
    sortedFolders: string[];
}



/**
 * Programmatically generates a 256x256 displacement map acting as a convex
 * lens/bezel. Encodes X distortion to RED and Y distortion to GREEN.
 * 128 is neutral (no bend). 
 */
function generateDisplacementMap(size: number = 256, edgeThickness: number = 120): string {
    if (typeof document === 'undefined') return '';
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const imgData = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const idx = (y * size + x) * 4;

            const dxLeft = x;
            const dxRight = size - x;
            const dyTop = y;
            const dyBottom = size - y;

            let xDistort = 0;
            let yDistort = 0;

            if (dxLeft < edgeThickness) xDistort = 1 - (dxLeft / edgeThickness);
            else if (dxRight < edgeThickness) xDistort = -(1 - (dxRight / edgeThickness));

            if (dyTop < edgeThickness) yDistort = 1 - (dyTop / edgeThickness);
            else if (dyBottom < edgeThickness) yDistort = -(1 - (dyBottom / edgeThickness));

            // smooth curve for optical bevel rather than linear slope
            const curve = (val: number) => Math.sign(val) * Math.pow(Math.abs(val), 1.5);

            xDistort = curve(xDistort);
            yDistort = curve(yDistort);

            imgData.data[idx] = Math.floor(128 + xDistort * 127); // R (X axis)
            imgData.data[idx + 1] = Math.floor(128 + yDistort * 127); // G (Y axis)
            imgData.data[idx + 2] = 128; // B (Ignored by feDisplacementMap usually, 128 is safe)
            imgData.data[idx + 3] = 255; // A
        }
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas.toDataURL('image/png');
}

const itemVariants: any = {
    hidden: { opacity: 0, y: 50 },
    show: {
        opacity: 1,
        y: 0,
        transition: { type: "spring", stiffness: 100, damping: 20 }
    }
};

function PhotoCard({ photo, isFirstFolder, pIdx, setFocusedPhoto }: { photo: Photo, isFirstFolder: boolean, pIdx: number, setFocusedPhoto: (p: Photo) => void }) {
    const ref = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: ref,
        offset: ["start end", "end start"]
    });

    // Subtle vertical shift
    const y = useTransform(scrollYProgress, [0, 1], ["-5%", "5%"]);

    return (
        <motion.div
            ref={ref}
            variants={itemVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-50px" }}
            className="break-inside-avoid relative group cursor-pointer"
            onClick={() => {
                (window as any).haptics?.trigger("medium");
                setFocusedPhoto(photo);
            }}
        >
            <motion.div
                layoutId={`photo-${photo.id}`}
                className="relative bg-black overflow-hidden rounded-2xl"
                whileHover={{ scale: 1.0 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
                <div className="pulsing-placeholder absolute inset-0 bg-[#262626] opacity-40 z-0"></div>
                <motion.img
                    style={{
                        y,
                        scale: 1.1,
                        willChange: "transform",
                        filter: 'url(#liquid-glass-refraction)'
                    }}
                    src={photo.thumbnailUrl || photo.data.image.src}
                    alt={photo.data.title || photo.id}
                    className="w-full h-auto object-cover contrast-[1.15] relative z-10"
                    loading={isFirstFolder && pIdx < 3 ? "eager" : "lazy"}
                    decoding={isFirstFolder && pIdx < 3 ? "auto" : "async"}
                    fetchPriority={isFirstFolder && pIdx < 3 ? "high" : "low"}
                    width={photo.data.image.width}
                    height={photo.data.image.height}
                />
                {/* Liquid Glass Overlay (3D Convex) - Clean & Crisp */}
                <div
                    className="absolute inset-0 rounded-2xl pointer-events-none z-20 transform-gpu"
                    style={{
                        boxShadow: `
                            inset 0 4px 12px rgba(255,255,255,0.2),
                            inset 0 -8px 20px rgba(0,0,0,0.6),
                            inset 0 0 16px rgba(0,0,0,0.3),
                            inset 0 1px 2px rgba(255,255,255,0.7),
                            inset 0 -1px 2px rgba(0,0,0,0.8)
                        `,
                        borderTop: '1px solid rgba(255,255,255,0.4)',
                        borderLeft: '1px solid rgba(255,255,255,0.15)',
                        borderRight: '1px solid rgba(0,0,0,0.4)',
                        borderBottom: '1px solid rgba(0,0,0,0.7)',
                        background: `
                            linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 15%, rgba(255,255,255,0) 85%, rgba(255,255,255,0.05) 100%)
                        `,
                        willChange: 'transform'
                    }}
                />
            </motion.div>
        </motion.div>
    );
}

export default function ReactGallery({ groupedPhotos, sortedFolders }: ReactGalleryProps) {
    const [focusedPhoto, setFocusedPhoto] = useState<Photo | null>(null);
    const [displacementUrl, setDisplacementUrl] = useState<string>('');

    // Generate hardware-accelerated liquid glass map
    useEffect(() => {
        setDisplacementUrl(generateDisplacementMap());
    }, []);

    // Close on escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                (window as any).haptics?.trigger("light");
                setFocusedPhoto(null);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    // Prevent body scroll when focusing
    useEffect(() => {
        if (focusedPhoto) {
            document.body.style.overflow = 'hidden';
            window.dispatchEvent(new CustomEvent('lenis-pause'));
        } else {
            document.body.style.overflow = '';
            window.dispatchEvent(new CustomEvent('lenis-play'));
        }
    }, [focusedPhoto]);


    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    return (
        <div className="relative">
            <AutoScrollButton />
            {/* Liquid Glass Displacement Map Definition */}
            {displacementUrl && (
                <svg style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}>
                    <filter id="liquid-glass-refraction" colorInterpolationFilters="sRGB" filterUnits="objectBoundingBox" primitiveUnits="objectBoundingBox">
                        {/* We use purely 1x1 primitive sizing so SVG maps exactly to any aspect ratio image dynamically */}
                        <feImage
                            href={displacementUrl}
                            result="displacementMap"
                            x="0" y="0" width="1" height="1"
                            preserveAspectRatio="none"
                        />
                        {/* Scale controls the refraction strength */}
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="displacementMap"
                            scale="0.10"
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </svg>
            )}

            {/* The Main Gallery Grid */}
            <div className="space-y-40 pb-32 lg:pb-0">
                {sortedFolders.map((folder, folderIdx) => {
                    const sectionId = folder.toLowerCase().replace(/\s+/g, '-');
                    const isFirstFolder = folderIdx === 0;
                    return (
                        <motion.section
                            key={folder}
                            id={sectionId}
                            className="scroll-mt-32 lg:scroll-mt-24 section-folder"
                            style={{ contentVisibility: 'auto', containIntrinsicSize: '0 800px' }}
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={containerVariants}
                        >
                            <div className="mb-24 flex flex-col md:flex-row justify-between items-start md:items-end w-full">
                                <div className="md:w-1/2">
                                    <h2 className="text-4xl lg:text-7xl font-serif text-[var(--color-on-surface)] font-bold tracking-tight uppercase leading-none">
                                        {folder}
                                    </h2>
                                </div>
                                <div className="text-right hidden sm:block md:w-1/3 flex flex-col items-end pt-4 md:pt-0">
                                    <p className="text-sm text-[var(--color-primary-container)] font-mono uppercase tracking-[0.2em] mb-1 leading-none">
                                        [ ID: {folder.substring(0, 4).toUpperCase()} ]
                                    </p>
                                </div>
                            </div>

                            {/* Staggered Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {groupedPhotos[folder].map((photo, pIdx) => (
                                    <PhotoCard
                                        key={photo.id}
                                        photo={photo}
                                        isFirstFolder={isFirstFolder}
                                        pIdx={pIdx}
                                        setFocusedPhoto={setFocusedPhoto}
                                    />
                                ))}
                            </div>
                        </motion.section>
                    );
                })}
            </div>

            {/* A spacer for the bottom */}
            <AnimatePresence>
                {focusedPhoto && (
                    <FocusView
                        photo={focusedPhoto}
                        onClose={() => {
                            (window as any).haptics?.trigger("light");
                            setFocusedPhoto(null);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function FocusView({ photo, onClose }: { photo: Photo, onClose: () => void }) {

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-[9999] overflow-y-auto drop-shadow-2xl"
            style={{ backgroundColor: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(24px)' }}
            data-lenis-prevent
        >
            <button
                onClick={onClose}
                className="fixed top-6 right-6 lg:top-12 lg:right-12 z-[10000] text-neutral-400 hover:text-white transition-colors"
                aria-label="Close Focus View"
            >
                <WaitXIcon />
            </button>

            {/* Scrollable min-height centering container */}
            <div
                className="min-h-full w-full py-24 lg:py-16 px-4 md:px-20 flex flex-col justify-center"
                onClick={onClose}
            >
                {/* The wrapper for the focus view elements */}
                <div className="w-full h-auto flex flex-col lg:flex-row relative max-w-7xl mx-auto">

                    {/* The Image scaling out of the grid */}
                    <motion.div
                        layoutId={`photo-${photo.id}`}
                        className="relative z-50 flex-shrink-0 w-full lg:w-[60%] flex items-center justify-center lg:items-start lg:p-4"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    >
                        <img
                            src={photo.fullUrl || photo.data.image.src}
                            alt={photo.data.title}
                            className="max-h-[70vh] lg:max-h-[85vh] max-w-full object-contain shadow-2xl rounded-sm"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>

                    {/* The EXIF and Editorial Wrapper */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 0.2 }}
                        className="flex-1 text-white lg:pl-12 flex flex-col justify-start lg:justify-center mt-10 lg:mt-0 relative overflow-visible"
                    >
                        <div className="space-y-6" onClick={(e) => e.stopPropagation()}>
                            <h2 className="text-4xl md:text-5xl font-serif">{photo.data.title || "Untitled"}</h2>

                            <div className="grid grid-cols-2 gap-4 text-xs font-mono tracking-widest text-neutral-400 border-l border-neutral-800 pl-4">
                                {photo.data.camera && <div><span className="text-neutral-600 block mb-1">CAMERA</span>{photo.data.camera}</div>}
                                {photo.data.lens && <div><span className="text-neutral-600 block mb-1">LENS</span>{photo.data.lens}</div>}
                                {photo.data.aperture && <div><span className="text-neutral-600 block mb-1">APERTURE</span>{photo.data.aperture}</div>}
                                {photo.data.shutter && <div><span className="text-neutral-600 block mb-1">SHUTTER</span>{photo.data.shutter}</div>}
                                {photo.data.iso && <div><span className="text-neutral-600 block mb-1">ISO</span>{photo.data.iso}</div>}
                            </div>

                            <div className="text-sm leading-relaxed text-neutral-300 font-sans mt-8 max-w-md relative z-10">
                                {photo.body}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}

function WaitXIcon() {
    return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
    )
}
