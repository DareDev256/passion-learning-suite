"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  className?: string;
}

const variants = {
  primary: "bg-game-primary text-game-black hover:bg-game-primary/90",
  secondary: "bg-game-dark text-game-primary border-2 border-game-primary hover:bg-game-primary/10",
  ghost: "text-game-accent hover:text-game-primary",
};

export function Button({
  children,
  onClick,
  href,
  variant = "primary",
  disabled = false,
  className = "",
}: ButtonProps) {
  const base = `btn-retro px-6 py-3 text-xs md:text-sm font-pixel inline-block ${variants[variant]} ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"} ${className}`;

  if (href) {
    return (
      <motion.a
        href={href}
        className={base}
        whileHover={disabled ? {} : { scale: 1.05 }}
        whileTap={disabled ? {} : { scale: 0.95 }}
      >
        {children}
      </motion.a>
    );
  }

  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      className={base}
      whileHover={disabled ? {} : { scale: 1.05 }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      disabled={disabled}
    >
      {children}
    </motion.button>
  );
}
