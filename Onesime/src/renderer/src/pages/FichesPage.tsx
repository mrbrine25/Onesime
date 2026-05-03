import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getFiches, createFiche, deleteFiche, mergeFiches, getTagsForFiche } from '../api/client'
import type { Fiche, Tag } from '../types'

type FicheTagMap = Record<string, Tag[]>
import { ZoneAvatar } from './FichePage'

// Color palette for card top borders — rotates based on index
const BORDER_COLORS = [
  'border-teal-400', 'border-violet-400', 'border-amber-400', 'border-rose-400',
  'border-blue-400', 'border-emerald-400', 'border-pink-400', 'border-orange-400',
]
const AVATAR_COLORS = [
  'bg-teal-400', 'bg-violet-400', 'bg-amber-400', 'bg-rose-400',
  'bg-blue-400', 'bg-emerald-400', 'bg-pink-400', 'bg-orange-400',
]

// ─── Fiche Card ───────────────────────────────────────────────────────────────

function FicheCard({ fiche, colorIdx, tags, onOpen, onDelete, onMerge }: {
  fiche: Fiche; colorIdx: number; tags: Tag[]; onOpen: () => void; onDelete: () => void; onMerge: () => void
}) {
  const border = BORDER_COLORS[colorIdx % BORDER_COLORS.length]
  const avatar = AVATAR_COLORS[colorIdx % AVATAR_COLORS.length]
  const initials = fiche.title.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div
      className={`group bg-navy-600 rounded-2xl border-t-4 ${border} p-5 hover:bg-navy-500 transition-all cursor-pointer`}
      onClick={onOpen}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {fiche.avatar_zone ? (
            <ZoneAvatar zone={fiche.avatar_zone} size={40} radius={10} />
          ) : (
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-navy-900 flex-shrink-0 ${avatar}`}>
              {initials || '?'}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-white text-sm leading-tight truncate">{fiche.title}</h3>
            {fiche.date && <p className="text-xs text-slate-400 mt-0.5">{fiche.date}</p>}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all ml-2 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); onMerge() }} title="Fusionner avec une autre fiche"
            className="text-slate-600 hover:text-amber-400 p-0.5 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M8 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3" /><polyline points="15 3 12 6 9 3" /><line x1="12" y1="6" x2="12" y2="13" />
            </svg>
          </button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} title="Supprimer"
            className="text-slate-600 hover:text-red-400 p-0.5 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {fiche.description && (
        <p className="text-xs text-slate-400 mt-3 line-clamp-2">{fiche.description}</p>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-navy-700">
        <span className="flex items-center gap-1 text-xs text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
          </svg>
          {fiche.document_count ?? 0} doc.
        </span>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-end">
            {tags.slice(0, 3).map(t => (
              <span key={t.id} className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full" style={{ backgroundColor: t.color + '25', color: t.color }}>
                {t.name}
              </span>
            ))}
            {tags.length > 3 && <span className="text-[9px] text-slate-500">+{tags.length - 3}</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Merge Modal ──────────────────────────────────────────────────────────────

function MergeFicheModal({ fiche, fiches, onClose, onMerged }: {
  fiche: Fiche; fiches: Fiche[]; onClose: () => void; onMerged: () => void
}) {
  const [targetId, setTargetId] = useState('')
  const [merging, setMerging] = useState(false)
  const candidates = fiches.filter(f => f.id !== fiche.id)

  const handleMerge = async () => {
    if (!targetId) return
    const target = candidates.find(f => f.id === targetId)!
    if (!confirm(`Fusionner "${fiche.title}" dans "${target.title}" ? Tous les documents seront transférés puis la fiche source sera supprimée.`)) return
    setMerging(true)
    await mergeFiches(fiche.id, targetId)
    onMerged()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[460px] p-6">
        <h3 className="font-semibold text-white mb-1">Fusionner avec…</h3>
        <p className="text-xs text-slate-400 mb-4">Les documents de <strong className="text-white">{fiche.title}</strong> seront transférés vers la fiche choisie, puis cette fiche sera supprimée.</p>
        <select autoFocus value={targetId} onChange={e => setTargetId(e.target.value)}
          className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 mb-4"
        >
          <option value="">Choisir une fiche cible…</option>
          {candidates.map(f => <option key={f.id} value={f.id}>{f.title} {f.date ? `(${f.date})` : ''}</option>)}
        </select>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
          <button onClick={handleMerge} disabled={!targetId || merging} className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
            {merging ? 'Fusion…' : 'Fusionner'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function NewFicheModal({ archiveId, onClose, onCreated }: {
  archiveId: string; onClose: () => void; onCreated: () => void
}) {
  const [form, setForm] = useState({ title: '', date: '', description: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await createFiche(archiveId, form)
    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[460px]">
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <h3 className="font-semibold text-white">Nouvelle fiche</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Titre *</label>
            <input
              required autoFocus
              className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Famille Dupont, Acte de naissance…"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Période / Dates</label>
            <input
              className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              placeholder="1850 – 1923"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Notes</label>
            <textarea
              className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Informations sur cette personne…"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {saving ? 'Création…' : 'Créer la fiche'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type SortKey = 'name' | 'date' | 'docs'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FichesPage() {
  const { archiveId } = useParams<{ archiveId: string }>()
  const navigate = useNavigate()
  const [fiches, setFiches] = useState<Fiche[]>([])
  const [ficheTags, setFicheTags] = useState<FicheTagMap>({})
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortAsc, setSortAsc] = useState(true)
  const [mergeSource, setMergeSource] = useState<Fiche | null>(null)

  const load = () => { if (archiveId) getFiches(archiveId).then(setFiches) }
  useEffect(() => { load() }, [archiveId])

  useEffect(() => {
    if (!fiches.length) return
    Promise.all(fiches.map(f => getTagsForFiche(f.id).then(tags => [f.id, tags as Tag[]] as const)))
      .then(entries => setFicheTags(Object.fromEntries(entries)))
  }, [fiches])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  const filtered = fiches
    .filter(f => !search || f.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = a.title.localeCompare(b.title, 'fr')
      else if (sortKey === 'date') cmp = (a.date || '').localeCompare(b.date || '')
      else if (sortKey === 'docs') cmp = (a.document_count ?? 0) - (b.document_count ?? 0)
      return sortAsc ? cmp : -cmp
    })

  const handleDelete = async (f: Fiche) => {
    if (!confirm(`Supprimer la fiche "${f.title}" ?`)) return
    await deleteFiche(f.id)
    load()
  }

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button
      onClick={() => handleSort(k)}
      className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${sortKey === k ? 'bg-blue-600 text-white' : 'bg-navy-600 text-slate-400 hover:text-white hover:bg-navy-500'}`}
    >
      {label}
      {sortKey === k && <span className="text-[10px]">{sortAsc ? '↑' : '↓'}</span>}
    </button>
  )

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Fiches</h1>
          <p className="text-sm text-slate-400 mt-0.5">{fiches.length} fiche{fiches.length !== 1 ? 's' : ''} dans cette archive</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouvelle fiche
        </button>
      </div>

      {fiches.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher une fiche…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-navy-600 border border-navy-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <SortBtn k="name" label="Nom" />
            <SortBtn k="date" label="Date" />
            <SortBtn k="docs" label="Docs" />
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-navy-600 flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" className="w-8 h-8">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <circle cx="8" cy="10" r="2" />
              <path d="M6 15c0-1.7 1-2.5 2-2.5s2 .8 2 2.5" />
              <line x1="13" y1="9" x2="20" y2="9" /><line x1="13" y1="13" x2="18" y2="13" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm">{search ? 'Aucune fiche trouvée' : 'Aucune fiche créée'}</p>
          {!search && (
            <button onClick={() => setShowModal(true)} className="mt-3 text-blue-400 hover:text-blue-300 text-sm">
              Créer la première fiche →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((f, i) => (
            <FicheCard
              key={f.id}
              fiche={f}
              colorIdx={i}
              tags={ficheTags[f.id] ?? []}
              onOpen={() => navigate(`/archives/${archiveId}/fiches/${f.id}`)}
              onDelete={() => handleDelete(f)}
              onMerge={() => setMergeSource(f)}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NewFicheModal archiveId={archiveId!} onClose={() => setShowModal(false)} onCreated={load} />
      )}
      {mergeSource && (
        <MergeFicheModal fiche={mergeSource} fiches={fiches} onClose={() => setMergeSource(null)} onMerged={load} />
      )}
    </div>
  )
}
