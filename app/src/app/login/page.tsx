"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import D20Dice from "@/components/ui/D20Dice";
import styles from "./login.module.css";

export default function LoginPage() {
    return (
        <Suspense fallback={<div className={styles.container}><div style={{ textAlign: "center", color: "var(--text-secondary)" }}>Caricamento...</div></div>}>
            <LoginForm />
        </Suspense>
    );
}

function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [username, setUsername] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (searchParams.get("mode") === "register") {
            setIsRegister(true);
        }
    }, [searchParams]);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setLoading(true);
        setError("");
        setSuccess("");

        try {
            if (isRegister) {
                // Sign up
                const { data, error: signUpError } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { username: username || email.split("@")[0] },
                    },
                });

                if (signUpError) throw signUpError;

                if (data.user) {
                    // Create profile in public.profiles
                    const { error: profileError } = await supabase
                        .from("profiles")
                        .upsert({
                            id: data.user.id,
                            username: username || email.split("@")[0],
                        });

                    if (profileError) {
                        console.error("Profile creation error:", profileError);
                    }
                }

                // Check if email confirmation is required
                if (data.user && !data.session) {
                    setSuccess(
                        "Registrazione completata! Controlla la tua email per confermare l'account."
                    );
                } else {
                    router.push("/dashboard");
                }
            } else {
                // Sign in
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });

                if (signInError) throw signInError;
                router.push("/dashboard");
            }
        } catch (err: unknown) {
            const message =
                err instanceof Error ? err.message : "Si è verificato un errore";
            setError(message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.formWrapper}>
                <a href="/" className={styles.backLink}>
                    ← Torna alla home
                </a>

                <div className={styles.header}>
                    <D20Dice size={80} autoRollInterval={8000} />
                    <h1 className={styles.title}>
                        {isRegister ? "Crea Account" : "Accedi"}
                    </h1>
                    <p className="text-secondary">
                        {isRegister
                            ? "Unisciti alla tua campagna D&D"
                            : "Bentornato, avventuriero!"}
                    </p>
                </div>

                {error && <div className={styles.alert + " " + styles.alertError}>{error}</div>}
                {success && (
                    <div className={styles.alert + " " + styles.alertSuccess}>{success}</div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    {isRegister && (
                        <div className={styles.field}>
                            <label className="label" htmlFor="username">
                                Nome Utente
                            </label>
                            <input
                                id="username"
                                type="text"
                                className="input"
                                placeholder="Il tuo nome da avventuriero"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </div>
                    )}

                    <div className={styles.field}>
                        <label className="label" htmlFor="email">
                            Email
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="input"
                            placeholder="la-tua@email.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className={styles.field}>
                        <label className="label" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="input"
                            placeholder="Almeno 6 caratteri"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary w-full"
                        disabled={loading}
                        style={{ marginTop: "var(--space-md)" }}
                    >
                        {loading
                            ? "Caricamento..."
                            : isRegister
                                ? "Registrati"
                                : "Accedi"}
                    </button>
                </form>

                <p className={styles.switchText}>
                    {isRegister ? "Hai già un account?" : "Non hai un account?"}{" "}
                    <button
                        className={styles.switchButton}
                        onClick={() => {
                            setIsRegister(!isRegister);
                            setError("");
                            setSuccess("");
                        }}
                    >
                        {isRegister ? "Accedi" : "Registrati"}
                    </button>
                </p>
            </div>
        </div>
    );
}
