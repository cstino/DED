
const fs = require('fs');
const path = require('path');

const prismDir = '/Users/cristiano/DED/prism';
const files = fs.readdirSync(prismDir).filter(f => f.endsWith('.prism'));

const spellsToFix = [
    "Ensnaring Strike",
    "Aura of Life",
    "Ray of Sickness"
];

files.forEach(file => {
    const filePath = path.join(prismDir, file);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        const spells = data.spells || (Array.isArray(data) ? data : []);

        spells.forEach(s => {
            if (s.name && spellsToFix.includes(s.name)) {
                console.log(`Spell ${s.name} in ${file}: casters=${JSON.stringify(s.casters)}`);
            }
        });
    } catch (e) { }
});
