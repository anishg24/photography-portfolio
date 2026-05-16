export type Photo = {
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

export type ReactGalleryProps = {
    groupedPhotos: Record<string, Photo[]>;
    sortedFolders: string[];
    // Dictionary mapping folder name to raw markdown/HTML string (if we pass rendered HTML)
    albumHtml?: Record<string, string>;
}
