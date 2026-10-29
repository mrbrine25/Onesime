

<div align="center">
  <img width="1600" height="500" alt="banner" src="https://github.com/user-attachments/assets/243d8f0a-1e5b-4d4f-ae4c-1ad410820d6b" />
</div>

<div align="center">

![Version](https://img.shields.io/github/v/release/mrbrine25/Onesime?style=flat-square&color=8b5cf6&label=version)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue?style=flat-square&logo=windows)
![Electron](https://img.shields.io/badge/Electron-31-47848F?style=flat-square&logo=electron)
![Licence](https://img.shields.io/badge/licence-propriétaire-orange?style=flat-square)
[![Discord](https://img.shields.io/badge/Discord-Rejoindre-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.gg/N8ayZbzeye)

</div>

<br>

**Onésime** est un logiciel de bureau pour **organiser, annoter et explorer vos archives généalogiques** — photos de famille, actes notariés, lettres, médailles, carnets… Toutes vos données restent sur votre ordinateur. Aucun cloud (sauf si vous choisissez d'utiliser OneDrive), aucun abonnement, aucune fuite.

---

## Téléchargement

### 👉 [Télécharger Onésime](https://mrbrine25.github.io/Onesime/#telechargement)

La page propose directement le bon fichier pour votre ordinateur : un clic, et le téléchargement démarre.

<details>
<summary>Ou choisir soi-même le fichier, sur la page des versions</summary>

Sur la **[dernière version](https://github.com/mrbrine25/Onesime/releases/latest)**, tout en bas (« Assets »), prenez **un seul** fichier :

| Votre ordinateur | Fichier à télécharger |
|---|---|
| Windows 10 / 11 | `Onesime-…-Setup.exe` |
| Mac récent (puce Apple M1, M2, M3…) | `Onesime-…-mac-arm64.dmg` |
| Mac Intel (avant 2020) | `Onesime-…-mac-x64.dmg` |

Les autres fichiers (`latest.yml`, `.blockmap`…) servent aux mises à jour automatiques : inutile de les télécharger.

</details>

> **Note Windows** — À la première exécution, Windows peut afficher un avertissement « application inconnue ». Cliquez sur **Informations complémentaires → Exécuter quand même** pour lancer l'installation.

> **Note macOS** — Sans signature Apple, macOS peut bloquer l'app au premier lancement. Faites **Clic droit → Ouvrir** puis confirmez. Cette étape n'est nécessaire qu'une seule fois.

---

## Documentation

📘 **[Guide complet (PDF)](../docs/Onesime-Tutoriel.pdf)** — tutoriel illustré : démarrage, documents et vignettes, albums, fiches, personnes, tags, module Archives, réglages. Aussi consultable depuis l'app (À propos).

---

## Aperçu

### Explorateur de documents

<img width="1917" height="991" alt="explorer" src="https://github.com/user-attachments/assets/4eafd34d-c694-4571-8bdc-b23d6302e4c4" />


Parcourez vos archives sous forme de grille de vignettes avec lazy loading. Filtrez par type de document (photo, lettre, carte postale…), triez, recherchez.

---

### Annotation et zones

<img width="1912" height="982" alt="document" src="https://github.com/user-attachments/assets/4fa1223c-173b-4ef9-9aa9-e9d53439da28" />


Ouvrez n'importe quel document — image, PDF, vidéo, audio. Dessinez des zones sur une image pour annoter des détails, ajoutez labels, notes et transcriptions. Éditeur photo non-destructif intégré (recadrage, rotation, luminosité, contraste, miroir).

---

### Albums photo

<img width="1830" height="991" alt="albums" src="https://github.com/user-attachments/assets/e417350f-35b4-4e55-81ac-b4c8be586795" />
Composez des galeries ordonnées avec légendes. Recadrez, appliquez des effets, lancez un diaporama ou exportez en PDF.

---

### Module Archives — Registres & Actes

<img width="1912" height="677" alt="archives" src="https://github.com/user-attachments/assets/f93d1a79-50fd-483e-8402-db7ccff8f314" />


Gérez vos registres (BMS, état civil, notariés…) avec leur liste d'actes. Saisissez les parties avec rôle, âge et lieu, et liez-les directement à vos fiches Personnes.

---

### Frise chronologique

<img width="1842" height="751" alt="timeline" src="https://github.com/user-attachments/assets/9a4479c2-3124-4a1e-b451-9b1f251fddf7" />


Visualisez tous vos événements sur un axe temporel. Filtrez, triez dans les deux sens, identifiez les éléments sans date.

---

## Fonctionnalités

<details>
<summary><strong>Archives & Documents</strong></summary>

- Multi-archives — organisez vos sources par fonds (archives départementales, fonds familial, archives d'église…)
- Archives OneDrive (en option) — utilisez un dossier OneDrive comme dossier souche, en lecture seule ; les fichiers ne sont téléchargés que lorsque vous les ouvrez
- Scanner les nouvelles photos d'un dossier sans recréer toute l'archive
- Relocalisation d'archive — déplacez un dossier sans perdre vos données
- 12 types de document avec auto-détection par nom de fichier — photo, carte postale, lettre, médaille, carnet, faire-part, diplôme, carte d'identité, journal, plan, affiche, autre
- Visionneuse universelle — images, PDF, vidéo, audio
- Éditeur photo non-destructif — recadrage, rotation, luminosité, contraste, miroir
- Zones (vignettes) — dessinez des zones sur un document, ajoutez label, notes, transcription
- Lien recto/verso — associez deux documents face/dos et retournez-les d'un clic
- Export/import JSON par archive, backup et restauration de la base de données

</details>

<details>
<summary><strong>Personnes & Fiches</strong></summary>

- Fiches — regroupez des documents autour d'un thème ou d'un événement, ajoutez un avatar
- Personnes — créez une fiche individu avec photo de profil, dates et lieux de naissance/décès
- Fusion de doublons
- Actes liés — retrouvez tous les actes où une personne apparaît directement depuis sa fiche

</details>

<details>
<summary><strong>Module Archives (généalogie avancée)</strong></summary>

- Registres — BMS, état civil, notaire… avec liste d'actes intégrée
- Actes — parties avec rôle, âge, lieu, liées à des fiches Personnes
- Export PDF registre — couverture + une page par acte, prêt à imprimer

</details>

<details>
<summary><strong>Organisation & Recherche</strong></summary>

- Albums — galeries ordonnées, diaporama, export PDF
- Tags — étiquettes colorées sur documents et fiches, registre complet avec compteurs
- Frise chronologique — axe temporel, tri ascendant/descendant
- Recherche plein-texte — documents, fiches, personnes, transcriptions

</details>

<details>
<summary><strong>Intelligence locale</strong></summary>

- Reconnaissance faciale — détection et indexation des visages, 100 % sur votre machine, aucune donnée envoyée en ligne
- Transcription automatique — Onésime lit l'écriture d'un acte, d'une lettre ou du dos d'une photo et en propose le texte, avec une IA incluse qui tourne entièrement sur votre ordinateur (modèle téléchargé une fois depuis l'app, rien à installer à part)

</details>

---

## Stack technique

| Couche | Technologie |
|---|---|
| Desktop | Electron 31 |
| UI | React 18 + TypeScript + Tailwind CSS |
| Base de données | sql.js (SQLite / WebAssembly) |
| Reconnaissance faciale | face-api.js (modèles locaux) |
| Transcription (HTR) | llama.cpp (inclus) + Qwen3.5 4B / 9B, téléchargé à la demande |
| Export PDF | Electron `printToPDF` |

---

## Données & confidentialité

La base de données SQLite est stockée **localement sur votre ordinateur** (répertoire de données utilisateur géré par Electron). Aucune donnée ne quitte votre machine : Onésime fonctionne hors-ligne, sans compte ni serveur à lui. Il se connecte seulement pour vérifier au démarrage si une mise à jour est disponible (sur GitHub, sans rien envoyer vous concernant), et, si vous le demandez, pour télécharger une fois le modèle de transcription automatique (sur Hugging Face) : ensuite, la transcription se fait entièrement sur votre ordinateur, sans connexion.

Depuis **À propos**, vous pouvez sauvegarder cette base en un clic ou activer une sauvegarde automatique quotidienne (les 10 dernières sont gardées), dans le dossier de votre choix — idéalement sur un autre disque ou une clé USB.

Seule exception, et seulement si vous la choisissez : une archive peut pointer vers un dossier de votre **OneDrive**. Onésime se connecte alors à votre compte Microsoft en **lecture seule** (il ne peut rien modifier, supprimer ni déposer sur votre OneDrive) et télécharge sur votre ordinateur les fichiers que vous ouvrez. Vos fiches, vignettes, personnes et tags restent, eux, uniquement sur votre machine.

---

## Licence

Ce logiciel est distribué sous **Licence Onésime v1.0** (propriétaire).

- Utilisation personnelle et consultation du code source à des fins éducatives : **autorisées**
- Redistribution, revente ou exploitation commerciale : **interdites sans autorisation écrite**

Voir le fichier [LICENSE](./LICENSE) pour le texte complet.

---

## Auteur

Développé par **Amélien BRISEBARD**.

