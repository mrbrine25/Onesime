# Procédure de release — Onésime

## Avant chaque release

### 1. Incrémenter la version
| Changement | Exemple |
|---|---|
| Correction / petite amélioration | `0.3.1` → `0.3.2` |
| Nouvelle fonctionnalité majeure | `0.3.x` → `0.4.0` |

Fichiers à mettre à jour :
- `package.json` — champ `"version"`
- `src/renderer/src/pages/AboutPage.tsx` — texte `Version X.Y.Z`
- `CLAUDE.md` — ligne `Version actuelle`

### 2. Mettre à jour CLAUDE.md
Si la session a ajouté une fonctionnalité notable ou corrigé un bug important,
documenter dans la section **Fonctionnalités implémentées**.

---

## Build et publication — deux façons de faire

### Option A — GitHub Actions (recommandé)
> Produit automatiquement Windows + macOS sans avoir de Mac.

1. S'assurer que la version est bien incrémentée dans `package.json` et `AboutPage.tsx`
2. Créer et pousser un tag Git :
   ```bash
   git tag v0.3.3
   git push origin v0.3.3
   ```
3. GitHub Actions déclenche deux jobs en parallèle :
   - **build-windows** (`windows-latest`) → `Onesime-X.Y.Z-Setup.exe` + `latest.yml`
   - **build-macos** (`macos-latest`) → `Onesime-X.Y.Z-mac-x64.dmg` + `Onesime-X.Y.Z-mac-arm64.dmg` + `latest-mac.yml`
4. Les fichiers sont automatiquement attachés à la release GitHub créée par le tag.
5. Vérifier sur **github.com/mrbrine25/Onesime → Releases** que tous les fichiers sont bien présents.

> ⚠️ Le workflow crée la release au moment du push du tag — aucune action manuelle sur GitHub n'est nécessaire.

---

### Option B — Build local (Windows uniquement)

```bash
npm run package
```

Génère dans `dist/` :
- `Onesime-X.Y.Z-Setup.exe` — installateur Windows
- `latest.yml` — fichier de contrôle pour l'auto-update ⚠️ obligatoire

Puis publier manuellement sur GitHub :
1. **github.com/mrbrine25/Onesime → Releases → Draft a new release**
2. **Tag** : `vX.Y.Z` — doit correspondre exactement à `package.json`
3. **Titre** : `Onésime vX.Y.Z`
4. Attacher `Onesime-X.Y.Z-Setup.exe` et `latest.yml`
5. Cliquer **Publish release**

> Cette option ne produit que le build Windows. Pour macOS, utiliser l'Option A.

---

## Page de téléchargement

L'adresse à donner aux utilisateurs est **https://mrbrine25.github.io/Onesime/** (et non le dépôt) : ses boutons Windows / Mac récent / Mac Intel pointent directement sur les fichiers de la dernière release (API GitHub, aucun lien à mettre à jour). Les notes de chaque release se terminent par une section « Installer Onésime » ajoutée par le workflow (coupée dans la bannière de mise à jour de l'app).

## Fichiers de release par plateforme

| Fichier | Plateforme | Obligatoire |
|---|---|---|
| `Onesime-X.Y.Z-Setup.exe` | Windows | ✅ |
| `latest.yml` | Auto-update Windows | ✅ |
| `Onesime-X.Y.Z-mac-x64.dmg` | macOS Intel | ✅ (si release mac) |
| `Onesime-X.Y.Z-mac-arm64.dmg` | macOS Apple Silicon | ✅ (si release mac) |
| `latest-mac.yml` | Auto-update macOS | ✅ (si release mac) |

---

## Installation macOS — note pour les bêta-testeurs

Sans signature Apple (compte Developer à 99 $/an), macOS bloque l'app au premier lancement.
Inclure ces instructions avec le `.dmg` :

> **Si macOS affiche « app endommagée » ou « développeur non identifié » :**
> 1. Clic droit sur l'app → **Ouvrir**
> 2. Confirmer dans la fenêtre qui apparaît
>
> Cette étape n'est nécessaire qu'une seule fois.

---

## Annonce automatique sur Discord

À chaque tag `vX.Y.Z` poussé (donc à chaque release), le job `notify-discord` du workflow
envoie un message dans un salon Discord via webhook, avec le lien vers la release GitHub et un
résumé des changements. Ce résumé est repris tel quel du message du commit taggé — d'où l'intérêt
de garder la convention "type: vX.Y.Z — résumé" + liste à puces sur le commit de version.

Mise en place (une seule fois) :
1. Discord → **Paramètres du serveur → Intégrations → Webhooks → Nouveau webhook**
2. Choisir le salon où poster les annonces, copier l'URL du webhook
3. Sur GitHub : **repo → Settings → Secrets and variables → Actions → New repository secret**
   - Nom : `DISCORD_WEBHOOK_URL`
   - Valeur : l'URL copiée à l'étape 2

Si le secret n'est pas configuré, le job ne fait rien (pas d'erreur, juste un message dans les logs) —
le reste de la release (build, publication GitHub) n'est jamais bloqué par ça.

---

## Mettre à jour la page GitHub Pages

Si `contenu.json` ou `index.html` ont changé :

1. Copier les fichiers modifiés depuis `README/` vers la racine du repo de distribution
2. `git add`, `git commit`, `git push`
3. GitHub Pages se redéploie automatiquement (1-2 min)

---

## Checklist complète avant de publier

- [ ] Version incrémentée dans `package.json`
- [ ] Version incrémentée dans `AboutPage.tsx`
- [ ] `CLAUDE.md` à jour
- [ ] Tag Git créé au format `vX.Y.Z`
- [ ] Tag poussé sur GitHub (`git push origin vX.Y.Z`)
- [ ] GitHub Actions terminé sans erreur (onglet Actions sur GitHub)
- [ ] Release visible sur GitHub avec tous les fichiers attachés
- [ ] Release publiée (pas en draft)

---

## Auto-update — comment ça fonctionne

Au démarrage de l'app, elle vérifie silencieusement `latest.yml` (Windows) ou `latest-mac.yml` (macOS)
sur GitHub Releases. Si une version plus récente est détectée, elle télécharge l'installateur en arrière-plan.
Une bannière violette apparaît quand la mise à jour est prête → bouton **Redémarrer**.

L'utilisateur peut ignorer la bannière — l'installation se fera automatiquement
à la prochaine fermeture de l'application.

> ⚠️ L'auto-update macOS nécessite une app signée (compte Apple Developer). Sans signature,
> la vérification échoue silencieusement — les utilisateurs Mac devront télécharger manuellement.


# Mettre à jour le readme
1. Va sur github.com/mrbrine25/Onesime
2. Clique sur Add file → Upload files
3. Fais glisser les 3 fichiers depuis E:\Onesime\README\ :
  - index.html
  - contenu.json
  - README.md
4. Message de commit : chore: mise à jour landing page v0.3.2 (macOS)
5. Commit changes
Les fichiers existants dans le repo seront remplacés automatiquement.