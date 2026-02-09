import { motion, useReducedMotion } from "framer-motion";
import { PropsWithChildren } from "react";

interface RevealProps {
  delay?: number;
  y?: number;
}

export function Reveal({ children, delay = 0, y = 14 }: PropsWithChildren<RevealProps>) {
  const prefersReduced = useReducedMotion();
  const initial = prefersReduced ? { opacity: 1, y: 0 } : { opacity: 0, y };
  const animate = { opacity: 1, y: 0 };
  
  return (
    <motion.div 
      initial={initial} 
      whileInView={animate} 
      viewport={{ once: true, amount: 0.2 }} 
      transition={{ duration: 0.35, ease: "easeOut", delay }}
    >
      {children}
    </motion.div>
  );
}
