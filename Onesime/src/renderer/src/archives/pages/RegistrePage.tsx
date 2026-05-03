import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getRegistre, updateRegistre, deleteRegistre, setActeRegistre, applyRegistreDefaults, exportRegistrePdf, getActes, fileUrl } from '../../api/client'
import type { Acte, Registre } from '../../types'
import { TYPE_ACTE_LABELS, TYPE_ACTE_COLORS, TYPE_REGISTRE_LABELS } from '../../types'

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tif', '.tiff'])

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_ACTE_COLORS[type] || TYPE_ACTE_COLORS.autre
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>{TYPE_ACTE_LABELS[type] || type}</span>
}

// ─── Modal ajout en masse ──────────────────────────────────────────────────────

function AddActesModal({ archiveId, registreId, existingIds, onDone, onClose }: {
  archiveId: string
  registreId: string
  existingIds: Set<string>
  onDone: () => void
  onClose: () => void
}) {
  const [actes, setActes] = useState<Acte[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [q, setQ] = useState('')
  const [noRegistreOnly, setNoRegistreOnly] = useState(true)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    setLoading(true)
    getActes(archiveId, noRegistreOnly ? { no_registre: true } : {}).then((data: Acte[]) => {
      setActes((data as Acte[]).filter(a => !existingIds.has(a.id)))
      setSelected(new Set())
      setLoading(false)
    })
  }, [archiveId, noRegistreOnly])

  const filtered = actes.filter(a => {
    if (!q) return true
    const txt = `${a.principals || ''} ${a.filename || ''} ${a.lieu_nom || ''} ${a.date_acte || ''}`.toLowerCase()
    return txt.includes(q.toLowerCase())
  })

  const allChecked = filtered.length > 0 && filtered.every(a => selected.has(a.id))
  const toggleAll = () => {
    if (allChecked) setSelected(s => { const n = new Set(s); filtered.forEach(a => n.delete(a.id)); return n })
    else setSelected(s => { const n = new Set(s); filtered.forEach(a => n.add(a.id)); return n })
  }

  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleAdd = async () => {
    if (!selected.size) return
    setAdding(true)
    for (const id of selected) await setActeRegistre(id, registreId)
    setAdding(false)
    onDone()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[560px] max-h-[78vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <h3 className="font-semibold text-white">Ajouter des actes au registre</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-navy-800 bg-navy-800/30">
          <input autoFocus type="text" placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)}
            className="flex-1 bg-navy-800 border border-navy-700 rounded-xl px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500" />
          <label className="flex items-center gap-2 cursor-pointer select-none flex-shrink-0">
            <input type="checkbox" checked={noRegistreOnly} onChange={e => setNoRegistreOnly(e.target.checked)} className="accent-amber-500 w-3.5 h-3.5" />
            <span className="text-xs text-slate-400 whitespace-nowrap">Sans registre</span>
          </label>
        </div>

        {/* Select-all bar */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 border-b border-navy-800 bg-navy-800/20">
            <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-3.5 h-3.5 accent-amber-500 cursor-pointer" />
            <span className="text-xs text-slate-400">
              {selected.size > 0 ? `${selected.size} sélectionné${selected.size > 1 ? 's' : ''}` : `${filtered.length} acte${filtered.length > 1 ? 's' : ''}`}
            </span>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-500 text-sm">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center gap-1">
              <p className="text-slate-500 text-sm">{q ? 'Aucun résultat' : 'Aucun acte disponible'}</p>
              {!q && noRegistreOnly && <p className="text-slate-600 text-xs">Essayez de décocher « Sans registre »</p>}
            </div>
          ) : (
            filtered.map(a => {
              const ext = a.filename ? a.filename.slice(a.filename.lastIndexOf('.')).toLowerCase() : ''
              const isImage = !!(a.file_path && IMAGE_EXTS.has(ext))
              const isChecked = selected.has(a.id)
              return (
                <div key={a.id} onClick={() => toggle(a.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 border-b border-navy-800/50 last:border-0 cursor-pointer select-none transition-colors ${isChecked ? 'bg-amber-500/10' : 'hover:bg-navy-800'}`}>
                  <input type="checkbox" checked={isChecked} onChange={() => {}} className="w-4 h-4 accent-amber-500 flex-shrink-0 pointer-events-none" />
                  <div className="w-10 h-12 rounded bg-navy-700 border border-navy-600 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {isImage
                      ? <img src={fileUrl(a.file_path)} alt="" className="w-full h-full object-cover" />
                      : <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <TypeBadge type={a.type_acte} />
                      {a.date_acte && <span className="text-xs text-slate-400">{a.date_precision !== 'exacte' ? `${a.date_precision} ` : ''}{a.date_acte}</span>}
                      {a.lieu_nom && <span className="text-xs text-slate-500">{a.lieu_nom}</span>}
                      {a.registre_nom && <span className="text-xs text-amber-500/60 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5">{a.registre_nom}</span>}
                    </div>
                    <p className="text-sm font-medium text-white truncate mt-0.5">
                      {a.principals || <span className="text-slate-500 italic font-normal">{a.filename || 'Sans nom'}</span>}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-navy-800 flex items-center justify-between">
          <span className="text-sm text-slate-400">{selected.size} acte{selected.size !== 1 ? 's' : ''} sélectionné{selected.size !== 1 ? 's' : ''}</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
            <button onClick={handleAdd} disabled={!selected.size || adding}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white text-sm font-medium transition-colors">
              {adding ? 'Ajout…' : `Ajouter${selected.size > 0 ? ` (${selected.size})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function RegistrePage() {
  const { archiveId, registreId } = useParams<{ archiveId: string; registreId: string }>()
  const navigate = useNavigate()
  const [registre, setRegistre] = useState<Registre & { actes: Acte[] } | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ nom: '', type_registre: 'autre', default_type_acte: '', default_lieu_nom: '', date_debut: '', date_fin: '', lieu_nom: '', description: '', notes: '' })
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)

  const load = () => {
    if (registreId) getRegistre(registreId).then((r: any) => {
      setRegistre(r)
      setForm({ nom: r.nom, type_registre: r.type_registre, default_type_acte: r.default_type_acte || '', default_lieu_nom: r.default_lieu_nom || '', date_debut: r.date_debut, date_fin: r.date_fin, lieu_nom: r.lieu_nom, description: r.description, notes: r.notes })
    })
  }
  useEffect(() => { load() }, [registreId])

  const handleSave = async () => {
    if (!registreId) return
    await updateRegistre(registreId, form)
    setEditMode(false); load()
  }

  const handleDelete = async () => {
    if (!registreId || !registre) return
    if (!confirm(`Supprimer le registre "${registre.nom}" ?`)) return
    await deleteRegistre(registreId)
    navigate(`/arch/${archiveId}/registres`)
  }

  const removeActe = async (acteId: string) => {
    await setActeRegistre(acteId, null); load()
  }

  if (!registre) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Chargement…</div>

  const actes = registre.actes || []
  const existingIds = new Set(actes.map(a => a.id))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-5 border-b border-navy-800">
        <button onClick={() => navigate(`/arch/${archiveId}/registres`)}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.8" className="w-5 h-5"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">{registre.nom}</h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
            <span>{TYPE_REGISTRE_LABELS[registre.type_registre] || registre.type_registre}</span>
            {(registre.date_debut || registre.date_fin) && (
              <span>{registre.date_debut}{registre.date_fin && registre.date_debut ? ' – ' : ''}{registre.date_fin}</span>
            )}
            {registre.lieu_nom && <span>· {registre.lieu_nom}</span>}
          </p>
        </div>
        <div className="flex-1" />
        <button
          disabled={exporting || actes.length === 0}
          onClick={async () => {
            setExporting(true)
            const res = await exportRegistrePdf(registreId!)
            setExporting(false)
            if (!res.ok && res.error) alert(`Erreur export PDF : ${res.error}`)
          }}
          className="flex items-center gap-1.5 bg-navy-800 hover:bg-navy-700 disabled:opacity-40 text-slate-300 hover:text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          title="Exporter le registre en PDF">
          {exporting
            ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 animate-spin"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-3.5 h-3.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="12" x2="12" y2="18"/><polyline points="9 15 12 18 15 15"/></svg>}
          {exporting ? 'Export…' : 'PDF'}
        </button>
        <button onClick={() => setEditMode(e => !e)}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${editMode ? 'bg-amber-500 text-white' : 'bg-navy-800 text-slate-400 hover:text-white'}`} title="Modifier">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button onClick={handleDelete}
          className="w-8 h-8 rounded-lg bg-navy-800 hover:bg-red-600/30 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors" title="Supprimer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </div>

      {/* Edit form */}
      {editMode && (
        <div className="px-5 py-4 border-b border-navy-800 bg-navy-800/30 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Nom</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Début</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                value={form.date_debut} onChange={e => setForm(f => ({ ...f, date_debut: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Fin</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                value={form.date_fin} onChange={e => setForm(f => ({ ...f, date_fin: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Lieu</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                value={form.lieu_nom} onChange={e => setForm(f => ({ ...f, lieu_nom: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Type de registre</label>
              <select className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                value={form.type_registre} onChange={e => setForm(f => ({ ...f, type_registre: e.target.value }))}>
                {Object.entries(TYPE_REGISTRE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Type d'acte par défaut</label>
              <select className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                value={form.default_type_acte} onChange={e => setForm(f => ({ ...f, default_type_acte: e.target.value }))}>
                <option value="">— Aucun (ne pas modifier le type) —</option>
                {Object.entries(TYPE_ACTE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {form.default_type_acte && (
                <p className="text-[10px] text-amber-400/70 mt-1">Les actes reliés seront classés en « {TYPE_ACTE_LABELS[form.default_type_acte]} ».</p>
              )}
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1 uppercase tracking-wider">Lieu par défaut</label>
              <input className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                value={form.default_lieu_nom} onChange={e => setForm(f => ({ ...f, default_lieu_nom: e.target.value }))}
                placeholder="ex. Baume-les-Dames" />
              {form.default_lieu_nom && (
                <p className="text-[10px] text-amber-400/70 mt-1">Les actes reliés auront le lieu « {form.default_lieu_nom} » automatiquement.</p>
              )}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setEditMode(false)} className="px-3 py-1.5 rounded-lg border border-navy-700 text-xs text-slate-400 hover:text-white transition-colors">Annuler</button>
            <button onClick={handleSave} className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white text-xs font-medium transition-colors">Enregistrer</button>
          </div>
        </div>
      )}

      {/* Actes bar */}
      <div className="px-5 py-3 border-b border-navy-800 flex items-center gap-2">
        <span className="text-sm font-medium text-white">{actes.length} acte{actes.length !== 1 ? 's' : ''}</span>
        <div className="flex-1" />
        {actes.length > 0 && (registre.default_type_acte || registre.default_lieu_nom) && (
          <button
            disabled={refreshing}
            onClick={async () => {
              setRefreshing(true)
              await applyRegistreDefaults(registreId!)
              setRefreshing(false)
              load()
            }}
            className="flex items-center gap-1.5 bg-navy-700 hover:bg-navy-600 disabled:opacity-50 text-slate-300 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors"
            title="Appliquer type et lieu par défaut à tous les actes du registre">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            {refreshing ? 'Mise à jour…' : 'Rafraîchir'}
          </button>
        )}
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl px-3 py-1.5 text-xs font-medium transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Ajouter des actes
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-5">
        {actes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" className="w-7 h-7"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <p className="text-slate-500 text-sm">Aucun acte dans ce registre</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 text-amber-400 hover:text-amber-300 text-sm transition-colors">
              + Ajouter des actes
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {actes.map(a => {
              const ext = a.filename ? a.filename.slice(a.filename.lastIndexOf('.')).toLowerCase() : ''
              const isImage = !!(a.file_path && IMAGE_EXTS.has(ext))
              return (
                <div key={a.id}
                  className="bg-navy-800 rounded-xl border border-navy-700 hover:border-amber-700/40 px-4 py-3 flex items-center gap-3 group cursor-pointer transition-colors"
                  onClick={() => navigate(`/arch/${archiveId}/actes/${a.id}`)}>
                  <div className="w-10 h-12 rounded bg-navy-700 border border-navy-600 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {isImage
                      ? <img src={fileUrl(a.file_path)} alt="" className="w-full h-full object-cover" />
                      : <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" className="w-5 h-5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <TypeBadge type={a.type_acte} />
                      {a.date_acte && <span className="text-xs text-slate-400">{a.date_precision !== 'exacte' ? `${a.date_precision} ` : ''}{a.date_acte}</span>}
                      {a.lieu_nom && <span className="text-xs text-slate-500">{a.lieu_nom}</span>}
                    </div>
                    <div className="mt-0.5">
                      {a.principals
                        ? <span className="text-sm font-medium text-white">{a.principals}</span>
                        : <span className="text-sm text-slate-500 italic truncate block">{a.filename || 'Sans nom'}</span>}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); removeActe(a.id) }}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg bg-navy-700 hover:bg-red-600/30 text-slate-400 hover:text-red-400 flex items-center justify-center transition-all flex-shrink-0"
                    title="Retirer du registre">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-slate-600 group-hover:text-slate-400 flex-shrink-0 transition-colors"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showAdd && archiveId && registreId && (
        <AddActesModal
          archiveId={archiveId}
          registreId={registreId}
          existingIds={existingIds}
          onDone={load}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  )
}
