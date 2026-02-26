import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.logo}>🎲</div>
        <h1 className={styles.title}>D&D Campaign Manager</h1>
        <p className={styles.subtitle}>
          Gestisci le tue campagne in presenza
        </p>

        <div className={styles.actions}>
          <a href="/login" className="btn btn-primary" style={{ width: "100%", textAlign: "center" }}>
            Accedi
          </a>
          <a href="/login?mode=register" className="btn btn-secondary" style={{ width: "100%", textAlign: "center" }}>
            Registrati
          </a>
        </div>

        <div className={styles.features}>
          <div className={`card ${styles.featureCard}`}>
            <div className={styles.featureIcon}>🎭</div>
            <h3>Schede Personaggio</h3>
            <p className="text-secondary">Crea e gestisci i tuoi PG con stats, spell e inventario</p>
          </div>
          <div className={`card ${styles.featureCard}`}>
            <div className={styles.featureIcon}>📚</div>
            <h3>Database Incantesimi</h3>
            <p className="text-secondary">Tutti gli spell del PHB con filtri per classe e livello</p>
          </div>
          <div className={`card ${styles.featureCard}`}>
            <div className={styles.featureIcon}>⚔️</div>
            <h3>Tracker Iniziativa</h3>
            <p className="text-secondary">Combattimento condiviso in tempo reale</p>
          </div>
        </div>
      </div>
    </div>
  );
}
