

<div align="center">
  <img width="1602" height="465" alt="banner" src="https://github.com/user-attachments/assets/f247daba-6ed7-4852-bf2d-100064af58f7" />
</div>

<div align="center">

![Version](https://img.shields.io/badge/version-0.3.0-8b5cf6?style=flat-square)
![Platform](https://img.shields.io/badge/platform-Windows-blue?style=flat-square&logo=windows)
![Electron](https://img.shields.io/badge/Electron-31-47848F?style=flat-square&logo=electron)
![Licence](https://img.shields.io/badge/licence-propriétaire-orange?style=flat-square)

</div>

<br>

**Onésime** est un logiciel de bureau pour **organiser, annoter et explorer vos archives généalogiques** — photos de famille, actes notariés, lettres, médailles, carnets… Toutes vos données restent sur votre ordinateur. Aucun cloud, aucun abonnement, aucune fuite.

---

## Téléchargement

Rendez-vous dans l'onglet **[Releases](../../releases/latest)** pour télécharger la dernière version.

| Fichier | Système |
|---|---|
| `Onesime-Setup-0.3.0.exe` | Windows 10 / 11 |

> **Note Windows** — À la première exécution, Windows peut afficher un avertissement « application inconnue ». Cliquez sur **Informations complémentaires → Exécuter quand même** pour lancer l'installation.

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

<img width="1830" height="991" alt="albums" src="https://github.com/user-attachments/assets/e417350f-35b4-4e55-81ac-b4c8be586795" />![Uploading archives.png .png…]()


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
- HTR (transcription automatique) — lisez les vieux manuscrits grâce à [Ollama](https://ollama.com/) + qwen2.5-vl (modèle IA local, optionnel)

</details>

---

## Stack technique

| Couche | Technologie |
|---|---|
| Desktop | Electron 31 |
| UI | React 18 + TypeScript + Tailwind CSS |
| Base de données | sql.js (SQLite / WebAssembly) |
| Reconnaissance faciale | face-api.js (modèles locaux) |
| HTR | Ollama + qwen2.5-vl:7b |
| Export PDF | Electron `printToPDF` |

---

## Données & confidentialité

La base de données SQLite est stockée **localement sur votre ordinateur** (répertoire de données utilisateur géré par Electron). Aucune donnée ne quitte votre machine. Onésime fonctionne entièrement hors-ligne — aucun compte requis, aucun serveur distant.

---

## Licence

Ce logiciel est distribué sous **Licence Onésime v1.0** (propriétaire).

- Utilisation personnelle et consultation du code source à des fins éducatives : **autorisées**
- Redistribution, revente ou exploitation commerciale : **interdites sans autorisation écrite**

Voir le fichier [LICENSE](./LICENSE) pour le texte complet.

---

## Auteur

Développé par **Amélien BRISEBARD**.

