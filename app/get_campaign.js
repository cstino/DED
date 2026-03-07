const { createClient } = require('@supabase/supabase-api');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

(async () => {
    const { data, error } = await supabase.from('campaigns').select('id, name').limit(1);
    if (error) console.error(error);
    else console.log(data);
})();
