import { motion } from "framer-motion";
import type { Photo } from "../../types/photo";
import WaitXIcon from "../icons/WaitXIcon";

interface FocusViewProps {
    photo: Photo;
    onClose: () => void;
}

export default function FocusView({ photo, onClose }: FocusViewProps) {
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
