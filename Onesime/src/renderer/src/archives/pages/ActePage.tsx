import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getActe, updateActe, deleteActe, setActeParties, getRegistres, fileUrl, htrStatus, htrTranscribe, htrSaveCorrection } from '../../api/client'
import type { Acte, ActePartie, Registre } from '../../types'
import { TYPE_ACTE_LABELS, ROLE_LABELS, TYPE_ACTE_COLORS } from '../../types'

type HtrState = 'checking' | 'loading' | 'ready' | 'unavailable'

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tif', '.tiff'])
const DATE_PRECISIONS = ['exacte', 'vers', 'avant', 'après', 'entre']
const EMPTY_PARTIE: ActePartie = { prenom: '', nom: '', age: '', profession: '', domicile: '', role: 'principal', notes: '' }

function PartiRow({ p, onChange, onRemove }: { p: ActePartie; onChange: (k: keyof ActePartie, v: string) => void; onRemove: () => void }) {
  return (
    <div className="p-3 bg-navy-850 rounded-xl border border-navy-700 flex flex-col gap-1.5">
      <div className="grid grid-cols-2 gap-1.5">
        <input value={p.prenom} onChange={e => onChange('prenom', e.target.value)} placeholder="Prénom"
          className="bg-navy-800 border border-navy-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500" />
        <input value={p.nom} onChange={e => onChange('nom', e.target.value)} placeholder="Nom"
          className="bg-navy-800 border border-navy-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500" />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        <select value={p.role} onChange={e => onChange('role', e.target.value)}
          className="col-span-2 bg-navy-800 border border-navy-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500">
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input value={p.age} onChange={e => onChange('age', e.target.value)} placeholder="Âge"
          className="bg-navy-800 border border-navy-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500" />
      </div>
      <div className="flex gap-1.5">
        <input value={p.profession} onChange={e => onChange('profession', e.target.value)} placeholder="Profession"
          className="flex-1 bg-navy-800 border border-navy-700 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500" />
        <button onClick={onRemove} title="Supprimer" className="w-7 h-7 rounded-lg bg-navy-700 hover:bg-red-600/30 text-slate-400 hover:text-red-400 flex items-center justify-center transition-colors flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  )
}

export default function ActePage() {
  const { archiveId, acteId } = useParams<{ archiveId: string; acteId: string }>()
  const navigate = useNavigate()
  const [acte, setActe] = useState<Acte | null>(null)
  const [registres, setRegistres] = useState<Registre[]>([])
  const [form, setForm] = useState<Partial<Acte>>({})
  const [parties, setParties] = useState<ActePartie[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [htrState, setHtrState] = useState<HtrState>('checking')
  const [htrEngine, setHtrEngine] = useState<string>('')
  const [transcribing, setTranscribing] = useState(false)
  const [correctionSaved, setCorrectionSaved] = useState(false)
  const htrPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const s = await htrStatus()
        if (cancelled) return
        if (!s || !s.ok) { setHtrState('unavailable'); return }
        if (s.model_ready) {
          setHtrState('ready')
          setHtrEngine((s as any).engine || '')
          if (htrPollRef.current) { clearInterval(htrPollRef.current); htrPollRef.current = null }
        } else if (s.model_loading) { setHtrState('loading') }
        else { setHtrState('unavailable') }
      } catch { if (!cancelled) setHtrState('unavailable') }
    }
    check()
    htrPollRef.current = setInterval(check, 5000)
    return () => { cancelled = true; if (htrPollRef.current) clearInterval(htrPollRef.current) }
  }, [])

  useEffect(() => {
    if (!acteId || !archiveId) return
    Promise.all([getActe(acteId), getRegistres(archiveId)]).then(([a, r]: [Acte, Registre[]]) => {
      setActe(a)
      setForm({
        type_acte: a.type_acte, date_acte: a.date_acte, date_precision: a.date_precision,
        lieu_nom: a.lieu_nom, folio: a.folio, acte_num: a.acte_num,
        description: a.description, transcription: a.transcription, notes: a.notes,
        registre_id: a.registre_id,
      })
      setParties(a.parties || [])
      setRegistres(r)
      setDirty(false)
    })
  }, [acteId, archiveId])

  const set = (k: keyof typeof form, v: any) => { setForm(f => ({ ...f, [k]: v })); setDirty(true) }
  const setPartie = (i: number, k: keyof ActePartie, v: string) => { setParties(ps => ps.map((p, j) => j === i ? { ...p, [k]: v } : p)); setDirty(true) }
  const addPartie = () => { setParties(ps => [...ps, { ...EMPTY_PARTIE }]); setDirty(true) }
  const removePartie = (i: number) => { setParties(ps => ps.filter((_, j) => j !== i)); setDirty(true) }

  const save = useCallback(async () => {
    if (!acteId || saving) return
    setSaving(true)
    try {
      await updateActe(acteId, form)
      await setActeParties(acteId, parties)
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }, [acteId, form, parties, saving])

  const handleDelete = async () => {
    if (!acteId || !confirm('Supprimer cet acte ?')) return
    await deleteActe(acteId)
    navigate(`/arch/${archiveId}/actes`)
  }

  const ext = acte?.filename ? acte.filename.slice(acte.filename.lastIndexOf('.')).toLowerCase() : ''
  const isImage = !!(acte?.file_path && IMAGE_EXTS.has(ext))

  if (!acte) return <div className="flex items-center justify-center h-full text-slate-500 text-sm">Chargement…</div>

  return (
    <div className="flex h-full overflow-hidden">
      {/* Image panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: '#060d18' }}>
        <div className="flex items-center gap-2 px-4 py-2 border-b border-navy-800/60 flex-shrink-0">
          <button onClick={() => navigate(`/arch/${archiveId}/actes`)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
            Actes
          </button>
          <div className="flex-1" />
          {acte.file_path && (
            <>
              <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="w-7 h-7 rounded bg-navy-800 hover:bg-navy-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors">−</button>
              <span className="text-xs text-slate-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="w-7 h-7 rounded bg-navy-800 hover:bg-navy-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors">+</button>
              <button onClick={() => setZoom(1)} className="text-xs text-slate-500 hover:text-white px-2 py-1 rounded hover:bg-navy-700 transition-colors">Réinitialiser</button>
            </>
          )}
        </div>
        <div className="flex-1 overflow-auto flex items-start justify-center p-6">
          {isImage ? (
            <img
              src={fileUrl(acte.file_path)}
              alt={acte.filename}
              style={{ width: zoom === 1 ? '100%' : `${zoom * 100}%`, maxWidth: zoom === 1 ? '100%' : 'none' }}
              className="rounded shadow-2xl select-none object-contain"
              onDoubleClick={() => setZoom(z => z === 1 ? 2 : 1)}
            />
          ) : acte.file_path ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-navy-800 border border-navy-700 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" className="w-10 h-10"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <p className="text-slate-400 text-sm">{acte.filename}</p>
              <p className="text-slate-600 text-xs">Aperçu non disponible pour ce format</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <div className="w-20 h-20 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="1.5" className="w-10 h-10"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <p className="text-slate-500 text-sm">Aucun fichier associé à cet acte</p>
            </div>
          )}
        </div>
      </div>

      {/* Form panel */}
      <div className="w-[360px] flex-shrink-0 flex flex-col border-l border-navy-800 bg-navy-900 overflow-hidden">
        {/* Form header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-navy-800 flex-shrink-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${TYPE_ACTE_COLORS[acte.type_acte] || TYPE_ACTE_COLORS.autre}`}>
            {TYPE_ACTE_LABELS[acte.type_acte] || acte.type_acte}
          </span>
          <span className="text-xs text-slate-500 truncate flex-1">{acte.filename || 'Acte sans fichier'}</span>
          <button onClick={handleDelete} className="w-7 h-7 rounded-lg bg-navy-800 hover:bg-red-600/30 text-slate-500 hover:text-red-400 flex items-center justify-center transition-colors" title="Supprimer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Type + date precision */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Type</label>
              <select value={form.type_acte || 'autre'} onChange={e => set('type_acte', e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500">
                {Object.entries(TYPE_ACTE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Précision</label>
              <select value={form.date_precision || 'exacte'} onChange={e => set('date_precision', e.target.value)}
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500">
                {DATE_PRECISIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Date</label>
            <input value={form.date_acte || ''} onChange={e => set('date_acte', e.target.value)} placeholder="1er janvier 1750"
              className="w-full bg-navy-800 border border-navy-700 rounded-xl px-2.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500" />
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Lieu</label>
            <input value={form.lieu_nom || ''} onChange={e => set('lieu_nom', e.target.value)} placeholder="Baume-les-Dames"
              className="w-full bg-navy-800 border border-navy-700 rounded-xl px-2.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Folio</label>
              <input value={form.folio || ''} onChange={e => set('folio', e.target.value)} placeholder="f° 12"
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-2.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">N° acte</label>
              <input value={form.acte_num || ''} onChange={e => set('acte_num', e.target.value)} placeholder="42"
                className="w-full bg-navy-800 border border-navy-700 rounded-xl px-2.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Registre</label>
            <select value={form.registre_id || ''} onChange={e => set('registre_id', e.target.value || null)}
              className="w-full bg-navy-800 border border-navy-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-amber-500">
              <option value="">— Aucun registre —</option>
              {registres.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Description</label>
            <textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={2}
              placeholder="Résumé de l'acte…"
              className="w-full bg-navy-800 border border-navy-700 rounded-xl px-2.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none" />
          </div>

          {/* Parties */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] uppercase tracking-wider text-slate-500">Parties ({parties.length})</label>
              <button onClick={addPartie} className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Ajouter
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {parties.map((p, i) => (
                <PartiRow key={i} p={p} onChange={(k, v) => setPartie(i, k, v)} onRemove={() => removePartie(i)} />
              ))}
              {parties.length === 0 && (
                <p className="text-xs text-slate-600 italic py-2 text-center">Aucune partie renseignée</p>
              )}
            </div>
          </div>

          {/* Transcription */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-500">Transcription</label>
              <div className="flex items-center gap-2">
                {/* HTR status dot */}
                {htrState === 'checking' && <span className="text-[10px] text-slate-600">…</span>}
                {htrState === 'loading' && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-400/80">
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Chargement IA…
                  </span>
                )}
                {htrState === 'ready' && !transcribing && (
                  <button
                    disabled={!acte?.file_path}
                    onClick={async () => {
                      if (!acte?.file_path) return
                      setTranscribing(true)
                      setCorrectionSaved(false)
                      try {
                        const res = await htrTranscribe(acte.file_path)
                        if (res.ok && res.transcription) {
                          set('transcription', res.transcription)
                        } else {
                          alert(res.error || 'Transcription échouée')
                        }
                      } finally {
                        setTranscribing(false)
                      }
                    }}
                    className="flex items-center gap-1 text-[10px] text-violet-400 hover:text-violet-300 disabled:opacity-40 transition-colors"
                    title={`Transcrire avec ${htrEngine === 'ollama' ? 'Ollama (IA locale)' : 'TrOCR-fr'}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="M9 3H5a2 2 0 0 0-2 2v4"/><path d="M9 3h10a2 2 0 0 1 2 2v4"/><path d="M3 9v10a2 2 0 0 0 2 2h4"/><path d="M21 9v10a2 2 0 0 1-2 2h-4"/><path d="M9 21h6"/><path d="M9 12h6"/><path d="M12 9v6"/></svg>
                    Transcrire{htrEngine === 'ollama' ? ' (Ollama)' : ''}
                  </button>
                )}
                {transcribing && (
                  <span className="flex items-center gap-1 text-[10px] text-violet-400">
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                    Transcription…
                  </span>
                )}
              </div>
            </div>
            <textarea value={form.transcription || ''} onChange={e => { set('transcription', e.target.value); setCorrectionSaved(false) }} rows={8}
              placeholder="Texte intégral de l'acte…"
              className="w-full bg-navy-800 border border-navy-700 rounded-xl px-2.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none font-mono leading-relaxed" />
            {/* Valider pour entraînement */}
            {htrState === 'ready' && form.transcription && acte?.file_path && (
              <div className="flex items-center justify-end mt-1">
                {correctionSaved ? (
                  <span className="text-[10px] text-teal-400 flex items-center gap-1">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><polyline points="20 6 9 17 4 12"/></svg>
                    Validé pour entraînement
                  </span>
                ) : (
                  <button
                    onClick={async () => {
                      if (!acteId || !acte?.file_path || !form.transcription) return
                      const res = await htrSaveCorrection(acteId, acte.file_path, form.transcription)
                      if (res.ok) setCorrectionSaved(true)
                    }}
                    className="text-[10px] text-slate-500 hover:text-teal-400 transition-colors"
                    title={`Enregistrer comme donnée d'entraînement`}>
                    Valider pour entraîner l'IA
                  </button>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-wider text-slate-500 mb-1">Notes</label>
            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full bg-navy-800 border border-navy-700 rounded-xl px-2.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 resize-none" />
          </div>

          <div className="pb-2" />
        </div>

        {/* Save bar */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-navy-800 flex items-center gap-3">
          {dirty && (
            <span className="text-xs text-amber-400/70 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              Non sauvegardé
            </span>
          )}
          <div className="flex-1" />
          <button onClick={save} disabled={!dirty || saving}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors">
            {saving ? 'Sauvegarde…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
