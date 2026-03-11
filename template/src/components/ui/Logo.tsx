"use client";

import { motion } from "framer-motion";

interface LogoProps {
  title: string;
  subtitle?: string;
}

export function Logo({ title, subtitle }: LogoProps) {
  return (
    <motion.div
      className="text-center mb-8"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
    >
      <h1 className="font-pixel text-2xl md:text-4xl text-game-primary neon-glow mb-4">
        {title}
      </h1>
      {subtitle && (
        <p className="font-pixel text-xs text-game-accent opacity-80">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
