import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getSourcesArch, createSourceArch, updateSourceArch, deleteSourceArch, getDepots } from '../../api/client'
import type { SourceArch, Depot } from '../../types'
import { TYPE_SOURCE_LABELS } from '../../types'

const TYPES = Object.entries(TYPE_SOURCE_LABELS)
const EMPTY = { depot_id: '', titre: '', abbrev: '', auteur: '', date_pub: '', editeur: '', lieu_pub: '', cote: '', type_source: 'autre', date_debut: '', date_fin: '', description: '', notes: '' }

function SourceModal({ initial, depots, onSave, onClose }: { initial?: Partial<SourceArch>; depots: Depot[]; onSave: (d: typeof EMPTY) => void; onClose: () => void }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial, depot_id: initial?.depot_id || '' })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[580px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <h3 className="font-semibold text-white">{initial?.titre ? 'Modifier la source' : 'Nouvelle source'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Titre *</label>
            <input autoFocus className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.titre} onChange={e => set('titre', e.target.value)} placeholder="Registre de baptêmes, mariages et sépultures de Baume-les-Dames 1750–1780" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Abréviation</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono" value={form.abbrev} onChange={e => set('abbrev', e.target.value)} placeholder="BMS Baume 1750" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Cote</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono" value={form.cote} onChange={e => set('cote', e.target.value)} placeholder="5 MI 142" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Type</label>
              <select className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.type_source} onChange={e => set('type_source', e.target.value)}>
                {TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Date début</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.date_debut} onChange={e => set('date_debut', e.target.value)} placeholder="1750" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Date fin</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.date_fin} onChange={e => set('date_fin', e.target.value)} placeholder="1780" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Dépôt</label>
            <select className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.depot_id} onChange={e => set('depot_id', e.target.value)}>
              <option value="">— Aucun dépôt —</option>
              {depots.map(d => <option key={d.id} value={d.id}>{d.sigle ? `[${d.sigle}] ` : ''}{d.nom}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Auteur</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.auteur} onChange={e => set('auteur', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Éditeur</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.editeur} onChange={e => set('editeur', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Description</label>
            <textarea className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Notes</label>
            <textarea className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 resize-none" rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
            <button onClick={() => form.titre.trim() && onSave(form)} disabled={!form.titre.trim()} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white text-sm font-semibold transition-colors">Enregistrer</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SourcesPage() {
  const { archiveId } = useParams<{ archiveId: string }>()
  const [sources, setSources] = useState<SourceArch[]>([])
  const [depots, setDepots] = useState<Depot[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SourceArch | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterDepot, setFilterDepot] = useState('')
  const [q, setQ] = useState('')

  const load = () => {
    if (!archiveId) return
    Promise.all([getSourcesArch(archiveId), getDepots(archiveId)]).then(([s, d]: [SourceArch[], Depot[]]) => { setSources(s); setDepots(d) })
  }
  useEffect(() => { load() }, [archiveId])

  const filtered = sources.filter(s =>
    (!filterType || s.type_source === filterType) &&
    (!filterDepot || s.depot_id === filterDepot) &&
    (!q || [s.titre, s.cote, s.abbrev, s.auteur].some(v => v?.toLowerCase().includes(q.toLowerCase())))
  )

  const handleSave = async (data: typeof EMPTY) => {
    const payload = { ...data, depot_id: data.depot_id || null }
    if (editing) { await updateSourceArch(editing.id, payload) } else { await createSourceArch(archiveId!, payload) }
    setShowModal(false); setEditing(null); load()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-5 border-b border-navy-800">
        <div>
          <h1 className="text-lg font-bold text-white">Sources</h1>
          <p className="text-xs text-slate-500 mt-0.5">Registres, collections, fonds documentaires</p>
        </div>
        <div className="flex-1" />
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouvelle source
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-navy-800 bg-navy-800/30">
        <input type="text" placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} className="bg-navy-800 border border-navy-700 rounded-xl px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 w-52" />
        <select value={filterType} onChange={e => setFilterType(e.target.value)} className="bg-navy-800 border border-navy-700 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500">
          <option value="">Tous types</option>
          {TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {depots.length > 0 && (
          <select value={filterDepot} onChange={e => setFilterDepot(e.target.value)} className="bg-navy-800 border border-navy-700 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500">
            <option value="">Tous dépôts</option>
            {depots.map(d => <option key={d.id} value={d.id}>{d.sigle || d.nom}</option>)}
          </select>
        )}
        <span className="text-xs text-slate-500 ml-auto">{filtered.length} / {sources.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" className="w-8 h-8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <p className="text-slate-400 text-sm">{sources.length === 0 ? 'Aucune source référencée' : 'Aucun résultat'}</p>
            {sources.length === 0 && <button onClick={() => setShowModal(true)} className="mt-3 text-amber-400 hover:text-amber-300 text-sm">Ajouter une source →</button>}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map(s => (
              <div key={s.id} className="bg-navy-800 rounded-xl border border-navy-700 hover:border-navy-600 p-4 flex items-start gap-4 group transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-white">{s.titre}</span>
                    {s.abbrev && <span className="text-xs font-mono text-amber-400/80 bg-amber-500/10 px-1.5 py-0.5 rounded">{s.abbrev}</span>}
                    {s.cote && <span className="text-xs font-mono text-slate-400">Cote : {s.cote}</span>}
                    <span className="text-xs text-slate-600">{TYPE_SOURCE_LABELS[s.type_source] || s.type_source}</span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 mt-1">
                    {(s.date_debut || s.date_fin) && <span className="text-xs text-slate-500">{s.date_debut}{s.date_fin && s.date_debut ? ' – ' : ''}{s.date_fin}</span>}
                    {s.depot_nom && <span className="text-xs text-slate-500">{s.depot_sigle ? `[${s.depot_sigle}] ` : ''}{s.depot_nom}</span>}
                    {s.auteur && <span className="text-xs text-slate-600">{s.auteur}</span>}
                  </div>
                  {s.description && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{s.description}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(s); setShowModal(true) }} className="w-7 h-7 rounded-lg bg-navy-700 hover:bg-navy-600 text-slate-400 hover:text-white flex items-center justify-center" title="Modifier">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={async () => { if (!confirm('Supprimer cette source ?')) return; await deleteSourceArch(s.id); load() }} className="w-7 h-7 rounded-lg bg-navy-700 hover:bg-red-600/30 text-slate-400 hover:text-red-400 flex items-center justify-center" title="Supprimer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-2 border-t border-navy-800 text-xs text-slate-500">{sources.length} source{sources.length !== 1 ? 's' : ''}</div>
      {showModal && <SourceModal initial={editing || undefined} depots={depots} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null) }} />}
    </div>
  )
}
