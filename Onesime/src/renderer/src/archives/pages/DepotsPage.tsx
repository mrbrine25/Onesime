import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getDepots, createDepot, updateDepot, deleteDepot } from '../../api/client'
import type { Depot } from '../../types'

const EMPTY = { nom: '', sigle: '', adresse: '', telephone: '', email: '', url: '', heures: '', notes: '' }

function DepotModal({ initial, onSave, onClose }: { initial?: Partial<Depot>; onSave: (d: typeof EMPTY) => void; onClose: () => void }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[520px] max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <h3 className="font-semibold text-white">{initial?.nom ? 'Modifier le dépôt' : 'Nouveau dépôt'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Nom *</label>
              <input autoFocus className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Archives Départementales du Doubs" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Sigle</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.sigle} onChange={e => set('sigle', e.target.value)} placeholder="AD25" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Adresse</label>
            <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.adresse} onChange={e => set('adresse', e.target.value)} placeholder="4 rue des Fusillés, 25000 Besançon" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Téléphone</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.telephone} onChange={e => set('telephone', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Email</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Site web</label>
            <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://archives.doubs.fr" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Horaires</label>
            <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500" value={form.heures} onChange={e => set('heures', e.target.value)} placeholder="Lun–Ven 9h–17h" />
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

export default function DepotsPage() {
  const { archiveId } = useParams<{ archiveId: string }>()
  const [depots, setDepots] = useState<Depot[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Depot | null>(null)

  const load = () => { if (archiveId) getDepots(archiveId).then((d: Depot[]) => setDepots(d)) }
  useEffect(() => { load() }, [archiveId])

  const handleSave = async (data: typeof EMPTY) => {
    if (editing) { await updateDepot(editing.id, data) } else { await createDepot(archiveId!, data) }
    setShowModal(false); setEditing(null); load()
  }
  const handleDelete = async (d: Depot) => {
    if (!confirm(`Supprimer le dépôt "${d.nom}" ? Les sources liées seront dissociées.`)) return
    await deleteDepot(d.id); load()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-5 border-b border-navy-800">
        <div>
          <h1 className="text-lg font-bold text-white">Dépôts d'archives</h1>
          <p className="text-xs text-slate-500 mt-0.5">Fonds, services d'archives, bibliothèques…</p>
        </div>
        <div className="flex-1" />
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau dépôt
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {depots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" className="w-8 h-8"><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21v-6h6v6"/></svg>
            </div>
            <p className="text-slate-400 text-sm">Aucun dépôt référencé</p>
            <button onClick={() => setShowModal(true)} className="mt-3 text-amber-400 hover:text-amber-300 text-sm">Ajouter un dépôt →</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {depots.map(d => (
              <div key={d.id} className="bg-navy-800 rounded-2xl border border-navy-700 hover:border-navy-600 transition-colors p-5 flex items-start gap-5 group">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400 text-xs font-bold uppercase">{d.sigle || d.nom.slice(0, 2)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-semibold text-white">{d.nom}</h3>
                    {d.sigle && <span className="text-xs text-amber-400/70 font-mono">{d.sigle}</span>}
                    {(d.source_count ?? 0) > 0 && <span className="text-xs text-slate-500">{d.source_count} source{(d.source_count ?? 0) > 1 ? 's' : ''}</span>}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    {d.adresse && <p className="text-xs text-slate-400">{d.adresse}</p>}
                    {d.telephone && <p className="text-xs text-slate-500">{d.telephone}</p>}
                    {d.heures && <p className="text-xs text-slate-500">⏱ {d.heures}</p>}
                    {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="text-xs text-amber-400/70 hover:text-amber-400">{d.url}</a>}
                  </div>
                  {d.notes && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{d.notes}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <button onClick={() => { setEditing(d); setShowModal(true) }} className="w-8 h-8 rounded-lg bg-navy-700 hover:bg-navy-600 text-slate-400 hover:text-white flex items-center justify-center transition-colors" title="Modifier">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => handleDelete(d)} className="w-8 h-8 rounded-lg bg-navy-700 hover:bg-red-600/30 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors" title="Supprimer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-2 border-t border-navy-800 text-xs text-slate-500">{depots.length} dépôt{depots.length !== 1 ? 's' : ''}</div>
      {showModal && <DepotModal initial={editing || undefined} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null) }} />}
    </div>
  )
}
