import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');

    if (code) {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        try {
            await supabase.auth.exchangeCodeForSession(code);
        } catch (error) {
            console.error('Error exchanging code for session:', error);
            // Even if exchange fails, we might want to redirect to login or show an error
            return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
        }
    }

    // Redirect to dashboard after handling the confirmation
    // We use origin but fallback to a relative path if needed
    const redirectTo = `${origin}/dashboard`;
    return NextResponse.redirect(redirectTo);
}
