# ONÉSIME — Document de valorisation des parts
### Version 1.0 — Avril 2026
### Confidentiel — usage restreint aux parties concernées

---

## TABLE DES MATIÈRES

1. Résumé exécutif
2. Présentation du projet
3. Analyse du marché
4. Atouts technologiques & propriété intellectuelle
5. Estimation du coût de développement
6. Modèle économique et projections
7. Méthodes de valorisation
8. Structure capitalistique proposée
9. Droits et obligations des associés
10. Facteurs de risque
11. Feuille de route
12. Conclusion & tableau de synthèse

---

## 1. RÉSUMÉ EXÉCUTIF

**Onésime** est un logiciel de bureau (desktop) dédié à la gestion d'archives généalogiques et documentaires, développé en France à partir de 2025. Il cible les généalogistes amateurs et professionnels, les archivistes, les historiens locaux et les familles souhaitant valoriser leur patrimoine documentaire.

Le logiciel est distribué en licence propriétaire (source fermée), fonctionne entièrement hors-ligne (pas de dépendance cloud), intègre un moteur de **reconnaissance faciale 100 % local** et couvre l'ensemble du cycle de vie d'un document d'archive : import, indexation, annotation, enrichissement, publication.

À la date du présent document (avril 2026), Onésime est en version **0.2.0.0**, fonctionnel et buildable, avec une base de code estimée à **8 000–10 000 lignes de code TypeScript/TSX** représentant environ **400–500 heures de développement** à un rythme soutenu.

| Indicateur | Valeur estimée |
|---|---|
| Coût de reconstitution du code | 30 000 € – 50 000 € |
| Valorisation pré-revenu (méthode comparative) | 40 000 € – 80 000 € |
| Valorisation avec hypothèse de revenus (DCF 5 ans) | 60 000 € – 150 000 € |
| **Fourchette de valorisation retenue** | **50 000 € – 100 000 €** |

---

## 2. PRÉSENTATION DU PROJET

### 2.1 Concept

Onésime est un logiciel de gestion d'archives personnelles et familiales. Contrairement aux outils en ligne (Ancestry, MyHeritage, Geneanet…), il stocke toutes les données **localement** sur la machine de l'utilisateur. Aucune donnée ne quitte l'ordinateur, ce qui constitue un avantage fort sur le plan de la confidentialité et de la conformité RGPD.

### 2.2 Fonctionnalités v0.2.0.0 (avril 2026)

| Module | Fonctionnalités clés |
|---|---|
| **Archives** | Multi-archives, import de dossiers entiers, aucune copie de fichier |
| **Explorateur** | Navigation arborescente, tri persistant, import par lot |
| **Documents** | Titre, date, description, transcription, tags colorés, recto/verso |
| **Éditeur photo** | Rognage, rotation, luminosité, contraste, miroir (non destructif) |
| **Vignettes (zones)** | Dessin de zones sur image, label, notes, export PNG |
| **Reconnaissance faciale** | Détection auto, indexation, recherche par similarité (100 % local, sans cloud) |
| **Réindexation en lot** | Ré-analyse de toute l'archive en arrière-plan, annulable |
| **Personnes** | Fiche individu, photo de profil, dates et lieux naissance/décès, fusion |
| **Fiches** | Regroupement thématique, tags, impression/export PDF |
| **Albums** | Galerie, glisser-déposer, vue grille/liste/pages (1–4 photos par page configurable), diaporama, impression |
| **Tags** | Registre coloré, compteur par tag, vue filtrée |
| **Frise chronologique** | Axe vertical, filtres, éléments sans date |
| **Recherche** | Plein-texte sur fiches, documents, personnes, transcriptions |
| **Import / Export** | Import GEDCOM (personnes), sauvegarde base SQLite |

### 2.3 Stack technique

| Couche | Technologie |
|---|---|
| Desktop | **Electron 31** (Windows, macOS, Linux) |
| Frontend | **React 18** + **TypeScript** + **Tailwind CSS** |
| Base de données | **SQLite via sql.js** (embarqué, zéro dépendance serveur) |
| Reconnaissance faciale | **@vladmandic/face-api** (modèles locaux, WebGL) |
| Build | **electron-vite**, electron-builder |
| Persistance | Fichier `.sqlite` local, migrations automatiques |

