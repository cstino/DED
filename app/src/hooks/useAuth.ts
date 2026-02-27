"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { User, Session } from "@supabase/supabase-js";

interface Profile {
    id: string;
    username: string;
    avatar_url: string | null;
    created_at: string;
}

interface AuthState {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    loading: boolean;
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        session: null,
        profile: null,
        loading: true,
    });

    const fetchProfile = useCallback(async (userId: string) => {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
        return data as Profile | null;
    }, []);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(async ({ data: { session } }) => {
            let profile: Profile | null = null;
            if (session?.user) {
                profile = await fetchProfile(session.user.id);
            }
            setState({
                user: session?.user ?? null,
                session,
                profile,
                loading: false,
            });
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            let profile: Profile | null = null;
            if (session?.user) {
                profile = await fetchProfile(session.user.id);
            }
            setState({
                user: session?.user ?? null,
                session,
                profile,
                loading: false,
            });
        });

        return () => subscription.unsubscribe();
    }, [fetchProfile]);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return { ...state, signOut };
}
