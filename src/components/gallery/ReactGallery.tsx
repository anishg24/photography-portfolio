import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PhotoCard from "./PhotoCard";
import AlbumAbout from "./AlbumAbout";
import AlbumScrubber from "./AlbumScrubber";
import type { ReactGalleryProps, Photo } from "../../types/photo";
import { recordView } from "../../hooks/useViewerStats";
import { buildPhotoHashMap, resolveHash, slugify as toSlug } from "../../hooks/usePhotoHash";

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

export default function ReactGallery({ groupedPhotos, sortedFolders, albumHtml }: ReactGalleryProps) {
    const [focusedPhoto, setFocusedPhoto] = useState<Photo | null>(null);

    // Flat ordered list mirroring the display order for prev/next navigation
    const allPhotos: Photo[] = sortedFolders.flatMap(folder => groupedPhotos[folder]);

    // Stable photo -> hash map, built once
    const photoHashMap = buildPhotoHashMap(groupedPhotos, sortedFolders);

    // ── URL hash helpers ──────────────────────────────────────────────────────
    const openPhoto = (photo: Photo, folder: string) => {
        recordView(photo.id, folder);
        setFocusedPhoto(photo);
        const hash = photoHashMap.get(photo.id);
        if (hash) history.replaceState(null, "", `#${hash}`);
    };

    const closePhoto = () => {
        setFocusedPhoto(prev => {
            if (prev) {
                // Restore section hash so the user knows where they are
                const folder = sortedFolders.find(f =>
                    groupedPhotos[f].some(p => p.id === prev.id)
                );
                if (folder) history.replaceState(null, "", `#${toSlug(folder)}`);
                else history.replaceState(null, "", window.location.pathname);
            }
            return null;
        });
    };

    // ── On mount: resolve the initial hash ───────────────────────────────────
    useEffect(() => {
        const hash = window.location.hash.slice(1); // strip leading #
        if (!hash) return;

        // Try photo hash first (e.g. "tahoe-3")
        const resolved = resolveHash(hash, groupedPhotos, sortedFolders);
        if (resolved) {
            // Small delay so the page has painted before opening FocusView
            setTimeout(() => {
                const sectionEl = document.getElementById(toSlug(resolved.folder));
                sectionEl?.scrollIntoView({ behavior: "instant" });
                openPhoto(resolved.photo, resolved.folder);
            }, 100);
            return;
        }

        // Fall back to section hash (e.g. "tahoe")
        const sectionEl = document.getElementById(hash);
        if (sectionEl) {
            setTimeout(() => sectionEl.scrollIntoView({ behavior: "smooth" }), 100);
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Close on Escape ──────────────────────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                (window as any).haptics?.trigger("light");
                closePhoto();
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
            <AlbumScrubber sortedFolders={sortedFolders} />
            
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
                            className="scroll-mt-32 lg:scroll-mt-24 section-folder relative"
                            initial="hidden"
                            whileInView="show"
                            viewport={{ once: true, margin: "-100px" }}
                            variants={containerVariants}
                        >
                            {/* Vertical Section Marker */}
                            <div className="absolute -left-4 lg:-left-20 top-0 h-full pointer-events-none hidden sm:flex items-start pt-2 select-none overflow-hidden">
                                <span className="[writing-mode:vertical-lr] rotate-180 text-8xl lg:text-[12rem] font-mono font-black tracking-tighter text-[var(--color-on-surface)] opacity-[0.03] leading-none">
                                    {`//SEC_${(folderIdx + 1).toString().padStart(2, '0')}`}
                                </span>
                            </div>

                            <div className="mb-24 flex flex-col md:flex-row justify-between items-start md:items-end w-full relative z-10">
                                <div className="md:w-1/2">
                                    <h2 className="text-4xl lg:text-7xl font-serif text-[var(--color-on-surface)] font-bold tracking-tight uppercase leading-none">
                                        {folder}
                                    </h2>
                                    {albumHtml && albumHtml[toSlug(folder)] && (
                                        <AlbumAbout html={albumHtml[toSlug(folder)]} />
                                    )}
                                </div>
                                <div className="text-right hidden sm:flex md:w-1/3 flex-col items-end pt-4 md:pt-0">
                                    <p className="text-sm text-[var(--color-primary-container)] font-pixel font-bold uppercase tracking-[0.2em] mb-1 leading-none">
                                        [ ID: {folderId} ]
                                    </p>
                                    {timeStr && (
                                        <p className="text-xs text-[#adaaaa] font-mono tracking-widest mt-2 bg-[var(--color-surface)]/80 inline-block px-1">
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
                                        setFocusedPhoto={(p) => openPhoto(p, folder)}
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
                                closePhoto();
                            }}
                            onPrev={() => {
                                const idx = allPhotos.findIndex(p => p.id === focusedPhoto.id);
                                if (idx > 0) {
                                    (window as any).haptics?.trigger("light");
                                    const prev = allPhotos[idx - 1];
                                    const folder = sortedFolders.find(f => groupedPhotos[f].some(p => p.id === prev.id)) ?? "";
                                    openPhoto(prev, folder);
                                }
                            }}
                            onNext={() => {
                                const idx = allPhotos.findIndex(p => p.id === focusedPhoto.id);
                                if (idx < allPhotos.length - 1) {
                                    (window as any).haptics?.trigger("light");
                                    const next = allPhotos[idx + 1];
                                    const folder = sortedFolders.find(f => groupedPhotos[f].some(p => p.id === next.id)) ?? "";
                                    openPhoto(next, folder);
                                }
                            }}
                            hasPrev={allPhotos.findIndex(p => p.id === focusedPhoto.id) > 0}
                            hasNext={allPhotos.findIndex(p => p.id === focusedPhoto.id) < allPhotos.length - 1}
                        />
                    </Suspense>
                )}
            </AnimatePresence>
        </div>
    );
}
