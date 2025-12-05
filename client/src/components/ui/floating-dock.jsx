import { cn } from "@/lib/utils";
import { IconLayoutNavbarCollapse } from "@tabler/icons-react";
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useRef, useState } from "react";

export const FloatingDock = ({ items, desktopClassName, mobileClassName }) => {
    return (
        <>
            <FloatingDockDesktop items={items} className={desktopClassName} />
            <FloatingDockMobile items={items} className={mobileClassName} />
        </>
    );
};

const FloatingDockMobile = ({ items, className }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className={cn("relative block md:hidden", className)}>
            <AnimatePresence>
                {open && (
                    <motion.div layoutId="nav" className="absolute inset-x-0 bottom-full mb-2 flex flex-col gap-2">
                        {items.map((item, idx) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{
                                    opacity: 0,
                                    y: 10,
                                    transition: { delay: idx * 0.05 },
                                }}
                                transition={{ delay: (items.length - 1 - idx) * 0.05 }}
                            >
                                <a
                                    href={item.href}
                                    key={item.title}
                                    // FIX: Use bg-base-200 instead of gray-50/neutral-900
                                    className="flex h-10 w-10 items-center justify-center rounded-full bg-base-200 shadow-md"
                                >
                                    <div className="h-4 w-4">{item.icon}</div>
                                </a>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
            <button
                onClick={() => setOpen(!open)}
                // FIX: Use bg-base-200 instead of gray-50/neutral-800
                className="flex h-10 w-10 items-center justify-center rounded-full bg-base-200 shadow-md"
            >
                {/* FIX: Use text-base-content/50 for a subtle default icon color */}
                <IconLayoutNavbarCollapse className="h-5 w-5 text-base-content/50" />
            </button>
        </div>
    );
};

const FloatingDockDesktop = ({ items, className }) => {
    let mouseX = useMotionValue(Infinity);
    return (
        <motion.div
            onMouseMove={(e) => mouseX.set(e.pageX)}
            onMouseLeave={() => mouseX.set(Infinity)}
            className={cn(
                // FIX: Replaced bg-gray-50/dark:bg-neutral-900 with bg-base-200
                // Added shadow-md for better separation
                "mx-auto hidden h-16 items-end gap-4 rounded-2xl bg-base-200 px-4 pb-3 md:flex shadow-md",
                className
            )}
        >
            {items.map((item) => (
                <IconContainer mouseX={mouseX} key={item.title} {...item} />
            ))}
        </motion.div>
    );
};

function IconContainer({ mouseX, title, icon, href }) {
    let ref = useRef(null);

    let distance = useTransform(mouseX, (val) => {
        let bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
        return val - bounds.x - bounds.width / 2;
    });

    let widthTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
    let heightTransform = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
    let widthTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);
    let heightTransformIcon = useTransform(distance, [-150, 0, 150], [20, 40, 20]);

    let width = useSpring(widthTransform, { mass: 0.1, stiffness: 150, damping: 12 });
    let height = useSpring(heightTransform, { mass: 0.1, stiffness: 150, damping: 12 });
    let widthIcon = useSpring(widthTransformIcon, { mass: 0.1, stiffness: 150, damping: 12 });
    let heightIcon = useSpring(heightTransformIcon, { mass: 0.1, stiffness: 150, damping: 12 });

    const [hovered, setHovered] = useState(false);

    return (
        <a href={href}>
            <motion.div
                ref={ref}
                style={{ width, height }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                // FIX: Replaced bg-gray-200/dark:bg-neutral-800 with bg-base-300
                // This creates a nice contrast against the bg-base-200 dock
                className="relative flex aspect-square items-center justify-center rounded-full bg-base-300 shadow-inner"
            >
                <AnimatePresence>
                    {hovered && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, x: "-50%" }}
                            animate={{ opacity: 1, y: 0, x: "-50%" }}
                            exit={{ opacity: 0, y: 2, x: "-50%" }}
                            // FIX: Updated Tooltip colors to match DaisyUI
                            className="absolute -top-8 left-1/2 w-fit rounded-md border border-base-200 bg-base-100 px-2 py-0.5 text-xs whitespace-pre text-base-content shadow-sm"
                        >
                            {title}
                        </motion.div>
                    )}
                </AnimatePresence>
                <motion.div
                    style={{ width: widthIcon, height: heightIcon }}
                    className="flex items-center justify-center"
                >
                    {icon}
                </motion.div>
            </motion.div>
        </a>
    );
}
