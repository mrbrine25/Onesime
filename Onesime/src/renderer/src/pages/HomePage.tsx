import { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { getDocuments, getRecentDocuments, getFiches, getPersons, getAlbums, fileUrl } from '../api/client'
import type { LayoutContext } from '../components/Layout'
import type { Document, Fiche, Person, Album } from '../types'

// ─── Stat Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  onClick?: () => void
}

function StatCard({ label, value, icon, color, onClick }: StatCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 bg-navy-600 hover:bg-navy-500 rounded-2xl p-5 transition-all text-left w-full group"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-sm text-slate-400">{label}</p>
      </div>
    </button>
  )
}

// ─── Polaroid Card ───────────────────────────────────────────────────────────

interface PolaroidProps {
  doc: Document
  onClick: () => void
}

function PolaroidCard({ doc, onClick }: PolaroidProps) {
  const isImage = doc.mime_type.startsWith('image/')
  const url = fileUrl(doc.file_path)

  return (
    <button
      onClick={onClick}
      className="group flex flex-col bg-white rounded-sm shadow-polaroid hover:scale-105 transition-transform cursor-pointer"
      style={{ width: 160 }}
    >
      <div className="w-full bg-slate-200 overflow-hidden" style={{ height: 140 }}>
        {isImage ? (
          <img src={url} alt={doc.title || doc.filename} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-100">
            <FileIcon mime={doc.mime_type} />
          </div>
        )}
      </div>
      <div className="px-3 py-3 pb-4">
        <p className="text-xs font-medium text-slate-800 truncate leading-tight">
          {doc.title || doc.filename}
        </p>
        {doc.date && <p className="text-[10px] text-slate-400 mt-0.5">{doc.date}</p>}
      </div>
    </button>
  )
}

function FileIcon({ mime }: { mime: string }) {
  if (mime === 'application/pdf')
    return <span className="text-3xl text-red-400">PDF</span>
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" className="w-10 h-10">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

// ─── Archive Selector ─────────────────────────────────────────────────────────

function ArchiveSelector() {
  const { archives, currentArchive, setCurrentArchive } = useOutletContext<LayoutContext>()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  if (archives.length === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-navy-600 hover:bg-navy-500 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4 text-amber-400">
          <rect x="2" y="4" width="20" height="5" rx="1" /><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9" /><path d="M10 13h4" />
        </svg>
        <span className="max-w-[180px] truncate">{currentArchive?.name ?? 'Choisir une archive'}</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-400 ml-1">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 bg-navy-900 border border-navy-700 rounded-xl shadow-2xl z-50 min-w-[220px] overflow-hidden py-1">
          {archives.map(a => (
            <button
              key={a.id}
              onClick={() => { setCurrentArchive(a); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left transition-colors ${a.id === currentArchive?.id ? 'bg-navy-600 text-white' : 'text-slate-300 hover:bg-navy-700 hover:text-white'}`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
              <span className="truncate">{a.name}</span>
            </button>
          ))}
          <div className="border-t border-navy-700 mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); navigate('/archives') }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-400 hover:text-white hover:bg-navy-700 transition-colors"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Gérer les archives
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const { archives, currentArchive } = useOutletContext<LayoutContext>()
  const navigate = useNavigate()

  const [docCount, setDocCount] = useState(0)
  const [recentDocs, setRecentDocs] = useState<Document[]>([])
  const [fiches, setFiches] = useState<Fiche[]>([])
  const [persons, setPersons] = useState<Person[]>([])
  const [albums, setAlbums] = useState<Album[]>([])

  useEffect(() => {
    if (!currentArchive) return
    getDocuments(currentArchive.id).then(d => setDocCount(d.length))
    getRecentDocuments(currentArchive.id).then(setRecentDocs)
    getFiches(currentArchive.id).then(setFiches)
    getPersons(currentArchive.id).then(setPersons)
    getAlbums(currentArchive.id).then(setAlbums)
  }, [currentArchive?.id])

  if (archives.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <div className="w-20 h-20 rounded-3xl bg-amber-400 flex items-center justify-center font-bold text-navy-900 text-4xl mb-8 shadow-xl shadow-amber-400/20">
          O
        </div>
        <h1 className="text-3xl font-bold text-white mb-3">Bienvenue dans Onésime</h1>
        <p className="text-slate-400 text-base max-w-md mb-8">
          Onésime vous aide à organiser vos archives généalogiques directement depuis vos dossiers, sans copier aucun fichier.
        </p>
        <button
          onClick={() => navigate('/archives')}
          className="bg-amber-400 hover:bg-amber-300 text-navy-900 font-semibold px-8 py-3 rounded-xl transition-colors shadow-lg shadow-amber-400/20"
        >
          Créer ma première archive
        </button>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Accueil</h1>
          <p className="text-sm text-slate-400 mt-0.5">Vue d'ensemble de votre archive</p>
        </div>
        <ArchiveSelector />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <StatCard
          label="Documents"
          value={docCount}
          color="bg-blue-500/20 text-blue-400"
          onClick={() => currentArchive && navigate(`/archives/${currentArchive.id}/browser`)}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          }
        />
        <StatCard
          label="Fiches"
          value={fiches.length}
          color="bg-violet-500/20 text-violet-400"
          onClick={() => currentArchive && navigate(`/archives/${currentArchive.id}/fiches`)}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          }
        />
        <StatCard
          label="Albums"
          value={albums.length}
          color="bg-amber-500/20 text-amber-400"
          onClick={() => currentArchive && navigate(`/archives/${currentArchive.id}/albums`)}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15 16 10 5 21" />
            </svg>
          }
        />
        <StatCard
          label="Personnes"
          value={persons.length}
          color="bg-teal-500/20 text-teal-400"
          onClick={() => currentArchive && navigate(`/archives/${currentArchive.id}/persons`)}
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-6 h-6">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
      </div>

      {/* Recent documents */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-white">Documents récents</h2>
          {docCount > 0 && currentArchive && (
            <button
              onClick={() => navigate(`/archives/${currentArchive.id}/browser`)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Voir tout →
            </button>
          )}
        </div>

        {recentDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-navy-600 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#4f7ef8" strokeWidth="1.5" className="w-8 h-8">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15 16 10 5 21" />
              </svg>
            </div>
            <p className="text-slate-400">Aucun document encore ajouté</p>
            <button
              onClick={() => currentArchive && navigate(`/archives/${currentArchive.id}/browser`)}
              className="mt-4 text-sm text-blue-400 hover:text-blue-300"
            >
              Aller dans l'Explorateur →
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-5">
            {recentDocs.map(doc => (
              <PolaroidCard
                key={doc.id}
                doc={doc}
                onClick={() => currentArchive && navigate(`/archives/${currentArchive.id}/documents/${doc.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
