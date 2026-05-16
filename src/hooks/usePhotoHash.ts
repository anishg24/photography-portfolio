import type { Photo } from "../types/photo";

/**
 * Sort photos within a folder the same way ReactGallery does:
 * by date descending, photos without dates fall to the end sorted by id.
 */
function sortedPhotos(photos: Photo[]): Photo[] {
    return [...photos].sort((a, b) => {
        const da = a.data.date ? new Date(a.data.date).getTime() : 0;
        const db = b.data.date ? new Date(b.data.date).getTime() : 0;
        if (da !== db) return db - da;
        return a.id.localeCompare(b.id);
    });
}

/** e.g. "San Diego Zoo" -> "san-diego-zoo" */
export function slugify(name: string): string {
    return name.toLowerCase().replace(/\s+/g, "-");
}

/**
 * Build a map from every photo's internal id -> its stable URL hash.
 * e.g. "Tahoe/photo_1777013057379_203" -> "tahoe-3"
 */
export function buildPhotoHashMap(
    groupedPhotos: Record<string, Photo[]>,
    sortedFolders: string[]
): Map<string, string> {
    const map = new Map<string, string>();
    for (const folder of sortedFolders) {
        const slug = slugify(folder);
        const ordered = sortedPhotos(groupedPhotos[folder]);
        ordered.forEach((photo, idx) => {
            map.set(photo.id, `${slug}-${idx + 1}`);
        });
    }
    return map;
}

/**
 * Given a URL hash (without the #), return the matching photo and its folder,
 * or null if the hash is a section link or unrecognised.
 */
export function resolveHash(
    hash: string,
    groupedPhotos: Record<string, Photo[]>,
    sortedFolders: string[]
): { photo: Photo; folder: string } | null {
    const hashMap = buildPhotoHashMap(groupedPhotos, sortedFolders);
    for (const [photoId, photoHash] of hashMap) {
        if (photoHash === hash) {
            const folder = sortedFolders.find(f =>
                groupedPhotos[f].some(p => p.id === photoId)
            );
            if (!folder) return null;
            const photo = groupedPhotos[folder].find(p => p.id === photoId)!;
            return { photo, folder };
        }
    }
    return null;
}
