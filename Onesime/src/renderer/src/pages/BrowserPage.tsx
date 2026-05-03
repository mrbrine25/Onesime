import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  browseArchive, browseArchiveAll, createDocument, getDocuments, getFiches,
  updateDocument, deleteDocument, fileUrl, getThumbnail,
  getTags, getTagsForDocument, addTagToDocument, removeTagFromDocument, createTag,
  getAlbums, addDocumentsToAlbum,
  addDocumentToFiche, createZone, updateZone,
} from '../api/client'
import type { FileEntry, Document, Fiche, Tag, Album } from '../types'
import { DocPhoto, DocPhotoEditor } from '../components/PhotoEditor'
import { detectAllFacesInImage, descriptorToJson } from '../utils/faceapi'

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.tiff', '.bmp', '.avif']
const ITEMS_PER_PAGE = 50

type SortOption = 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc' | 'type'

function fmtSize(n: number) {
  if (n < 1024) return `${n} o`
  if (n < 1048576) return `${(n / 1024).toFixed(0)} Ko`
  return `${(n / 1048576).toFixed(1)} Mo`
}

function FileTypeIcon({ ext, mime }: { ext: string; mime?: string }) {
  const e = ext.toLowerCase()
  if (IMAGE_EXTS.includes(e)) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5" className="w-8 h-8">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15 16 10 5 21" />
      </svg>
    )
  }
  if (e === '.pdf' || mime === 'application/pdf') {
    return <span className="text-red-400 font-bold text-sm">PDF</span>
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" className="w-7 h-7">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

// ─── Polaroid Card ────────────────────────────────────────────────────────────

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ docs, versoMap, startIdx, onClose }: {
  docs: Document[]
  versoMap: Map<string, Document>
  startIdx: number
  onClose: () => void
}) {
  const navigate = useNavigate()
  const [idx, setIdx] = useState(startIdx)
  const [showVerso, setShowVerso] = useState(false)
  const [zoom, setZoom] = useState(1)

  const go = (dir: number) => {
    setIdx(i => (i + dir + docs.length) % docs.length)
    setShowVerso(false)
    setZoom(1)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { if (zoom > 1) { setZoom(1); return } onClose() }
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
      if ((e.key === 'f' || e.key === 'F') && versoMap.get(docs[idx]?.id)) setShowVerso(v => !v)
      if (e.key === '+' || e.key === '=') setZoom(z => Math.min(4, z + 0.25))
      if (e.key === '-') setZoom(z => Math.max(0.5, z - 0.25))
      if (e.key === '0') setZoom(1)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [idx, docs.length, zoom])

  const doc = docs[idx]
  if (!doc) return null
  const verso = versoMap.get(doc.id)
  const activeDoc = showVerso && verso ? verso : doc
  const isImage = activeDoc.mime_type.startsWith('image/')

  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col z-50">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
        <span className="text-slate-400 text-sm">{idx + 1} / {docs.length}</span>
        <div className="flex items-center gap-3">
          {verso && (
            <button
              onClick={() => setShowVerso(v => !v)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border transition-colors ${showVerso ? 'bg-orange-600 border-orange-500 text-white' : 'bg-white/10 border-white/20 text-slate-300 hover:bg-white/20'}`}
            >
              ↺ {showVerso ? 'Recto' : 'Verso'}
            </button>
          )}
          <button
            onClick={() => navigate(`/archives/${doc.archive_id}/documents/${activeDoc.id}`)}
            className="text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20"
            title="Ouvrir la page du document"
          >
            Ouvrir →
          </button>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center relative px-16 min-h-0 overflow-hidden"
        onWheel={e => { e.preventDefault(); setZoom(z => Math.max(0.5, Math.min(4, z - e.deltaY * 0.0008))) }}
      >
        <button onClick={() => go(-1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        {isImage ? (
          <img
            src={fileUrl(activeDoc.file_path)}
            alt={activeDoc.title || activeDoc.filename}
            className="max-w-full max-h-full object-contain rounded-lg select-none"
            style={{
              maxHeight: 'calc(100vh - 200px)',
              transform: `scale(${zoom})`,
              transformOrigin: 'center center',
              transition: 'transform 0.12s ease',
              cursor: zoom > 1 ? 'zoom-out' : 'zoom-in',
            }}
            onClick={() => setZoom(z => z > 1 ? 1 : 2)}
          />
        ) : (
          <div className="flex flex-col items-center gap-4 text-white">
            <FileTypeIcon ext={activeDoc.filename.match(/\.[^.]+$/)?.[0] ?? ''} mime={activeDoc.mime_type} />
            <p className="text-slate-300 text-sm">{activeDoc.filename}</p>
          </div>
        )}
        <button onClick={() => go(1)} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
        {zoom !== 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded-lg pointer-events-none">
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-shrink-0 text-center px-6 py-4">
        <p className="text-white font-medium">{activeDoc.title || activeDoc.filename}</p>
        {activeDoc.date && <p className="text-slate-400 text-sm mt-0.5">{activeDoc.date}</p>}
        {verso && (
          <p className="text-[11px] text-slate-600 mt-1">← → naviguer · F retourner · Molette/clic zoom · + − 0 zoom · Échap fermer</p>
        )}
        {!verso && (
          <p className="text-[11px] text-slate-600 mt-1">← → naviguer · Molette/clic pour zoomer · + − 0 · Échap fermer</p>
        )}
      </div>
    </div>
  )
}

// ─── Polaroid Card ────────────────────────────────────────────────────────────

interface PolaroidCardProps {
  doc: Document
  versoDoc?: Document
  onEdit: (doc: Document) => void
  selected: boolean
  checked: boolean
  selectionMode: boolean
  onOpen: (doc: Document) => void
  onCheck: (docId: string) => void
  onDoubleClick: (doc: Document) => void
}

const PolaroidCard = memo(function PolaroidCard({ doc, versoDoc, onEdit, selected, checked, selectionMode, onOpen, onCheck, onDoubleClick }: PolaroidCardProps) {
  const [showVerso, setShowVerso] = useState(false)
  const activeDoc = showVerso && versoDoc ? versoDoc : doc
  const isImage = activeDoc.mime_type.startsWith('image/')
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleClick = () => {
    if (selectionMode) { onCheck(doc.id); return }
    if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null; return }
    clickTimer.current = setTimeout(() => { clickTimer.current = null; onOpen(doc) }, 220)
  }

  const handleDoubleClick = () => {
    if (selectionMode) return
    if (clickTimer.current) { clearTimeout(clickTimer.current); clickTimer.current = null }
    onDoubleClick(doc)
  }

  return (
    <div
      className={`group relative flex flex-col bg-white rounded-sm cursor-pointer transition-[transform,box-shadow]
        ${selected ? 'ring-2 ring-blue-400 scale-105 shadow-[0_8px_32px_rgba(0,0,0,0.6)]' : 'shadow-polaroid hover:scale-[1.03]'}
        ${checked ? 'ring-2 ring-blue-400 shadow-[0_8px_32px_rgba(0,0,0,0.6)]' : ''}
      `}
      style={{ width: 155 }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* Checkbox overlay in selection mode */}
      {selectionMode && (
        <div className="absolute top-2 left-2 z-10">
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${checked ? 'bg-blue-500 border-blue-500' : 'bg-white/80 border-slate-400'}`}>
            {checked && (
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" className="w-3 h-3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Recto/Verso flip badge */}
      {versoDoc && (
        <button
          className={`absolute top-2 right-2 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow transition-colors ${showVerso ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-200'}`}
          onClick={e => { e.stopPropagation(); setShowVerso(v => !v) }}
          title={showVerso ? 'Voir le recto' : 'Voir le verso'}
        >
          {showVerso ? '↺ R' : 'R/V'}
        </button>
      )}

      <div className="relative w-full overflow-hidden bg-slate-200 flex items-center justify-center" style={{ height: 130 }}>
        {isImage ? (
          <DocPhoto doc={activeDoc} className="w-full h-full object-cover" thumbnailSize={310} />
        ) : (
          <div className="flex flex-col items-center justify-center w-full h-full bg-slate-100 gap-2">
            <FileTypeIcon ext={activeDoc.filename.match(/\.[^.]+$/)?.[0] ?? ''} mime={activeDoc.mime_type} />
          </div>
        )}
        {isImage && (
          <button
            className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 text-white rounded-lg p-1 z-10"
            title="Retoucher la photo"
            onClick={e => { e.stopPropagation(); onEdit(doc) }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
        )}
      </div>
      <div className="px-3 py-2.5 pb-4 text-left">
        <p className="text-[11px] font-medium text-slate-800 truncate leading-tight">
          {activeDoc.title || activeDoc.filename}
        </p>
        {activeDoc.date && <p className="text-[10px] text-slate-400 mt-0.5">{activeDoc.date}</p>}
        {versoDoc && showVerso && (
          <p className="text-[9px] text-orange-400 mt-0.5 font-medium">verso</p>
        )}
      </div>
    </div>
  )
})

// ─── Right Panel ──────────────────────────────────────────────────────────────

interface PanelProps {
  doc: Document
  fiches: Fiche[]
  allTags: Tag[]
  archiveId: string
  onClose: () => void
  onUpdated: () => void
  onDeleted: () => void
  onTagsRefresh: () => void
  onOpenLightbox: () => void
}

function RightPanel({ doc, fiches, allTags, archiveId, onClose, onUpdated, onDeleted, onTagsRefresh, onOpenLightbox }: PanelProps) {
  const navigate = useNavigate()
  const [title, setTitle]   = useState(doc.title)
  const [date, setDate]     = useState(doc.date)
  const [desc, setDesc]     = useState(doc.description)
  const [saving, setSaving] = useState(false)
  const [docTags, setDocTags] = useState<Tag[]>([])
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#6B7280')

  const isImage = doc.mime_type.startsWith('image/')
  const url = fileUrl(doc.file_path)

  useEffect(() => {
    setTitle(doc.title)
    setDate(doc.date)
    setDesc(doc.description)
    getTagsForDocument(doc.id).then(setDocTags)
  }, [doc.id])

  const save = async () => {
    setSaving(true)
    await updateDocument(doc.id, { title, date, description: desc })
    setSaving(false)
    onUpdated()
  }

  const del = async () => {
    if (!confirm(`Supprimer la référence à "${doc.filename}" ?`)) return
    await deleteDocument(doc.id)
    onDeleted()
  }

  const addTag = async (tagId: string) => {
    await addTagToDocument(doc.id, tagId)
    setDocTags(await getTagsForDocument(doc.id))
  }

  const removeTag = async (tagId: string) => {
    await removeTagFromDocument(doc.id, tagId)
    setDocTags(t => t.filter(x => x.id !== tagId))
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    const tag = await createTag({ name: newTagName.trim(), color: newTagColor })
    onTagsRefresh()
    await addTagToDocument(doc.id, tag.id)
    setDocTags(await getTagsForDocument(doc.id))
    setNewTagName('')
    setNewTagColor('#6B7280')
  }

  const availableTags = allTags.filter(t => !docTags.find(dt => dt.id === t.id))

  return (
    <div className="w-72 flex-shrink-0 bg-navy-900 border-l border-navy-800 flex flex-col overflow-y-auto">
      <div className="flex items-center justify-between p-4 border-b border-navy-800">
        <span className="text-sm font-semibold text-white truncate flex-1">{doc.filename}</span>
        <button onClick={onClose} className="text-slate-500 hover:text-white ml-2 flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className="p-4 border-b border-navy-800">
        {isImage ? (
          <div className="relative group/thumb cursor-pointer" onClick={onOpenLightbox}>
            <img src={url} alt={doc.filename} className="w-full rounded-lg object-contain max-h-48 bg-navy-800" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded-lg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-8 h-8 text-white">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
              </svg>
            </div>
          </div>
        ) : (
          <div className="w-full h-32 flex items-center justify-center bg-navy-800 rounded-lg">
            <FileTypeIcon ext={doc.filename.match(/\.[^.]+$/)?.[0] ?? ''} mime={doc.mime_type} />
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1">Titre</label>
          <input
            className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={doc.filename}
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1">Date</label>
          <input
            className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
            value={date}
            onChange={e => setDate(e.target.value)}
            placeholder="1885, vers 1920…"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-1">Description</label>
          <textarea
            className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 resize-none"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            rows={3}
            placeholder="Notes sur ce document…"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
        >
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>

        {/* Tags section */}
        <div>
          <label className="block text-[11px] text-slate-500 uppercase tracking-wider mb-2">Tags</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {docTags.map(tag => (
              <span
                key={tag.id}
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: tag.color + '33', color: tag.color, border: `1px solid ${tag.color}55` }}
              >
                {tag.name}
                <button onClick={() => removeTag(tag.id)} className="opacity-60 hover:opacity-100">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            ))}
            {docTags.length === 0 && <span className="text-xs text-slate-600">Aucun tag</span>}
          </div>
          {availableTags.length > 0 && (
            <select
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 mb-2"
              onChange={e => { if (e.target.value) { addTag(e.target.value); e.target.value = '' } }}
              defaultValue=""
            >
              <option value="">+ Ajouter un tag existant…</option>
              {availableTags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          )}
          <div className="flex gap-1.5">
            <input
              className="flex-1 bg-navy-800 border border-navy-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
              placeholder="Nouveau tag…"
            />
            <input
              type="color"
              value={newTagColor}
              onChange={e => setNewTagColor(e.target.value)}
              className="w-8 h-8 rounded border border-navy-700 bg-navy-800 cursor-pointer p-0.5 flex-shrink-0"
            />
            <button
              onClick={handleCreateTag}
              disabled={!newTagName.trim()}
              className="bg-navy-700 hover:bg-navy-600 disabled:opacity-40 text-white rounded-lg px-2 py-1.5 text-xs transition-colors"
            >
              +
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <button
            onClick={() => navigate(`/archives/${archiveId}/documents/${doc.id}`)}
            className="flex items-center justify-center gap-1.5 bg-navy-700 hover:bg-navy-600 text-slate-300 rounded-lg py-2 text-xs font-medium transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Vignettes
          </button>
          <button
            onClick={del}
            className="flex items-center justify-center gap-1.5 bg-red-900/30 hover:bg-red-900/60 text-red-400 rounded-lg py-2 text-xs font-medium transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
            </svg>
            Retirer
          </button>
        </div>

        <div className="text-[10px] text-slate-600 mt-1 font-mono break-all">{doc.file_path}</div>
      </div>
    </div>
  )
}

// ─── Folder Browser Modal ─────────────────────────────────────────────────────

function FileThumbnail({ fullPath }: { fullPath: string }) {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    getThumbnail(fullPath, 80).then(setUrl).catch(() => {})
  }, [fullPath])
  if (!url) return <div className="w-8 h-8 rounded bg-navy-700 flex-shrink-0 animate-pulse" />
  return <img src={url} className="w-8 h-8 rounded object-cover flex-shrink-0" />
}

function FolderBrowserModal({ archiveId, onClose, onAdded }: { archiveId: string; onClose: () => void; onAdded: () => void }) {
  const [path, setPath]           = useState('')
  const [entries, setEntries]     = useState<FileEntry[]>([])
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [folderFiles, setFolderFiles] = useState<Map<string, string>>(new Map())
  const [loading, setLoading]     = useState(true)
  const [loadingAll, setLoadingAll] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null)
  const [imagesOnly, setImagesOnly] = useState(true)
  const [existingPaths, setExistingPaths] = useState<Set<string>>(new Set())

  const isImg = (name: string) => IMAGE_EXTS.some(e => name.toLowerCase().endsWith(e))

  const load = async (p: string) => {
    setLoading(true)
    try {
      const data = await browseArchive(archiveId, p)
      setEntries(data)
      setPath(p)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    load('')
    getDocuments(archiveId).then((docs: { file_path: string }[]) => {
      setExistingPaths(new Set(docs.map(d => d.file_path)))
    })
  }, [archiveId])

  const parts = path ? path.split('/').filter(Boolean) : []

  const filterFile = (name: string) => !imagesOnly || isImg(name)

  const toggleSel = (e: FileEntry) => {
    if (!filterFile(e.name)) return
    setSelected(s => { const n = new Set(s); n.has(e.path) ? n.delete(e.path) : n.add(e.path); return n })
  }

  const toggleFolder = async (entry: FileEntry) => {
    const allFiles = await browseArchiveAll(archiveId, entry.path) as FileEntry[]
    const prefix = entry.path + '/'
    const alreadySelected = Array.from(folderFiles.keys()).some(p => p.startsWith(prefix))
    setFolderFiles(prev => {
      const updated = new Map(prev)
      if (alreadySelected) {
        for (const k of [...updated.keys()]) {
          if (k.startsWith(prefix)) updated.delete(k)
        }
      } else {
        allFiles
          .filter(f => filterFile(f.name))
          .forEach(f => updated.set(f.path, f.full_path))
      }
      return updated
    })
  }

  const isFolderSelected = (entry: FileEntry) => {
    const prefix = entry.path + '/'
    return Array.from(folderFiles.keys()).some(p => p.startsWith(prefix))
  }

  // Sélectionne tout le dossier courant récursivement
  const selectAllFromCurrent = async () => {
    setLoadingAll(true)
    try {
      const allFiles = await browseArchiveAll(archiveId, path) as FileEntry[]
      const filtered = allFiles.filter(f => filterFile(f.name))
      setFolderFiles(prev => {
        const updated = new Map(prev)
        const prefix = path ? path + '/' : ''
        for (const k of [...updated.keys()]) {
          if (!prefix || k.startsWith(prefix)) updated.delete(k)
        }
        filtered.forEach(f => updated.set(f.path, f.full_path))
        return updated
      })
      setSelected(new Set())
    } finally { setLoadingAll(false) }
  }

  const visibleFiles = entries.filter(e => !e.is_dir && filterFile(e.name))
  const allVisibleSelected = visibleFiles.length > 0 && visibleFiles.every(e => selected.has(e.path))

  const toggleSelectAllVisible = () => {
    if (allVisibleSelected) {
      setSelected(s => { const n = new Set(s); visibleFiles.forEach(e => n.delete(e.path)); return n })
    } else {
      setSelected(s => { const n = new Set(s); visibleFiles.forEach(e => n.add(e.path)); return n })
    }
  }

  const totalCount = selected.size + folderFiles.size

  const handleAdd = async () => {
    setImporting(true)
    const directFiles = entries.filter(e => !e.is_dir && selected.has(e.path))
    const folderEntries = [...folderFiles.entries()].filter(([relPath]) => !directFiles.find(e => e.path === relPath))
    const total = directFiles.length + folderEntries.length
    setImportProgress({ done: 0, total })
    let done = 0
    for (const e of directFiles) {
      await createDocument(archiveId, { file_path: e.full_path })
      setImportProgress({ done: ++done, total })
    }
    for (const [, fullPath] of folderEntries) {
      await createDocument(archiveId, { file_path: fullPath })
      setImportProgress({ done: ++done, total })
    }
    setImporting(false)
    setImportProgress(null)
    onAdded()
    onClose()
  }

  const visibleEntries = entries.filter(e => e.is_dir || filterFile(e.name))

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <div>
            <h3 className="font-semibold text-white">Ajouter des documents</h3>
            <nav className="flex items-center gap-1 text-xs text-slate-500 mt-1">
              <button onClick={() => load('')} className="hover:text-white">Racine</button>
              {parts.map((p, i) => (
                <span key={i} className="flex items-center gap-1">
                  <span>/</span>
                  <button onClick={() => load(parts.slice(0, i + 1).join('/'))} className="hover:text-white">{p}</button>
                </span>
              ))}
            </nav>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 px-4 py-2.5 border-b border-navy-800 bg-navy-800/30">
          {/* Images only toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={imagesOnly} onChange={e => setImagesOnly(e.target.checked)} className="accent-blue-500 w-3.5 h-3.5" />
            <span className="text-xs text-slate-400">Images seulement</span>
          </label>
          <div className="flex-1" />
          {/* Select all visible files */}
          {visibleFiles.length > 0 && (
            <button onClick={toggleSelectAllVisible} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              {allVisibleSelected ? 'Tout désélectionner' : 'Tout sélectionner ici'}
            </button>
          )}
          {/* Select entire current folder recursively */}
          <button
            onClick={selectAllFromCurrent}
            disabled={loadingAll}
            className="flex items-center gap-1.5 text-xs bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-300 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
          >
            {loadingAll ? (
              'Chargement…'
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Tout ce dossier
              </>
            )}
          </button>
        </div>

        {/* File list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">Chargement…</div>
          ) : (
            <>
              {path && (
                <button onClick={() => load(parts.slice(0, -1).join('/'))} className="flex items-center gap-3 px-4 py-3 w-full hover:bg-navy-800 text-sm text-slate-400 border-b border-navy-800">
                  <span>↩</span> Dossier parent
                </button>
              )}
              {visibleEntries.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  {imagesOnly ? 'Aucune image dans ce dossier' : 'Dossier vide'}
                </div>
              )}
              {visibleEntries.map(e => {
                const alreadyAdded = !e.is_dir && existingPaths.has(e.full_path)
                return (
                <div key={e.path} className={`flex items-center gap-3 px-4 py-2.5 border-b border-navy-800/50 last:border-0 transition-colors ${alreadyAdded ? 'opacity-50' : 'hover:bg-navy-800'} ${(!e.is_dir && selected.has(e.path)) || (e.is_dir && isFolderSelected(e)) ? 'bg-navy-700' : ''}`}>
                  <input
                    type="checkbox"
                    checked={e.is_dir ? isFolderSelected(e) : selected.has(e.path)}
                    onChange={() => e.is_dir ? toggleFolder(e) : toggleSel(e)}
                    disabled={alreadyAdded}
                    className="w-4 h-4 rounded accent-blue-500 flex-shrink-0 disabled:cursor-not-allowed"
                  />
                  <button className="flex items-center gap-3 flex-1 min-w-0 text-left" onClick={() => e.is_dir && load(e.path)}>
                    {e.is_dir ? (
                      <span className="text-base flex-shrink-0">📁</span>
                    ) : isImg(e.name) ? (
                      <FileThumbnail fullPath={e.full_path} />
                    ) : (
                      <span className="text-base flex-shrink-0">📄</span>
                    )}
                    <span className={`text-sm flex-1 truncate ${e.is_dir ? 'font-medium text-white' : 'text-slate-300'}`}>{e.name}</span>
                    {alreadyAdded
                      ? <span className="text-[10px] text-green-500 flex-shrink-0 font-medium">✓ Déjà ajouté</span>
                      : e.is_dir
                        ? <span className="text-xs text-blue-400 flex-shrink-0 opacity-70">Tout sélectionner →</span>
                        : <span className="text-xs text-slate-500 flex-shrink-0">{fmtSize(e.size)}</span>
                    }
                  </button>
                </div>
                )
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-navy-800 flex items-center justify-between">
          {importing && importProgress ? (
            <div className="flex-1 mr-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Import en cours…</span>
                <span>{importProgress.done}/{importProgress.total}</span>
              </div>
              <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all" style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }} />
              </div>
            </div>
          ) : (
            <span className="text-sm text-slate-400">{totalCount} fichier{totalCount > 1 ? 's' : ''} sélectionné{totalCount > 1 ? 's' : ''}</span>
          )}
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white hover:border-navy-600 transition-colors">Annuler</button>
            <button onClick={handleAdd} disabled={totalCount === 0 || importing} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors">
              {importing ? 'Import…' : `Référencer${totalCount > 0 ? ` (${totalCount})` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Batch Action Modals ──────────────────────────────────────────────────────

function BatchFicheModal({ fiches, onConfirm, onClose }: { fiches: Fiche[]; onConfirm: (ficheId: string) => void; onClose: () => void }) {
  const [selected, setSelected] = useState('')
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-96 p-6">
        <h3 className="font-semibold text-white mb-4">Ajouter à une fiche</h3>
        <select
          className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 mb-4"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          <option value="">Choisir une fiche…</option>
          {fiches.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
        </select>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
          <button onClick={() => selected && onConfirm(selected)} disabled={!selected} className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors">Ajouter</button>
        </div>
      </div>
    </div>
  )
}

function BatchTagModal({ allTags, onConfirm, onClose }: { allTags: Tag[]; onConfirm: (tagId: string) => void; onClose: () => void }) {
  const [selected, setSelected] = useState('')
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#6B7280')
  const [tags, setTags] = useState(allTags)

  const handleCreate = async () => {
    if (!newName.trim()) return
    const tag = await createTag({ name: newName.trim(), color: newColor })
    setTags(t => [...t, tag])
    setSelected(tag.id)
    setNewName('')
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-96 p-6">
        <h3 className="font-semibold text-white mb-4">Appliquer un tag</h3>
        <select
          className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 mb-3"
          value={selected}
          onChange={e => setSelected(e.target.value)}
        >
          <option value="">Choisir un tag…</option>
          {tags.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Ou créer un nouveau tag…"
          />
          <input type="color" value={newColor} onChange={e => setNewColor(e.target.value)} className="w-9 h-9 rounded border border-navy-700 bg-navy-800 cursor-pointer p-0.5" />
          <button onClick={handleCreate} disabled={!newName.trim()} className="bg-navy-700 hover:bg-navy-600 disabled:opacity-40 text-white rounded-xl px-3 text-sm transition-colors">+</button>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
          <button onClick={() => selected && onConfirm(selected)} disabled={!selected} className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors">Appliquer</button>
        </div>
      </div>
    </div>
  )
}

function BatchAlbumModal({ albums, onConfirm, onClose }: { albums: Album[]; onConfirm: (albumId: string) => void; onClose: () => void }) {
  const [selected, setSelected] = useState('')
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-96 p-6">
        <h3 className="font-semibold text-white mb-4">Ajouter à un album</h3>
        {albums.length === 0 ? (
          <p className="text-slate-400 text-sm mb-4">Aucun album. Créez d'abord un album depuis la section Albums.</p>
        ) : (
          <select
            className="w-full bg-navy-800 border border-navy-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 mb-4"
            value={selected}
            onChange={e => setSelected(e.target.value)}
          >
            <option value="">Choisir un album…</option>
            {albums.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl border border-navy-700 text-sm text-slate-400 hover:text-white transition-colors">Annuler</button>
          {albums.length > 0 && (
            <button onClick={() => selected && onConfirm(selected)} disabled={!selected} className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-medium transition-colors">Ajouter</button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type BatchModal = 'fiche' | 'tag' | 'album' | null

function sortDocs(docs: Document[], sortBy: SortOption): Document[] {
  return [...docs].sort((a, b) => {
    switch (sortBy) {
      case 'date-asc':
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return a.date.localeCompare(b.date)
      case 'date-desc':
        if (!a.date && !b.date) return 0
        if (!a.date) return 1
        if (!b.date) return -1
        return b.date.localeCompare(a.date)
      case 'name-asc':
        return (a.title || a.filename).localeCompare(b.title || b.filename)
      case 'name-desc':
        return (b.title || b.filename).localeCompare(a.title || a.filename)
      case 'type':
        return a.mime_type.localeCompare(b.mime_type)
      default:
        return 0
    }
  })
}

// ─── Batch face scanner ───────────────────────────────────────────────────────

function BatchFaceModal({ archiveId, onClose, onDone }: {
  archiveId: string; onClose: () => void; onDone: () => void
}) {
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0, found: 0 })
  const [currentFile, setCurrentFile] = useState('')
  const [log, setLog] = useState<string[]>([])
  const abortRef = useState({ cancelled: false })[0]

  const run = async () => {
    abortRef.cancelled = false
    setStatus('running')
    setLog([])
    const docs = (await getDocuments(archiveId)) as Document[]
    const imageDocs = docs.filter(d => IMAGE_EXTS.some(e => d.filename.toLowerCase().endsWith(e)))
    setProgress({ current: 0, total: imageDocs.length, found: 0 })
    let totalFound = 0
    for (let i = 0; i < imageDocs.length; i++) {
      if (abortRef.cancelled) break
      const doc = imageDocs[i]
      setCurrentFile(doc.filename)
      setProgress(p => ({ ...p, current: i + 1 }))
      try {
        const faces = await detectAllFacesInImage(fileUrl(doc.file_path))
        if (faces.length > 0) {
          for (const face of faces) {
            const zone = await createZone(doc.id, { x: face.box.x, y: face.box.y, width: face.box.w, height: face.box.h, label: 'Visage' })
            await updateZone(zone.id, { face_descriptor: descriptorToJson(face.descriptor) })
          }
          totalFound += faces.length
          setLog(l => [...l, `✓ ${doc.filename} — ${faces.length} visage(s)`])
        }
      } catch {
        setLog(l => [...l, `✗ ${doc.filename} — erreur`])
      }
      setProgress(p => ({ ...p, found: totalFound }))
    }
    setStatus('done')
    onDone()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) { abortRef.cancelled = true; onClose() } }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[520px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <div>
            <h3 className="font-semibold text-white">Scanner les visages</h3>
            <p className="text-xs text-slate-500 mt-0.5">Crée des vignettes pour chaque visage détecté dans les images</p>
          </div>
          <button onClick={() => { abortRef.cancelled = true; onClose() }} className="text-slate-500 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {status === 'idle' && (
            <div className="text-center">
              <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="1.5" className="w-8 h-8">
                  <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                  <path d="M19 3l1.5 1.5L23 2" strokeLinecap="round"/>
                </svg>
              </div>
              <p className="text-sm text-slate-300 mb-1">Analyse toutes les images de l'archive</p>
              <p className="text-xs text-slate-500 mb-5">Les vignettes créées sont identiques aux vignettes manuelles et peuvent être corrigées.</p>
              <button onClick={run} className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-6 py-2.5 text-sm font-semibold transition-colors">
                Démarrer l'analyse
              </button>
            </div>
          )}
          {(status === 'running' || status === 'done') && (
            <>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{progress.current} / {progress.total} images</span>
                <span className="text-violet-400">{progress.found} vignette(s) créée(s)</span>
              </div>
              <div className="w-full h-2 bg-navy-700 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }} />
              </div>
              {status === 'running' && currentFile && (
                <p className="text-xs text-slate-500 truncate">Analyse : {currentFile}</p>
              )}
              {status === 'done' && (
                <p className="text-sm text-green-400 font-medium text-center">
                  Terminé — {progress.found} vignette(s) créée(s) dans {progress.total} image(s)
                </p>
              )}
              {log.length > 0 && (
                <div className="bg-navy-800 rounded-xl p-3 max-h-40 overflow-y-auto flex flex-col gap-0.5">
                  {log.map((l, i) => (
                    <p key={i} className={`text-[11px] font-mono ${l.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>{l}</p>
                  ))}
                </div>
              )}
              {status === 'done' && (
                <button onClick={onClose} className="w-full bg-navy-700 hover:bg-navy-600 text-white rounded-xl py-2 text-sm font-medium transition-colors mt-2">
                  Fermer
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────

export default function BrowserPage() {
  const { archiveId } = useParams<{ archiveId: string }>()
  const [docs, setDocs]         = useState<Document[]>([])
  const [fiches, setFiches]     = useState<Fiche[]>([])
  const [albums, setAlbums]     = useState<Album[]>([])
  const [allTags, setAllTags]   = useState<Tag[]>([])
  const [panelDoc, setPanelDoc] = useState<Document | null>(null)
  const [showBrowser, setShowBrowser] = useState(false)
  const [searchQ, setSearchQ]   = useState('')
  const [sortBy, setSortBy]     = useState<SortOption>(() => (localStorage.getItem(`browser-sort-${archiveId}`) as SortOption) || 'name-asc')
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [resumeDoc, setResumeDoc] = useState<{ id: string; title: string } | null>(null)
  const [editingDoc, setEditingDoc] = useState<Document | null>(null)
  const [showBatchFace, setShowBatchFace] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // Multi-selection
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchModal, setBatchModal] = useState<BatchModal>(null)

  const load = useCallback(() => {
    if (!archiveId) return
    getDocuments(archiveId).then(setDocs)
    getFiches(archiveId).then(setFiches)
    getAlbums(archiveId).then(setAlbums)
    getTags().then(setAllTags)
  }, [archiveId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!archiveId) return
    try {
      const stored = localStorage.getItem(`lastDoc_${archiveId}`)
      if (stored) setResumeDoc(JSON.parse(stored))
    } catch { setResumeDoc(null) }
  }, [archiveId])

  // Reset pagination when search or sort changes
  useEffect(() => { setDisplayedCount(ITEMS_PER_PAGE) }, [searchQ, sortBy])

  // Keyboard: Escape closes panel / lightbox / modals
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (lightboxIdx !== null) { setLightboxIdx(null); return }
      if (batchModal) { setBatchModal(null); return }
      if (showBatchFace) { setShowBatchFace(false); return }
      if (editingDoc) { setEditingDoc(null); return }
      if (panelDoc) { setPanelDoc(null); return }
      if (selectionMode) { setSelectionMode(false); setSelectedIds(new Set()); return }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightboxIdx, batchModal, showBatchFace, editingDoc, panelDoc, selectionMode])

  // Memoized derived state — only recomputes when deps actually change
  const versoMap = useMemo(() => {
    const m = new Map<string, Document>()
    docs.forEach(d => { if (d.link_type === 'verso' && d.linked_document_id) m.set(d.linked_document_id, d) })
    return m
  }, [docs])

  const filtered = useMemo(() => docs.filter(d => {
    if (d.link_type === 'verso' && d.linked_document_id) return false
    return !searchQ || d.filename.toLowerCase().includes(searchQ.toLowerCase()) || d.title.toLowerCase().includes(searchQ.toLowerCase())
  }), [docs, searchQ])

  const sortedFiltered = useMemo(() => sortDocs(filtered, sortBy), [filtered, sortBy])
  const visibleDocs = useMemo(() => sortedFiltered.slice(0, displayedCount), [sortedFiltered, displayedCount])
  const hasMore = sortedFiltered.length > displayedCount

  // Stable card callbacks — only recreate when truly necessary
  const handleOpen = useCallback((doc: Document) => {
    setPanelDoc(s => s?.id === doc.id ? null : doc)
  }, [])

  const handleCheck = useCallback((docId: string) => {
    setSelectedIds(s => { const n = new Set(s); n.has(docId) ? n.delete(docId) : n.add(docId); return n })
  }, [])

  const handleEdit = useCallback((doc: Document) => {
    setEditingDoc(doc)
  }, [])

  const handleDoubleClick = useCallback((doc: Document) => {
    setLightboxIdx(sortedFiltered.findIndex(d => d.id === doc.id))
  }, [sortedFiltered])

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false)
    setSelectedIds(new Set())
  }, [])

  const selectAll = useCallback(() => setSelectedIds(new Set(sortedFiltered.map(d => d.id))), [sortedFiltered])

  const handleBatchAddToFiche = async (ficheId: string) => {
    for (const id of selectedIds) {
      await addDocumentToFiche(ficheId, id)
    }
    setBatchModal(null)
    exitSelectionMode()
    load()
  }

  const handleBatchTag = async (tagId: string) => {
    for (const id of selectedIds) {
      await addTagToDocument(id, tagId)
    }
    setBatchModal(null)
  }

  const handleBatchAlbum = async (albumId: string) => {
    await addDocumentsToAlbum(albumId, Array.from(selectedIds))
    setBatchModal(null)
    exitSelectionMode()
    load()
  }

  const handleBatchDelete = async () => {
    if (!confirm(`Supprimer ${selectedIds.size} document(s) ?`)) return
    for (const id of selectedIds) {
      await deleteDocument(id)
    }
    exitSelectionMode()
    load()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (!files.length || !archiveId) return
    for (const file of files) {
      const path = (file as File & { path: string }).path
      if (path) await createDocument(archiveId, { file_path: path })
    }
    load()
  }

  return (
    <div className="flex h-full">
      {/* Left: grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <div className="flex items-center gap-3 p-5 border-b border-navy-800">
          <h1 className="text-lg font-bold text-white mr-2">Explorateur</h1>
          <div className="flex-1 relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher…"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              className="w-full bg-navy-800 border border-navy-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={sortBy}
            onChange={e => { const v = e.target.value as SortOption; setSortBy(v); localStorage.setItem(`browser-sort-${archiveId}`, v) }}
            className="bg-navy-800 border border-navy-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-blue-500 flex-shrink-0"
            title="Trier par"
          >
            <option value="name-asc">Nom A→Z</option>
            <option value="name-desc">Nom Z→A</option>
            <option value="date-asc">Date ↑</option>
            <option value="date-desc">Date ↓</option>
            <option value="type">Type</option>
          </select>
          <button
            onClick={() => { setSelectionMode(s => !s); setSelectedIds(new Set()); setPanelDoc(null) }}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors flex-shrink-0 ${selectionMode ? 'bg-blue-600 text-white' : 'bg-navy-700 hover:bg-navy-600 text-slate-300'}`}
            title="Mode sélection multiple"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
            <span className="hidden sm:inline">Sélection</span>
          </button>
          <button
            onClick={() => setShowBatchFace(true)}
            className="flex items-center gap-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-300 rounded-xl px-3 py-2 text-sm font-medium transition-colors flex-shrink-0"
            title="Détecter tous les visages dans les images de l'archive"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              <path d="M19 3l1.5 1.5L23 2" strokeLinecap="round"/>
            </svg>
            <span className="hidden md:inline">Détecter les visages</span>
          </button>
          {resumeDoc && (
            <button
              onClick={() => navigate(`/archives/${archiveId}/documents/${resumeDoc.id}`)}
              className="flex items-center gap-1.5 text-xs bg-navy-700 hover:bg-navy-600 text-slate-300 rounded-xl px-3 py-2 transition-colors flex-shrink-0 max-w-[160px]"
              title={`Reprendre : ${resumeDoc.title}`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
                <polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" />
              </svg>
              <span className="truncate">{resumeDoc.title}</span>
            </button>
          )}
          <button
            onClick={() => setShowBrowser(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Ajouter
          </button>
        </div>

        {/* Selection bar */}
        {selectionMode && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-navy-800 border-b border-navy-700">
            <span className="text-sm text-white font-medium">{selectedIds.size} sélectionné(s)</span>
            <button onClick={selectAll} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">Tout sélectionner</button>
            <div className="flex-1" />
            {selectedIds.size > 0 && (
              <>
                <button onClick={() => setBatchModal('fiche')} className="flex items-center gap-1.5 text-xs bg-navy-700 hover:bg-navy-600 text-slate-300 rounded-lg px-3 py-1.5 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                  Ajouter à une fiche
                </button>
                <button onClick={() => setBatchModal('tag')} className="flex items-center gap-1.5 text-xs bg-navy-700 hover:bg-navy-600 text-slate-300 rounded-lg px-3 py-1.5 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                  Tagger
                </button>
                <button onClick={() => setBatchModal('album')} className="flex items-center gap-1.5 text-xs bg-navy-700 hover:bg-navy-600 text-slate-300 rounded-lg px-3 py-1.5 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15 16 10 5 21" /></svg>
                  Album
                </button>
                <button onClick={handleBatchDelete} className="flex items-center gap-1.5 text-xs bg-red-900/40 hover:bg-red-900/70 text-red-400 rounded-lg px-3 py-1.5 transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /></svg>
                  Supprimer
                </button>
              </>
            )}
            <button onClick={exitSelectionMode} className="text-xs text-slate-500 hover:text-white transition-colors ml-1">Annuler</button>
          </div>
        )}

        {/* Grid */}
        <div
          className="flex-1 overflow-y-auto p-5 relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {dragOver && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-blue-600/20 border-2 border-dashed border-blue-400 rounded-xl pointer-events-none m-2">
              <div className="text-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="1.5" className="w-12 h-12 mx-auto mb-2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <p className="text-blue-300 font-medium">Déposer pour ajouter</p>
              </div>
            </div>
          )}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-navy-600 flex items-center justify-center mb-4">
                <svg viewBox="0 0 24 24" fill="none" stroke="#4f7ef8" strokeWidth="1.5" className="w-8 h-8">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15 16 10 5 21" />
                </svg>
              </div>
              <p className="text-slate-400 text-sm">
                {searchQ ? 'Aucun résultat' : 'Aucun document référencé'}
              </p>
              {!searchQ && (
                <button onClick={() => setShowBrowser(true)} className="mt-3 text-blue-400 hover:text-blue-300 text-sm">
                  Ajouter des documents →
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-5">
                {visibleDocs.map(doc => (
                  <PolaroidCard
                    key={doc.id}
                    doc={doc}
                    versoDoc={versoMap.get(doc.id)}
                    selected={panelDoc?.id === doc.id}
                    checked={selectedIds.has(doc.id)}
                    selectionMode={selectionMode}
                    onOpen={handleOpen}
                    onCheck={handleCheck}
                    onEdit={handleEdit}
                    onDoubleClick={handleDoubleClick}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <button
                    onClick={() => setDisplayedCount(c => c + ITEMS_PER_PAGE)}
                    className="px-6 py-2.5 bg-navy-700 hover:bg-navy-600 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                  >
                    Charger plus ({sortedFiltered.length - displayedCount} restants)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Count */}
        <div className="px-5 py-2 border-t border-navy-800 text-xs text-slate-500">
          {filtered.length} document{filtered.length !== 1 ? 's' : ''}
          {hasMore && ` · ${visibleDocs.length} affichés`}
          {selectionMode && selectedIds.size > 0 && ` · ${selectedIds.size} sélectionné(s)`}
        </div>
      </div>

      {/* Right panel */}
      {panelDoc && !selectionMode && (
        <RightPanel
          doc={panelDoc}
          fiches={fiches}
          allTags={allTags}
          archiveId={archiveId!}
          onClose={() => setPanelDoc(null)}
          onUpdated={load}
          onDeleted={() => { setPanelDoc(null); load() }}
          onTagsRefresh={() => getTags().then(setAllTags)}
          onOpenLightbox={() => setLightboxIdx(sortedFiltered.findIndex(d => d.id === panelDoc.id))}
        />
      )}

      {showBrowser && (
        <FolderBrowserModal archiveId={archiveId!} onClose={() => setShowBrowser(false)} onAdded={load} />
      )}

      {batchModal === 'fiche' && (
        <BatchFicheModal fiches={fiches} onConfirm={handleBatchAddToFiche} onClose={() => setBatchModal(null)} />
      )}
      {batchModal === 'tag' && (
        <BatchTagModal allTags={allTags} onConfirm={handleBatchTag} onClose={() => setBatchModal(null)} />
      )}
      {batchModal === 'album' && (
        <BatchAlbumModal albums={albums} onConfirm={handleBatchAlbum} onClose={() => setBatchModal(null)} />
      )}

      {lightboxIdx !== null && (
        <Lightbox
          docs={sortedFiltered}
          versoMap={versoMap}
          startIdx={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
      {editingDoc && (
        <DocPhotoEditor
          doc={editingDoc}
          onSave={updated => {
            setDocs(ds => ds.map(d => d.id === updated.id ? updated : d))
            setEditingDoc(null)
          }}
          onClose={() => setEditingDoc(null)}
        />
      )}
      {showBatchFace && archiveId && (
        <BatchFaceModal
          archiveId={archiveId}
          onClose={() => setShowBatchFace(false)}
          onDone={load}
        />
      )}
    </div>
  )
}
