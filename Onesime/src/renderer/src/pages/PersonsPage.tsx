import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPersons, createPerson, updatePerson, deletePerson, mergePersons, fileUrl } from '../api/client'
import type { Person, AvatarZone } from '../types'

type SortKey = 'last_name' | 'first_name' | 'birth_date'

function ZoneAvatar({ zone, size = 36, radius = 10 }: { zone: AvatarZone; size?: number; radius?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
      <img
        src={fileUrl(zone.doc_file_path)}
        draggable={false}
        style={{
          position: 'absolute',
          width: `${100 / zone.width}%`,
          height: `${100 / zone.height}%`,
          left: `${-zone.x / zone.width * 100}%`,
          top: `${-zone.y / zone.height * 100}%`,
          userSelect: 'none',
        }}
      />
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function PersonModal({ person, onClose, onSaved, archiveId }: {
  person: Person | null; onClose: () => void; onSaved: () => void; archiveId: string
}) {
  const [form, setForm] = useState({
    first_name: person?.first_name ?? '',
    last_name: person?.last_name ?? '',
    birth_date: person?.birth_date ?? '',
    death_date: person?.death_date ?? '',
    birth_place: person?.birth_place ?? '',
    death_place: person?.death_place ?? '',
    notes: person?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    if (person) await updatePerson(person.id, form)
    else await createPerson(archiveId, form)
    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[480px]">
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <h3 className="font-semibold text-white">{person ? 'Modifier' : 'Nouvelle personne'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Prénom</label>
              <input
                autoFocus
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                placeholder="Jean"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Nom *</label>
              <input
                required
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                placeholder="DUPONT"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Naissance</label>
              <input
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                value={form.birth_date}
                onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
                placeholder="1850"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Décès</label>
              <input
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                value={form.death_date}
                onChange={e => setForm(f => ({ ...f, death_date: e.target.value }))}
                placeholder="1923"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Lieu naissance</label>
              <input
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                value={form.birth_place}
                onChange={e => setForm(f => ({ ...f, birth_place: e.target.value }))}
                placeholder="Paris"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Lieu décès</label>
              <input
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                value={form.death_place}
                onChange={e => setForm(f => ({ ...f, death_place: e.target.value }))}
                placeholder="Lyon"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Notes</label>
            <textarea
              className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
              rows={3}
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Informations complémentaires…"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
              {saving ? 'Enregistrement…' : person ? 'Modifier' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Person Row ───────────────────────────────────────────────────────────────

function PersonRow({ person, onOpen, onEdit, onDelete, onMerge }: {
  person: Person; onOpen: () => void; onEdit: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void; onMerge: (e: React.MouseEvent) => void
}) {
  const initials = ((person.first_name?.[0] ?? '') + (person.last_name[0] ?? '')).toUpperCase()
  const COLORS = ['bg-violet-400', 'bg-blue-400', 'bg-teal-400', 'bg-amber-400', 'bg-rose-400', 'bg-emerald-400']
  const color = COLORS[person.last_name.charCodeAt(0) % COLORS.length]

  return (
    <div
      className="group flex items-center gap-4 px-5 py-3.5 hover:bg-navy-800 transition-colors border-b border-navy-800/50 last:border-0 cursor-pointer"
      onClick={onOpen}
    >
      {person.avatar_zone ? (
        <ZoneAvatar zone={person.avatar_zone} size={36} radius={10} />
      ) : (
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-navy-900 flex-shrink-0 ${color}`}>
          {initials || '?'}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white text-sm">{person.first_name} <span className="uppercase">{person.last_name}</span></p>
        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
          {person.birth_date && <span>✦ {person.birth_date}{person.birth_place ? ` ${person.birth_place}` : ''}</span>}
          {person.death_date && <span>† {person.death_date}{person.death_place ? ` ${person.death_place}` : ''}</span>}
          {person.notes && <span className="truncate max-w-[200px]">{person.notes}</span>}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-xs text-slate-500 mr-2">Voir →</span>
        <button onClick={onMerge}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
          title="Fusionner avec une autre personne"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path d="M8 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3" /><polyline points="15 3 12 6 9 3" /><line x1="12" y1="6" x2="12" y2="13" />
          </svg>
        </button>
        <button onClick={onEdit}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-navy-700 transition-colors"
          title="Modifier"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button onClick={onDelete}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-400/10 transition-colors"
          title="Supprimer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Merge Modal ──────────────────────────────────────────────────────────────

function MergePersonModal({ person, persons, onClose, onMerged }: {
  person: Person; persons: Person[]; onClose: () => void; onMerged: () => void
}) {
  const [targetId, setTargetId] = useState('')
  const [merging, setMerging] = useState(false)
  const candidates = persons.filter(p => p.id !== person.id)

  const handleMerge = async () => {
    if (!targetId) return
    const target = candidates.find(p => p.id === targetId)!
    if (!confirm(`Fusionner "${person.first_name} ${person.last_name}" dans "${target.first_name} ${target.last_name}" ? Cette action est irréversible.`)) return
    setMerging(true)
    await mergePersons(person.id, targetId)
    onMerged()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[460px] p-6">
        <h3 className="font-semibold text-white mb-1">Fusionner avec…</h3>
        <p className="text-xs text-slate-400 mb-4">Les zones de <strong className="text-white">{person.first_name} {person.last_name}</strong> seront transférées vers la personne choisie, puis la fiche sera supprimée.</p>
        <select
          autoFocus
          value={targetId}
          onChange={e => setTargetId(e.target.value)}
          className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 mb-4"
        >
          <option value="">Choisir une personne cible…</option>
          {candidates.map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} {p.birth_date ? `(${p.birth_date})` : ''}</option>)}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PersonsPage() {
  const { archiveId } = useParams<{ archiveId: string }>()
  const navigate = useNavigate()
  const [persons, setPersons] = useState<Person[]>([])
  const [allPersons, setAllPersons] = useState<Person[]>([])
  const [query, setQuery] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editPerson, setEditPerson] = useState<Person | null>(null)
  const [mergeSource, setMergeSource] = useState<Person | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('last_name')
  const [sortAsc, setSortAsc] = useState(true)

  const loadAll = () => { if (archiveId) getPersons(archiveId).then(setAllPersons) }
  const load = (q = '') => { if (archiveId) getPersons(archiveId, q).then(setPersons) }
  useEffect(() => { load(); loadAll() }, [archiveId])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(true) }
  }

  const sorted = [...persons].sort((a, b) => {
    let cmp = 0
    if (sortKey === 'last_name') cmp = a.last_name.localeCompare(b.last_name, 'fr')
    else if (sortKey === 'first_name') cmp = (a.first_name || '').localeCompare(b.first_name || '', 'fr')
    else if (sortKey === 'birth_date') cmp = (a.birth_date || '').localeCompare(b.birth_date || '')
    return sortAsc ? cmp : -cmp
  })

  const handleDelete = async (e: React.MouseEvent, p: Person) => {
    e.stopPropagation()
    if (!confirm(`Supprimer "${p.first_name} ${p.last_name}" ?`)) return
    await deletePerson(p.id)
    load(query); loadAll()
  }

  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => handleSort(k)}
      className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${sortKey === k ? 'bg-blue-600 text-white' : 'bg-navy-600 text-slate-400 hover:text-white hover:bg-navy-500'}`}
    >
      {label}{sortKey === k && <span className="text-[10px]">{sortAsc ? '↑' : '↓'}</span>}
    </button>
  )

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Personnes identifiées</h1>
          <p className="text-sm text-slate-400 mt-0.5">{allPersons.length} personne{allPersons.length !== 1 ? 's' : ''} dans cette archive</p>
        </div>
        <button
          onClick={() => { setEditPerson(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nouvelle personne
        </button>
      </div>

      {allPersons.length > 0 && (
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher par nom…"
              value={query}
              onChange={e => { setQuery(e.target.value); load(e.target.value) }}
              className="w-full bg-navy-600 border border-navy-500 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <SortBtn k="last_name" label="Nom" />
            <SortBtn k="first_name" label="Prénom" />
            <SortBtn k="birth_date" label="Naissance" />
          </div>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-navy-600 flex items-center justify-center mb-4">
            <svg viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="1.5" className="w-8 h-8">
              <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </div>
          <p className="text-slate-400 text-sm">{query ? 'Aucun résultat' : 'Aucune personne enregistrée'}</p>
          {!query && <p className="text-slate-500 text-xs mt-1 max-w-xs">Les personnes sont liées aux zones (vignettes) des documents images</p>}
          {!query && <button onClick={() => { setEditPerson(null); setShowModal(true) }} className="mt-4 text-blue-400 hover:text-blue-300 text-sm">Ajouter une personne →</button>}
        </div>
      ) : (
        <div className="bg-navy-600 rounded-2xl border border-navy-500 overflow-hidden">
          {sorted.map(p => (
            <PersonRow
              key={p.id}
              person={p}
              onOpen={() => navigate(`/archives/${archiveId}/persons/${p.id}`)}
              onEdit={e => { e.stopPropagation(); setEditPerson(p); setShowModal(true) }}
              onDelete={e => handleDelete(e, p)}
              onMerge={e => { e.stopPropagation(); setMergeSource(p) }}
            />
          ))}
        </div>
      )}

      {showModal && (
        <PersonModal person={editPerson} archiveId={archiveId!} onClose={() => setShowModal(false)} onSaved={() => { load(query); loadAll() }} />
      )}
      {mergeSource && (
        <MergePersonModal
          person={mergeSource}
          persons={allPersons}
          onClose={() => setMergeSource(null)}
          onMerged={() => { load(query); loadAll() }}
        />
      )}
    </div>
  )
}
