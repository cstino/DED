import fs from 'fs';
import path from 'path';

const PRISM_DIR = path.join(__dirname, '../prism');

async function fetchAll(url: string) {
    let results: any[] = [];
    let nextUrl = url;

    while (nextUrl) {
        console.log(`Fetching ${nextUrl}...`);
        const res = await fetch(nextUrl);
        const data = await res.json();
        results = results.concat(data.results);
        nextUrl = data.next;
    }
    return results;
}

async function main() {
    console.log('Fetching SRD from Open5e API...');

    const spellsData = await fetchAll('https://api.open5e.com/v1/spells/?limit=300');
    const classesData = await fetchAll('https://api.open5e.com/v1/classes/?limit=20');
    const racesData = await fetchAll('https://api.open5e.com/v1/races/?limit=10');

    // Map to Prism-like structure
    const prismFormat = {
        spells: spellsData.map((s: any) => ({
            name: s.name,
            level: s.level_int,
            school: s.school,
            castingTime: s.casting_time,
            range: s.range,
            components: s.components,
            duration: s.duration,
            isConcentration: s.concentration === 'yes',
            isRitual: s.ritual === 'yes',
            description: s.desc + (s.higher_level ? `\n\nAt Higher Levels: ${s.higher_level}` : ''),
            casters: {
                // Approximate casters from the dnd_class string
                wizard: s.dnd_class.includes('Wizard'),
                cleric: s.dnd_class.includes('Cleric'),
                sorcerer: s.dnd_class.includes('Sorcerer'),
                bard: s.dnd_class.includes('Bard'),
                paladin: s.dnd_class.includes('Paladin'),
                ranger: s.dnd_class.includes('Ranger'),
                druid: s.dnd_class.includes('Druid'),
                warlock: s.dnd_class.includes('Warlock')
            }
        })),
        classes: classesData.map((c: any) => ({
            name: c.name,
            hitDice: parseInt(c.hit_dice.replace('1d', '')),
            description: c.desc,
            savingThrows: {
                str: c.prof_saving_throws.includes('Strength'),
                dex: c.prof_saving_throws.includes('Dexterity'),
                con: c.prof_saving_throws.includes('Constitution'),
                int: c.prof_saving_throws.includes('Intelligence'),
                wis: c.prof_saving_throws.includes('Wisdom'),
                cha: c.prof_saving_throws.includes('Charisma'),
            }
        })),
        races: racesData.map((r: any) => ({
            name: r.name,
            description: r.desc,
            movement: { speed: r.speed?.walk || 30 },
            sizes: [r.size]
        }))
    };

    const outPath = path.join(PRISM_DIR, '000_srd_base.prism');
    fs.writeFileSync(outPath, JSON.stringify(prismFormat, null, 2));

    console.log(`\n✅ Saved to ${outPath}!`);
    console.log(`- Spells: ${prismFormat.spells.length}`);
    console.log(`- Classes: ${prismFormat.classes.length}`);
    console.log(`- Races: ${prismFormat.races.length}`);
}

main().catch(console.error);
