import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function check() {
    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase env vars");
        return;
    }
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { count, error } = await supabase
        .from('document_chunks')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error("Error fetching count:", error);
    } else {
        console.log("Total chunks in DB:", count);
    }

    // Also check one example chunk
    const { data: samples } = await supabase.from('document_chunks').select('document_name').limit(5);
    console.log("Sample documents:", samples?.map(s => s.document_name));
}

check();