### 2.4 Propriété intellectuelle

Le code source est la propriété exclusive du développeur fondateur. Il n'utilise que des dépendances open-source sous licences permissives (MIT, Apache 2.0). La marque **Onésime** n'est pas encore déposée à l'INPI (opportunité d'action).

---

## 3. ANALYSE DU MARCHÉ

### 3.1 Taille du marché

La généalogie est la **deuxième activité de loisir la plus pratiquée en France** après le jardinage (sondage INSEE, diverses études). On estime à :

- **6 à 8 millions** de Français pratiquant la généalogie à titre amateur
- **~50 000** généalogistes professionnels ou semi-professionnels en Europe
- Marché mondial de la généalogie évalué à **~1,4 milliard USD en 2024**, avec une croissance annuelle de **~5–6 %** (Source : Global Genealogy Market reports)

### 3.2 Segments cibles

| Segment | Taille estimée (France) | Disposition à payer |
|---|---|---|
| Généalogistes amateurs passionnés | 800 000 – 1 200 000 | 20–60 € (licence) / 5–15 €/mois |
| Associations de généalogie | ~3 000 associations | 100–300 € (licence pro) |
| Archivistes & historiens locaux | ~15 000 | 150–500 € (pro + support) |
| Services d'archives municipales | ~5 000 | 500–2 000 € (licence institution) |

### 3.3 Concurrence

| Concurrent | Type | Prix | Limites |
|---|---|---|---|
| **Heredis** | Desktop propriétaire | 59–99 € | Centré GEDCOM, pas d'archivage photo avancé |
| **MacFamilyTree** | Desktop (Mac only) | 29–49 € | Mac uniquement, pas de RA faciale |
| **Ancestry** | SaaS cloud | 12–20 €/mois | Données sur serveurs tiers, abonnement perpétuel |
| **Geneanet** | SaaS freemium | 0–10 €/mois | Cloud, collaboratif mais pas de gestion locale |
| **Gramps** | Open source desktop | Gratuit | Interface vieillissante, courbe d'apprentissage élevée |

**Avantage différenciel d'Onésime :** seul outil combinant gestion documentaire avancée (zones, vignettes, albums), reconnaissance faciale locale, éditeur photo non-destructif et confidentialité totale des données.

---

## 4. ATOUTS TECHNOLOGIQUES & PROPRIÉTÉ INTELLECTUELLE

### 4.1 Barrières à l'entrée

- **Reconnaissance faciale locale** : intégration de modèles de deep learning (face-api.js) dans une app desktop — représente plusieurs semaines de R&D en soi
- **Architecture non-destructive** : toutes les modifications photo (crop, rotation, filtres) sont stockées sous forme de paramètres, le fichier source n'est jamais altéré
- **SQLite embarqué** : aucune installation de serveur requise, déploiement immédiat
- **Multi-archives** : gestion de projets cloisonnés (branches familiales distinctes, projets clients…)

### 4.2 Actifs immatériels

| Actif | Description | Valeur estimée |
|---|---|---|
| Code source | ~10 000 lignes TypeScript/TSX, architecture modulaire | 30 000–50 000 € |
| Savoir-faire RA faciale | Intégration, optimisation, UX de la reconnaissance | 5 000–10 000 € |
| Marque "Onésime" | Nom, identité visuelle, logo SVG propriétaire | 2 000–5 000 € |
| Base utilisateurs | 0 à ce jour (pré-lancement) | — |
| **Total actifs immatériels** | | **37 000–65 000 €** |

---

## 5. ESTIMATION DU COÛT DE DÉVELOPPEMENT

### 5.1 Décompte des heures

