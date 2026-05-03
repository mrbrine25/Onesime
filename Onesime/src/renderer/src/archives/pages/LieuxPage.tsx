import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getLieux, createLieu, updateLieu, deleteLieu } from '../../api/client'
import type { Lieu } from '../../types'
import { TYPE_LIEU_LABELS } from '../../types'

const TYPES = Object.entries(TYPE_LIEU_LABELS)
const EMPTY = { nom: '', type_lieu: 'commune', parent_id: '', code_insee: '', notes: '' }

function LieuModal({ initial, lieux, onSave, onClose }: { initial?: Partial<Lieu>; lieux: Lieu[]; onSave: (d: typeof EMPTY) => void; onClose: () => void }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial, parent_id: initial?.parent_id || '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const candidates = lieux.filter(l => l.id !== initial?.id)
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[460px]">
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <h3 className="font-semibold text-white">{initial?.nom ? 'Modifier le lieu' : 'Nouveau lieu'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Nom *</label>
              <input autoFocus className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Baume-les-Dames" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Type</label>
              <select className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.type_lieu} onChange={e => set('type_lieu', e.target.value)}>
                {TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Lieu parent</label>
              <select className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.parent_id} onChange={e => set('parent_id', e.target.value)}>
                <option value="">— Aucun —</option>
                {candidates.map(l => <option key={l.id} value={l.id}>{l.nom} ({TYPE_LIEU_LABELS[l.type_lieu] || l.type_lieu})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Code INSEE</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono" value={form.code_insee} onChange={e => set('code_insee', e.target.value)} placeholder="25054" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Notes</label>
            <textarea className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
            <button onClick={() => form.nom.trim() && onSave(form)} disabled={!form.nom.trim()} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white text-sm font-semibold transition-colors">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LieuxPage() {
  const { archiveId } = useParams<{ archiveId: string }>()
  const [lieux, setLieux] = useState<Lieu[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Lieu | null>(null)
  const [q, setQ] = useState('')
  const [filterType, setFilterType] = useState('')

  const load = () => { if (archiveId) getLieux(archiveId).then((l: Lieu[]) => setLieux(l)) }
  useEffect(() => { load() }, [archiveId])

  const filtered = lieux.filter(l =>
    (!filterType || l.type_lieu === filterType) &&
    (!q || [l.nom, l.code_insee, l.parent_nom].some(v => v?.toLowerCase().includes(q.toLowerCase())))
  )

  const handleSave = async (data: typeof EMPTY) => {
    const payload = { ...data, parent_id: data.parent_id || null }
    if (editing) { await updateLieu(editing.id, payload) } else { await createLieu(archiveId!, payload) }
    setShowModal(false); setEditing(null); load()
  }

  const typeCount = TYPES.map(([k]) => ({ type: k, count: lieux.filter(l => l.type_lieu === k).length })).filter(t => t.count > 0)

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-5 border-b border-navy-800">
        <div>
          <h1 className="text-lg font-bold text-white">Lieux</h1>
          <p className="text-xs text-slate-500 mt-0.5">Référentiel géographique réutilisable dans tous les actes</p>
        </div>
        <div className="flex-1" />
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau lieu
        </button>
      </div>

      {/* Type pills summary */}
      {typeCount.length > 0 && (
        <div className="flex items-center gap-2 px-5 py-2 border-b border-navy-800 bg-navy-800/20 flex-wrap">
          {typeCount.map(t => (
            <button key={t.type} onClick={() => setFilterType(f => f === t.type ? '' : t.type)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${filterType === t.type ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-navy-800 text-slate-500 border-navy-700 hover:border-navy-600 hover:text-slate-300'}`}>
              {TYPE_LIEU_LABELS[t.type]} <span className="opacity-60">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-3 px-5 py-2.5 border-b border-navy-800">
        <input type="text" placeholder="Rechercher un lieu…" value={q} onChange={e => setQ(e.target.value)} className="bg-navy-800 border border-navy-700 rounded-xl px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 w-60" />
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} lieu{filtered.length !== 1 ? 'x' : ''}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {lieux.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" className="w-8 h-8"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
            </div>
            <p className="text-slate-400 text-sm">Aucun lieu référencé</p>
            <button onClick={() => setShowModal(true)} className="mt-3 text-amber-400 hover:text-amber-300 text-sm">Ajouter un lieu →</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {filtered.map(l => (
              <div key={l.id} className="bg-navy-800 rounded-xl border border-navy-700 hover:border-navy-600 px-4 py-3 flex items-center gap-3 group transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" className="w-4 h-4 flex-shrink-0 opacity-60"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-white truncate">{l.nom}</span>
                    {l.code_insee && <span className="text-xs font-mono text-slate-600">{l.code_insee}</span>}
                  </div>
                  <div className="flex gap-2">
                    <span className="text-xs text-slate-500">{TYPE_LIEU_LABELS[l.type_lieu] || l.type_lieu}</span>
                    {l.parent_nom && <span className="text-xs text-slate-600">› {l.parent_nom}</span>}
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(l); setShowModal(true) }} className="w-6 h-6 rounded bg-navy-700 hover:bg-navy-600 text-slate-400 hover:text-white flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={async () => { if (!confirm('Supprimer ce lieu ?')) return; await deleteLieu(l.id); load() }} className="w-6 h-6 rounded bg-navy-700 hover:bg-red-600/30 text-slate-400 hover:text-red-400 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && <LieuModal initial={editing || undefined} lieux={lieux} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null) }} />}
    </div>
  )
}
