"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./D20Dice.module.css";

interface D20DiceProps {
    size?: number;
    autoRollInterval?: number; // ms between rolls, 0 = no auto
}

export default function D20Dice({ size = 100, autoRollInterval = 6000 }: D20DiceProps) {
    const [number, setNumber] = useState(20);
    const [isRolling, setIsRolling] = useState(false);
    const [isCrit, setIsCrit] = useState(true); // start showing 20

    const roll = useCallback(() => {
        if (isRolling) return;
        setIsRolling(true);
        setIsCrit(false);

        // Rapid number cycling during roll
        let cycles = 0;
        const maxCycles = 12;
        const interval = setInterval(() => {
            setNumber(Math.floor(Math.random() * 20) + 1);
            cycles++;
            if (cycles >= maxCycles) {
                clearInterval(interval);
                const finalNumber = Math.floor(Math.random() * 20) + 1;
                setNumber(finalNumber);
                setIsCrit(finalNumber === 20);
                setIsRolling(false);
            }
        }, 80);
    }, [isRolling]);

    // Auto-roll on interval
    useEffect(() => {
        if (!autoRollInterval) return;
        const timer = setInterval(roll, autoRollInterval);
        return () => clearInterval(timer);
    }, [autoRollInterval, roll]);

    return (
        <div
            className={styles.container}
            style={{ width: size, height: size }}
            onClick={roll}
            title="Clicca per tirare!"
        >
            {/* Glow behind the dice */}
            <div className={`${styles.glow} ${isCrit ? styles.glowCrit : ""} ${isRolling ? styles.glowRolling : ""}`} />

            {/* The d20 shape */}
            <div className={`${styles.dice} ${isRolling ? styles.rolling : styles.floating}`}>
                <div className={styles.face}>
                    {/* Top triangle */}
                    <svg viewBox="0 0 200 200" className={styles.shape}>
                        {/* Main d20 shape - stylized icosahedron front face */}
                        <polygon
                            points="100,8 190,70 165,175 35,175 10,70"
                            className={styles.shapeFill}
                        />
                        <polygon
                            points="100,8 190,70 165,175 35,175 10,70"
                            className={styles.shapeStroke}
                        />
                        {/* Inner lines for d20 facets */}
                        <line x1="100" y1="8" x2="35" y2="175" className={styles.facetLine} />
                        <line x1="100" y1="8" x2="165" y2="175" className={styles.facetLine} />
                        <line x1="10" y1="70" x2="165" y2="175" className={styles.facetLine} />
                        <line x1="190" y1="70" x2="35" y2="175" className={styles.facetLine} />
                        <line x1="10" y1="70" x2="190" y2="70" className={styles.facetLine} />
                    </svg>

                    {/* Number display */}
                    <span
                        className={`${styles.number} ${isCrit ? styles.numberCrit : ""} ${isRolling ? styles.numberRolling : ""}`}
                    >
                        {number}
                    </span>
                </div>
            </div>
        </div>
    );
}
