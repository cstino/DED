import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from the Next.js app folder
const envPath = path.resolve(__dirname, '../app/.env.local');
dotenv.config({ path: envPath });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
    console.log('🔍 Checking Supabase for latest chunks of "materiale-sorgente/appunti-campagna.txt"...');

    const { data, error } = await supabase
        .from('document_chunks')
        .select('chunk_content, document_name')
        .eq('document_name', 'materiale-sorgente/appunti-campagna.txt')
        .order('id', { ascending: false });

    if (error) {
        console.error('❌ Error fetching chunks:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log(`✅ Found ${data.length} chunks.`);
        const hasSession3 = data.some(chunk => chunk.chunk_content.includes('Sessione 3'));
        const hasTheCage = data.some(chunk => chunk.chunk_content.includes('The Cage'));

        if (hasSession3) {
            console.log('✨ "Sessione 3" is INDEXED!');
        } else {
            console.log('⚠️ "Sessione 3" is NOT found in the index.');
        }

        if (hasTheCage) {
            console.log('✨ "The Cage" is INDEXED!');
        } else {
            console.log('⚠️ "The Cage" is NOT found in the index.');
        }

        console.log('\n--- SAMPLE CONTENT FROM LATEST CHUNKS ---');
        console.log(data[0].chunk_content.substring(0, 300) + '...');
        console.log('-----------------------------------------');
    } else {
        console.log('❌ No chunks found for this file in the database.');
    }
}

verify();
