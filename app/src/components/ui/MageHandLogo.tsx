"use client";

import Image from "next/image";
import styles from "./MageHandLogo.module.css";

interface MageHandLogoProps {
    size?: number;
    className?: string;
    animate?: boolean;
}

export default function MageHandLogo({
    size = 120,
    className = "",
    animate = true
}: MageHandLogoProps) {
    return (
        <div
            className={`${styles.logoContainer} ${className} ${animate ? styles.animated : ""}`}
            style={{ width: size, height: size }}
        >
            <div className={styles.glow} />
            <Image
                src="/logo.png"
                alt="MageHand Logo"
                width={size}
                height={size}
                className={styles.logoImage}
                priority
            />
        </div>
    );
}