| Phase | Modules couverts | Heures estimées |
|---|---|---|
| Architecture & infrastructure | Electron, IPC, SQLite, migrations, preload | 40–60 h |
| Explorateur & documents | Browser, import, éditeur, recto/verso | 50–70 h |
| Système de zones & vignettes | Dessin, labels, export, ZoneEditor | 40–60 h |
| Reconnaissance faciale | Intégration face-api, indexation, recherche, batch | 60–90 h |
| Personnes & fiches | Fiches, PersonsPage, PersonPage, fusion, lieux | 40–60 h |
| Albums | Galerie, drag-drop, vue pages, diaporama, impression | 50–70 h |
| Tags, Frise, Recherche, À propos | Modules transverses | 30–50 h |
| UI/UX & design system | Tailwind, composants, Layout, Logo SVG | 30–50 h |
| Tests, débogage, build | Electron-vite, electron-builder, QA | 20–40 h |
| **Total** | | **360–550 heures** |

### 5.2 Coût de reconstitution (coût de remplacement)

| Profil | Taux journalier (TJM) | Coût total |
|---|---|---|
| Développeur junior | 300 €/jour (37,5 €/h) | 13 500 € – 20 600 € |
| Développeur confirmé | 500 €/jour (62,5 €/h) | 22 500 € – 34 400 € |
| Développeur senior / freelance spécialisé | 700 €/jour (87,5 €/h) | 31 500 € – 48 100 € |

> **Coût de reconstitution retenu : 30 000 € – 50 000 €** (base développeur confirmé à senior)

Cette valeur représente le montant qu'il faudrait dépenser pour recréer un logiciel équivalent depuis zéro — c'est le plancher de la valorisation.

---

## 6. MODÈLE ÉCONOMIQUE ET PROJECTIONS

### 6.1 Options de monétisation

**Option A — Licence perpétuelle (recommandé pour le lancement)**
- Prix public : 39 € (standard) / 79 € (pro avec mises à jour 2 ans)
- Simple, pas d'abonnement, fidélise une communauté

**Option B — Abonnement annuel (SaaS light)**
- 4,99 €/mois ou 39 €/an
- Revenus récurrents mais nécessite infrastructure de licence

**Option C — Freemium**
- Gratuit (1 archive, fonctions de base) + Pro 39 €/an
- Conversion estimée 2–5 % des utilisateurs gratuits

**Option D — Licence institution**
- Services d'archives, mairies, associations
- 299–999 € par poste, support inclus

### 6.2 Projections financières (scénario central — licence perpétuelle)

Les hypothèses ci-dessous sont **conservatrices** et supposent une commercialisation débutant au S2 2026 avec un budget marketing minimal (réseaux sociaux, forums généalogiques, YouTube).

| Année | Utilisateurs payants | Prix moyen | Revenu brut | Charges (héberg., marketing, mises à jour) | Résultat net |
|---|---|---|---|---|---|
| 2026 (S2) | 50 | 45 € | 2 250 € | 1 500 € | 750 € |
| 2027 | 300 | 45 € | 13 500 € | 5 000 € | 8 500 € |
| 2028 | 800 | 50 € | 40 000 € | 12 000 € | 28 000 € |
| 2029 | 1 800 | 55 € | 99 000 € | 25 000 € | 74 000 € |
| 2030 | 3 500 | 55 € | 192 500 € | 45 000 € | 147 500 € |

> *Scénario pessimiste : diviser par 3. Scénario optimiste : multiplier par 2–3 (campagne presse spécialisée, partenariats associatifs).*

---

## 7. MÉTHODES DE VALORISATION

Trois méthodes complémentaires sont appliquées. La valorisation finale est une moyenne pondérée.

### 7.1 Méthode par le coût de reconstitution (actifs)

> Valeur = coût pour recréer un logiciel équivalent depuis zéro

**Résultat : 30 000 € – 50 000 €**

C'est le plancher absolu. En-dessous de ce montant, il serait rationnel de recoder plutôt qu'acheter.

### 7.2 Méthode des comparables (multiples de marché)

Les logiciels de niche desktop en phase early-stage se valorisent généralement entre **1× et 5×** leur revenu annuel projeté à 2 ans, ou entre **2× et 8×** leur coût de développement.

| Multiple | Base | Valorisation |
|---|---|---|
| 2× coût de dev | 40 000 € | 80 000 € |
| 3× revenu annuel projeté 2027 | 13 500 € | 40 500 € |
| 5× revenu annuel projeté 2027 | 13 500 € | 67 500 € |
| 10× revenu annuel projeté 2027 | 13 500 € | 135 000 € |

