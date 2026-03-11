"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import styles from "./page.module.css";
import MageHandLogo from "@/components/ui/MageHandLogo";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.push("/dashboard");
      }
    });
  }, [router]);

  return (
    <div className={styles.container}>
      {/* Ambient background effects */}
      <div className={styles.ambientOrb1} />
      <div className={styles.ambientOrb2} />
      <div className={styles.ambientOrb3} />

      <div className={styles.content}>
        {/* Hero Section */}
        <div className={styles.hero}>
          <div className={styles.logoContainer}>
            <MageHandLogo size={150} />
          </div>

          <h1 className={styles.title}>
            MageHand
          </h1>

          <p className={styles.subtitle}>
            Gestisci le tue campagne D&D 5e in presenza.
            <br />
            <span className={styles.subtitleHighlight}>
              Schede, incantesimi e combattimento — tutto in un&apos;app.
            </span>
          </p>

          <div className={styles.actions}>
            <a href="/login" className={styles.btnPrimary}>
              <span className={styles.btnIcon}>⚔️</span>
              Inizia l&apos;Avventura
            </a>
            <a href="/login?mode=register" className={styles.btnSecondary}>
              Crea un Account
            </a>
          </div>
        </div>

        {/* Feature Cards */}
        <div className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <span className={styles.featureIcon}>🎭</span>
            </div>
            <div className={styles.featureText}>
              <h3>Schede Personaggio</h3>
              <p>Crea e gestisci i tuoi PG con stats, spell slot e inventario</p>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <span className={styles.featureIcon}>📚</span>
            </div>
            <div className={styles.featureText}>
              <h3>Database Incantesimi</h3>
              <p>Oltre 1.300 spell con filtri per classe, livello e scuola</p>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <span className={styles.featureIcon}>⚔️</span>
            </div>
            <div className={styles.featureText}>
              <h3>Tracker Iniziativa</h3>
              <p>Combattimento condiviso in tempo reale con il tuo party</p>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIconWrap}>
              <span className={styles.featureIcon}>👹</span>
            </div>
            <div className={styles.featureText}>
              <h3>Bestiario Completo</h3>
              <p>1.143 mostri pronti per i tuoi scontri, dal Goblin al Tarrasque</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p>Creato per sessioni in presenza • D&D 5e SRD</p>
        </div>
      </div>
    </div>
  );
}
