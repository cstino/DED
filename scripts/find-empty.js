
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../app/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function findEmptyCasters() {
    const { data, error } = await supabase
        .from("spells")
        .select("name, casters");

    if (error) return;

    const empty = data.filter(s => {
        return Object.values(s.casters || {}).every(v => v === false);
    });

    console.log(`Spells with all casters false: ${empty.length}`);
    empty.forEach(s => console.log(`- ${s.name}`));
}

findEmptyCasters();