**Résultat : 40 000 € – 100 000 €**

### 7.3 Méthode par les flux futurs actualisés (DCF, 5 ans)

Actualisation des résultats nets prévisionnels à un taux de 15 % (risque startup / early-stage) :

| Année | Résultat net | Facteur d'actualisation (15 %) | Valeur actualisée |
|---|---|---|---|
| 2026 | 750 € | 0,87 | 652 € |
| 2027 | 8 500 € | 0,76 | 6 452 € |
| 2028 | 28 000 € | 0,66 | 18 450 € |
| 2029 | 74 000 € | 0,57 | 42 237 € |
| 2030 | 147 500 € | 0,50 | 73 258 € |
| **Valeur terminale** (×8 résultat 2030) | 1 180 000 € | 0,50 | **589 000 €** |
| **Total VAN** | | | **~730 000 €** |

> La valeur terminale représente la valeur de revente hypothétique du logiciel après 5 ans d'exploitation. **Attention : ce chiffre est très sensible aux hypothèses.** Avec un scénario pessimiste (÷3), la VAN tombe à ~240 000 €. Ce chiffre illustre le **potentiel**, pas la valeur actuelle.

**Valeur DCF pondérée retenue (forte décote early-stage 70–80 %) : 50 000 € – 150 000 €**

### 7.4 Synthèse — Valorisation retenue

| Méthode | Résultat | Pondération |
|---|---|---|
| Coût de reconstitution | 30 000 – 50 000 € | 30 % |
| Comparables marché | 40 000 – 100 000 € | 40 % |
| DCF actualisé (décote) | 50 000 – 150 000 € | 30 % |
| **VALORISATION TOTALE** | **50 000 € – 100 000 €** | |

> **Valeur centrale recommandée : 65 000 – 75 000 €** pour une cession partielle de parts (minoritaire). En cas de cession majoritaire ou totale, une prime de contrôle de 15–25 % est habituelle.

---

## 8. STRUCTURE CAPITALISTIQUE PROPOSÉE

### 8.1 Répartition suggérée

La structure suivante permet au fondateur de rester majoritaire tout en ouvrant le capital à des associés :

| Part | Pourcentage | Valeur (base 70 000 €) | Rôle |
|---|---|---|---|
| Fondateur | 60 % | 42 000 € | Développement, stratégie, direction |
| Associé(s) investisseur(s) | 30 % | 21 000 € | Apport financier, réseau |
| Réserve (BSPCE / futurs associés) | 10 % | 7 000 € | Fidélisation future |

> Exemple concret : 1 associé investisseur apporte **21 000 €** pour **30 %** des parts (valorisation pré-money : 49 000 €, post-money : 70 000 €).

### 8.2 Ticket d'entrée minimum suggéré

| Part | Pourcentage | Ticket |
|---|---|---|
| Part symbolique | 2 % | 1 400 € |
| Part minoritaire petite | 5 % | 3 500 € |
| Part minoritaire standard | 10 % | 7 000 € |
| Part minoritaire significative | 20 % | 14 000 € |
| Part majoritaire | 51 % | 35 700 € |

---

## 9. DROITS ET OBLIGATIONS DES ASSOCIÉS

### 9.1 Droits financiers

- **Droit aux bénéfices** au prorata des parts détenues
- **Droit à l'information** : accès aux comptes annuels et aux rapports d'activité
- **Droit de préemption** : priorité d'achat si un associé souhaite céder ses parts

### 9.2 Droits non financiers

- **Droit de vote** en assemblée (une part = une voix, sauf clause spécifique)
- **Droit au nom** : les associés investisseurs peuvent être mentionnés dans les crédits du logiciel et sur le site officiel
- Accès à une version **Pro à vie** du logiciel

### 9.3 Obligations

