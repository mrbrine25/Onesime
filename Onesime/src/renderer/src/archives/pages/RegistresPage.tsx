import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRegistres, createRegistre, updateRegistre, deleteRegistre } from '../../api/client'
import type { Registre } from '../../types'
import { TYPE_REGISTRE_LABELS, TYPE_ACTE_LABELS } from '../../types'

const TYPES = Object.entries(TYPE_REGISTRE_LABELS)
const EMPTY = { nom: '', type_registre: 'autre', default_type_acte: '', default_lieu_nom: '', date_debut: '', date_fin: '', lieu_nom: '', description: '', notes: '' }

function RegistreModal({ initial, onSave, onClose }: { initial?: Partial<Registre>; onSave: (d: typeof EMPTY) => void; onClose: () => void }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial })
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[500px]">
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <h3 className="font-semibold text-white">{initial?.nom ? 'Modifier le registre' : 'Nouveau registre'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Nom *</label>
              <input autoFocus className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="BMS Baume-les-Dames 1750–1780" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Type</label>
              <select className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                value={form.type_registre} onChange={e => set('type_registre', e.target.value)}>
                {TYPES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Début</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                value={form.date_debut} onChange={e => set('date_debut', e.target.value)} placeholder="1750" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Fin</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                value={form.date_fin} onChange={e => set('date_fin', e.target.value)} placeholder="1780" />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Lieu</label>
            <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              value={form.lieu_nom} onChange={e => set('lieu_nom', e.target.value)} placeholder="Baume-les-Dames" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Type d'acte par défaut</label>
            <select className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              value={form.default_type_acte} onChange={e => set('default_type_acte', e.target.value)}>
              <option value="">— Aucun —</option>
              {Object.entries(TYPE_ACTE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            {form.default_type_acte && (
              <p className="text-[10px] text-amber-400/70 mt-1">Les actes reliés seront classés en « {TYPE_ACTE_LABELS[form.default_type_acte]} ».</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Lieu par défaut</label>
            <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
              value={form.default_lieu_nom} onChange={e => set('default_lieu_nom', e.target.value)}
              placeholder="ex. Baume-les-Dames" />
            {form.default_lieu_nom && (
              <p className="text-[10px] text-amber-400/70 mt-1">Les actes reliés auront ce lieu automatiquement.</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Description</label>
            <textarea className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
              rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
            <button onClick={() => form.nom.trim() && onSave(form)} disabled={!form.nom.trim()}
              className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
              Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegistresPage() {
  const { archiveId } = useParams<{ archiveId: string }>()
  const navigate = useNavigate()
  const [registres, setRegistres] = useState<Registre[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Registre | null>(null)

  const load = () => { if (archiveId) getRegistres(archiveId).then((r: Registre[]) => setRegistres(r)) }
  useEffect(() => { load() }, [archiveId])

  const handleSave = async (data: typeof EMPTY) => {
    if (editing) { await updateRegistre(editing.id, data) } else { await createRegistre(archiveId!, data) }
    setShowModal(false); setEditing(null); load()
  }

  const handleDelete = async (r: Registre) => {
    if (!confirm(`Supprimer le registre "${r.nom}" ? Les actes associés resteront mais seront dissociés.`)) return
    await deleteRegistre(r.id); load()
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-5 border-b border-navy-800">
        <div>
          <h1 className="text-lg font-bold text-white">Registres</h1>
          <p className="text-xs text-slate-500 mt-0.5">Regroupez vos actes en registres, créés après l'import</p>
        </div>
        <div className="flex-1" />
        <button onClick={() => { setEditing(null); setShowModal(true) }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nouveau registre
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {registres.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" className="w-8 h-8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
            </div>
            <p className="text-slate-400 text-sm">Aucun registre créé</p>
            <p className="text-slate-600 text-xs mt-1 max-w-xs">Importez d'abord vos actes, puis créez des registres pour les regrouper</p>
            <button onClick={() => setShowModal(true)} className="mt-3 text-amber-400 hover:text-amber-300 text-sm">Créer un registre →</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {registres.map(r => (
              <div key={r.id}
                className="bg-navy-800 rounded-2xl border border-navy-700 hover:border-amber-700/40 transition-colors p-5 flex items-start gap-4 group cursor-pointer"
                onClick={() => navigate(`/arch/${archiveId}/registres/${r.id}`)}>
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" className="w-6 h-6"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h3 className="font-semibold text-white">{r.nom}</h3>
                    <span className="text-xs text-slate-500">{TYPE_REGISTRE_LABELS[r.type_registre] || r.type_registre}</span>
                    {(r.acte_count ?? 0) > 0 && (
                      <span className="text-xs text-amber-400/70">{r.acte_count} acte{(r.acte_count ?? 0) > 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                    {(r.date_debut || r.date_fin) && (
                      <span className="text-xs text-slate-500">
                        {r.date_debut}{r.date_fin && r.date_debut ? ' – ' : ''}{r.date_fin}
                      </span>
                    )}
                    {r.lieu_nom && <span className="text-xs text-slate-500">{r.lieu_nom}</span>}
                  </div>
                  {r.description && <p className="text-xs text-slate-500 mt-1 line-clamp-1">{r.description}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => { setEditing(r); setShowModal(true) }}
                    className="w-8 h-8 rounded-lg bg-navy-700 hover:bg-navy-600 text-slate-400 hover:text-white flex items-center justify-center transition-colors" title="Modifier">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button onClick={() => handleDelete(r)}
                    className="w-8 h-8 rounded-lg bg-navy-700 hover:bg-red-600/30 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors" title="Supprimer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
                  </button>
                </div>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 mt-1 transition-colors" onClick={e => e.stopPropagation()}><polyline points="9 18 15 12 9 6"/></svg>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-2 border-t border-navy-800 text-xs text-slate-500">
        {registres.length} registre{registres.length !== 1 ? 's' : ''}
      </div>

      {showModal && <RegistreModal initial={editing || undefined} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null) }} />}
    </div>
  )
}
