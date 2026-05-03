import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getAlbums, createAlbum, updateAlbum, deleteAlbum,
  getAlbum, addDocumentsToAlbum, removeDocumentFromAlbum,
  getDocuments, fileUrl, updateAlbumDocEntry, reorderAlbum,
} from '../api/client'
import type { Album, AlbumDocument, Document } from '../types'
import PhotoEditor, { TransformedPhoto } from '../components/PhotoEditor'

// ─── Thumb helper ─────────────────────────────────────────────────────────────

function Thumb({ doc }: { doc: AlbumDocument | Document }) {
  const isImage = doc.mime_type.startsWith('image/')
  return isImage ? (
    <img src={fileUrl(doc.file_path)} alt={doc.title || doc.filename} className="w-full h-full object-cover" />
  ) : (
    <div className="w-full h-full flex items-center justify-center bg-navy-700">
      <span className="text-slate-500 text-xs font-bold uppercase">{doc.filename.split('.').pop()}</span>
    </div>
  )
}

// ─── Album Card ───────────────────────────────────────────────────────────────

function AlbumCard({ album, onOpen, onDelete }: { album: Album; onOpen: () => void; onDelete: () => void }) {
  const covers = (album.documents || []).slice(0, 4)
  return (
    <div className="bg-navy-800 rounded-2xl overflow-hidden border border-navy-700 hover:border-navy-600 transition-colors cursor-pointer group" onClick={onOpen}>
      <div className="w-full aspect-[4/3] bg-navy-900 overflow-hidden">
        {covers.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="1.5" className="w-12 h-12">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15 16 10 5 21" />
            </svg>
          </div>
        ) : covers.length === 1 ? (
          <Thumb doc={covers[0]} />
        ) : covers.length === 2 ? (
          <div className="grid grid-cols-2 h-full">
            {covers.map(d => <Thumb key={d.id} doc={d} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 grid-rows-2 h-full">
            {covers.map(d => <Thumb key={d.id} doc={d} />)}
          </div>
        )}
      </div>
      <div className="p-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-white truncate">{album.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {(album.documents || []).length} document{(album.documents || []).length !== 1 ? 's' : ''}
          </p>
          {album.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{album.description}</p>}
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete() }}
          className="text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ─── Create Album Modal ───────────────────────────────────────────────────────

function CreateAlbumModal({ onConfirm, onClose }: { onConfirm: (name: string, desc: string) => void; onClose: () => void }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[400px]">
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <h3 className="font-semibold text-white">Nouvel album</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Nom</label>
            <input autoFocus
              className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              value={name} onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && onConfirm(name.trim(), desc)}
              placeholder="Vacances 1923, Mariage…"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 uppercase tracking-wider">Description (optionnelle)</label>
            <textarea
              className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
              rows={2} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Brève description…"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
            <button onClick={() => name.trim() && onConfirm(name.trim(), desc)} disabled={!name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold transition-colors">Créer</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Add Documents Modal ──────────────────────────────────────────────────────

function AddDocsModal({ archiveId, albumDocIds, onConfirm, onClose }: {
  archiveId: string; albumDocIds: Set<string>; onConfirm: (ids: string[]) => void; onClose: () => void
}) {
  const [docs, setDocs] = useState<Document[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [searchQ, setSearchQ] = useState('')

  useEffect(() => { getDocuments(archiveId).then(all => setDocs(all.filter(d => !albumDocIds.has(d.id)))) }, [archiveId])
  const filtered = docs.filter(d => !searchQ || (d.title || d.filename).toLowerCase().includes(searchQ.toLowerCase()))
  const toggle = (id: string) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[560px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <h3 className="font-semibold text-white">Ajouter des documents</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <div className="p-4 border-b border-navy-800">
          <input autoFocus type="text" placeholder="Rechercher…" value={searchQ} onChange={e => setSearchQ(e.target.value)}
            className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500" />
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0
            ? <div className="flex items-center justify-center py-12 text-slate-500 text-sm">{searchQ ? 'Aucun résultat' : 'Tous les documents sont déjà dans cet album'}</div>
            : <div className="flex flex-wrap gap-4 p-4">
              {filtered.map(doc => {
                const isImage = doc.mime_type.startsWith('image/')
                const chk = selected.has(doc.id)
                return (
                  <div key={doc.id} onClick={() => toggle(doc.id)}
                    className={`relative flex flex-col bg-white rounded-sm cursor-pointer transition-all ${chk ? 'ring-2 ring-blue-400 scale-105' : 'shadow-polaroid hover:scale-[1.03]'}`}
                    style={{ width: 110 }}
                  >
                    <div className="absolute top-1.5 left-1.5 z-10">
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${chk ? 'bg-blue-500 border-blue-500' : 'bg-white/80 border-slate-400'}`}>
                        {chk && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-2.5 h-2.5"><polyline points="20 6 9 17 4 12" /></svg>}
                      </div>
                    </div>
                    <div className="w-full overflow-hidden bg-slate-200" style={{ height: 90 }}>
                      {isImage ? <img src={fileUrl(doc.file_path)} alt={doc.filename} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center bg-slate-100"><span className="text-slate-400 text-[10px] font-bold uppercase">{doc.filename.split('.').pop()}</span></div>}
                    </div>
                    <div className="px-2 py-1.5 pb-2">
                      <p className="text-[10px] font-medium text-slate-700 truncate">{doc.title || doc.filename}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          }
        </div>
        <div className="p-4 border-t border-navy-800 flex items-center justify-between">
          <span className="text-sm text-slate-400">{selected.size} sélectionné(s)</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
            <button onClick={() => onConfirm(Array.from(selected))} disabled={selected.size === 0}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors">Ajouter</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Album Photo Card (with drag, caption, editor) ────────────────────────────

function AlbumPhotoCard({ doc, albumId, index, isDragOver, onDragStart, onDragOver, onDrop, onRemove, onPhotoEdit, navigate, archiveId }: {
  doc: AlbumDocument; albumId: string; index: number; isDragOver: boolean
  onDragStart: (e: React.DragEvent) => void; onDragOver: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void
  onRemove: () => void; onPhotoEdit: () => void
  navigate: (path: string) => void; archiveId: string
}) {
  const [editingCaption, setEditingCaption] = useState(false)
  const [captionVal, setCaptionVal] = useState(doc.album_caption || '')

  const saveCaption = async () => {
    if (captionVal !== doc.album_caption) {
      await updateAlbumDocEntry(albumId, doc.id, { caption: captionVal })
    }
    setEditingCaption(false)
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative flex flex-col group transition-all ${isDragOver ? 'scale-105 ring-2 ring-blue-400 ring-offset-2 ring-offset-navy-700 rounded-sm' : ''}`}
      style={{ width: 160 }}
    >
      {/* Drag handle */}
      <div className="absolute top-1.5 left-1.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing bg-black/50 rounded p-0.5">
        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-3.5 h-3.5">
          <circle cx="9" cy="5" r="1" fill="white" /><circle cx="15" cy="5" r="1" fill="white" />
          <circle cx="9" cy="12" r="1" fill="white" /><circle cx="15" cy="12" r="1" fill="white" />
          <circle cx="9" cy="19" r="1" fill="white" /><circle cx="15" cy="19" r="1" fill="white" />
        </svg>
      </div>

      {/* Edit + Remove buttons */}
      <div className="absolute top-1.5 right-1.5 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={onPhotoEdit}
          className="w-6 h-6 bg-blue-600/90 text-white rounded-full flex items-center justify-center hover:bg-blue-500"
          title="Éditer la photo"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>
        <button onClick={onRemove}
          className="w-6 h-6 bg-red-600/90 text-white rounded-full flex items-center justify-center hover:bg-red-500"
          title="Retirer"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      {/* Photo */}
      <div
        className="bg-white shadow-polaroid rounded-sm overflow-hidden cursor-pointer"
        onClick={() => navigate(`/archives/${archiveId}/documents/${doc.id}`)}
      >
        <div className="w-full overflow-hidden bg-slate-200" style={{ height: 135 }}>
          <TransformedPhoto doc={doc} />
        </div>
        <div className="px-2.5 py-2 pb-1">
          <p className="text-[10px] font-medium text-slate-700 truncate">{doc.title || doc.filename}</p>
          {doc.date && <p className="text-[9px] text-slate-400">{doc.date}</p>}
        </div>
      </div>

      {/* Caption */}
      <div className="mt-1.5">
        {editingCaption ? (
          <textarea
            autoFocus
            value={captionVal}
            onChange={e => setCaptionVal(e.target.value)}
            onBlur={saveCaption}
            onKeyDown={e => { if (e.key === 'Escape') { setCaptionVal(doc.album_caption || ''); setEditingCaption(false) } }}
            rows={2}
            className="w-full bg-navy-700 border border-blue-500 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none resize-none"
            placeholder="Légende…"
          />
        ) : (
          <div
            onClick={() => { setCaptionVal(doc.album_caption || ''); setEditingCaption(true) }}
            className="min-h-[28px] cursor-text rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-slate-300 hover:bg-navy-700/50 transition-colors"
            title="Cliquer pour ajouter une légende"
          >
            {doc.album_caption || <span className="italic text-slate-600">+ Légende…</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Slideshow ────────────────────────────────────────────────────────────────

function Slideshow({ docs, startIndex, onClose }: { docs: AlbumDocument[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const go = (dir: number) => setIdx(i => (i + dir + docs.length) % docs.length)

  useEffect(() => {
    if (playing) {
      timerRef.current = setTimeout(() => go(1), 3000)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, idx])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const doc = docs[idx]
  const isImage = doc.mime_type.startsWith('image/')

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Controls top */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <span className="text-slate-400 text-sm">{idx + 1} / {docs.length}</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setPlaying(p => !p)} className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl transition-colors ${playing ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`}>
            {playing ? (
              <><svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>Pause</>
            ) : (
              <><svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>Auto</>
            )}
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
      </div>

      {/* Image */}
      <div className="flex-1 flex items-center justify-center relative px-16">
        <button onClick={() => go(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        {isImage ? (
          <TransformedPhoto doc={doc} containerClass="max-h-full max-w-full object-contain rounded-lg" />
        ) : (
          <div className="flex flex-col items-center gap-4 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" className="w-24 h-24">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="text-slate-400">{doc.filename}</span>
          </div>
        )}
        <button onClick={() => go(1)} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>

      {/* Caption + info */}
      <div className="flex-shrink-0 text-center px-6 py-5 max-w-2xl mx-auto w-full">
        <p className="text-white font-medium">{doc.title || doc.filename}</p>
        {doc.date && <p className="text-slate-400 text-sm mt-0.5">{doc.date}</p>}
        {doc.album_caption && <p className="text-slate-300 text-sm mt-2 italic">"{doc.album_caption}"</p>}
      </div>
    </div>
  )
}

// ─── Print helpers ────────────────────────────────────────────────────────────

function printAlbum(album: Album, docs: AlbumDocument[]) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  const rows = docs.map(d => {
    const isImage = d.mime_type.startsWith('image/')
    const imgTag = isImage
      ? `<img src="${(window as any).api.fileUrl(d.file_path)}" style="width:100%;height:180px;object-fit:cover;display:block;">`
      : `<div style="width:100%;height:180px;display:flex;align-items:center;justify-content:center;background:#e2e8f0;font-weight:bold;color:#64748b">${d.filename.split('.').pop()?.toUpperCase()}</div>`
    return `<div style="break-inside:avoid;text-align:center;margin-bottom:20px">
      <div style="border:1px solid #e2e8f0;border-radius:4px;overflow:hidden;max-width:280px;margin:0 auto;box-shadow:0 2px 6px rgba(0,0,0,.12)">
        ${imgTag}
        <div style="padding:8px 10px 10px;background:#fff">
          <p style="margin:0;font-size:12px;font-weight:600;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.title || d.filename}</p>
          ${d.date ? `<p style="margin:4px 0 0;font-size:10px;color:#94a3b8">${d.date}</p>` : ''}
          ${d.album_caption ? `<p style="margin:6px 0 0;font-size:11px;color:#475569;font-style:italic">"${d.album_caption}"</p>` : ''}
        </div>
      </div>
    </div>`
  }).join('')
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${album.name}</title>
    <style>body{font-family:system-ui,sans-serif;margin:0;padding:20px}h1{font-size:24px;color:#1e293b;margin:0 0 6px}p.sub{font-size:13px;color:#64748b;margin:0 0 24px}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}@media print{.grid{grid-template-columns:repeat(3,1fr)}}</style></head>
    <body><h1>${album.name}</h1>${album.description ? `<p class="sub">${album.description}</p>` : ''}<div class="grid">${rows}</div></body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

// ─── Album Detail View ────────────────────────────────────────────────────────

function AlbumDetail({ albumId, archiveId, onBack }: { albumId: string; archiveId: string; onBack: () => void }) {
  const navigate = useNavigate()
  const [album, setAlbum] = useState<Album | null>(null)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [showAddDocs, setShowAddDocs] = useState(false)
  const [editingPhotoDoc, setEditingPhotoDoc] = useState<AlbumDocument | null>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'pages'>('grid')
  const [pageIdx, setPageIdx] = useState(0)
  const [pageSizes, setPageSizes] = useState<number[]>([])
  const [slideshowIdx, setSlideshowIdx] = useState<number | null>(null)

  const load = async () => { setAlbum(await getAlbum(albumId)) }
  useEffect(() => { load() }, [albumId])

  if (!album) return <div className="flex items-center justify-center h-full text-slate-500">Chargement…</div>

  const docs = (album.documents || []) as AlbumDocument[]

  const handleSaveName = async () => {
    await updateAlbum(albumId, { name: editName, description: editDesc })
    setEditing(false); load()
  }

  const handleRemoveDoc = async (docId: string) => {
    await removeDocumentFromAlbum(albumId, docId); load()
  }

  const handleAddDocs = async (ids: string[]) => {
    if (ids.length > 0) await addDocumentsToAlbum(albumId, ids)
    setShowAddDocs(false); load()
  }

  const handlePhotoSave = async (data: { rotation: number; crop_x: number; crop_y: number; crop_w: number; crop_h: number; brightness: number; contrast: number; flip_h: number; flip_v: number }) => {
    if (!editingPhotoDoc) return
    await updateAlbumDocEntry(albumId, editingPhotoDoc.id, data)
    setEditingPhotoDoc(null); load()
  }

  const handleDrop = async (targetIdx: number) => {
    if (dragIdx === null || dragIdx === targetIdx) { setDragIdx(null); setDragOverIdx(null); return }
    const newOrder = [...docs]
    const [moved] = newOrder.splice(dragIdx, 1)
    newOrder.splice(targetIdx, 0, moved)
    await reorderAlbum(albumId, newOrder.map(d => d.id))
    setDragIdx(null); setDragOverIdx(null); load()
  }

  const albumDocIds = new Set(docs.map(d => d.id))

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-5 border-b border-navy-800">
        <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        {editing ? (
          <div className="flex items-center gap-2 flex-1">
            <input autoFocus
              className="bg-navy-800 border border-navy-700 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
              value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveName()}
            />
            <input
              className="flex-1 bg-navy-800 border border-navy-700 rounded-xl px-3 py-1.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Description…"
            />
            <button onClick={handleSaveName} className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-3 py-1.5 text-sm transition-colors">OK</button>
            <button onClick={() => setEditing(false)} className="text-slate-500 hover:text-white text-sm transition-colors">Annuler</button>
          </div>
        ) : (
          <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setEditName(album.name); setEditDesc(album.description); setEditing(true) }}>
            <h1 className="text-lg font-bold text-white truncate hover:text-blue-300 transition-colors">{album.name}</h1>
            {album.description && <p className="text-xs text-slate-400 truncate">{album.description}</p>}
          </div>
        )}
        {docs.length > 0 && (
          <>
            <button onClick={() => setSlideshowIdx(0)}
              className="flex items-center gap-1.5 bg-navy-700 hover:bg-navy-600 text-slate-300 rounded-xl px-3 py-2 text-sm transition-colors flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
              Diaporama
            </button>
            <button
              onClick={() => printAlbum(album, docs)}
              className="flex items-center gap-1.5 bg-navy-700 hover:bg-navy-600 text-slate-300 rounded-xl px-3 py-2 text-sm transition-colors flex-shrink-0"
              title="Exporter / Imprimer l'album"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
              Imprimer
            </button>
          </>
        )}
        <div className="flex bg-navy-800 rounded-xl p-0.5 flex-shrink-0">
          <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-navy-600 text-white' : 'text-slate-500 hover:text-white'}`} title="Vue grille">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
          </button>
          <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-navy-600 text-white' : 'text-slate-500 hover:text-white'}`} title="Vue liste">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
          </button>
          <button onClick={() => { setViewMode('pages'); setPageIdx(0) }} className={`p-1.5 rounded-lg transition-colors ${viewMode === 'pages' ? 'bg-navy-600 text-white' : 'text-slate-500 hover:text-white'}`} title="Vue livre (2 par page)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><rect x="2" y="3" width="9" height="18" rx="1"/><rect x="13" y="3" width="9" height="18" rx="1"/></svg>
          </button>
        </div>
        <button onClick={() => setShowAddDocs(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors flex-shrink-0"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Ajouter
        </button>
      </div>

      {/* Gallery */}
      <div className="flex-1 overflow-y-auto p-5">
        {docs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-navy-600 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" className="w-8 h-8">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15 16 10 5 21" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm">Aucun document dans cet album</p>
            <button onClick={() => setShowAddDocs(true)} className="mt-3 text-blue-400 hover:text-blue-300 text-sm">Ajouter des documents →</button>
          </div>
        ) : viewMode === 'pages' ? (() => {
          const sizeOf = (i: number) => pageSizes[i] ?? 2
          const pageStarts: number[] = []
          let pos = 0, pg = 0
          while (pos < docs.length) { pageStarts.push(pos); pos += sizeOf(pg); pg++ }
          if (pageStarts.length === 0) pageStarts.push(0)
          const safeIdx = Math.min(pageIdx, pageStarts.length - 1)
          const pageCount = pageStarts.length
          const curSize = sizeOf(safeIdx)
          const curStart = pageStarts[safeIdx] ?? 0
          const pageDocs = docs.slice(curStart, curStart + curSize)

          const changeSize = (delta: number) => setPageSizes(prev => {
            const next = [...prev]
            next[safeIdx] = Math.max(1, Math.min(4, (next[safeIdx] ?? 2) + delta))
            return next
          })

          const gridClass = curSize === 1
            ? 'flex justify-center'
            : curSize === 4
              ? 'grid grid-cols-2 grid-rows-2'
              : `grid grid-cols-${curSize} grid-rows-1`

          return (
            <div className="flex flex-col" style={{ height: '100%' }}>
              {/* Page canvas */}
              <div className={`flex-1 min-h-0 ${gridClass} gap-6 p-6`}>
                {pageDocs.map((doc, i) => (
                  <div key={doc.id} className="relative group flex flex-col min-h-0">
                    {/* Photo — fills cell, contain so nothing is cropped, dark bg so letterbox is invisible */}
                    <div
                      className="flex-1 min-h-0 overflow-hidden cursor-pointer rounded-sm"
                      onClick={() => navigate(`/archives/${archiveId}/documents/${doc.id}`)}
                    >
                      <TransformedPhoto doc={doc} fitMode="contain" />
                    </div>
                    {/* Edit button overlay */}
                    <button
                      onClick={e => { e.stopPropagation(); setEditingPhotoDoc(doc) }}
                      className="absolute top-2 right-2 z-10 w-7 h-7 bg-blue-600/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                      title="Éditer la photo"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    {/* Caption + number below */}
                    <div className="flex-shrink-0 pt-1.5 text-center">
                      <p className="text-[10px] text-slate-400 truncate leading-tight">{doc.title || doc.filename}</p>
                      {doc.date && <p className="text-[9px] text-slate-500 leading-tight">{doc.date}</p>}
                      {doc.album_caption && <p className="text-[9px] text-slate-500 italic leading-tight truncate">"{doc.album_caption}"</p>}
                      <p className="text-[9px] text-slate-600 mt-0.5 tracking-widest">{String(curStart + i + 1).padStart(2, '0')}</p>
                    </div>
                  </div>
                ))}
              </div>
              {/* Navigation bar */}
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-t border-navy-800">
                <button
                  onClick={() => setPageIdx(Math.max(0, safeIdx - 1))}
                  disabled={safeIdx === 0}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-navy-700 hover:bg-navy-600 disabled:opacity-30 text-slate-300 text-sm transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="15 18 9 12 15 6"/></svg>
                  Préc.
                </button>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-400">Page {safeIdx + 1} / {pageCount}</span>
                  <div className="flex items-center gap-1.5 bg-navy-800 rounded-xl px-3 py-1.5 border border-navy-700">
                    <button onClick={() => changeSize(-1)} disabled={curSize <= 1}
                      className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 transition-colors font-bold text-sm">−</button>
                    <span className="text-xs text-slate-300 w-16 text-center">{curSize} photo{curSize > 1 ? 's' : ''}/page</span>
                    <button onClick={() => changeSize(+1)} disabled={curSize >= 4}
                      className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white disabled:opacity-30 transition-colors font-bold text-sm">+</button>
                  </div>
                </div>
                <button
                  onClick={() => setPageIdx(Math.min(pageCount - 1, safeIdx + 1))}
                  disabled={safeIdx >= pageCount - 1}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-navy-700 hover:bg-navy-600 disabled:opacity-30 text-slate-300 text-sm transition-colors"
                >
                  Suiv.
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          )
        })() : viewMode === 'grid' ? (
          <div className="flex flex-wrap gap-6 items-start">
            {docs.map((doc, i) => (
              <AlbumPhotoCard
                key={doc.id}
                doc={doc}
                albumId={albumId}
                index={i}
                isDragOver={dragOverIdx === i && dragIdx !== i}
                onDragStart={e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(i)); setDragIdx(i) }}
                onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverIdx(i) }}
                onDrop={e => { e.preventDefault(); handleDrop(i) }}
                onRemove={() => handleRemoveDoc(doc.id)}
                onPhotoEdit={() => setEditingPhotoDoc(doc)}
                navigate={navigate}
                archiveId={archiveId}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {docs.map((doc, i) => (
              <div key={doc.id} className="flex items-center gap-4 bg-navy-800 hover:bg-navy-700 rounded-xl px-4 py-3 group transition-colors cursor-pointer" onClick={() => navigate(`/archives/${archiveId}/documents/${doc.id}`)}>
                <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-navy-900">
                  <TransformedPhoto doc={doc} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{doc.title || doc.filename}</p>
                  {doc.date && <p className="text-xs text-slate-400 mt-0.5">{doc.date}</p>}
                  {doc.album_caption && <p className="text-xs text-slate-500 mt-0.5 italic truncate">"{doc.album_caption}"</p>}
                </div>
                <span className="text-xs text-slate-600 flex-shrink-0">#{i + 1}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={e => { e.stopPropagation(); setSlideshowIdx(i) }} className="w-7 h-7 bg-navy-600 hover:bg-navy-500 text-white rounded-lg flex items-center justify-center" title="Voir en plein écran">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  </button>
                  <button onClick={e => { e.stopPropagation(); setEditingPhotoDoc(doc) }} className="w-7 h-7 bg-blue-600/80 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center" title="Éditer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3 h-3"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleRemoveDoc(doc.id) }} className="w-7 h-7 bg-red-600/70 hover:bg-red-600 text-white rounded-lg flex items-center justify-center" title="Retirer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-2 border-t border-navy-800 text-xs text-slate-500">
        {docs.length} document{docs.length !== 1 ? 's' : ''}
        {docs.length > 0 && <span className="ml-3 text-slate-600">· Cliquez ✎ pour éditer · Glissez pour réordonner · Cliquez la légende pour la modifier</span>}
      </div>

      {showAddDocs && <AddDocsModal archiveId={archiveId} albumDocIds={albumDocIds} onConfirm={handleAddDocs} onClose={() => setShowAddDocs(false)} />}
      {editingPhotoDoc && <PhotoEditor doc={editingPhotoDoc} albumId={albumId} onSave={handlePhotoSave} onClose={() => setEditingPhotoDoc(null)} />}
      {slideshowIdx !== null && <Slideshow docs={docs} startIndex={slideshowIdx} onClose={() => setSlideshowIdx(null)} />}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AlbumsPage() {
  const { archiveId } = useParams<{ archiveId: string }>()
  const [albums, setAlbums] = useState<Album[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [openAlbumId, setOpenAlbumId] = useState<string | null>(null)

  const load = () => { if (archiveId) getAlbums(archiveId).then(setAlbums) }
  useEffect(() => { load() }, [archiveId])

  const handleCreate = async (name: string, desc: string) => {
    await createAlbum(archiveId!, { name, description: desc })
    setShowCreate(false); load()
  }

  const handleDelete = async (albumId: string) => {
    if (!confirm('Supprimer cet album ? Les documents ne seront pas supprimés.')) return
    await deleteAlbum(albumId); load()
  }

  if (openAlbumId) {
    return <AlbumDetail albumId={openAlbumId} archiveId={archiveId!} onBack={() => { setOpenAlbumId(null); load() }} />
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-5 border-b border-navy-800">
        <h1 className="text-lg font-bold text-white flex-1">Albums</h1>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          Nouvel album
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {albums.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-navy-600 flex items-center justify-center mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5" className="w-8 h-8">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15 16 10 5 21" />
              </svg>
            </div>
            <p className="text-slate-400 text-sm">Aucun album</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 text-blue-400 hover:text-blue-300 text-sm">Créer un album →</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {albums.map(album => (
              <AlbumCard key={album.id} album={album} onOpen={() => setOpenAlbumId(album.id)} onDelete={() => handleDelete(album.id)} />
            ))}
          </div>
        )}
      </div>

      <div className="px-5 py-2 border-t border-navy-800 text-xs text-slate-500">
        {albums.length} album{albums.length !== 1 ? 's' : ''}
      </div>

      {showCreate && <CreateAlbumModal onConfirm={handleCreate} onClose={() => setShowCreate(false)} />}
    </div>
  )
}
