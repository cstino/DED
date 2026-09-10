'use client';

// Local visual fixture. Uses the production CSS; never reads or writes a campaign.
import { useState } from 'react';
import { ChevronLeft, Settings2, Heart, Shield, Footprints, Zap, Award, Hexagon, Swords, Backpack, Sparkles, BookOpen } from 'lucide-react';
import styles from '../[id]/character/[charId]/character.module.css';
import roster from '../[id]/campaign.module.css';

const tabs = [
    { id: 'stats', label: 'Statistiche', icon: Hexagon },
    { id: 'combat', label: 'Battaglia', icon: Swords },
    { id: 'equipment', label: 'Zaino', icon: Backpack },
    { id: 'spells', label: 'Magia', icon: Sparkles },
    { id: 'notes', label: 'Note', icon: BookOpen },
];
const abilities = [['FOR', 18, '+4'], ['DES', 14, '+2'], ['COS', 16, '+3'], ['INT', 10, '+0'], ['SAG', 12, '+1'], ['CAR', 8, '−1']];

export default function Preview() {
    const [active, setActive] = useState('stats');
    const [party, setParty] = useState(false);
    const [hp, setHp] = useState(42);
    const [note, setNote] = useState('La porta sotto la torre si apre soltanto al tramonto.');
    const [edit, setEdit] = useState(false);
    return <div>
        <div style={{ padding: '10px 20px', textAlign: 'center', fontSize: 12, background: '#392319', color: '#ffd6b6' }}>Anteprima locale · Dati illustrativi · <button style={{ color: 'inherit', background: 'none', border: 0, textDecoration: 'underline', cursor: 'pointer', minHeight: 32 }} onClick={() => setParty(!party)}>{party ? 'Apri scheda' : 'Mostra party'}</button></div>
        {party ? <div className={`page ${roster.campaignPage}`}>
            <div className={roster.heroHeader}><img src="/art/ember-sanctuary.webp" alt="" className={roster.heroBackground} /><div className={roster.heroOverlay} /><div className={roster.heroContent}><div className={roster.headerInfo}><p className={roster.campaignEyebrow}>Il tuo prossimo capitolo</p><h1 className="page-title">Le ombre di Sharn</h1><p className="page-subtitle">Una città di torri. Un segreto che attende nell’oscurità.</p></div></div></div>
            <section className={roster.section}><div className={roster.sectionHeader}><h2>Il Party</h2></div><div className={roster.characterGrid}>{['Kael Voss', 'Mira delle Braci', 'Corwin'].map((name) => <button key={name} className={roster.characterCard} onClick={() => setParty(false)} style={{ textAlign: 'left', fontFamily: 'inherit', color: 'inherit' }}><div className={roster.charCardOverlay} /><div className={roster.charHeader}><h3>{name}</h3><span className={roster.levelBadge}>Lv. 7</span></div><p className={roster.charInfo}>Umano · Guerriero</p><div className={roster.charStats}><div className={roster.hpHeader}><span className={roster.hpLabel}>HP</span><span className={roster.hpNumbers}>42 / 58</span></div><div className={roster.hpBarOuter}><div className={roster.hpBarInner} style={{ width: '72%', background: '#8ccb9d' }} /></div><div className={roster.badgesSection}>{[['AC', '18'], ['BC', '+3'], ['PERC', '14']].map(([l, v]) => <div className={roster.statBadge} key={l}><span className={roster.statLabel}>{l}</span><span className={roster.statValue}>{v}</span></div>)}</div></div></button>)}</div></section>
        </div> : <div className={`page ${styles.sheetPage}`}>
            <div className={styles.topBar}><button className={styles.backBtn} onClick={() => setParty(true)}><ChevronLeft size={24} />Campagna</button><span className={styles.sheetLabel}><Hexagon size={16} />Scheda personaggio</span><button className={styles.settingsBtn} aria-label="Opzioni personaggio" onClick={() => setEdit(!edit)}><Settings2 size={20} /></button></div>
            <div className={styles.sheetLayout}>
                <aside className={styles.identityPanel}>
                    <div className={styles.charHeader}><img src="/art/ember-adventurer.webp" alt="" className={styles.charHeaderBackground} /><div className={styles.charHeaderOverlay} /><div className={styles.charInfo}><span className={styles.heroEyebrow}>Membro del party</span><h1 className={styles.charName}>Kael Voss</h1><p className={styles.charMeta}>Umano · Guerriero — Maestro di battaglia</p><div className={styles.charTags}><span className={styles.levelTag}>Lv. 7</span><span className={styles.alignTag}>Neutrale buono</span><span className={styles.bgTag}>Soldato</span></div></div></div>
                    <div className={styles.combatBar}><div className={styles.hpBox}><div className={styles.hpHeader}><span className={styles.statLabel}><Heart size={15} />Punti ferita</span><div className={styles.hpEditRow}><input aria-label="Punti ferita attuali" type="number" min={0} max={58} value={hp} onChange={e => setHp(Math.max(0, Math.min(58, Number(e.target.value))))} className={styles.smallInput} /><span>/ 58</span></div></div><div className="hp-bar-container" style={{ height: 8 }}><div className="hp-bar" style={{ width: `${hp / 58 * 100}%`, background: hp > 29 ? 'var(--hp-green)' : hp > 14 ? 'var(--hp-yellow)' : 'var(--hp-red)' }} /></div><div className={styles.hpTemp}>HP Temp: 0</div></div>{[{ l: 'Armatura', v: '18', i: Shield }, { l: 'Velocità', v: '9', i: Footprints }, { l: 'Iniziativa', v: '+2', i: Zap }, { l: 'Competenza', v: '+3', i: Award }].map(s => <div className={styles.statBox} key={s.l}><s.i size={20} /><span className={styles.statLabel}>{s.l}</span><span className={styles.statValue}>{s.v}</span></div>)}</div>
                    <p className={styles.artCaption}>Ritratto illustrativo · Personalizzalo dalle opzioni</p>
                </aside>
                <main className={styles.dossier}>
                    <nav className={styles.tabs} aria-label="Sezioni della scheda">{tabs.map(t => <button key={t.id} aria-current={active === t.id ? 'page' : undefined} className={`${styles.tab} ${active === t.id ? styles.tabActive : ''}`} onClick={() => setActive(t.id)}><t.icon size={20} strokeWidth={1.7} />{t.label}</button>)}</nav>
                    <div className={styles.tabContent}>
                        {edit && <p className={styles.saveErrorBanner}>Anteprima: le modifiche rimangono in questa pagina.</p>}
                        {active === 'stats' && <><h3 className={styles.sectionTitle}>Caratteristiche</h3><div className={styles.abilitiesGrid}>{abilities.map(([l, v, m]) => <div key={l} className={styles.abilityCard}><span className={styles.abilityLabel}>{l}</span><span className={styles.abilityScore}>{v}</span><span className={styles.abilityMod}>{m}</span></div>)}</div><h3 className={styles.sectionTitle}>Tiri Salvezza</h3><div className={styles.savesList}>{abilities.map(([l, , m]) => <div className={styles.saveRow} key={l}><span className={`${styles.profDot} ${l === 'FOR' ? styles.profDotActive : ''}`} /><span className={styles.saveMod}>{m}</span><span className={styles.saveName}>{l}</span></div>)}</div><h3 className={styles.sectionTitle}>Abilità</h3><div className={styles.skillsList}>{['Acrobazia', 'Addestrare Animali', 'Arcano', 'Atletica', 'Furtività', 'Indagare', 'Intimidire', 'Intuizione', 'Medicina', 'Natura', 'Percezione', 'Persuasione'].map((s, i) => <div className={styles.skillRow} key={s}><span className={`${styles.profDot} ${i % 3 === 0 ? styles.profDotActive : ''}`} /><span className={styles.skillMod}>+{i % 4 + 1}</span><span className={styles.skillName}>{s}</span><span className={styles.skillAbility}>DES</span></div>)}</div></>}
                        {active === 'combat' && <><h3 className={styles.sectionTitle}>Combattimento</h3><div className={styles.combatSection}><div className={styles.classAbilityViewCard}><h4>Recuperare energie</h4><p className={styles.noteText}>Riprendi fiato e recupera punti ferita durante il tuo turno.</p></div><div className={styles.classAbilityViewCard}><h4>Azione impetuosa</h4><p className={styles.noteText}>Spingiti oltre i tuoi limiti e compi un’azione aggiuntiva.</p></div></div></>}
                        {active === 'equipment' && <><h3 className={styles.sectionTitle}>Zaino</h3><div className={styles.skillsList}>{['Spada lunga', 'Armatura a piastre', 'Scudo', 'Kit da esploratore'].map(x => <div className={styles.skillRow} key={x}><Backpack size={18} /><span className={styles.skillName}>{x}</span></div>)}</div></>}
                        {active === 'spells' && <><h3 className={styles.sectionTitle}>Magia</h3><p className={styles.emptyNote}>Questo personaggio illustrativo non conosce incantesimi.</p></>}
                        {active === 'notes' && <><h3 className={styles.sectionTitle}>Note di viaggio</h3><textarea className="input" aria-label="Nota illustrativa" rows={6} value={note} onChange={e => setNote(e.target.value)} /></>}
                    </div>
                </main>
            </div>
        </div>}
    </div>;
}
