import React, { useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";

interface AnimatedListProps {
  items: React.ReactNode[];
  delay?: number;
  className?: string;
  itemClassName?: string;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.3,
    },
  },
};

const itemVariants: Variants = {
  hidden: { 
    opacity: 0,
    y: 20,
    scale: 0.95
  },
  show: { 
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
};

export function AnimatedList({ items, delay = 0.3, className = "", itemClassName = "" }: AnimatedListProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate={isVisible ? "show" : "hidden"}
      className={className}
    >
      {items.map((item, index) => (
        <motion.div
          key={index}
          variants={itemVariants}
          className={itemClassName}
          style={{ 
            originY: 0,
            position: "relative"
          }}
        >
          {item}
        </motion.div>
      ))}
    </motion.div>
  );
}
