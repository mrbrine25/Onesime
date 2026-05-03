import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getPerson, updatePerson, deletePerson, setPersonAvatar, fileUrl } from '../api/client'
import type { PersonDetail, PersonZone, AvatarZone } from '../types'

// ─── Zone Avatar (same technique as FichePage) ────────────────────────────────

function ZoneAvatar({ zone, size = 56, radius = 14 }: { zone: AvatarZone; size?: number; radius?: number }) {
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

// ─── Zone Thumbnail card ──────────────────────────────────────────────────────

function ZoneCard({ zone, isAvatar, onSetAvatar, onNavigate }: {
  zone: PersonZone
  isAvatar: boolean
  onSetAvatar: () => void
  onNavigate: () => void
}) {
  const [avatarSet, setAvatarSet] = useState(false)

  const handleSetAvatar = (e: React.MouseEvent) => {
    e.stopPropagation()
    setAvatarSet(true)
    onSetAvatar()
    setTimeout(() => setAvatarSet(false), 2000)
  }

  return (
    <div className="group relative bg-navy-800 rounded-xl overflow-hidden border border-navy-700 hover:border-navy-600 transition-colors cursor-pointer" onClick={onNavigate}>
      {/* Cropped zone image */}
      <div className="relative overflow-hidden bg-navy-900" style={{ height: 120 }}>
        <div className="absolute inset-0" style={{ overflow: 'hidden' }}>
          <img
            src={fileUrl(zone.doc_file_path)}
            draggable={false}
            style={{
              position: 'absolute',
              width: `${100 / zone.width}%`,
              height: `${100 / zone.height}%`,
              left: `${-zone.x / zone.width * 100}%`,
              top: `${-zone.y / zone.height * 100}%`,
            }}
          />
        </div>
        {isAvatar && (
          <div className="absolute top-1.5 right-1.5 bg-violet-600 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full">
            Avatar
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2.5">
        <p className="text-xs font-medium text-white truncate">{zone.doc_title}</p>
        {zone.label && <p className="text-[10px] text-slate-500 truncate mt-0.5">{zone.label}</p>}
      </div>

      {/* Set avatar button */}
      <div className="absolute bottom-10 inset-x-0 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity px-2">
        <button
          onClick={handleSetAvatar}
          className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors ${
            avatarSet || isAvatar
              ? 'bg-violet-600 text-white'
              : 'bg-navy-700 text-slate-300 hover:bg-violet-600 hover:text-white'
          }`}
        >
          {avatarSet ? 'Défini ✓' : isAvatar ? 'Avatar actuel' : 'Définir comme avatar'}
        </button>
      </div>
    </div>
  )
}

// ─── Person initials badge ────────────────────────────────────────────────────

function InitialsBadge({ person, size = 72 }: { person: PersonDetail; size?: number }) {
  const initials = ((person.first_name?.[0] ?? '') + (person.last_name[0] ?? '')).toUpperCase()
  const COLORS = ['#8b5cf6', '#3b82f6', '#14b8a6', '#f97316', '#f43f5e', '#10b981']
  const color = COLORS[person.last_name.charCodeAt(0) % COLORS.length]
  return (
    <div
      style={{ width: size, height: size, borderRadius: size / 4, background: color, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <span style={{ fontSize: size * 0.35, fontWeight: 700, color: '#0f172a' }}>{initials || '?'}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PersonPage() {
  const { archiveId, personId } = useParams<{ archiveId: string; personId: string }>()
  const navigate = useNavigate()
  const [person, setPerson] = useState<PersonDetail | null>(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ first_name: '', last_name: '', birth_date: '', death_date: '', birth_place: '', death_place: '', notes: '' })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    if (!personId) return
    const p = await getPerson(personId)
    setPerson(p)
    setForm({ first_name: p.first_name, last_name: p.last_name, birth_date: p.birth_date, death_date: p.death_date, birth_place: p.birth_place || '', death_place: p.death_place || '', notes: p.notes })
  }

  useEffect(() => { load() }, [personId])

  if (!person) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Chargement…</div>

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await updatePerson(personId!, form)
    setSaving(false)
    setEditing(false)
    load()
  }

  const handleDelete = async () => {
    if (!confirm(`Supprimer "${person.first_name} ${person.last_name}" ? Cette action est irréversible.`)) return
    await deletePerson(personId!)
    navigate(`/archives/${archiveId}/persons`)
  }

  const handleSetAvatar = async (zoneId: string) => {
    await setPersonAvatar(personId!, zoneId)
    load()
  }

  const handleRemoveAvatar = async () => {
    await setPersonAvatar(personId!, null)
    load()
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      {/* Back */}
      <button
        onClick={() => navigate(`/archives/${archiveId}/persons`)}
        className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Retour aux personnes
      </button>

      {/* Header */}
      <div className="flex items-start gap-5 mb-8">
        {/* Avatar */}
        <div className="relative group flex-shrink-0">
          {person.avatar_zone ? (
            <>
              <ZoneAvatar zone={person.avatar_zone} size={80} radius={20} />
              <button
                onClick={handleRemoveAvatar}
                title="Retirer l'avatar"
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white rounded-full text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >×</button>
            </>
          ) : (
            <InitialsBadge person={person} size={80} />
          )}
        </div>

        {/* Name & dates */}
        <div className="flex-1 min-w-0 pt-1">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input
                  autoFocus
                  value={form.first_name}
                  onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                  placeholder="Prénom"
                  className="bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
                <input
                  required
                  value={form.last_name}
                  onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                  placeholder="Nom *"
                  className="bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.birth_date}
                  onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))}
                  placeholder="Naissance (ex. 1850)"
                  className="bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
                <input
                  value={form.death_date}
                  onChange={e => setForm(f => ({ ...f, death_date: e.target.value }))}
                  placeholder="Décès (ex. 1923)"
                  className="bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={form.birth_place}
                  onChange={e => setForm(f => ({ ...f, birth_place: e.target.value }))}
                  placeholder="Lieu de naissance"
                  className="bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
                <input
                  value={form.death_place}
                  onChange={e => setForm(f => ({ ...f, death_place: e.target.value }))}
                  placeholder="Lieu de décès"
                  className="bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Notes…"
                rows={2}
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
              />
              <div className="flex gap-2">
                <button type="submit" disabled={saving}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                  {saving ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button type="button" onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">
                  Annuler
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white leading-tight">
                {person.first_name} <span className="uppercase">{person.last_name}</span>
              </h1>
              <div className="flex flex-wrap items-center gap-4 mt-1.5 text-sm text-slate-400">
                {person.birth_date && <span>✦ {person.birth_date}{person.birth_place ? ` — ${person.birth_place}` : ''}</span>}
                {person.death_date && <span>† {person.death_date}{person.death_place ? ` — ${person.death_place}` : ''}</span>}
              </div>
              {person.notes && <p className="mt-2 text-sm text-slate-400 max-w-lg">{person.notes}</p>}
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white bg-navy-700 hover:bg-navy-600 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Modifier
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-red-400 bg-navy-700 hover:bg-red-400/10 rounded-lg px-3 py-1.5 transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                  </svg>
                  Supprimer
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Zones section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Vignettes d'identification
            <span className="ml-2 text-slate-600 normal-case font-normal">({person.zones.length})</span>
          </h2>
        </div>

        {person.zones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-navy-800 rounded-2xl border border-navy-700">
            <svg viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" className="w-10 h-10 mb-3">
              <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
            </svg>
            <p className="text-slate-400 text-sm">Aucune vignette associée</p>
            <p className="text-slate-500 text-xs mt-1 max-w-xs">
              Ouvrez un document image → dessinez une zone → ajoutez cette personne dans le panneau droit
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {person.zones.map(zone => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                isAvatar={person.avatar_zone_id === zone.id}
                onSetAvatar={() => handleSetAvatar(zone.id)}
                onNavigate={() => navigate(`/archives/${archiveId}/documents/${zone.doc_id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
