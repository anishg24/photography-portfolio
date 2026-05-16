import { useState, useEffect } from "react";

export type ViewerStats = {
    photosSeen: number;
    collectionsSeen: number;
};

const STORAGE_KEY = "viewer-stats-v1";

function loadStats(): { photos: Set<string>; collections: Set<string> } {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { photos: new Set(), collections: new Set() };
        const parsed = JSON.parse(raw);
        return {
            photos: new Set<string>(parsed.photos ?? []),
            collections: new Set<string>(parsed.collections ?? []),
        };
    } catch {
        return { photos: new Set(), collections: new Set() };
    }
}

function saveStats(photos: Set<string>, collections: Set<string>) {
    try {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                photos: Array.from(photos),
                collections: Array.from(collections),
            })
        );
    } catch {}
}

export function recordView(photoId: string, collection: string) {
    const { photos, collections } = loadStats();
    photos.add(photoId);
    collections.add(collection);
    saveStats(photos, collections);
    // Broadcast so any mounted listener updates immediately
    window.dispatchEvent(new CustomEvent("viewer-stats-updated"));
}

export function useViewerStats(): ViewerStats {
    const [stats, setStats] = useState<ViewerStats>({ photosSeen: 0, collectionsSeen: 0 });

    const refresh = () => {
        const { photos, collections } = loadStats();
        setStats({ photosSeen: photos.size, collectionsSeen: collections.size });
    };

    useEffect(() => {
        refresh();
        window.addEventListener("viewer-stats-updated", refresh);
        return () => window.removeEventListener("viewer-stats-updated", refresh);
    }, []);

    return stats;
}
