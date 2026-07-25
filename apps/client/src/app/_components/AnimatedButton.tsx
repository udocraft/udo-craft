"use client";

import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

export function AnimBtn({
  href,
  children,
  variant = "primary",
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "outline" | "ghost";
  className?: string;
}) {
  const base =
    "group inline-flex items-center gap-2 font-semibold text-sm px-7 py-3.5 rounded-full transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  const styles = {
    primary:
      "bg-primary text-white hover:bg-primary/90 shadow-lg hover:shadow-xl hover:shadow-primary/20",
    outline:
      "border border-foreground/20 text-foreground hover:border-foreground/60 hover:bg-foreground/5",
    ghost: "border border-white/25 text-white hover:bg-white/10 hover:border-white/50",
  };
  return (
    <Link href={href} className={`${base} ${styles[variant]} ${className}`}>
      <span>{children}</span>
      <motion.span
        className="flex items-center"
        initial={{ x: 0 }}
        whileHover={{ x: 4 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <ArrowRight className="w-4 h-4" />
      </motion.span>
    </Link>
  );
}

export function AnimBtnWhite({
  href,
  children,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 bg-white text-primary font-semibold text-sm px-7 py-3.5 rounded-full hover:bg-white/90 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
    >
      <span>{children}</span>
      <motion.span
        className="flex items-center"
        initial={{ x: 0 }}
        whileHover={{ x: 4 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <ArrowRight className="w-4 h-4" />
      </motion.span>
    </Link>
  );
}
