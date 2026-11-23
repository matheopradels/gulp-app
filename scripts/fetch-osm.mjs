#!/usr/bin/env node
/**
 * Télécharge les bars d'une ou plusieurs zones depuis OpenStreetMap (licence
 * ODbL, réutilisable librement avec la mention « © OpenStreetMap ») et écrit
 * un fichier propre par zone dans src/data/bars/.
 *
 *   npm run fetch-bars                 → Paris
 *   npm run fetch-bars -- idf          → Île-de-France (hors Paris)
 *   npm run fetch-bars -- lille lyon   → plusieurs zones
 *   npm run fetch-bars -- all          → toutes les zones ci-dessous
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/data/bars');

// Zone = une « area » OpenStreetMap, repérée par son code INSEE ou ISO.
const ZONES = {
  paris: { name: 'Paris', area: '["ref:INSEE"="75056"]["admin_level"="8"]' },
  idf: { name: 'Île-de-France', area: '["ISO3166-2"="FR-IDF"]', exclude: ['paris'] },
  lille: { name: 'Lille', area: '["ref:INSEE"="59350"]["admin_level"="8"]' },
  lyon: { name: 'Lyon', area: '["ref:INSEE"="69123"]["admin_level"="8"]' },
  bordeaux: { name: 'Bordeaux', area: '["ref:INSEE"="33063"]["admin_level"="8"]' },
  nice: { name: 'Nice', area: '["ref:INSEE"="06088"]["admin_level"="8"]' },
  cannes: { name: 'Cannes', area: '["ref:INSEE"="06029"]["admin_level"="8"]' },
  toulouse: { name: 'Toulouse', area: '["ref:INSEE"="31555"]["admin_level"="8"]' },
};

const SERVERS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Bars et pubs, plus les cafés / restaurants qui sont en réalité des bars
// (très fréquent en France : « bar-tabac », « brasserie », « bistrot »).
// Le tri fin (mot entier : « Bar du Marché » oui, « Barbara Café » non) est fait ici, pas par le serveur.
const BARISH = /(^|[^a-zà-ÿ])(bar|pub|brasserie|bistrot?|taverne|cave à bières?|beer|bière)([^a-zà-ÿ]|$)/i;
const buildQuery = (area) => `
[out:json][timeout:180];
area${area}->.zone;
(
  nwr["amenity"~"^(bar|pub|biergarten)$"]["name"](area.zone);
  nwr["amenity"~"^(cafe|restaurant)$"]["bar"="yes"]["name"](area.zone);
  nwr["amenity"="cafe"]["name"~"bar|pub|brasserie|bistro|taverne|beer|bi.re",i](area.zone);
  nwr["craft"="brewery"]["name"]["amenity"](area.zone);
);
out center tags;`;

async function overpass(query) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const server of SERVERS) {
      try {
        const res = await fetch(server, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'GULP-app/1.2 (fetch-bars)' },
          body: 'data=' + encodeURIComponent(query),
          signal: AbortSignal.timeout(200_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (!Array.isArray(json.elements)) throw new Error('réponse inattendue');
        if (json.remark && /timed out|out of memory/i.test(json.remark)) throw new Error(json.remark);
        return json.elements;
      } catch (error) {
        lastError = error;
        console.log(`   … ${new URL(server).host} : ${error.message}, serveur suivant`);
        await sleep(2000);
      }
    }
    await sleep(15_000);
  }
  throw lastError;
}

// Noms inutilisables : « Bar », « Pub », un numéro, deux lettres…
const isGenericName = (n) => n.length < 3 || /^\d+$/.test(n) || /^(bar|pub|café|cafe|brasserie|bistrot?|buvette|tabac|bar[- ]tabac)$/i.test(n);

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const key = (s) => clean(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

// Distance approximative en mètres (suffisant pour repérer des doublons).
const meters = (a, b) => {
  const dy = (a.lat - b.lat) * 111_320;
  const dx = (a.lng - b.lng) * 111_320 * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
};

function toBars(elements, zoneName) {
  const bars = [];
  for (const el of elements) {
    const t = el.tags || {};
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const name = clean(t.name);
    if (!name || lat == null || lng == null) continue;
    if (t.amenity === 'cafe' && t.bar !== 'yes' && !BARISH.test(name)) continue;
    if (isGenericName(name)) continue;
    // Lieux fermés ou abandonnés.
    if (t.disused === 'yes' || t.abandoned === 'yes' || t['disused:amenity'] || t.opening_hours === 'closed') continue;
    const bar = {
      id: `osm_${el.type[0]}${el.id}`,
      name: name.slice(0, 80),
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      address: clean([t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ')),
      city: clean(t['addr:city']) || zoneName,
    };
    if (t.happy_hours) bar.hh = clean(t.happy_hours).slice(0, 60); // horaires d'happy hour, quand OSM les connaît
    bars.push(bar);
  }
  // Doublons : même nom à moins de 40 m (un point + un bâtiment pour le même bar).
  const kept = [];
  const byName = new Map();
  for (const bar of bars) {
    const k = key(bar.name);
    const same = byName.get(k) || [];
    if (same.some((o) => meters(o, bar) < 40)) continue;
    same.push(bar);
    byName.set(k, same);
    kept.push(bar);
  }
  return kept.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

const bboxOf = (bars) =>
  bars.reduce(
    (b, x) => [Math.min(b[0], x.lat), Math.min(b[1], x.lng), Math.max(b[2], x.lat), Math.max(b[3], x.lng)],
    [90, 180, -90, -180]
  );

function writeIndex() {
  const index = fs
    .readdirSync(OUT_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => {
      const bars = JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), 'utf8'));
      const id = f.replace('.json', '');
      return { id, name: ZONES[id]?.name || id, count: bars.length, bbox: bboxOf(bars) };
    })
    .filter((z) => z.count > 0);
  fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index, null, 1));
  return index;
}

async function main() {
  let wanted = process.argv.slice(2).map((a) => a.toLowerCase());
  if (wanted.length === 0) wanted = ['paris'];
  if (wanted.includes('all')) wanted = Object.keys(ZONES);
  const unknown = wanted.filter((z) => !ZONES[z]);
  if (unknown.length) {
    console.error(`Zone inconnue : ${unknown.join(', ')}. Zones possibles : ${Object.keys(ZONES).join(', ')}, all`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const id of wanted) {
    const zone = ZONES[id];
    console.log(`\n📍 ${zone.name} : téléchargement depuis OpenStreetMap…`);
    try {
      let bars = toBars(await overpass(buildQuery(zone.area)), zone.name);
      // Une zone englobante ne répète pas les bars d'une zone déjà à part (IDF sans Paris).
      for (const ex of zone.exclude || []) {
        const file = path.join(OUT_DIR, `${ex}.json`);
        if (!fs.existsSync(file)) {
          console.log(`   ⚠ lance d'abord « npm run fetch-bars -- ${ex} » pour éviter les doublons avec ${ZONES[ex].name}`);
          continue;
        }
        const ids = new Set(JSON.parse(fs.readFileSync(file, 'utf8')).map((b) => b.id));
        bars = bars.filter((b) => !ids.has(b.id));
      }
      fs.writeFileSync(path.join(OUT_DIR, `${id}.json`), JSON.stringify(bars));
      const withAddress = bars.filter((b) => b.address).length;
      console.log(`   ✅ ${bars.length} bars (${withAddress} avec adresse, ${bars.filter((b) => b.hh).length} avec happy hour)`);
    } catch (error) {
      console.error(`   ❌ ${zone.name} : ${error.message}. Réessaie dans quelques minutes.`);
      process.exitCode = 1;
    }
    await sleep(5000);
  }

  const index = writeIndex();
  console.log(`\nBase actuelle : ${index.map((z) => `${z.name} ${z.count}`).join(' · ') || 'vide'}`);
  console.log('Pour mettre en ligne : npm run deploy');
}

main();
