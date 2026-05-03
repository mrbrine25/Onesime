import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getTags, createTag, updateTag, deleteTag, getTagCounts, getDocumentsForTag, fileUrl } from '../api/client'
import type { Tag, Document } from '../types'

// ─── Tag Documents Modal ──────────────────────────────────────────────────────

function TagDocsModal({ tag, onClose }: { tag: Tag; onClose: () => void }) {
  const navigate = useNavigate()
  const [docs, setDocs] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  useEffect(() => {
    getDocumentsForTag(tag.id).then(d => { setDocs(d as Document[]); setLoading(false) })
  }, [tag.id])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (lightboxIdx !== null) setLightboxIdx(null)
        else onClose()
      }
      if (lightboxIdx !== null) {
        if (e.key === 'ArrowRight') setLightboxIdx(i => i !== null ? (i + 1) % docs.length : null)
        if (e.key === 'ArrowLeft') setLightboxIdx(i => i !== null ? (i - 1 + docs.length) % docs.length : null)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [lightboxIdx, docs.length])

  // Lightbox overlay
  if (lightboxIdx !== null) {
    const doc = docs[lightboxIdx]
    const isImage = doc?.mime_type.startsWith('image/')
    return (
      <div className="fixed inset-0 bg-black/95 flex flex-col z-50">
        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0">
          <span className="text-slate-400 text-sm">{lightboxIdx + 1} / {docs.length}</span>
          <div className="flex gap-3">
            <button onClick={() => { navigate(`/archives/${doc.archive_id}/documents/${doc.id}`); onClose() }}
              className="text-sm text-slate-400 hover:text-white px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-xl border border-white/20 transition-colors">
              Ouvrir →
            </button>
            <button onClick={() => setLightboxIdx(null)} className="text-slate-400 hover:text-white transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center relative px-16 min-h-0 overflow-hidden">
          <button onClick={() => setLightboxIdx(i => i !== null ? (i - 1 + docs.length) % docs.length : null)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          {isImage
            ? <img src={fileUrl(doc.file_path)} alt={doc.title || doc.filename} className="max-w-full object-contain rounded-lg select-none" style={{ maxHeight: 'calc(100vh - 180px)' }} />
            : <div className="text-slate-300 text-sm">{doc.filename}</div>
          }
          <button onClick={() => setLightboxIdx(i => i !== null ? (i + 1) % docs.length : null)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors z-10">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
        <div className="flex-shrink-0 text-center px-6 py-4">
          <p className="text-white font-medium">{doc.title || doc.filename}</p>
          {doc.date && <p className="text-slate-400 text-sm mt-0.5">{doc.date}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[700px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: tag.color }} />
            <h3 className="font-semibold text-white">{tag.name}</h3>
            <span className="text-xs text-slate-500">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500 text-sm">Chargement…</div>
          ) : docs.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-slate-500 text-sm">Aucun document avec ce tag</div>
          ) : (
            <div className="flex flex-wrap gap-4">
              {docs.map((doc, i) => {
                const isImage = doc.mime_type.startsWith('image/')
                return (
                  <div
                    key={doc.id}
                    className="relative flex flex-col bg-white rounded-sm shadow-polaroid hover:scale-[1.03] transition-all cursor-pointer group"
                    style={{ width: 140 }}
                    onClick={() => setLightboxIdx(i)}
                    onDoubleClick={() => { navigate(`/archives/${doc.archive_id}/documents/${doc.id}`); onClose() }}
                    title="Clic pour agrandir · Double-clic pour ouvrir"
                  >
                    <div className="w-full overflow-hidden bg-slate-200 flex items-center justify-center" style={{ height: 115 }}>
                      {isImage
                        ? <img src={fileUrl(doc.file_path)} alt={doc.title || doc.filename} className="w-full h-full object-cover" />
                        : <span className="text-slate-400 text-xs font-bold uppercase">{doc.filename.split('.').pop()}</span>
                      }
                    </div>
                    <div className="px-2.5 py-2 pb-3">
                      <p className="text-[10px] font-medium text-slate-800 truncate">{doc.title || doc.filename}</p>
                      {doc.date && <p className="text-[9px] text-slate-400 mt-0.5">{doc.date}</p>}
                    </div>
                    {/* Zoom hint */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-sm flex items-center justify-center">
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" className="w-6 h-6 opacity-0 group-hover:opacity-80 drop-shadow transition-opacity">
                        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" />
                      </svg>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-navy-800 text-xs text-slate-500">
          Clic pour agrandir · Double-clic pour ouvrir le document · ← → pour naviguer
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TagsPage() {
  const [tags, setTags]           = useState<Tag[]>([])
  const [counts, setCounts]       = useState<Record<string, number>>({})
  const [editing, setEditing]     = useState<Record<string, { name: string; color: string }>>({})
  const [newName, setNewName]     = useState('')
  const [newColor, setNewColor]   = useState('#6B7280')
  const [creating, setCreating]   = useState(false)
  const [searchQ, setSearchQ]     = useState('')
  const [viewingTag, setViewingTag] = useState<Tag | null>(null)

  const load = async () => {
    const [t, c] = await Promise.all([getTags(), getTagCounts()])
    setTags(t as Tag[])
    setCounts(c)
  }

  useEffect(() => { load() }, [])

  const startEdit = (tag: Tag) => {
    setEditing(e => ({ ...e, [tag.id]: { name: tag.name, color: tag.color } }))
  }

  const cancelEdit = (id: string) => {
    setEditing(e => { const n = { ...e }; delete n[id]; return n })
  }

  const saveEdit = async (id: string) => {
    const data = editing[id]
    if (!data?.name.trim()) return
    await updateTag(id, { name: data.name.trim(), color: data.color })
    cancelEdit(id)
    load()
  }

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`Supprimer le tag "${tag.name}" ? Il sera retiré de tous les documents.`)) return
    await deleteTag(tag.id)
    load()
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setCreating(true)
    await createTag({ name: newName.trim(), color: newColor })
    setNewName('')
    setNewColor('#6B7280')
    setCreating(false)
    load()
  }

  const filtered = tags.filter(t =>
    !searchQ || t.name.toLowerCase().includes(searchQ.toLowerCase())
  )

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Registre de tags</h1>
        <span className="text-sm text-slate-500">{tags.length} tag{tags.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          type="text"
          placeholder="Rechercher un tag…"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
          className="w-full bg-navy-800 border border-navy-700 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Create new tag */}
      <div className="bg-navy-800 border border-navy-700 rounded-2xl p-4 mb-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-3">Nouveau tag</h2>
        <div className="flex gap-3 items-center">
          <input
            className="flex-1 bg-navy-900 border border-navy-600 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="Nom du tag…"
          />
          <div className="flex items-center gap-2 flex-shrink-0">
            <input
              type="color"
              value={newColor}
              onChange={e => setNewColor(e.target.value)}
              className="w-9 h-9 rounded-lg border border-navy-600 bg-navy-900 cursor-pointer p-0.5"
            />
            <div className="w-6 h-6 rounded-full flex-shrink-0" style={{ background: newColor }} />
          </div>
          <button
            onClick={handleCreate}
            disabled={!newName.trim() || creating}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors flex-shrink-0"
          >
            Créer
          </button>
        </div>
        {newName && (
          <div className="mt-3">
            <span className="text-[11px] px-2.5 py-1 rounded-full font-medium" style={{ background: newColor + '33', color: newColor, border: `1px solid ${newColor}55` }}>
              {newName}
            </span>
          </div>
        )}
      </div>

      {/* Tag list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-500 text-sm">
          {searchQ ? 'Aucun résultat' : 'Aucun tag créé'}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(tag => {
            const isEditing = !!editing[tag.id]
            const editData = editing[tag.id] ?? { name: tag.name, color: tag.color }
            const count = counts[tag.id] ?? 0

            return (
              <div key={tag.id} className="bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 flex items-center gap-4">
                {isEditing ? (
                  <>
                    <input
                      type="color"
                      value={editData.color}
                      onChange={e => setEditing(ed => ({ ...ed, [tag.id]: { ...editData, color: e.target.value } }))}
                      className="w-8 h-8 rounded-lg border border-navy-600 bg-navy-900 cursor-pointer p-0.5 flex-shrink-0"
                    />
                    <input
                      className="flex-1 bg-navy-900 border border-navy-600 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
                      value={editData.name}
                      onChange={e => setEditing(ed => ({ ...ed, [tag.id]: { ...editData, name: e.target.value } }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(tag.id); if (e.key === 'Escape') cancelEdit(tag.id) }}
                      autoFocus
                    />
                    <button onClick={() => saveEdit(tag.id)} className="text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 transition-colors">OK</button>
                    <button onClick={() => cancelEdit(tag.id)} className="text-xs text-slate-400 hover:text-white transition-colors">Annuler</button>
                  </>
                ) : (
                  <>
                    <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: tag.color }} />
                    <span
                      className="flex-1 text-sm px-2.5 py-0.5 rounded-full font-medium w-fit"
                      style={{ background: tag.color + '33', color: tag.color, border: `1px solid ${tag.color}55` }}
                    >
                      {tag.name}
                    </span>
                    <button
                      onClick={() => setViewingTag(tag)}
                      className="text-xs text-slate-400 hover:text-white transition-colors flex-shrink-0 bg-navy-700 hover:bg-navy-600 rounded-lg px-2.5 py-1"
                      title="Voir les photos"
                    >
                      {count} document{count !== 1 ? 's' : ''} →
                    </button>
                    <button
                      onClick={() => startEdit(tag)}
                      className="text-slate-500 hover:text-white transition-colors flex-shrink-0"
                      title="Modifier"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(tag)}
                      className="text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
                      title="Supprimer"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            )
          })}
        </div>
      )}

      {viewingTag && <TagDocsModal tag={viewingTag} onClose={() => setViewingTag(null)} />}
    </div>
  )
}
