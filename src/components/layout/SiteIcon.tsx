import React from "react";
import { motion } from "framer-motion";

export default function SiteIcon({ className = "w-10 h-10 md:w-12 md:h-12" }: { className?: string }) {
  return (
    <motion.div 
      className={`relative ${className}`}
      initial="initial"
      animate="animate"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background - Matched to Surface Container High for tactical depth */}
        <rect width="24" height="24" rx="4" fill="var(--color-surface-container-high)" />
        
        {/* Outer Highlight Ring (The "Eyelid" blink effect) */}
        <motion.circle
          cx="12"
          cy="12"
          r="7"
          stroke="var(--color-primary-container)"
          strokeWidth="1.5"
          variants={{
            initial: { scaleY: 0, opacity: 0 },
            animate: { 
              scaleY: [0, 1.1, 1], 
              opacity: 1,
              transition: { duration: 0.4, ease: "easeOut" }
            }
          }}
        />

        {/* Breathing Inner Lens */}
        <motion.circle
          cx="12"
          cy="12"
          r="3.5"
          fill="white"
          variants={{
            initial: { scale: 0 },
            animate: { 
              scale: [0, 1],
              transition: { delay: 0.2, duration: 0.3 }
            }
          }}
        />
        
        {/* The Breathing Aura (Radial pulse) */}
        <motion.circle
          cx="12"
          cy="12"
          r="3.5"
          fill="white"
          animate={{
            scale: [1, 1.8],
            opacity: [0.3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
            delay: 1
          }}
        />

        {/* Tactical Status Light */}
        <rect
          x="18"
          y="4"
          width="2"
          height="2"
          rx="1"
          fill="var(--color-on-surface-variant)"
        />
      </svg>
    </motion.div>
  );
}
