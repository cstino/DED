import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Bypass the Navigator Locks API for auth storage.
        // The default lock frequently gets stuck during Next.js HMR and causes
        // the entire app to hang on "Caricamento..." because getSession() never resolves.
        lock: async (_name: string, _acquireTimeout: number, fn: () => Promise<any>) => {
            return await fn();
        },
        persistSession: true,
        autoRefreshToken: true,
    },
});

