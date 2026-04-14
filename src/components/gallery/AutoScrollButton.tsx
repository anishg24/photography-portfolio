import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";

export default function AutoScrollButton() {
    const [isAutoScrolling, setIsAutoScrolling] = useState(false);
    const requestRef = useRef<number | null>(null);

    const scrollLoop = () => {
        window.scrollBy({ top: 1.5, left: 0 }); // Fine-tuned speed
        requestRef.current = requestAnimationFrame(scrollLoop);
    };

    const toggleScroll = () => {
        if (isAutoScrolling) {
            setIsAutoScrolling(false);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            requestRef.current = null;
            (window as any).haptics?.trigger("light");
        } else {
            setIsAutoScrolling(true);
            requestRef.current = requestAnimationFrame(scrollLoop);
            (window as any).haptics?.trigger("medium");
        }
    };

    // Clean up
    useEffect(() => {
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // Stop auto-scroll on manual scroll gestures
    useEffect(() => {
        const stopScroll = (e: Event) => {
            // Only stop if they actually scroll via wheel or touch move
            if (isAutoScrolling) {
                setIsAutoScrolling(false);
                if (requestRef.current) cancelAnimationFrame(requestRef.current);
                requestRef.current = null;
            }
        };

        window.addEventListener('wheel', stopScroll, { passive: true });
        window.addEventListener('touchmove', stopScroll, { passive: true });

        return () => {
            window.removeEventListener('wheel', stopScroll);
            window.removeEventListener('touchmove', stopScroll);
        };
    }, [isAutoScrolling]);

    return (
        <motion.button 
            onClick={toggleScroll}
            className={`fixed bottom-6 right-6 lg:bottom-12 lg:right-12 z-50 flex items-center justify-center space-x-2 rounded-full px-5 py-3 transition-all duration-300 border md:min-w-[160px] ${
                isAutoScrolling 
                    ? "bg-[var(--color-primary-container)] text-black border-[var(--color-primary-container)] shadow-[0_0_20px_rgba(207,252,0,0.4)]" 
                    : "bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)] border-[var(--color-outline-variant)] shadow-lg hover:border-[var(--color-primary)]"
            } group`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
                opacity: 1, 
                y: 0,
                scale: isAutoScrolling ? [1, 1.02, 1] : 1
            }}
            transition={{
                scale: isAutoScrolling ? { repeat: Infinity, duration: 2 } : { duration: 0.2 }
            }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label={isAutoScrolling ? "Stop Auto Scroll" : "Start Auto Scroll"}
        >
            {isAutoScrolling ? (
                <>
                    <PauseIcon />
                    <span className="font-mono text-xs font-semibold tracking-widest uppercase hidden md:inline-block">Stop</span>
                </>
            ) : (
                <>
                    <PlayIcon />
                    <span className="font-mono text-xs font-semibold tracking-widest uppercase hidden md:inline-block">Auto Scroll</span>
                </>
            )}
        </motion.button>
    );
}

function PlayIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
        </svg>
    )
}

function PauseIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
        </svg>
    )
}
