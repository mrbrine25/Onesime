import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getDocument, updateDocument, createZone, deleteZone, updateZone,
  getPersons, createPerson, addPersonToZone, removePersonFromZone,
  fileUrl, getDocuments, linkDocuments, unlinkDocument,
  setFicheAvatar, setPersonAvatar, listZoneLabels,
  getZonesWithFace, getZonesAllLabeled, getThumbnail,
} from '../api/client'
import type { Document, Zone, Person, FaceZone } from '../types'
import ZoneEditor from '../components/ZoneEditor'
import { DocPhotoEditor } from '../components/PhotoEditor'
import {
  computeFaceDescriptor, forceFaceDescriptor, detectAllFacesInImage, euclideanDistance, similarityPercent,
  descriptorToJson, jsonToDescriptor,
} from '../utils/faceapi'

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp', '.avif']
const VIDEO_EXTS  = ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.m4v', '.wmv']
const AUDIO_EXTS  = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus']

// ─── Label combo (dropdown toujours visible au focus) ────────────────────────

function LabelCombo({ value, onChange, options, placeholder, autoFocus, className }: {
  value: string; onChange: (v: string) => void; options: string[]
  placeholder?: string; autoFocus?: boolean; className?: string
}) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState(false)
  const filtered = typed && value
    ? options.filter(o => o.toLowerCase().includes(value.toLowerCase()))
    : options
  return (
    <div className="relative w-full">
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={e => { onChange(e.target.value); setTyped(true); setOpen(true) }}
        onFocus={() => { setOpen(true); setTyped(false) }}
        onBlur={() => setTimeout(() => { setOpen(false); setTyped(false) }, 100)}
        onKeyDown={e => {
          if (e.key === 'Escape') { setOpen(false); e.stopPropagation() }
          if (e.key === 'Enter' && open) { setOpen(false); e.preventDefault() }
        }}
        placeholder={placeholder}
        className={className}
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-0.5 bg-navy-800 border border-navy-600 rounded-lg shadow-xl z-50 max-h-40 overflow-y-auto">
          {filtered.map(o => (
            <button key={o} type="button"
              onMouseDown={e => { e.preventDefault(); onChange(o); setOpen(false) }}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-navy-700 hover:text-white transition-colors"
            >{o}</button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Link recto/verso modal ───────────────────────────────────────────────────

function LinkDocModal({ allDocs, currentId, onLink, onClose }: {
  allDocs: Document[]; currentId: string
  onLink: (id: string, type: 'recto' | 'verso') => void; onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const [linkType, setLinkType] = useState<'recto' | 'verso'>('recto')
  const available = allDocs.filter(d =>
    d.id !== currentId && !d.linked_document_id && !d.link_type &&
    (!search || d.filename.toLowerCase().includes(search.toLowerCase()) || d.title.toLowerCase().includes(search.toLowerCase()))
  )
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[480px] max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <h3 className="font-semibold text-white">Lier un document recto/verso</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="p-4 border-b border-navy-800 flex flex-col gap-3">
          <div className="flex gap-2">
            {(['recto', 'verso'] as const).map(t => (
              <button key={t} onClick={() => setLinkType(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${linkType === t ? 'bg-amber-500/20 border-amber-500 text-amber-300' : 'border-navy-700 text-slate-400 hover:text-white'}`}
              >Ce doc est le <strong>{t}</strong></button>
            ))}
          </div>
          <input autoFocus type="text" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {available.length === 0
            ? <p className="text-center text-slate-500 text-sm py-10">Aucun document disponible</p>
            : available.map(d => (
              <button key={d.id} onClick={() => { onLink(d.id, linkType); onClose() }}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-navy-800 transition-colors text-left border-b border-navy-800/50 last:border-0"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" className="w-5 h-5 flex-shrink-0">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                </svg>
                <div className="min-w-0">
                  <p className="text-sm text-white truncate">{d.title || d.filename}</p>
                  {d.date && <p className="text-xs text-slate-500">{d.date}</p>}
                </div>
              </button>
            ))
          }
        </div>
      </div>
    </div>
  )
}

// ─── Face search modal ────────────────────────────────────────────────────────

function FaceSearchModal({ archiveId, zone, onClose, onNavigate }: {
  archiveId: string
  zone: Zone
  onClose: () => void
  onNavigate: (docId: string) => void
}) {
  const [results, setResults] = useState<Array<{ zone: FaceZone; score: number }> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [persons, setPersons] = useState<Person[]>([])
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    getPersons(archiveId).then(setPersons)
  }, [archiveId])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      if (!zone.face_descriptor) { setError('Cette vignette n\'a pas encore été analysée.'); return }
      const allZones = await getZonesWithFace(archiveId) as FaceZone[]
      const ref = jsonToDescriptor(zone.face_descriptor)
      const scored = allZones
        .filter(z => z.id !== zone.id)
        .map(z => ({ zone: z, score: similarityPercent(euclideanDistance(ref, jsonToDescriptor(z.face_descriptor))) }))
        .filter(r => r.score >= 15)
        .sort((a, b) => b.score - a.score)
      if (!cancelled) setResults(scored)
    }
    run().catch(e => { if (!cancelled) setError(String(e)) })
    return () => { cancelled = true }
  }, [zone.id])

  const handleQuickConfirm = (zoneId: string) => {
    setConfirmed(prev => new Map(prev).set(zoneId, ''))
  }

  const handleNameConfirm = async (zoneId: string, personId: string) => {
    await addPersonToZone(zoneId, personId)
    const person = persons.find(p => p.id === personId)
    const fullName = person ? `${person.first_name} ${person.last_name}`.trim() : ''
    if (fullName) await updateZone(zoneId, { label: fullName })
    setConfirmed(prev => new Map(prev).set(zoneId, fullName || 'Identifié'))
    setConfirmingId(null)
  }

  const GROUPS = [
    { label: 'Très similaire', min: 75, max: 100, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
    { label: 'Similaire',      min: 55, max: 75,  color: 'text-blue-400',  bg: 'bg-blue-500/10 border-blue-500/30' },
    { label: 'Peut-être',      min: 30, max: 55,  color: 'text-slate-400', bg: 'bg-navy-700/50 border-navy-600' },
    { label: 'Faible',         min: 15, max: 30,  color: 'text-slate-600', bg: 'bg-navy-800/50 border-navy-700' },
  ]
  const groups = results
    ? GROUPS.map(g => ({ ...g, items: results.filter(r => r.score >= g.min && r.score < g.max) }))
    : []

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[600px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <div>
            <h3 className="font-semibold text-white">Visages similaires</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Vignette : {zone.label || <span className="italic">sans étiquette</span>}
              {confirmed.size > 0 && <span className="ml-2 text-green-400">· {confirmed.size} confirmé(s)</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {error && <p className="text-red-400 text-sm text-center py-8">{error}</p>}
          {!results && !error && (
            <div className="flex flex-col items-center py-12 gap-3">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Analyse en cours…</p>
            </div>
          )}
          {results && results.length === 0 && (
            <div className="text-center py-12">
              <p className="text-slate-400 text-sm">Aucun visage similaire trouvé dans l'archive.</p>
              <p className="text-slate-600 text-xs mt-2">Analysez d'autres vignettes pour enrichir la base.</p>
            </div>
          )}
          {groups.map(g => g.items.length > 0 && (
            <div key={g.label} className="mb-5">
              <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${g.color}`}>{g.label}</p>
              <div className="flex flex-col gap-2">
                {g.items.map(({ zone: z, score }) => (
                  <div key={z.id} className={`rounded-xl border ${g.bg}`}>
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <button onClick={() => { onNavigate(z.doc_id); onClose() }} className="flex-shrink-0 hover:opacity-80 transition-opacity" title="Ouvrir le document">
                          <FaceThumb faceZone={z} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {confirmed.get(z.id)
                              ? confirmed.get(z.id)
                              : z.first_name && z.last_name ? `${z.first_name} ${z.last_name}` : (z.label || <span className="italic text-slate-500">Sans nom</span>)}
                          </p>
                          <button
                            onClick={() => { onNavigate(z.doc_id); onClose() }}
                            className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors truncate max-w-full mt-0.5"
                            title="Ouvrir le document source"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 flex-shrink-0">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <span className="truncate">{z.doc_title || z.doc_filename}</span>
                          </button>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right flex flex-col items-end gap-1.5">
                        <p className={`text-lg font-bold ${g.color}`}>{score}%</p>
                        {confirmed.has(z.id) ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-green-400 font-semibold">
                              ✓ {confirmed.get(z.id) || 'Même personne'}
                            </span>
                            {confirmingId === z.id ? (
                              <select
                                autoFocus
                                className="text-xs bg-navy-800 border border-navy-600 text-white rounded-lg px-2 py-1 focus:outline-none focus:border-blue-500"
                                defaultValue=""
                                onChange={e => { if (e.target.value) handleNameConfirm(z.id, e.target.value) }}
                                onBlur={() => setConfirmingId(null)}
                              >
                                <option value="">Choisir…</option>
                                {persons.map(p => (
                                  <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                                ))}
                              </select>
                            ) : !confirmed.get(z.id) && (
                              <button
                                onClick={() => setConfirmingId(z.id)}
                                className="text-[10px] text-slate-500 hover:text-blue-400 transition-colors"
                              >
                                Nommer →
                              </button>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => handleQuickConfirm(z.id)}
                            className="text-[10px] bg-green-600/20 border border-green-500/40 text-green-400 hover:bg-green-600/30 rounded-lg px-2 py-1 transition-colors font-medium"
                            title="Confirmer que c'est la même personne"
                          >
                            ✓ Confirmer
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Batch reindex modal ──────────────────────────────────────────────────────

interface LabeledZone {
  id: string; document_id: string; x: number; y: number; width: number; height: number
  label: string; face_descriptor: string | null; doc_file_path: string; doc_name: string
}

type ZoneStatus = 'pending' | 'running' | 'done' | 'error'

function BatchReindexModal({ archiveId, onClose }: { archiveId: string; onClose: () => void }) {
  const [zones, setZones] = useState<LabeledZone[]>([])
  const [statuses, setStatuses] = useState<Map<string, ZoneStatus>>(new Map())
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const cancelRef = useRef(false)

  useEffect(() => {
    getZonesAllLabeled(archiveId).then(zs => setZones(zs as LabeledZone[]))
  }, [archiveId])

  const run = async () => {
    cancelRef.current = false
    setRunning(true)
    const init = new Map<string, ZoneStatus>()
    zones.forEach(z => init.set(z.id, 'pending'))
    setStatuses(init)

    for (const z of zones) {
      if (cancelRef.current) break
      setStatuses(prev => new Map(prev).set(z.id, 'running'))
      try {
        const descriptor = await forceFaceDescriptor(fileUrl(z.doc_file_path), z)
        if (descriptor) {
          await updateZone(z.id, { face_descriptor: descriptorToJson(descriptor) })
          setStatuses(prev => new Map(prev).set(z.id, 'done'))
        } else {
          setStatuses(prev => new Map(prev).set(z.id, 'error'))
        }
      } catch {
        setStatuses(prev => new Map(prev).set(z.id, 'error'))
      }
    }
    setRunning(false)
    setDone(true)
  }

  const doneCount = Array.from(statuses.values()).filter(s => s === 'done').length
  const errCount = Array.from(statuses.values()).filter(s => s === 'error').length
  const progress = zones.length > 0 ? Math.round((doneCount + errCount) / zones.length * 100) : 0

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget && !running) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[520px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <div>
            <h3 className="font-semibold text-white">Réindexer les visages de l'archive</h3>
            <p className="text-xs text-slate-500 mt-0.5">{zones.length} vignette{zones.length !== 1 ? 's' : ''} avec étiquette ou descripteur</p>
          </div>
          <button onClick={onClose} disabled={running} className="text-slate-500 hover:text-white disabled:opacity-30">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {running && (
          <div className="px-5 py-3 border-b border-navy-800">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>{doneCount} / {zones.length} traité{doneCount !== 1 ? 's' : ''}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-navy-700 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3">
          {zones.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-10">Aucune vignette à réindexer dans cette archive.</p>
          ) : (
            <div className="flex flex-col gap-1">
              {zones.map(z => {
                const status = statuses.get(z.id)
                return (
                  <div key={z.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-navy-800/50">
                    <div className="w-8 h-8 rounded bg-navy-700 flex-shrink-0 overflow-hidden">
                      <img src={fileUrl(z.doc_file_path)} style={{ width: `${100/z.width}%`, height: `${100/z.height}%`, marginLeft: `${-z.x/z.width*100}%`, marginTop: `${-z.y/z.height*100}%` }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{z.label || 'Sans étiquette'}</p>
                      <p className="text-[10px] text-slate-500 truncate">{z.doc_name}</p>
                    </div>
                    <div className="flex-shrink-0 w-5 text-center">
                      {status === 'running' && <div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin mx-auto" />}
                      {status === 'done' && <span className="text-green-400 text-xs">✓</span>}
                      {status === 'error' && <span className="text-red-400 text-xs">✗</span>}
                      {(!status || status === 'pending') && <span className="text-slate-700 text-xs">·</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-navy-800 flex items-center justify-between">
          {done && (
            <span className="text-xs text-slate-400">{doneCount} réussi{doneCount !== 1 ? 's' : ''} · {errCount} échec{errCount !== 1 ? 's' : ''}</span>
          )}
          {!done && <span />}
          <div className="flex gap-2">
            {running ? (
              <button onClick={() => { cancelRef.current = true }} className="px-4 py-2 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">
                Annuler
              </button>
            ) : done ? (
              <button onClick={onClose} className="px-4 py-2 rounded-xl bg-navy-700 hover:bg-navy-600 text-white text-sm font-medium transition-colors">Fermer</button>
            ) : (
              <>
                <button onClick={onClose} className="px-4 py-2 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
                <button onClick={run} disabled={zones.length === 0}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors">
                  Lancer ({zones.length})
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function FaceThumb({ faceZone }: { faceZone: FaceZone }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (cancelled) return
      const canvas = document.createElement('canvas')
      const size = 48
      canvas.width = size; canvas.height = size
      const ctx = canvas.getContext('2d')!
      const sw = img.naturalWidth * faceZone.width
      const sh = img.naturalHeight * faceZone.height
      ctx.drawImage(img, img.naturalWidth * faceZone.x, img.naturalHeight * faceZone.y, sw, sh, 0, 0, size, size)
      if (!cancelled) setDataUrl(canvas.toDataURL())
    }
    img.onerror = () => {}
    img.src = fileUrl(faceZone.doc_file_path)
    return () => { cancelled = true }
  }, [faceZone.id])
  if (!dataUrl) return <div className="w-12 h-12 rounded-lg bg-navy-700 flex-shrink-0" />
  return <img src={dataUrl} className="w-12 h-12 rounded-lg object-cover flex-shrink-0 border border-navy-600" />
}

const thumbCache = new Map<string, string>()

function ZoneThumb({ filePath, zone }: { filePath: string; zone: { x: number; y: number; width: number; height: number } }) {
  const cacheKey = `${filePath}|${zone.x}|${zone.y}|${zone.width}|${zone.height}`
  const [dataUrl, setDataUrl] = useState<string | null>(thumbCache.get(cacheKey) ?? null)
  useEffect(() => {
    if (thumbCache.has(cacheKey)) return
    let cancelled = false
    const run = async () => {
      try {
        const thumb = await getThumbnail(filePath, 400)
        if (cancelled || !thumb) return
        const img = new Image()
        img.onload = () => {
          if (cancelled) return
          const canvas = document.createElement('canvas')
          canvas.width = 36; canvas.height = 36
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img,
            Math.round(img.naturalWidth * zone.x), Math.round(img.naturalHeight * zone.y),
            Math.round(img.naturalWidth * zone.width), Math.round(img.naturalHeight * zone.height),
            0, 0, 36, 36)
          const url = canvas.toDataURL()
          thumbCache.set(cacheKey, url)
          if (!cancelled) setDataUrl(url)
        }
        img.src = thumb
      } catch { /* silent */ }
    }
    run()
    return () => { cancelled = true }
  }, [cacheKey])
  if (!dataUrl) return <div className="w-9 h-9 rounded bg-navy-700 flex-shrink-0" />
  return <img src={dataUrl} className="w-9 h-9 rounded object-cover flex-shrink-0 border border-navy-600/50" />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentPage() {
  const { archiveId, docId } = useParams<{ archiveId: string; docId: string }>()
  const navigate = useNavigate()
  const [doc, setDoc] = useState<Document | null>(null)
  const [linkedDoc, setLinkedDoc] = useState<Document | null>(null)
  const [allDocs, setAllDocs] = useState<Document[]>([])
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null)
  const [persons, setPersons] = useState<Person[]>([])
  const [zoneTranscription, setZoneTranscription] = useState('')
  const [zoneLabel, setZoneLabel] = useState('')
  const [zoneNotes, setZoneNotes] = useState('')
  const [savingZoneMeta, setSavingZoneMeta] = useState(false)
  const [showZoneModal, setShowZoneModal] = useState(false)
  const [pendingZone, setPendingZone] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
  const [zoneForm, setZoneForm] = useState({ label: '', notes: '', isFace: false })
  const [analyzingFaceInModal, setAnalyzingFaceInModal] = useState(false)
  const [zoneLabels, setZoneLabels] = useState<string[]>([])
  const [transcription, setTranscription] = useState('')
  const [savingTranscription, setSavingTranscription] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [archiveDocs, setArchiveDocs] = useState<Document[]>([])
  // metadata editing
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState('')
  const [editingMeta, setEditingMeta] = useState(false)
  const [metaForm, setMetaForm] = useState({ description: '', date: '', location: '' })
  const [avatarSet, setAvatarSet] = useState(false)
  const [personAvatarsSet, setPersonAvatarsSet] = useState<Set<string>>(new Set())
  const [showPhotoEditor, setShowPhotoEditor] = useState(false)
  const [faceAnalyzing, setFaceAnalyzing] = useState(false)
  const [faceDetecting, setFaceDetecting] = useState(false)
  const [faceSearchZone, setFaceSearchZone] = useState<Zone | null>(null)
  const [showBatchReindex, setShowBatchReindex] = useState(false)
  const [showFaceTools, setShowFaceTools] = useState(false)
  const [newPersonForm, setNewPersonForm] = useState<{ first_name: string; last_name: string } | null>(null)
  const [savingNewPerson, setSavingNewPerson] = useState(false)
  const [renamingZoneId, setRenamingZoneId] = useState<string | null>(null)
  const [renameVal, setRenameVal] = useState('')

  const load = async () => {
    const d = await getDocument(docId!)
    setDoc(d)
    setTranscription(d.transcription ?? '')
    setTitleVal(d.title || d.filename)
    setMetaForm({ description: d.description, date: d.date, location: d.location ?? '' })
    if (d.linked_document_id) {
      setLinkedDoc(await getDocument(d.linked_document_id))
    } else {
      setLinkedDoc(null)
    }
  }

  useEffect(() => { load() }, [docId])

  useEffect(() => {
    if (archiveId) {
      listZoneLabels(archiveId).then(l => setZoneLabels(l as string[]))
      getDocuments(archiveId).then(setArchiveDocs)
    }
  }, [archiveId])

  useEffect(() => {
    if (archiveId) getPersons(archiveId).then(setPersons)
  }, [archiveId])

  // Mémoriser le dernier document consulté par archive
  useEffect(() => {
    if (archiveId && docId && doc) {
      localStorage.setItem(`lastDoc_${archiveId}`, JSON.stringify({ id: docId, title: doc.title || doc.filename }))
    }
  }, [archiveId, docId, doc?.id])

  const isImage = doc && IMAGE_EXTS.some(e => doc.filename.toLowerCase().endsWith(e))
  const isVideo = doc && VIDEO_EXTS.some(e => doc.filename.toLowerCase().endsWith(e))
  const isAudio = doc && AUDIO_EXTS.some(e => doc.filename.toLowerCase().endsWith(e))

  const currentDocIndex = archiveDocs.findIndex(d => d.id === docId)
  const prevDoc = currentDocIndex > 0 ? archiveDocs[currentDocIndex - 1] : null
  const nextDoc = currentDocIndex >= 0 && currentDocIndex < archiveDocs.length - 1 ? archiveDocs[currentDocIndex + 1] : null

  // ── Transcription doc ──────────────────────────────────────────────────────
  const saveTranscription = async () => {
    setSavingTranscription(true)
    await updateDocument(docId!, { transcription })
    setSavingTranscription(false)
  }

  // ── Metadata ───────────────────────────────────────────────────────────────
  const saveTitle = async () => {
    if (!doc) return
    const newTitle = titleVal.trim() || doc.filename
    await updateDocument(docId!, { title: newTitle })
    setEditingTitle(false)
    load()
  }

  const saveMeta = async () => {
    await updateDocument(docId!, { description: metaForm.description, date: metaForm.date, location: metaForm.location })
    setEditingMeta(false)
    load()
  }

  // ── Zones ──────────────────────────────────────────────────────────────────
  const handleZoneCreated = (z: { x: number; y: number; width: number; height: number }) => {
    setPendingZone(z)
    setZoneForm({ label: '', notes: '', isFace: false })
    setShowZoneModal(true)
  }

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pendingZone || !doc) return
    const label = zoneForm.label || (zoneForm.isFace ? 'Visage' : '')
    const zone = await createZone(docId!, { ...pendingZone, label, notes: zoneForm.notes })
    if (label && !zoneLabels.includes(label)) {
      setZoneLabels(prev => [...prev, label].sort())
    }
    if (zoneForm.isFace) {
      setAnalyzingFaceInModal(true)
      try {
        let descriptor = await computeFaceDescriptor(fileUrl(doc.file_path), { x: pendingZone.x, y: pendingZone.y, width: pendingZone.width, height: pendingZone.height })
        if (!descriptor) descriptor = await forceFaceDescriptor(fileUrl(doc.file_path), { x: pendingZone.x, y: pendingZone.y, width: pendingZone.width, height: pendingZone.height })
        if (descriptor) await updateZone(zone.id, { face_descriptor: descriptorToJson(descriptor) })
      } catch { /* non bloquant */ } finally {
        setAnalyzingFaceInModal(false)
      }
    }
    setShowZoneModal(false)
    setPendingZone(null)
    load()
  }

  const handleDeleteZone = async (zoneId: string) => {
    if (!confirm('Supprimer cette vignette ?')) return
    await deleteZone(zoneId)
    setSelectedZone(null)
    load()
  }

  const handleZoneSelected = (zone: Zone) => {
    setSelectedZone(zone)
    setZoneTranscription(zone.transcription || '')
    setZoneLabel(zone.label || '')
    setZoneNotes(zone.notes || '')
    setAvatarSet(false)
  }

  const saveZoneMeta = async () => {
    if (!selectedZone) return
    setSavingZoneMeta(true)
    await updateZone(selectedZone.id, { label: zoneLabel, notes: zoneNotes, transcription: zoneTranscription })
    setSelectedZone(prev => prev ? { ...prev, label: zoneLabel, notes: zoneNotes, transcription: zoneTranscription } : null)
    setSavingZoneMeta(false)
    load()
  }

  const handleAddPerson = async (personId: string) => {
    if (!selectedZone) return
    await addPersonToZone(selectedZone.id, personId)
    load()
  }

  const handleCreateAndLinkPerson = async () => {
    if (!selectedZone || !newPersonForm || !archiveId) return
    const fn = newPersonForm.first_name.trim()
    const ln = newPersonForm.last_name.trim()
    if (!fn && !ln) return
    setSavingNewPerson(true)
    const person = await createPerson(archiveId, { first_name: fn, last_name: ln }) as Person
    await addPersonToZone(selectedZone.id, person.id)
    setNewPersonForm(null)
    setSavingNewPerson(false)
    const p = await getPersons()
    setPersons(p)
    load()
  }

  const handleRemovePerson = async (personId: string) => {
    if (!selectedZone) return
    await removePersonFromZone(selectedZone.id, personId)
    load()
    setSelectedZone(prev => prev ? { ...prev, persons: (prev.persons || []).filter(p => p.id !== personId) } : null)
  }

  // ── Export vignette ────────────────────────────────────────────────────────
  const exportZone = () => {
    if (!selectedZone || !doc) return
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const cropW = Math.round(img.naturalWidth * selectedZone.width)
      const cropH = Math.round(img.naturalHeight * selectedZone.height)
      canvas.width = cropW
      canvas.height = cropH
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, Math.round(img.naturalWidth * selectedZone.x), Math.round(img.naturalHeight * selectedZone.y), cropW, cropH, 0, 0, cropW, cropH)
      const a = document.createElement('a')
      a.href = canvas.toDataURL('image/png')
      a.download = `${selectedZone.label || 'vignette'}.png`
      a.click()
    }
    img.src = fileUrl(doc.file_path)
  }

  // ── Auto-detect all faces in the full image ────────────────────────────────
  const handleDetectAllFaces = async () => {
    if (!doc) return
    setFaceDetecting(true)
    try {
      const faces = await detectAllFacesInImage(fileUrl(doc.file_path))
      if (faces.length === 0) {
        alert('Aucun visage détecté dans cette image.')
        return
      }
      for (const face of faces) {
        const zone = await createZone(docId!, {
          x: face.box.x, y: face.box.y,
          width: face.box.w, height: face.box.h,
          label: 'Visage',
        })
        await updateZone(zone.id, { face_descriptor: descriptorToJson(face.descriptor) })
      }
      await load()
    } catch (e) {
      alert('Erreur lors de la détection : ' + String(e))
    } finally {
      setFaceDetecting(false)
    }
  }

  // ── Analyze face in existing zone ──────────────────────────────────────────
  const handleAnalyzeFace = async () => {
    if (!selectedZone || !doc) return
    setFaceAnalyzing(true)
    try {
      let descriptor = await computeFaceDescriptor(fileUrl(doc.file_path), selectedZone)
      if (!descriptor) descriptor = await forceFaceDescriptor(fileUrl(doc.file_path), selectedZone)
      if (descriptor) {
        const json = descriptorToJson(descriptor)
        await updateZone(selectedZone.id, { face_descriptor: json })
        setSelectedZone(prev => prev ? { ...prev, face_descriptor: json } : null)
      } else {
        alert('Impossible de calculer le descripteur facial pour cette vignette.')
      }
    } catch (e) {
      alert('Erreur : ' + String(e))
    } finally {
      setFaceAnalyzing(false)
    }
  }

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName.toLowerCase()
    const activeTag = (document.activeElement as HTMLElement)?.tagName?.toLowerCase() ?? ''
    const isEditing = ['input', 'textarea', 'select'].includes(tag) ||
                      ['input', 'textarea', 'select'].includes(activeTag) ||
                      !!(document.activeElement as HTMLElement)?.isContentEditable

    if (isEditing) return

    if (e.key === 'Escape') {
      if (showZoneModal) { setShowZoneModal(false); return }
      if (showLinkModal) { setShowLinkModal(false); return }
      if (showPhotoEditor) { setShowPhotoEditor(false); return }
      if (faceSearchZone) { setFaceSearchZone(null); return }
      setSelectedZone(null)
      return
    }

    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedZone) {
      e.preventDefault()
      handleDeleteZone(selectedZone.id)
      return
    }

    if (selectedZone && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault()
      const delta = e.shiftKey ? 0.02 : 0.005
      const dx = e.key === 'ArrowLeft' ? -delta : e.key === 'ArrowRight' ? delta : 0
      const dy = e.key === 'ArrowUp' ? -delta : e.key === 'ArrowDown' ? delta : 0
      const newRect = {
        x: Math.max(0, Math.min(1 - selectedZone.width, selectedZone.x + dx)),
        y: Math.max(0, Math.min(1 - selectedZone.height, selectedZone.y + dy)),
        width: selectedZone.width,
        height: selectedZone.height,
      }
      updateZone(selectedZone.id, newRect).then(() => {
        setSelectedZone(prev => prev ? { ...prev, ...newRect } : null)
        load()
      })
    }
  }, [selectedZone, showZoneModal, showLinkModal, showPhotoEditor, faceSearchZone, showBatchReindex])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // ── Set avatar ─────────────────────────────────────────────────────────────
  const handleSetAvatar = async () => {
    if (!selectedZone || !doc?.fiche_id) return
    await setFicheAvatar(doc.fiche_id, selectedZone.id)
    setAvatarSet(true)
  }

  // ── Link recto/verso ───────────────────────────────────────────────────────
  const handleLink = async (targetId: string, type: 'recto' | 'verso') => {
    await linkDocuments(docId!, targetId, type)
    load()
  }

  const handleUnlink = async () => {
    if (!confirm('Retirer ce lien recto/verso ?')) return
    await unlinkDocument(docId!)
    load()
  }

  const openLinkModal = async () => {
    const docs = await getDocuments(archiveId!)
    setAllDocs(docs)
    setShowLinkModal(true)
  }

  if (!doc) return <div className="flex items-center justify-center h-full text-slate-500">Chargement…</div>

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Main viewer ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-navy-800 flex-shrink-0">
          <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors flex-shrink-0" title="Retour">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <button
            onClick={() => prevDoc && navigate(`/archives/${archiveId}/documents/${prevDoc.id}`)}
            disabled={!prevDoc}
            className="text-slate-400 hover:text-white transition-colors flex-shrink-0 disabled:opacity-30 disabled:cursor-default"
            title={prevDoc ? (prevDoc.title || prevDoc.filename) : ''}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="18 15 12 9 6 15" /></svg>
          </button>
          <button
            onClick={() => nextDoc && navigate(`/archives/${archiveId}/documents/${nextDoc.id}`)}
            disabled={!nextDoc}
            className="text-slate-400 hover:text-white transition-colors flex-shrink-0 disabled:opacity-30 disabled:cursor-default"
            title={nextDoc ? (nextDoc.title || nextDoc.filename) : ''}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="6 9 12 15 18 9" /></svg>
          </button>
          <div className="flex-1 min-w-0">
            {editingTitle ? (
              <input
                autoFocus
                className="text-sm font-bold bg-navy-600 border border-blue-500 rounded-lg px-2 py-0.5 text-white focus:outline-none w-full max-w-xs"
                value={titleVal}
                onChange={e => setTitleVal(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitleVal(doc.title || doc.filename); setEditingTitle(false) } }}
              />
            ) : (
              <h1
                className="text-sm font-bold text-white truncate cursor-pointer hover:text-blue-300 transition-colors"
                onClick={() => { setTitleVal(doc.title || doc.filename); setEditingTitle(true) }}
                title="Cliquer pour modifier le titre"
              >
                {doc.title || doc.filename}
              </h1>
            )}
            {doc.date && !editingTitle && <p className="text-xs text-slate-400">{doc.date}</p>}
          </div>
          {isImage && (
            <>
              <button
                onClick={handleDetectAllFaces}
                disabled={faceDetecting}
                className="flex items-center gap-1.5 text-xs bg-violet-600/20 border border-violet-500/40 text-violet-300 rounded-lg px-2.5 py-1.5 hover:bg-violet-600/30 transition-colors flex-shrink-0 disabled:opacity-50"
                title="Détecter automatiquement tous les visages sur cette image"
              >
                {faceDetecting ? (
                  <><div className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" /> Analyse…</>
                ) : (
                  <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    <path d="M19 3l1.5 1.5L23 2" strokeLinecap="round"/>
                  </svg> Détecter les visages</>
                )}
              </button>
              <button
                onClick={() => setShowBatchReindex(true)}
                className="flex items-center gap-1.5 text-xs bg-navy-700 border border-navy-600 text-slate-300 rounded-lg px-2.5 py-1.5 hover:bg-navy-600 transition-colors flex-shrink-0"
                title="Réindexer tous les visages de l'archive"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
                Réindexer archive
              </button>
              <button
                onClick={() => setShowPhotoEditor(true)}
                className="flex items-center gap-1.5 text-xs bg-navy-700 border border-navy-600 text-slate-300 rounded-lg px-2.5 py-1.5 hover:bg-navy-600 transition-colors flex-shrink-0"
                title="Retoucher la photo"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Retoucher
              </button>
            </>
          )}
          {doc.linked_document_id && linkedDoc && (
            <button
              onClick={() => navigate(`/archives/${archiveId}/documents/${doc.linked_document_id}`)}
              className="flex items-center gap-1.5 text-xs bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-lg px-2.5 py-1.5 hover:bg-amber-500/25 transition-colors flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4" />
              </svg>
              {doc.link_type === 'recto' ? 'Verso →' : '← Recto'}
            </button>
          )}
        </div>

        {/* Viewer */}
        <div className="flex-1 overflow-y-auto p-4">
          {isImage ? (
            <ZoneEditor
              imageUrl={fileUrl(doc.file_path)}
              zones={doc.zones || []}
              onZoneCreated={handleZoneCreated}
              onZoneSelected={handleZoneSelected}
              onZoneDeleted={async (zoneId) => {
                if (!confirm('Supprimer cette vignette ?')) return
                await deleteZone(zoneId)
                if (selectedZone?.id === zoneId) setSelectedZone(null)
                load()
              }}
              onZoneLabelChanged={async (zoneId, newLabel) => {
                await updateZone(zoneId, { label: newLabel })
                if (selectedZone?.id === zoneId) {
                  setZoneLabel(newLabel)
                  setSelectedZone(prev => prev ? { ...prev, label: newLabel } : null)
                }
                load()
              }}
              selectedZoneId={selectedZone?.id}
              onZoneUpdated={async (zoneId, update) => {
                await updateZone(zoneId, update)
                if (selectedZone?.id === zoneId) {
                  setSelectedZone(prev => prev ? { ...prev, ...update } : null)
                }
                load()
              }}
            />
          ) : isVideo ? (
            <video
              controls
              src={fileUrl(doc.file_path)}
              className="w-full rounded-xl max-h-[calc(100vh-130px)]"
              style={{ background: '#000' }}
            />
          ) : isAudio ? (
            <div className="flex flex-col items-center justify-center h-full gap-6">
              <div className="w-24 h-24 rounded-3xl bg-navy-600 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" className="w-12 h-12">
                  <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm">{doc.title || doc.filename}</p>
              <audio controls src={fileUrl(doc.file_path)} className="w-full max-w-lg" />
            </div>
          ) : (
            <embed
              src={fileUrl(doc.file_path)}
              type={doc.mime_type || 'application/pdf'}
              className="w-full rounded-xl"
              style={{ height: 'calc(100vh - 130px)' }}
            />
          )}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="w-72 flex-shrink-0 bg-navy-900 border-l border-navy-800 overflow-y-auto">

        {/* Vignettes */}
        <div className="border-b border-navy-800">
          <div className="px-4 py-3">
            <h2 className="font-semibold text-white text-sm">Vignettes ({doc.zones?.length || 0})</h2>
            {isImage && <p className="text-xs text-slate-500 mt-0.5">Cliquez-glissez sur l'image pour délimiter</p>}
          </div>
          {(doc.zones || []).length === 0 ? (
            <div className="px-4 pb-4 text-xs text-slate-500 text-center">Aucune vignette.</div>
          ) : (
            (doc.zones || []).map(z => (
              <div key={z.id}
                onClick={(e) => {
                  if (renamingZoneId === z.id) return
                  if (e.detail === 2) {
                    setRenamingZoneId(z.id)
                    setRenameVal(z.label || '')
                    return
                  }
                  handleZoneSelected(z)
                }}
                className={`px-3 py-2 cursor-pointer transition-colors border-b border-navy-800/50 last:border-0 ${selectedZone?.id === z.id ? 'bg-navy-700 border-l-2 border-blue-500' : 'hover:bg-navy-800'}`}
              >
                <div className="flex items-center gap-2">
                  {isImage && <ZoneThumb filePath={doc.file_path} zone={z} />}
                  <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  {renamingZoneId === z.id ? (
                    <input
                      autoFocus
                      className="flex-1 text-sm bg-transparent border-b border-blue-500 text-white focus:outline-none mr-1 min-w-0"
                      value={renameVal}
                      onChange={e => setRenameVal(e.target.value)}
                      onBlur={async () => {
                        await updateZone(z.id, { label: renameVal })
                        if (selectedZone?.id === z.id) setZoneLabel(renameVal)
                        setRenamingZoneId(null)
                        load()
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        if (e.key === 'Escape') setRenamingZoneId(null)
                        e.stopPropagation()
                      }}
                    />
                  ) : (
                    <p className="text-sm font-medium text-white truncate" title="Double-clic pour renommer">
                      {z.label || <span className="text-slate-500 italic">Sans nom</span>}
                    </p>
                  )}
                  <button onClick={e => { e.stopPropagation(); handleDeleteZone(z.id) }} className="text-slate-600 hover:text-red-400 ml-1 flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
                {z.notes && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{z.notes}</p>}
                {(z.persons || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {z.persons!.map(p => (
                      <span key={p.id} className="text-[10px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full">{p.first_name} {p.last_name}</span>
                    ))}
                  </div>
                )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Informations */}
        <div className="border-b border-navy-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Informations</h3>
            <button onClick={() => setEditingMeta(m => !m)} className="text-slate-600 hover:text-blue-400 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          </div>
          {editingMeta ? (
            <div className="flex flex-col gap-2">
              <input
                type="text" placeholder="Date (ex: 1920)"
                value={metaForm.date} onChange={e => setMetaForm(f => ({ ...f, date: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text" placeholder="Lieu (ex: Paris, Archives nationales…)"
                value={metaForm.location} onChange={e => setMetaForm(f => ({ ...f, location: e.target.value }))}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
              <textarea
                placeholder="Description…"
                value={metaForm.description} onChange={e => setMetaForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
              />
              <div className="flex gap-2">
                <button onClick={saveMeta} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg py-1.5 text-xs font-medium transition-colors">Enregistrer</button>
                <button onClick={() => setEditingMeta(false)} className="text-xs text-slate-500 hover:text-white px-2 transition-colors">✕</button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-xs text-slate-500">
                <span className="text-slate-400">Fichier :</span> {doc.filename}
              </p>
              {doc.date && <p className="text-xs text-slate-500"><span className="text-slate-400">Date :</span> {doc.date}</p>}
              {doc.location && <p className="text-xs text-slate-500"><span className="text-slate-400">Lieu :</span> {doc.location}</p>}
              {doc.description && <p className="text-xs text-slate-400 line-clamp-3">{doc.description}</p>}
              {!doc.date && !doc.location && !doc.description && <p className="text-xs text-slate-600 italic">Aucune info. Cliquez ✎ pour en ajouter.</p>}
            </div>
          )}
        </div>

        {/* Transcription du document */}
        <div className="border-b border-navy-800 p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Transcription</h3>
          <textarea
            className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
            rows={4}
            value={transcription}
            onChange={e => setTranscription(e.target.value)}
            placeholder="Transcription du document…"
          />
          <button onClick={saveTranscription} disabled={savingTranscription}
            className="w-full mt-2 bg-navy-700 hover:bg-navy-600 disabled:opacity-50 text-slate-300 rounded-xl py-1.5 text-xs font-medium transition-colors"
          >
            {savingTranscription ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>

        {/* Recto / Verso */}
        <div className="border-b border-navy-800 p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Recto / Verso</h3>
          {doc.linked_document_id && linkedDoc ? (
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">{doc.link_type}</span>
              <button onClick={() => navigate(`/archives/${archiveId}/documents/${doc.linked_document_id}`)}
                className="flex-1 text-xs text-blue-400 hover:text-blue-300 truncate text-left transition-colors"
              >{linkedDoc.title || linkedDoc.filename}</button>
              <button onClick={handleUnlink} className="text-slate-600 hover:text-red-400 flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
          ) : (
            <button onClick={openLinkModal} className="text-xs text-slate-500 hover:text-blue-400 transition-colors">
              + Lier un document recto/verso
            </button>
          )}
        </div>

        {/* Zone sélectionnée */}
        {selectedZone && (
          <div className="p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Vignette sélectionnée
            </h3>

            {/* Nom + Notes + Transcription + bouton unifié */}
            <div className="mb-3 flex flex-col gap-2">
              <LabelCombo
                value={zoneLabel}
                onChange={setZoneLabel}
                options={zoneLabels}
                placeholder="Nom (Portrait, Cachet…)"
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
              <textarea
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                rows={2}
                value={zoneNotes}
                onChange={e => setZoneNotes(e.target.value)}
                placeholder="Notes…"
              />
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">Transcription</p>
              <textarea
                className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                rows={3}
                value={zoneTranscription}
                onChange={e => setZoneTranscription(e.target.value)}
                placeholder="Texte de cette zone…"
              />
              <button
                onClick={saveZoneMeta}
                disabled={savingZoneMeta}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-1.5 text-xs font-semibold transition-colors"
              >{savingZoneMeta ? 'Enregistrement…' : 'Enregistrer'}</button>
            </div>

            {/* Zone actions */}
            {isImage && (
              <div className="flex gap-2 mb-3">
                <button onClick={exportZone}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-navy-700 hover:bg-navy-600 text-slate-300 rounded-xl py-1.5 text-xs font-medium transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Exporter
                </button>
                {doc.fiche_id && (
                  <button onClick={handleSetAvatar}
                    className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-medium transition-colors ${avatarSet ? 'bg-violet-600 text-white' : 'bg-navy-700 hover:bg-navy-600 text-slate-300'}`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                    {avatarSet ? 'Défini ✓' : 'Photo profil'}
                  </button>
                )}
              </div>
            )}

            {/* Face recognition */}
            {isImage && (
              <div className="mb-3">
                <button
                  onClick={() => setShowFaceTools(s => !s)}
                  className="flex items-center justify-between w-full mb-1.5 group"
                >
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider group-hover:text-slate-400 transition-colors">
                    Reconnaissance faciale
                    {selectedZone.face_descriptor && <span className="ml-1.5 text-green-500">●</span>}
                  </p>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    className={`w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-all ${showFaceTools ? 'rotate-180' : ''}`}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </button>
                {showFaceTools && (
                  <div className="flex gap-2">
                    <button
                      onClick={handleAnalyzeFace}
                      disabled={faceAnalyzing}
                      className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-1.5 text-xs font-medium transition-colors ${
                        selectedZone.face_descriptor
                          ? 'bg-green-600/20 border border-green-500/40 text-green-400 hover:bg-green-600/30'
                          : 'bg-navy-700 hover:bg-navy-600 text-slate-300'
                      }`}
                    >
                      {faceAnalyzing ? (
                        <><div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> Analyse…</>
                      ) : selectedZone.face_descriptor ? (
                        <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M20 7 9 18l-5-5"/></svg> Indexé ✓</>
                      ) : (
                        <><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/><path d="M18 14l1.5 1.5L22 13"/></svg> Indexer</>
                      )}
                    </button>
                    {selectedZone.face_descriptor && (
                      <button
                        onClick={() => setFaceSearchZone(selectedZone)}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600/20 border border-blue-500/40 text-blue-300 hover:bg-blue-600/30 rounded-xl py-1.5 text-xs font-medium transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                        Rechercher
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Personnes liées */}
            <div>
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5">Personnes liées</p>
              {(selectedZone.persons || []).map(p => (
                <div key={p.id} className="flex items-center justify-between py-1 text-sm">
                  <span className="text-white text-xs">{p.first_name} {p.last_name}</span>
                  <button onClick={() => handleRemovePerson(p.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              ))}
              <select
                className="w-full mt-1.5 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                onChange={e => { if (e.target.value) { handleAddPerson(e.target.value); e.target.value = '' } }}
                defaultValue=""
              >
                <option value="">+ Lier une personne existante…</option>
                {persons.filter(p => !selectedZone.persons?.find(sp => sp.id === p.id))
                  .map(p => <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>)}
              </select>

              {/* Créer + lier une nouvelle personne */}
              {newPersonForm ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  <input
                    autoFocus
                    className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    placeholder="Prénom"
                    value={newPersonForm.first_name}
                    onChange={e => setNewPersonForm(f => f ? { ...f, first_name: e.target.value } : f)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateAndLinkPerson(); if (e.key === 'Escape') setNewPersonForm(null) }}
                  />
                  <input
                    className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                    placeholder="Nom de famille"
                    value={newPersonForm.last_name}
                    onChange={e => setNewPersonForm(f => f ? { ...f, last_name: e.target.value } : f)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreateAndLinkPerson(); if (e.key === 'Escape') setNewPersonForm(null) }}
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleCreateAndLinkPerson}
                      disabled={savingNewPerson || (!newPersonForm.first_name.trim() && !newPersonForm.last_name.trim())}
                      className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-1.5 text-xs font-medium transition-colors"
                    >{savingNewPerson ? 'Création…' : 'Créer et lier'}</button>
                    <button onClick={() => setNewPersonForm(null)} className="text-slate-500 hover:text-white px-2 text-xs transition-colors">✕</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setNewPersonForm({ first_name: '', last_name: '' })}
                  className="mt-1.5 text-xs text-slate-500 hover:text-blue-400 transition-colors"
                >
                  + Créer une nouvelle personne…
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Zone modal */}
      {showZoneModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget && !analyzingFaceInModal) setShowZoneModal(false) }}>
          <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[400px]">
            <div className="flex items-center justify-between p-5 border-b border-navy-800">
              <h3 className="font-semibold text-white">Nouvelle vignette</h3>
              <button onClick={() => { if (!analyzingFaceInModal) setShowZoneModal(false) }} className="text-slate-500 hover:text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <form onSubmit={handleSaveZone} className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Nom</label>
                <LabelCombo
                  autoFocus
                  value={zoneForm.label}
                  onChange={v => setZoneForm(f => ({ ...f, label: v }))}
                  options={zoneLabels}
                  placeholder={zoneForm.isFace ? 'Visage (optionnel)' : 'Portrait, Cachet, Signature…'}
                  className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
                />
                {zoneForm.label && zoneLabels.includes(zoneForm.label) && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    Étiquette déjà utilisée dans cette archive
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Notes</label>
                <textarea
                  className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
                  rows={3}
                  value={zoneForm.notes}
                  onChange={e => setZoneForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
              {isImage && (
                <label className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors select-none ${
                  zoneForm.isFace ? 'border-violet-500/50 bg-violet-500/10' : 'border-navy-700 hover:border-navy-600'
                }`}>
                  <input
                    type="checkbox"
                    checked={zoneForm.isFace}
                    onChange={e => setZoneForm(f => ({ ...f, isFace: e.target.checked }))}
                    className="accent-violet-500 w-4 h-4 flex-shrink-0"
                  />
                  <div>
                    <p className={`text-sm font-medium ${zoneForm.isFace ? 'text-violet-300' : 'text-slate-300'}`}>C'est un visage</p>
                    <p className="text-[11px] text-slate-500">Analyse le descripteur facial automatiquement</p>
                  </div>
                </label>
              )}
              <div className="flex gap-3">
                <button type="button" onClick={() => { if (!analyzingFaceInModal) setShowZoneModal(false) }} disabled={analyzingFaceInModal} className="flex-1 py-2.5 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white disabled:opacity-40 transition-colors">Annuler</button>
                <button type="submit" disabled={analyzingFaceInModal} className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition-colors">
                  {analyzingFaceInModal ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Analyse…
                    </span>
                  ) : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showLinkModal && (
        <LinkDocModal allDocs={allDocs} currentId={docId!} onLink={handleLink} onClose={() => setShowLinkModal(false)} />
      )}
      {showPhotoEditor && doc && (
        <DocPhotoEditor
          doc={doc}
          onSave={updated => { setDoc(updated); setShowPhotoEditor(false) }}
          onClose={() => setShowPhotoEditor(false)}
        />
      )}
      {faceSearchZone && archiveId && (
        <FaceSearchModal
          archiveId={archiveId}
          zone={faceSearchZone}
          onClose={() => setFaceSearchZone(null)}
          onNavigate={docId => navigate(`/archives/${archiveId}/documents/${docId}`)}
        />
      )}
      {showBatchReindex && archiveId && (
        <BatchReindexModal archiveId={archiveId} onClose={() => { setShowBatchReindex(false); load() }} />
      )}
    </div>
  )
}
