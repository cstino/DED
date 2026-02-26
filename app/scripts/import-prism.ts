import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const PRISM_DIR = path.join(__dirname, '../../prism');

type CategoryEntries = Record<string, any>;

interface PrismData {
    races: CategoryEntries;
    classes: CategoryEntries;
    subclasses: CategoryEntries;
    monsters: CategoryEntries;
    feats: CategoryEntries;
    spells: CategoryEntries;
    backgrounds: CategoryEntries;
}

async function insertInBatches(tableName: string, items: any[]) {
    const BATCH_SIZE = 100;
    for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE);

        // We use upsert so we can run this multiple times without duplication errors
        const { error } = await supabase
            .from(tableName)
            .upsert(batch, { onConflict: 'name' });

        if (error) {
            console.error(`❌ Error inserting batch into ${tableName}:`, error.message);
        } else {
            process.stdout.write('.');
        }
    }
    console.log(` ✅ Inserted ${items.length} items into ${tableName}`);
}

async function main() {
    const isDryRun = process.argv.includes('--dry-run');
    console.log(`Starting Prism import 🎲 ${isDryRun ? '(DRY RUN)' : ''}`);

    const files = fs.readdirSync(PRISM_DIR).filter((f) => f.endsWith('.prism'));

    const data: PrismData = {
        races: {},
        classes: {},
        subclasses: {},
        monsters: {},
        feats: {},
        spells: {},
        backgrounds: {},
    };

    files.forEach((file) => {
        console.log(`Scanning ${file}...`);
        const content = fs.readFileSync(path.join(PRISM_DIR, file), 'utf-8');
        const parsed = JSON.parse(content);

        const categoryMap: Record<string, keyof PrismData> = {
            races: 'races',
            classes: 'classes',
            subclasses: 'subclasses',
            monsters: 'monsters',
            feats: 'feats',
            spells: 'spells',
            backgrounds: 'backgrounds',
        };

        for (const [prismKey, targetKey] of Object.entries(categoryMap)) {
            if (parsed[prismKey] && Array.isArray(parsed[prismKey])) {
                parsed[prismKey].forEach((item: any) => {
                    const name = item.name || item.title;
                    if (!name) return;
                    item.source_book = file.replace('.prism', '');

                    let dbItem: any = {};
                    if (targetKey === 'spells') {
                        dbItem = {
                            name: item.name, level: item.level, school: item.school,
                            casting_time: item.castingTime || item.casting_time, range: item.range,
                            components: item.components, duration: item.duration, description: item.description,
                            is_concentration: item.isConcentration || item.is_concentration || false,
                            is_ritual: item.isRitual || item.is_ritual || false,
                            casters: item.casters || {}, damage_dice: item.damageDice || item.damage_dice || [],
                            source_book: item.source_book
                        };
                    } else if (targetKey === 'classes') {
                        dbItem = {
                            name: item.name, description: item.description || item.classDescription,
                            hit_dice: item.hitDice || item.hit_dice, saving_throws: item.savingThrows || item.saving_throws || {},
                            proficiencies: item.proficiencies || {}, features: item.newFeatures || item.features || [],
                            spell_table: item.spellTable || item.spell_table || {}, source_book: item.source_book
                        };
                    } else if (targetKey === 'subclasses') {
                        dbItem = {
                            name: item.name, class_name: item.className || item.class_name || 'Unknown',
                            description: item.subclassDescription || item.description, features: item.newFeatures || item.features || [],
                            source_book: item.source_book
                        };
                    } else if (targetKey === 'races') {
                        dbItem = {
                            name: item.name, description: item.raceDescription || item.description,
                            ability_bonuses: item.abilityBonuses || item.ability_bonuses || {}, features: item.newFeatures || item.features || [],
                            movement: item.movement || {}, languages: item.newLanguages || item.languages || [],
                            sizes: item.sizes || [], source_book: item.source_book
                        };
                    } else if (targetKey === 'monsters') {
                        dbItem = {
                            name: item.name, ac: item.ac, ac_string: item.acString || item.ac_string,
                            hp: item.hp, hp_dice: item.hpDice || item.hp_dice || {}, stats: item.stats || {},
                            movement: item.movement || {}, actions: item.actions || [], traits: item.monsterTraits || item.traits || [],
                            challenge_rating: item.challengeRating || item.challenge_rating, experience_points: item.experiencePoints || item.experience_points,
                            description: item.monsterDescription || item.description, source_book: item.source_book
                        };
                    } else if (targetKey === 'feats') {
                        dbItem = {
                            name: item.name, description: item.description || item.featDescription,
                            effects: item.effects || [], source_book: item.source_book
                        };
                    } else if (targetKey === 'backgrounds') {
                        dbItem = {
                            name: item.name, description: item.description || item.backgroundDescription,
                            skills: item.skills || [], features: item.features || [], source_book: item.source_book
                        };
                    }

                    data[targetKey][name] = dbItem;
                });
            }
        }
    });

    console.log('\n=== 📊 DEDUPLICATED COUNTS ===');
    for (const [key, items] of Object.entries(data)) {
        console.log(`${key.toUpperCase()}: ${Object.keys(items).length}`);
    }

    if (isDryRun) {
        console.log('\n✅ Dry run complete. No data inserted.');
        return;
    }

    console.log('\n🚀 Starting insertion to Supabase...');

    await insertInBatches('spells', Object.values(data.spells));
    await insertInBatches('classes', Object.values(data.classes));
    await insertInBatches('races', Object.values(data.races));
    await insertInBatches('subclasses', Object.values(data.subclasses));
    await insertInBatches('monsters', Object.values(data.monsters));
    await insertInBatches('feats', Object.values(data.feats));
    await insertInBatches('backgrounds', Object.values(data.backgrounds));

    console.log('\n🎉 All imports finished successfully!');
}

main().catch(console.error);
