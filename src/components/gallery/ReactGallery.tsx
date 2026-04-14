import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AutoScrollButton from "./AutoScrollButton";
import PhotoCard from "./PhotoCard";
import type { ReactGalleryProps, Photo } from "../../types/photo";

// Simple hash function to generate a stable, pseudo-unique 4-char hex string
function generateFolderId(folderName: string): string {
    let hash = 0;
    for (let i = 0; i < folderName.length; i++) {
        hash = folderName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return (hash & 0xFFFF).toString(16).padStart(4, '0').toUpperCase();
}

// Lazy load the heavy FocusView component
const FocusView = lazy(() => import("./FocusView"));

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

export default function ReactGallery({ groupedPhotos, sortedFolders }: ReactGalleryProps) {
    const [focusedPhoto, setFocusedPhoto] = useState<Photo | null>(null);

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

    return (
        <div className="relative">
            <div className="hidden md:block">
                <AutoScrollButton />
            </div>
            
            {/* The Main Gallery Grid */}
            <div className="space-y-40 pb-32 lg:pb-0">
                {sortedFolders.map((folder, folderIdx) => {
                    const sectionId = folder.toLowerCase().replace(/\s+/g, '-');
                    const isFirstFolder = folderIdx === 0;
                    
                    const folderId = generateFolderId(folder);
                    const photoDates = groupedPhotos[folder]
                        .map(p => p.data.date ? new Date(p.data.date).getTime() : 0)
                        .filter(time => time > 0)
                        .filter(time => !isNaN(time));
                    
                    let timeStr = "";
                    if (photoDates.length > 0) {
                        const minD = new Date(Math.min(...photoDates));
                        const maxD = new Date(Math.max(...photoDates));
                        const minStr = minD.toISOString().split('T')[0];
                        const maxStr = maxD.toISOString().split('T')[0];
                        
                        if (minStr === maxStr) {
                            timeStr = `[ ${minStr} ]`;
                        } else {
                            timeStr = `[ ${minStr} // ${maxStr} ]`;
                        }
                    }

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
                                        [ ID: {folderId} ]
                                    </p>
                                    {timeStr && (
                                        <p className="text-xs text-[#adaaaa] font-mono tracking-widest mt-2 bg-[#0e0e0e]/80 inline-block px-1">
                                            {timeStr}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Masonry Layout */}
                            <div className="columns-1 md:columns-2 lg:columns-3 gap-8">
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

            <AnimatePresence>
                {focusedPhoto && (
                    <Suspense fallback={null}>
                        <FocusView
                            photo={focusedPhoto}
                            onClose={() => {
                                (window as any).haptics?.trigger("light");
                                setFocusedPhoto(null);
                            }}
                        />
                    </Suspense>
                )}
            </AnimatePresence>
        </div>
    );
}
