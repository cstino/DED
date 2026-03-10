"use client";

import { useState, useEffect } from "react";
import styles from "./SplashScreen.module.css";
import MageHandLogo from "./MageHandLogo";

const DND_TIPS = [
    "Un critico naturale (20) colpisce sempre, indipendentemente dalla CA.",
    "Il riposo breve dura 1 ora e permette di spendere Dadi Vita.",
    "Il vantaggio ti permette di lanciare due d20 e tenere il più alto.",
    "La competenza aggiunge il tuo bonus ai tiri in cui sei addestrato.",
    "Un riposo lungo recupera tutti i tuoi HP e metà dei tuoi Dadi Vita.",
    "L'ispirazione può essere spesa per ottenere vantaggio su un tiro.",
    "Gli incantesimi rituali non consumano slot se lanciati in 10 minuti extra.",
    "Strizzare l'occhio al Master non garantisce vantaggi... di solito.",
    "La Classe Armatura (CA) determina quanto è difficile colpirti.",
    "La Percezione Passiva aiuta il Master a capire cosa noti senza tirare.",
    "Cadere a 0 HP ti costringe a fare tiri salvezza contro morte.",
    "La Schivata (Dodge) dà svantaggio ai nemici che ti attaccano.",
    "Afferrare (Grapple) sostituisce un attacco e blocca il movimento nemico.",
    "La Resistenza dimezza il danno di un tipo specifico.",
];

export default function SplashScreen({ children }: { children: React.ReactNode }) {
    const [phase, setPhase] = useState<"initial" | "brand" | "tips" | "fadeout" | "done">("initial");
    const [visible, setVisible] = useState(true);
    const [tip, setTip] = useState("");

    useEffect(() => {
        if (typeof window !== "undefined") {
            const seen = sessionStorage.getItem("splash_seen");
            if (seen) {
                setPhase("done");
                setVisible(false);
            } else {
                // Pick a random tip
                const randomIndex = Math.floor(Math.random() * DND_TIPS.length);
                setTip(DND_TIPS[randomIndex]);

                // Cinematic sequence
                // 0ms -> Logo Pop In (via logoEntrance class)
                // 1200ms -> Fade in Brand (MageHand)
                // 2500ms -> Fade in Tips
                // 6000ms -> Start global fadeout
                // 7000ms -> Finished

                const t1 = setTimeout(() => setPhase("brand"), 1200);
                const t2 = setTimeout(() => setPhase("tips"), 2500);
                const t3 = setTimeout(() => setPhase("fadeout"), 6000);
                const t4 = setTimeout(() => {
                    sessionStorage.setItem("splash_seen", "1");
                    setPhase("done");
                    setVisible(false);
                }, 7000);

                return () => {
                    clearTimeout(t1);
                    clearTimeout(t2);
                    clearTimeout(t3);
                    clearTimeout(t4);
                };
            }
        }
    }, []);

    if (!visible) return <>{children}</>;

    const isTextVisible = phase !== "initial";
    const isTipVisible = phase === "tips" || phase === "fadeout";

    return (
        <>
            <div className={`${styles.overlay} ${phase === "fadeout" || phase === "done" ? styles.overlayHidden : ""}`}>
                <div className={styles.diceContainer}>
                    <div className={styles.ambientGlow} style={{ opacity: isTextVisible ? 0.8 : 0.4 }} />
                    <div className={styles.logoEntrance}>
                        <MageHandLogo size={260} animate={true} />
                    </div>
                </div>

                <div className={`${styles.textContainer} ${isTextVisible ? styles.textVisible : ""}`}>
                    <p className={styles.subtitle}>MageHand</p>
                    <p className={`${styles.tip} ${isTipVisible ? styles.tipVisible : ""}`}>
                        "{tip}"
                    </p>
                </div>
            </div>
            {children}
        </>
    );
}
