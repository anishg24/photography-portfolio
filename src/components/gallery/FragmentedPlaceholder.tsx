export default function FragmentedPlaceholder({ naturalWidth, naturalHeight }: { naturalWidth: number, naturalHeight: number }) {
    // Assume worst-case card width of 800px on modern screens before column break
    const MAX_CARD_WIDTH = 800;
    const SQUARE_SIZE = 64;
    
    // Calculate required rows/cols to cover the card area
    const cols = Math.ceil(MAX_CARD_WIDTH / SQUARE_SIZE) + 1; 
    const aspect = naturalHeight / naturalWidth;
    const rows = Math.ceil((MAX_CARD_WIDTH * aspect) / SQUARE_SIZE) + 1;
    
    // Cap total blocks to prevent massive DOM footprint if aspect ratio is extreme
    const totalBlocks = Math.min(cols * rows, 300);

    return (
        <div className="absolute inset-0 z-0 bg-[#0e0e0e] overflow-hidden">
            <style>{`
                @keyframes decryptFlicker {
                    0% { opacity: 0.1; }
                    33% { opacity: 0.8; }
                    66% { opacity: 0.2; }
                    100% { opacity: 1; }
                }
            `}</style>
            <div 
                className="grid gap-[2px] p-[2px] w-[150%] h-[150%]" 
                style={{ 
                    gridTemplateColumns: `repeat(auto-fill, ${SQUARE_SIZE}px)`,
                    gridAutoRows: `${SQUARE_SIZE}px`,
                }}
            >
                {Array.from({ length: totalBlocks }).map((_, i) => {
                    const pseudoRandom1 = ((i * 13) % 10) / 10;
                    const pseudoRandom2 = ((i * 17) % 10) / 10;
                    const duration = pseudoRandom2 * 2 + 0.5;
                    const delay = pseudoRandom1 * -2;
                    return (
                        <div
                            key={i}
                            className="bg-[#201f1f] w-full h-full"
                            style={{
                                animation: `decryptFlicker ${duration}s infinite alternate step-end`,
                                animationDelay: `${delay}s`
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
}
