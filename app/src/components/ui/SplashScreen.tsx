"use client";

import { useState, useEffect } from "react";
import styles from "./SplashScreen.module.css";
import MageHandLogo from "./MageHandLogo";

const DND_TIPS = [
    // Regole Base
    "Un critico naturale (20) colpisce sempre, indipendentemente dalla CA.",
    "Il riposo breve dura 1 ora e permette di spendere Dadi Vita.",
    "Il vantaggio ti permette di lanciare due d20 e tenere il più alto.",
    "La competenza aggiunge il tuo bonus ai tiri in cui sei addestrato.",
    "Un riposo lungo recupera tutti i tuoi HP e metà dei tuoi Dadi Vita.",
    "L'ispirazione può essere spesa per ottenere vantaggio su un tiro.",
    "La Classe Armatura (CA) determina quanto è difficile colpirti.",
    "Cadere a 0 HP ti costringe a fare tiri salvezza contro morte.",
    "L'iniziativa determina l'ordine dei turni in combattimento.",
    "La Resistenza dimezza il danno di un tipo specifico.",
    "La Vulnerabilità raddoppia il danno di un tipo specifico.",
    "Un 1 naturale su un tiro per colpire è sempre un fallimento.",

    // Azioni e Combattimento
    "L'azione Scatto (Dash) raddoppia il tuo movimento per il turno attuale.",
    "L'azione Disimpegno (Disengage) evita gli attacchi di opportunità.",
    "Schivare (Dodge) dà svantaggio a chi ti attacca e vantaggio ai tuoi TS Destrezza.",
    "Aiutare (Help) un alleato dà vantaggio al suo prossimo tiro o attacco.",
    "Afferrare (Grapple) sostituisce un attacco e azzera il movimento nemico.",
    "Attaccare una creatura prona dà vantaggio se sei entro 1,5m.",
    "L'azione Preparazione (Ready) ti permette di agire fuori dal tuo turno.",
    "Ogni creatura ha una sola Reazione per round.",
    "Nascondersi richiede un tiro di Furtività contrapposto alla Percezione nemica.",
    "Stabilizzare un alleato a 0 HP richiede un tiro di Medicina (CD 10).",

    // Magia e Abilità
    "Gli incantesimi rituali non consumano slot se lanciati in 10 minuti extra.",
    "La Concentrazione si interrompe se subisci danni e fallisci il TS Costituzione.",
    "La Percezione Passiva aiuta il Master a capire cosa noti senza tirare i dadi.",
    "Le componenti verbali richiedono che tu possa parlare liberamente.",
    "Le componenti somatiche richiedono l'uso di almeno una mano libera.",
    "Un Focus Arcano sostituisce le componenti materiali senza costo specifico.",
    "L'Indagine (Investigation) serve per dedurre, la Percezione per notare.",
    "Identificare un oggetto magico richiede un riposo breve o l'incantesimo Identificare.",
    "Il Trucchetto (Cantrip) può essere lanciato quante volte vuoi.",
    "Gli incantesimi di cura non funzionano su costrutti o non morti.",

    // Consigli e Curiosità
    "Strizzare l'occhio al Master non garantisce vantaggi... di solito.",
    "Non dimenticare mai di controllare le trappole prima di aprire un forziere!",
    "Il fuoco è spesso la soluzione migliore contro i Troll.",
    "Un 1 naturale su un tiro salvezza contro morte conta come due fallimenti.",
    "La regola numero 1? Divertirsi e creare una grande storia insieme.",
    "Porta sempre con te una corda da 15 metri, non si sa mai.",
    "Portare una torcia non serve solo a vedere, ma anche a scacciare il buio.",
    "Interagire con un oggetto è solitamente un'azione gratuita durante il movimento.",
    "I punti ferita temporanei non sono cumulabili: tieni i più alti.",
    "Un'arma con la proprietà Lancio può essere usata per attacchi a distanza.",
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
