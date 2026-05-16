import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function AlbumAbout({ html }: { html: string }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="flex flex-col items-start mt-4">
            <button
                onClick={() => {
                    (window as any).haptics?.trigger("light");
                    setIsOpen(!isOpen);
                }}
                className="text-[11px] font-mono tracking-widest text-[var(--color-on-surface)] opacity-30 hover:opacity-70 transition-opacity flex items-center gap-2 cursor-pointer bg-transparent"
            >
                <span className={`transition-transform duration-300 inline-block ${isOpen ? "-scale-y-100" : ""}`}>↓</span>
                about this album
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                    >
                        <div
                            className="pt-3 text-sm text-[var(--color-on-surface-variant)] opacity-60 max-w-sm leading-relaxed font-sans"
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
