import { useState } from 'react'
import OnesimeLogo from '../components/OnesimeLogo'

const FEATURES = [
  {
    title: 'Archives',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <rect x="2" y="4" width="20" height="5" rx="1" />
        <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" />
        <path d="M10 13h4" />
      </svg>
    ),
    content: (
      <>
        <p>Une <strong>archive</strong> est un dossier racine sur votre disque. Onésime ne copie jamais vos fichiers — il les référence directement depuis leur emplacement d'origine.</p>
        <p className="mt-2">Créez autant d'archives que vous voulez (une par branche familiale, par projet…). Toutes vos données (fiches, albums, tags…) restent attachées à l'archive concernée.</p>
      </>
    ),
  },
  {
    title: 'Explorateur de fichiers',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
    content: (
      <>
        <p>Parcourez l'arborescence de votre archive et importez des fichiers (images, PDF, vidéos, audio…) en un clic pour en faire des <strong>documents</strong>.</p>
        <ul className="mt-2 space-y-1 list-disc list-inside text-slate-300">
          <li><strong>Tri</strong> par nom, date ou type de fichier</li>
          <li><strong>Chargement par lot</strong> : 50 documents affichés à la fois pour rester fluide</li>
          <li><strong>Double-clic</strong> sur une photo pour l'agrandir en plein écran — naviguez avec ← →, fermez avec Échap</li>
          <li>Les documents <strong>recto/verso</strong> sont regroupés sur une seule carte (badge R/V)</li>
          <li><strong>Survol d'une photo</strong> → icône crayon pour retoucher directement (rognage, rotation, luminosité, contraste, miroir)</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Documents',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    ),
    content: (
      <>
        <p>Chaque document importé peut recevoir un <strong>titre</strong>, une <strong>date</strong>, une <strong>description</strong> et une <strong>transcription</strong>. Les images peuvent être visualisées en plein écran.</p>
        <p className="mt-2">Vous pouvez <strong>relier deux documents</strong> (recto/verso d'un acte, original + traduction…) et leur attribuer des <strong>étiquettes (tags)</strong> colorées pour les retrouver facilement.</p>
        <p className="mt-2">Pour les images, un bouton <strong>Retoucher</strong> est disponible directement dans l'en-tête du document — rognage, rotation, luminosité, contraste et miroir, sans jamais modifier le fichier source.</p>
      </>
    ),
  },
  {
    title: 'Module Archives — Actes & Registres',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="8" y1="13" x2="16" y2="13"/>
        <line x1="8" y1="17" x2="13" y2="17"/>
        <line x1="8" y1="9" x2="10" y2="9"/>
      </svg>
    ),
    content: (
      <>
        <p>Le <strong>Module Archives</strong> (bouton dédié en bas de la barre latérale) est un espace spécialisé pour le dépouillement d'actes généalogiques.</p>
        <p className="mt-3 font-medium text-white">Actes</p>
        <ul className="mt-1 space-y-1 list-disc list-inside text-slate-300">
          <li>Importez des <strong>images ou PDF</strong> pour créer des actes en masse</li>
          <li>Typez chaque acte : naissance, baptême, mariage, décès, sépulture, contrat de mariage, acte notarié, recensement…</li>
          <li>Renseignez date, lieu, folio, numéro d'acte, description et transcription</li>
          <li>Ajoutez des <strong>parties</strong> avec leur rôle (principal·e, père, mère, époux, témoin, officiant, déclarant…), leur âge, profession et domicile</li>
          <li>Basculez entre <strong>vue grille</strong> (portrait) et <strong>vue liste</strong></li>
        </ul>
        <p className="mt-3 font-medium text-white">Registres</p>
        <ul className="mt-1 space-y-1 list-disc list-inside text-slate-300">
          <li>Regroupez vos actes en <strong>registres</strong> (BMS, état civil, notaire, cadastre…)</li>
          <li>Définissez des <strong>valeurs par défaut</strong> (type d'acte, lieu) appliquées automatiquement à chaque acte relié</li>
          <li>Reliez plusieurs actes à la fois depuis la vue registre</li>
          <li>Le bouton <strong>Rafraîchir</strong> applique rétroactivement les défauts à tous les actes déjà reliés</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Vignettes & Reconnaissance faciale',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
    content: (
      <>
        <p>Sur un document image, dessinez des <strong>vignettes</strong> (rectangles de sélection) pour isoler une zone d'intérêt : visage, signature, cachet…</p>
        <p className="mt-2">Chaque vignette peut avoir un <strong>label</strong>, des <strong>notes</strong>, une <strong>transcription</strong> et être <strong>exportée</strong> en PNG. Vous pouvez également lui associer une ou plusieurs <strong>personnes</strong>.</p>
        <p className="mt-2 text-violet-400 font-medium">Reconnaissance faciale (100 % locale, sans cloud)</p>
        <ul className="mt-1 space-y-1 list-disc list-inside text-slate-300">
          <li>Bouton <strong>Détecter les visages</strong> (en-tête du document) : crée automatiquement des vignettes sur tous les visages détectés</li>
          <li>Bouton <strong>Détecter les visages</strong> (dans l'explorateur) : scanne toute l'archive en une passe</li>
          <li>Dans une vignette, section <em>Reconnaissance faciale</em> : <strong>Analyser</strong> pour indexer, puis <strong>Rechercher</strong> pour trouver des ressemblances dans toute l'archive</li>
          <li><strong>Confirmer</strong> un résultat pour lier la personne à la vignette trouvée</li>
          <li>Bouton <strong>Réindexer archive</strong> : réanalyse en lot toutes les vignettes, avec progression en temps réel et annulable</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Personnes & individus',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    content: (
      <>
        <p>Les personnes s'utilisent <strong>depuis un document image</strong> :</p>
        <ol className="mt-2 space-y-1 list-decimal list-inside text-slate-300">
          <li>Ouvrez un document image</li>
          <li>Dessinez une vignette sur le visage ou la zone voulue</li>
          <li>Dans le panneau droit, section <em>Personnes liées</em>, cliquez <strong>+ Ajouter</strong></li>
          <li>Choisissez une personne existante ou créez-en une nouvelle</li>
        </ol>
        <p className="mt-2">La vignette peut ensuite être définie comme <strong>photo de profil</strong> (bouton <em>Photo profil</em>). Chaque personne peut renseigner un lieu de naissance et un lieu de décès.</p>
      </>
    ),
  },
  {
    title: 'Fiches personnes',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
    content: (
      <>
        <p>Les <strong>fiches</strong> regroupent des documents autour d'une personne ou d'un événement. Chaque fiche peut avoir une <strong>photo de profil</strong> (extraite d'une vignette), des <strong>tags</strong> et une description.</p>
        <p className="mt-2">Les documents rattachés s'affichent en paires recto/verso si reliés. Depuis la fiche, cliquez sur un document pour l'ouvrir.</p>
        <p className="mt-2">Le bouton <strong>Imprimer</strong> génère une mise en page soignée avec la photo de profil, la date, les tags, la description et la grille de documents — prête pour l'impression ou l'export PDF.</p>
      </>
    ),
  },
  {
    title: 'Albums',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15 16 10 5 21" />
      </svg>
    ),
    content: (
      <>
        <p>Les albums permettent de composer des <strong>galeries vivantes</strong> à partir de vos documents images.</p>
        <ul className="mt-2 space-y-1 list-disc list-inside text-slate-300">
          <li>Réorganisez les photos par <strong>glisser-déposer</strong></li>
          <li>Ajoutez une <strong>légende</strong> à chaque photo</li>
          <li>Éditez chaque photo : rognage, rotation, luminosité, contraste, miroir</li>
          <li><strong>Diaporama</strong> plein écran avec lecture automatique (bouton ▶)</li>
          <li>Basculez entre <strong>vue grille</strong>, <strong>vue liste</strong> et <strong>vue pages</strong></li>
        </ul>
        <p className="mt-2">La <strong>vue pages</strong> présente l'album comme un livre : naviguez page par page, ajustez le nombre de photos par page (1 à 4) et retouchez directement en survol.</p>
        <p className="mt-2">Le bouton <strong>Imprimer</strong> génère une grille de toutes les photos avec leurs légendes.</p>
      </>
    ),
  },
  {
    title: 'Tags',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
    content: (
      <>
        <p>Les <strong>tags</strong> sont des étiquettes colorées que vous pouvez attribuer à n'importe quel document ou fiche.</p>
        <p className="mt-2">Le <strong>Registre de tags</strong> (icône étiquette dans la barre latérale) vous permet de :</p>
        <ul className="mt-1 space-y-1 list-disc list-inside text-slate-300">
          <li>Créer, renommer et recolorer vos tags</li>
          <li>Voir le nombre de documents par tag</li>
          <li>Cliquer sur le compteur pour <strong>voir toutes les photos</strong> portant ce tag</li>
        </ul>
      </>
    ),
  },
  {
    title: 'Frise chronologique',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <line x1="12" y1="2" x2="12" y2="22" />
        <circle cx="12" cy="7" r="2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="13" r="2" fill="currentColor" stroke="none" />
        <circle cx="12" cy="19" r="2" fill="currentColor" stroke="none" />
      </svg>
    ),
    content: (
      <>
        <p>La <strong>frise chronologique</strong> affiche tous vos documents et fiches classés par année.</p>
        <ul className="mt-2 space-y-1 list-disc list-inside text-slate-300">
          <li>Les événements alternent gauche/droite autour d'un axe central</li>
          <li>Filtrez par type : documents, fiches, ou les deux</li>
          <li>Les éléments sans date apparaissent en bas dans une section dédiée</li>
          <li>Cliquez sur un élément pour accéder directement à sa fiche ou son document</li>
        </ul>
        <p className="mt-2">Plus vous renseignez le champ <em>Date</em> de vos éléments, plus la frise est riche.</p>
      </>
    ),
  },
  {
    title: 'Recherche',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
    content: (
      <>
        <p>La recherche plein-texte parcourt simultanément vos <strong>fiches</strong>, <strong>documents</strong> et <strong>personnes</strong> (titres, descriptions, transcriptions…).</p>
        <p className="mt-2">Les résultats sont groupés par type et cliquables pour accéder directement à l'élément concerné.</p>
      </>
    ),
  },
]

const CREDITS = [
  {
    name: 'Electron',
    url: 'https://www.electronjs.org',
    desc: 'Framework desktop multi-plateformes',
    license: 'MIT',
  },
  {
    name: 'React',
    url: 'https://react.dev',
    desc: 'Bibliothèque UI',
    license: 'MIT',
  },
  {
    name: 'Vite / electron-vite',
    url: 'https://electron-vite.org',
    desc: 'Bundler et outillage de développement',
    license: 'MIT',
  },
  {
    name: 'sql.js',
    url: 'https://sql.js.org',
    desc: 'SQLite compilé en WebAssembly — base de données locale',
    license: 'MIT',
  },
  {
    name: '@vladmandic/face-api',
    url: 'https://github.com/vladmandic/face-api',
    desc: 'Reconnaissance faciale locale basée sur TensorFlow.js',
    license: 'MIT',
  },
  {
    name: 'Tailwind CSS',
    url: 'https://tailwindcss.com',
    desc: 'Framework CSS utilitaire',
    license: 'MIT',
  },
  {
    name: 'TypeScript',
    url: 'https://www.typescriptlang.org',
    desc: 'Typage statique pour JavaScript',
    license: 'Apache 2.0',
  },
  {
    name: 'React Router',
    url: 'https://reactrouter.com',
    desc: 'Navigation côté client',
    license: 'MIT',
  },
]

function CreditsAccordion() {
  const [open, setOpen] = useState(false)
  return (
    <div className="mb-8 border border-navy-700 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-navy-700/50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-slate-500 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
            <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
          </svg>
        </span>
        <span className="flex-1 text-sm font-medium text-slate-400">Technologies utilisées</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`w-4 h-4 text-slate-500 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="border-t border-navy-700/60 bg-navy-800/30 divide-y divide-navy-700/40">
          {CREDITS.map(c => (
            <div key={c.name} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">{c.name}</span>
                  <span className="text-xs text-slate-600 border border-navy-600 rounded px-1.5 py-0.5">{c.license}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{c.desc}</p>
              </div>
              <a href={c.url} target="_blank" rel="noreferrer"
                className="flex-shrink-0 text-slate-600 hover:text-slate-300 transition-colors" title={c.url}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AccordionItem({ title, icon, content }: { title: string; icon: React.ReactNode; content: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-navy-700 rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-navy-700/50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="text-violet-400 flex-shrink-0">{icon}</span>
        <span className="flex-1 text-sm font-medium text-white">{title}</span>
        <svg
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className={`w-4 h-4 text-slate-500 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 text-sm text-slate-400 border-t border-navy-700/60 bg-navy-800/30">
          {content}
        </div>
      )}
    </div>
  )
}

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      {/* Hero */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="mb-6 drop-shadow-xl">
          <OnesimeLogo size={80} />
        </div>
        <h1 className="text-3xl font-bold text-white mb-1">Onésime</h1>
        <p className="text-slate-500 text-sm mb-4">Version 0.2.5.0</p>
        <p className="text-slate-400 text-base max-w-md">
          Logiciel de gestion d'archives pour généalogistes et archivistes.
          Organisez vos documents et dépouiller vos actes directement depuis vos dossiers, sans jamais dupliquer un seul fichier.
        </p>

        <div className="flex gap-3 mt-6">
          <a
            href="https://github.com/mrbrine25/Onesime"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-navy-600 hover:bg-navy-500 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors border border-navy-500"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            GitHub
          </a>
          <a
            href="mailto:m.brine25190@gmail.com"
            className="flex items-center gap-2 bg-navy-600 hover:bg-navy-500 text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors border border-navy-500"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Contact
          </a>
        </div>
      </div>

      {/* Accordion */}
      <div className="mb-10">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4">
          Comment fonctionne Onésime ?
        </h2>
        <div className="space-y-2">
          {FEATURES.map(f => (
            <AccordionItem key={f.title} title={f.title} icon={f.icon} content={f.content} />
          ))}
        </div>
      </div>

      {/* Credits */}
      <CreditsAccordion />

      <div className="text-center space-y-1">
        <p className="text-xs text-slate-600">Développé avec ❤️ pour les passionnés de généalogie</p>
        <p className="text-xs text-slate-700">© 2024–2026 Amélien BRISEBARD</p>
      </div>
    </div>
  )
}