- Les associés s'engagent à **ne pas divulguer** le code source ni les informations confidentielles
- Engagement de **non-concurrence directe** (développement d'un logiciel similaire) pendant la durée de l'association
- Toute cession de parts à un tiers est soumise à **l'agrément du fondateur**

### 9.4 Clause de sortie

- À partir de l'année 3, possibilité de rachat des parts au **prix du marché** à date (nouvelle valorisation indépendante)
- En cas de cession totale du logiciel à un tiers, les associés participent au produit de cession **au prorata de leurs parts**

---

## 10. FACTEURS DE RISQUE

| Risque | Probabilité | Impact | Mitigation |
|---|---|---|---|
| Faible adoption initiale | Moyenne | Élevé | Marketing ciblé forums/YouTube, version d'essai 30 jours |
| Concurrent qui copie les fonctionnalités | Faible | Moyen | Avance technique, relation utilisateur, marque |
| Dépendance à Electron (performance) | Faible | Faible | Architecture modulaire, migration possible vers Tauri |
| Changement de licence des dépendances | Très faible | Faible | Suivi actif, dépendances MIT/Apache uniquement |
| Abandon du développement par le fondateur | Faible | Très élevé | Clause de reprise dans les statuts, documentation technique |
| Marché de niche trop petit | Faible | Élevé | Extension possible : historiens, archivistes, mairies |
| Piratage du logiciel | Moyenne | Faible | Système de licence à clé, version trial limitée |

---

## 11. FEUILLE DE ROUTE

### Court terme (v0.3 — S2 2026)
- [ ] Site vitrine & landing page (Onésime.fr)
- [ ] Système de licence & paiement en ligne (Stripe / Paddle)
- [ ] Export GEDCOM complet
- [ ] Synchronisation optionnelle vers NAS personnel (Synology, etc.)
- [ ] Version macOS signée (notarisation Apple)

### Moyen terme (v1.0 — 2027)
- [ ] Mode collaboratif local (réseau familial sans cloud)
- [ ] Impression de livres d'histoire de famille (PDF mis en page)
- [ ] Plugin import depuis Ancestry/Geneanet
- [ ] Interface disponible en anglais (ouverture marché UK/US/Canada)
- [ ] Application mobile compagnon (iOS/Android, consultation uniquement)

### Long terme (v2.0 — 2028–2030)
- [ ] Marketplace de thèmes et plugins communautaires
- [ ] IA de suggestion de liens familiaux (hors cloud)
- [ ] Partenariats avec archives départementales et associations nationales
- [ ] Éventuelle version SaaS opt-in (chiffrement de bout en bout)

---

## 12. CONCLUSION & TABLEAU DE SYNTHÈSE

Onésime se positionne sur un marché de niche porteur, avec une solution techniquement différenciée (reconnaissance faciale locale, respect de la vie privée, gestion documentaire avancée) et un code source solide représentant plusieurs centaines d'heures de travail qualifié.

La valorisation retenue de **65 000 à 75 000 €** reflète :
- La réalité du stade early-stage (pré-revenu)
- La qualité et l'étendue du code livré
- Le potentiel de marché documenté
- La décote habituelle appliquée aux projets sans historique commercial

**Tableau de synthèse final**

| Critère | Valeur |
|---|---|
| Stade du projet | Version 0.2.0.0 — fonctionnel, buildable, pré-commercial |
| Heures de développement | 360–550 heures |
| Coût de reconstitution | 30 000 – 50 000 € |
| **Valorisation retenue** | **65 000 – 75 000 €** |
| Part disponible recommandée | 30–40 % (fondateur reste majoritaire) |
| **Ticket pour 10 %** | **6 500 – 7 500 €** |
| **Ticket pour 20 %** | **13 000 – 15 000 €** |
| **Ticket pour 30 %** | **19 500 – 22 500 €** |

---

> **Avertissement légal :** Ce document est fourni à titre informatif et ne constitue pas une offre de valeurs mobilières réglementées. Toute entrée au capital d'une société doit faire l'objet d'un acte juridique formel (statuts, pacte d'associés) rédigé ou validé par un professionnel du droit (avocat, notaire, expert-comptable). Les projections financières présentées reposent sur des hypothèses et n'engagent pas le fondateur quant aux résultats futurs.

---

*Document rédigé en avril 2026 — Confidentiel*
*Contact : m.brine25190@gmail.com*
