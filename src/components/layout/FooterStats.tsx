import { useViewerStats } from "../../hooks/useViewerStats";

export default function FooterStats({ totalPhotos, totalCollections }: { totalPhotos: number; totalCollections: number }) {
    const { photosSeen, collectionsSeen } = useViewerStats();

    const photoPct = totalPhotos > 0 ? Math.round((photosSeen / totalPhotos) * 100) : 0;
    const BAR_LEN = 16;
    const filled = Math.round((photoPct / 100) * BAR_LEN);
    const bar = "█".repeat(filled) + "░".repeat(BAR_LEN - filled);

    return (
        <div className="font-mono text-[11px] tracking-widest text-[var(--color-on-surface)] opacity-25 mt-8 mb-6 space-y-1">
            <p>
                [ {bar} ] {photoPct}%
            </p>
            <p>
                {photosSeen} / {totalPhotos} photographs expanded
                &nbsp;&nbsp;//&nbsp;&nbsp;
                {collectionsSeen} / {totalCollections} collections explored
            </p>
        </div>
    );
}
