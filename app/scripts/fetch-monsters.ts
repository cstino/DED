import fs from 'fs';
import path from 'path';

async function downloadMonsters() {
    const outputDir = path.join(process.cwd(), '..', 'dnd-campaign', 'materiale-sorgente', 'bestiario');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log("Scaricando il manuale dei mostri (SRD 5.1) da Open5e...");

    let url = 'https://api.open5e.com/v1/monsters/?limit=300&document__slug=wotc-srd';
    let allMonsters: any[] = [];

    try {
        while (url) {
            console.log(`Recuperando: ${url}`);
            const res = await fetch(url);
            const data = await res.json();
            allMonsters = allMonsters.concat(data.results);
            url = data.next;
        }

        console.log(`Scaricati ${allMonsters.length} mostri. Generazione del file markdown...`);

        // We can create one large file or one file per alphabetical letter. Let's do one file for now.
        let md = `# Menagerie D&D 5e SRD\n\nQuesto documento contiene le statistiche dei mostri tratti dal SRD 5.1.\n\n`;

        for (const m of allMonsters) {
            md += `## ${m.name}\n`;
            md += `*${m.size} ${m.type}, ${m.alignment}*\n\n`;
            md += `- **Classe Armatura**: ${m.armor_class} (${m.armor_desc || 'naturale'})\n`;
            md += `- **Punti Ferita**: ${m.hit_points} (${m.hit_dice})\n`;
            md += `- **Velocità**: ${Object.entries(m.speed).map(([k, v]) => `${k} ${v}ft`).join(', ')}\n\n`;

            md += `| FOR | DES | COS | INT | SAG | CAR |\n`;
            md += `|---|---|---|---|---|---|\n`;
            md += `| ${m.strength} | ${m.dexterity} | ${m.constitution} | ${m.intelligence} | ${m.wisdom} | ${m.charisma} |\n\n`;

            if (m.skills && Object.keys(m.skills).length > 0) {
                md += `- **Abilità**: ${Object.entries(m.skills).map(([k, v]) => `${k} +${v}`).join(', ')}\n`;
            }
            if (m.senses) md += `- **Sensi**: ${m.senses}\n`;
            if (m.languages) md += `- **Linguaggi**: ${m.languages}\n`;
            md += `- **Grado di Sfida (CR)**: ${m.challenge_rating}\n\n`;

            if (m.special_abilities && m.special_abilities.length > 0) {
                md += `### Tratti Speciali\n`;
                for (const ability of m.special_abilities) {
                    md += `- **${ability.name}.** ${ability.desc}\n`;
                }
                md += `\n`;
            }

            if (m.actions && m.actions.length > 0) {
                md += `### Azioni\n`;
                for (const action of m.actions) {
                    md += `- **${action.name}.** ${action.desc}\n`;
                }
                md += `\n`;
            }

            if (m.legendary_actions && m.legendary_actions.length > 0) {
                md += `### Azioni Leggendarie\n`;
                for (const action of m.legendary_actions) {
                    md += `- **${action.name}.** ${action.desc}\n`;
                }
                md += `\n`;
            }
            md += `---\n\n`;
        }

        const filePath = path.join(outputDir, 'manuale-mostri-srd.md');
        fs.writeFileSync(filePath, md, 'utf-8');
        console.log(`Salvato in: ${filePath}`);

    } catch (err) {
        console.error("Errore durante il download:", err);
    }
}

downloadMonsters();
