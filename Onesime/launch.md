# Onésime — Logiciel de généalogie

Onésime est une application de bureau pour la gestion d'archives généalogiques : documents numérisés, fiches de personnes, albums photos, frise chronologique et registre de tags.

---

## Prérequis

- **Node.js** v18 ou supérieur — [télécharger sur nodejs.org](https://nodejs.org/)
- **npm** v9 ou supérieur (inclus avec Node.js)

Vérifier les versions installées :
```bash
node --version
npm --version
```

---

## Installation

Cloner ou décompresser le projet, puis installer les dépendances :

```bash
cd Onesime
npm install
```

---

## Lancer en développement

```bash
npm run dev
```

Cela démarre simultanément le processus Electron et le serveur Vite (hot-reload). L'application s'ouvre automatiquement.

---

## Construire l'application

### Compiler le code (sans packager)
```bash
npm run build
```

### Créer un installateur distributable
```bash
npm run package
```

Le résultat se trouve dans le dossier `dist/` (`.exe` sur Windows, `.dmg` sur macOS, `.AppImage` sur Linux).

---

## Structure du projet

```
Onesime/
├── src/
│   ├── main/           # Processus principal Electron (IPC, base de données)
│   │   ├── index.ts    # Point d'entrée Electron
│   │   ├── db.ts       # Base de données SQLite (sql.js)
│   │   └── ipc.ts      # Handlers IPC (API entre renderer et main)
│   ├── preload/        # Script de liaison contextBridge
│   │   └── index.ts
│   └── renderer/       # Interface React
│       └── src/
│           ├── pages/  # Pages de l'application
│           ├── components/  # Composants réutilisables
│           ├── api/    # Appels IPC côté renderer
│           └── types/  # Types TypeScript
├── resources/          # Icônes et ressources statiques
└── package.json
```

---

## Principales dépendances

| Dépendance | Version | Rôle |
|---|---|---|
| Electron | ^31.3.0 | Environnement desktop |
| React | ^18.3.1 | Interface utilisateur |
| electron-vite | ^2.3.0 | Bundler + dev server |
| TypeScript | ^5.4.5 | Typage statique |
| Tailwind CSS | ^3.4.4 | Styles utilitaires |
| sql.js | ^1.12.0 | Base de données SQLite (WebAssembly) |
| React Router | ^6.23.1 | Navigation entre pages |

---

## Fonctionnalités

- **Archives** — organisez vos sources par fonds d'archives
- **Explorateur** — parcourez les documents avec lazy loading, tri et lightbox
- **Fiches** — créez des fiches pour chaque individu, liez-leur des documents
- **Albums** — regroupez des photos, retouchez-les (recadrage, rotation, luminosité, contraste, miroir), lancez un diaporama
- **Tags** — étiquetez documents et fiches, gérez le registre complet des tags
- **Frise chronologique** — visualisez tous les événements sur un axe temporel
- **Recto-verso** — liez deux documents recto/verso et retournez-les d'un clic

---

## Base de données

La base SQLite est stockée dans le répertoire de données utilisateur de l'application (géré automatiquement par Electron via `app.getPath('userData')`). Aucune configuration manuelle n'est requise.

## Transport 
Solution recommandée : GitHub (gratuit, privé)
Sur le PC fixe :

Créer un repo privé sur github.com (bouton "New repository", cocher "Private")
Dans le terminal du projet :

git remote add origin https://github.com/mrbrine25/onesime.git
git push -u origin main
Sur le PC portable :


git clone https://github.com/mrbrine25/onesime.git
cd onesime
npm install
Et c'est tout — le projet est prêt à dev.

Workflow quotidien ensuite
Quand tu termines sur un PC :


git add -A
git commit -m "..."
git push
Quand tu reprends sur l'autre :


git pull
