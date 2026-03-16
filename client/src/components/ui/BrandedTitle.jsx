import React from "react";
import { motion as Motion } from "motion/react";

const BrandedTitle = ({ suffix, className = "" }) => (
  <div className={`flex justify-center ${className}`}>
    <Motion.h1
      className="text-5xl md:text-7xl tracking-tighter cursor-default"
      initial="rest"
      whileHover="hover"
      animate="rest"
    >
      <Motion.span
        variants={{
          rest: { fontWeight: 700, color: "var(--color-base-content)" },
          hover: { fontWeight: 200, color: "var(--color-info)" },
        }}
        transition={{ duration: 0.3 }}
      >
        AERO
      </Motion.span>
      <Motion.span
        className="tracking-widest"
        variants={{
          rest: { fontWeight: 200, color: "var(--color-info)" },
          hover: { fontWeight: 700, color: "var(--color-base-content)" },
        }}
        transition={{ duration: 0.3 }}
      >
        {suffix}
      </Motion.span>
    </Motion.h1>
  </div>
);

export default BrandedTitle;
