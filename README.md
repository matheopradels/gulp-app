# GULP!

Le chrono de soirée : solo, duel, relais, précision, réflexe, et 15 jeux à jouer entre potes au bar.
React 18 + Vite + Tailwind. Firebase est **optionnel**.

## Lancer l'app

```bash
npm install
npm run dev
```

Ouvre l'adresse affichée (`http://localhost:5173`). La ligne « Network » donne l'adresse à ouvrir
sur ton téléphone s'il est sur le même Wi-Fi.

L'app est branchée sur le projet Firebase **gulp-637e2** (config dans `src/config/firebaseConfig.js`) :
connexion Google, profils, perfs, classement et clans sont stockés dans Firestore. Sans compte, on
joue en **visiteur** : tout marche, mais les records restent sur le téléphone (importables dans le
compte à la première connexion).

## Remplir la carte des bars

```bash
npm run fetch-bars                 # Paris
npm run fetch-bars -- idf          # Île-de-France (hors Paris, à lancer après Paris)
npm run fetch-bars -- lille lyon bordeaux nice cannes toulouse
npm run deploy                     # met la nouvelle base en ligne
```

Les bars viennent d'OpenStreetMap (licence libre ODbL, mention « © OpenStreetMap » affichée dans
l'app). Le script nettoie les noms, retire les lieux fermés et les doublons, et écrit un fichier par
zone dans `src/data/bars/`. L'app ne charge que les zones proches du joueur. Pour ajouter une ville,
ajoute une ligne dans `ZONES` en haut de `scripts/fetch-osm.mjs` (code INSEE de la commune).

Le **prix de la pinte** n'existe dans aucune base libre : ce sont les joueurs connectés qui
l'indiquent depuis la fiche du bar (un prix par joueur et par bar, médiane affichée).

## Mettre en ligne (Firebase)

Première fois seulement :

```bash
npx firebase-tools login
```

Ensuite, à chaque mise à jour :

```bash
npm run deploy
```

Ça construit l'app et envoie tout d'un coup : les règles de sécurité (`firestore.rules`), les index
(`firestore.indexes.json`) et le site. L'app est alors en ligne sur **https://gulp-637e2.web.app**.
Pour n'envoyer que les règles : `npm run deploy:rules`.

Les index Firestore mettent quelques minutes à se construire après le premier déploiement : le
classement peut rester vide pendant ce temps.

### Ce qui est stocké

| Collection | Contenu | Qui peut lire / écrire |
|---|---|---|
| `users/{uid}` | pseudo, photo Google (jamais l'email) | joueurs connectés / le joueur lui-même |
| `performances` | chaque perf d'un joueur connecté ; `ranked: true` si faite dans un bar à moins de 100 m | tout le monde (classement public) / le joueur lui-même |
| `groups` | clans : nom, code à 6 chiffres, membres (30 max) | joueurs connectés / le chef, ou chaque membre pour entrer ou sortir |
| `bars` | bars ajoutés par les joueurs | tout le monde / celui qui l'a ajouté |

Un joueur peut supprimer son compte depuis son profil : ses perfs, son profil et sa présence dans
les clans sont effacés (un clan dont il était chef passe au membre suivant).

## Réglages utiles

| Réglage | Où | Défaut |
|---|---|---|
| Chrono libre partout, ou seulement dans un bar | `VITE_REQUIRE_BAR=true` dans `.env.local` | libre |
| Rayon pour qu'une perf soit classée | `VITE_GEOFENCE_RADIUS` | 100 m |
| Perfs à enregistrer avant de pouvoir ajouter un bar | `MIN_PERFS_TO_ADD_BAR` dans `src/utils/geo.js` | 5 |
| Nombre maximum de joueurs | `MAX_PLAYERS` dans `src/games/usePlayers.js` | 12 |
| Seuils Élite / Solide / Moyen par format | `src/utils/performance.js` | — |

## Où est quoi

```
src/
  App.jsx                 coque : écran 18+, pages, barre de navigation
  pages/                  Gulp (chrono), Jeux, Discover (carte), Groups (clans), Ranking, Profile
  games/                  modes chrono : Solo, Duel, Relais, Precision, Reflexe + Roulette, Cartes (Mix)
  games/party/            jeux de soirée + moteur de cartes (DeckGame) + banques de cartes (banks.js)
  games/content.js        gages, vérités, « je n'ai jamais », pénalités
  hooks/useChugTimer.js   le chrono (maintien ½ s, arrêt daté au toucher)
  services/               bars, perfs, clans, compte, stockage local
  config/firebase.js      Firebase, activé seulement si les clés sont présentes
public/                   icônes, manifest, service worker (app installable, utilisable hors ligne)
firestore.rules / firestore.indexes.json
```

## Ajouter des cartes

Chaque carte est une ligne dans `src/games/content.js` ou `src/games/party/banks.js` :
`{ l: 1, t: 'texte' }` avec `l` = niveau (1 Soft, 2 Hot, 3 Sans honte). `{p}` et `{q}` sont
remplacés par des prénoms de la table, `{n}` par un nombre de 2 à 5.
