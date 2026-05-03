import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  getFiche, updateFiche, getDocuments,
  addDocumentToFiche, removeDocumentFromFiche, fileUrl,
  getTags, getTagsForFiche, addTagToFiche, removeTagFromFiche, createTag,
  setFicheAvatar,
} from '../api/client'
import type { Fiche, Document, Tag, AvatarZone } from '../types'

// ─── Zone Avatar ──────────────────────────────────────────────────────────────

export function ZoneAvatar({ zone, size = 56, radius = 14 }: { zone: AvatarZone; size?: number; radius?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: radius, overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
      <img
        src={fileUrl(zone.doc_file_path)}
        draggable={false}
        style={{
          position: 'absolute',
          width: `${100 / zone.width}%`,
          height: `${100 / zone.height}%`,
          left: `${-zone.x / zone.width * 100}%`,
          top: `${-zone.y / zone.height * 100}%`,
          userSelect: 'none',
        }}
      />
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupDocsByLink(docs: Document[]) {
  const used = new Set<string>()
  const pairs: [Document, Document][] = []
  const singles: Document[] = []
  for (const doc of docs) {
    if (used.has(doc.id)) continue
    if (doc.link_type === 'recto' && doc.linked_document_id) {
      const partner = docs.find(d => d.id === doc.linked_document_id)
      if (partner && !used.has(partner.id)) {
        pairs.push([doc, partner])
        used.add(doc.id)
        used.add(partner.id)
        continue
      }
    }
    if (!used.has(doc.id)) singles.push(doc)
  }
  return { pairs, singles }
}

const TAG_COLORS = ['#3b82f6','#8b5cf6','#10b981','#f97316','#ef4444','#ec4899','#f59e0b','#06b6d4']

// ─── Polaroid ─────────────────────────────────────────────────────────────────

function DocPolaroid({ doc, onRemove, onClick }: { doc: Document; onRemove: () => void; onClick: () => void }) {
  const isImage = doc.mime_type.startsWith('image/')
  const url = fileUrl(doc.file_path)
  return (
    <div className="group relative flex flex-col bg-white rounded-sm shadow-polaroid hover:scale-105 transition-transform" style={{ width: 160 }}>
      <button
        onClick={e => { e.stopPropagation(); onRemove() }}
        className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center"
      >×</button>
      <button onClick={onClick} className="flex flex-col w-full text-left">
        <div className="w-full overflow-hidden bg-slate-200" style={{ height: 135 }}>
          {isImage
            ? <img src={url} alt={doc.title || doc.filename} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center bg-slate-100">
                <span className="text-slate-400 font-bold text-sm">{doc.filename.split('.').pop()?.toUpperCase()}</span>
              </div>
          }
        </div>
        <div className="px-2.5 py-2 pb-4">
          <p className="text-[11px] font-medium text-slate-800 truncate">{doc.title || doc.filename}</p>
          {doc.date && <p className="text-[10px] text-slate-400 mt-0.5">{doc.date}</p>}
        </div>
      </button>
    </div>
  )
}

function PairCard({ recto, verso, onRemove, onClick }: {
  recto: Document; verso: Document
  onRemove: (id: string) => void; onClick: (id: string) => void
}) {
  return (
    <div className="flex items-end gap-3 bg-navy-500/50 border border-navy-400/50 rounded-2xl p-4">
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Recto</span>
        <DocPolaroid doc={recto} onRemove={() => onRemove(recto.id)} onClick={() => onClick(recto.id)} />
      </div>
      <div className="pb-10 text-slate-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M8 3 4 7l4 4M4 7h16M16 21l4-4-4-4M20 17H4" />
        </svg>
      </div>
      <div className="flex flex-col items-center gap-1.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Verso</span>
        <DocPolaroid doc={verso} onRemove={() => onRemove(verso.id)} onClick={() => onClick(verso.id)} />
      </div>
    </div>
  )
}

// ─── Link modal ───────────────────────────────────────────────────────────────

function LinkDocModal({ allDocs, linked, onLink, onClose }: {
  allDocs: Document[]; linked: Set<string>
  onLink: (id: string) => void; onClose: () => void
}) {
  const [search, setSearch] = useState('')
  const available = allDocs.filter(d =>
    !linked.has(d.id) &&
    (!search || d.filename.toLowerCase().includes(search.toLowerCase()) || d.title.toLowerCase().includes(search.toLowerCase()))
  )
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-navy-900 rounded-2xl shadow-2xl border border-navy-700 w-[500px] max-h-[70vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-navy-800">
          <h3 className="font-semibold text-white">Ajouter un document</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="p-4 border-b border-navy-800">
          <input
            autoFocus type="text" placeholder="Rechercher…"
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto">
          {available.length === 0
            ? <p className="text-center text-slate-500 text-sm py-10">Aucun document disponible</p>
            : available.map(d => (
              <button key={d.id} onClick={() => { onLink(d.id); onClose() }}
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

// ─── Tags section ─────────────────────────────────────────────────────────────

function TagsSection({ ficheId, tags, allTags, onRefresh }: {
  ficheId: string; tags: Tag[]; allTags: Tag[]
  onRefresh: () => void
}) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0])
  const [creating, setCreating] = useState(false)

  const available = allTags.filter(t => !tags.find(tt => tt.id === t.id))

  const handleAdd = async (tagId: string) => {
    await addTagToFiche(ficheId, tagId)
    onRefresh()
  }

  const handleRemove = async (tagId: string) => {
    await removeTagFromFiche(ficheId, tagId)
    onRefresh()
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    const t = await createTag({ name: newName.trim(), color: newColor })
    await addTagToFiche(ficheId, (t as Tag).id)
    setNewName('')
    setShowCreate(false)
    setCreating(false)
    onRefresh()
  }

  return (
    <div className="mb-8">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Étiquettes</h2>
      <div className="flex flex-wrap gap-2 items-center">
        {tags.map(t => (
          <span
            key={t.id}
            className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border"
            style={{ backgroundColor: t.color + '22', color: t.color, borderColor: t.color + '55' }}
          >
            {t.name}
            <button onClick={() => handleRemove(t.id)} className="opacity-60 hover:opacity-100 ml-0.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-2.5 h-2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </span>
        ))}

        {available.length > 0 && (
          <select
            className="text-xs bg-navy-600 border border-navy-500 rounded-full px-2.5 py-1 text-slate-400 focus:outline-none focus:border-blue-500 cursor-pointer"
            value=""
            onChange={e => { if (e.target.value) handleAdd(e.target.value) }}
          >
            <option value="">+ Ajouter…</option>
            {available.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}

        {!showCreate
          ? <button onClick={() => setShowCreate(true)} className="text-xs text-slate-500 hover:text-blue-400 transition-colors px-1">+ Nouvelle étiquette</button>
          : (
            <form onSubmit={handleCreate} className="flex items-center gap-1.5 bg-navy-600 border border-navy-500 rounded-full px-2 py-0.5">
              {TAG_COLORS.map(c => (
                <button key={c} type="button" onClick={() => setNewColor(c)}
                  className="w-3 h-3 rounded-full flex-shrink-0 ring-offset-1 ring-offset-navy-600 transition-all"
                  style={{ backgroundColor: c, outline: newColor === c ? `2px solid ${c}` : 'none' }}
                />
              ))}
              <input
                autoFocus
                type="text" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="Nom…"
                className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 w-20"
              />
              <button type="submit" disabled={creating} className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold">OK</button>
              <button type="button" onClick={() => setShowCreate(false)} className="text-[10px] text-slate-500 hover:text-white">✕</button>
            </form>
          )
        }
      </div>
    </div>
  )
}

// ─── Print helper ────────────────────────────────────────────────────────────

function printFiche(fiche: Fiche, docs: Document[], tags: Tag[]) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  const avatarHtml = fiche.avatar_zone
    ? (() => {
        const z = fiche.avatar_zone!
        const url = (window as any).api.fileUrl(z.doc_file_path)
        return `<div style="width:80px;height:80px;border-radius:12px;overflow:hidden;position:relative;flex-shrink:0">
          <img src="${url}" style="position:absolute;width:${100/z.width}%;height:${100/z.height}%;left:${-z.x/z.width*100}%;top:${-z.y/z.height*100}%">
        </div>`
      })()
    : `<div style="width:80px;height:80px;border-radius:12px;background:#8b5cf6;display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:700;color:#fff;flex-shrink:0">${fiche.title.split(' ').map((w: string) => w[0]).slice(0,2).join('').toUpperCase() || '?'}</div>`

  const tagsHtml = tags.map(t => `<span style="display:inline-block;background:${t.color}22;border:1px solid ${t.color}55;color:${t.color};border-radius:99px;padding:2px 10px;font-size:11px;margin:0 4px 4px 0">${t.name}</span>`).join('')

  const docsHtml = docs.map(d => {
    const isImage = d.mime_type.startsWith('image/')
    const imgTag = isImage
      ? `<img src="${(window as any).api.fileUrl(d.file_path)}" style="width:100%;height:140px;object-fit:cover;display:block;">`
      : `<div style="width:100%;height:140px;display:flex;align-items:center;justify-content:center;background:#f1f5f9;font-weight:bold;color:#94a3b8;font-size:14px">${d.filename.split('.').pop()?.toUpperCase()}</div>`
    return `<div style="break-inside:avoid;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;margin-bottom:16px">
      ${imgTag}
      <div style="padding:8px 12px 10px"><p style="margin:0;font-size:12px;font-weight:600;color:#1e293b">${d.title || d.filename}</p>
      ${d.date ? `<p style="margin:3px 0 0;font-size:10px;color:#94a3b8">${d.date}</p>` : ''}
      ${d.location ? `<p style="margin:3px 0 0;font-size:10px;color:#94a3b8">📍 ${d.location}</p>` : ''}</div></div>`
  }).join('')

  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${fiche.title}</title>
    <style>body{font-family:system-ui,sans-serif;margin:0;padding:24px;color:#1e293b}
    .header{display:flex;align-items:center;gap:20px;margin-bottom:20px;padding-bottom:20px;border-bottom:2px solid #e2e8f0}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
    @media print{body{padding:1cm}.grid{grid-template-columns:repeat(3,1fr)}}</style></head>
    <body>
    <div class="header">${avatarHtml}<div><h1 style="margin:0;font-size:22px">${fiche.title}</h1>
    ${fiche.date ? `<p style="margin:4px 0 0;color:#64748b;font-size:13px">${fiche.date}</p>` : ''}
    ${tags.length > 0 ? `<div style="margin-top:10px">${tagsHtml}</div>` : ''}</div></div>
    ${fiche.description ? `<p style="color:#475569;font-size:13px;line-height:1.6;margin-bottom:20px">${fiche.description}</p>` : ''}
    ${docs.length > 0 ? `<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;margin:0 0 12px">Documents (${docs.length})</h2><div class="grid">${docsHtml}</div>` : ''}
    </body></html>`)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FichePage() {
  const { archiveId, ficheId } = useParams<{ archiveId: string; ficheId: string }>()
  const navigate = useNavigate()
  const [fiche, setFiche] = useState<Fiche | null>(null)
  const [allDocs, setAllDocs] = useState<Document[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [showLink, setShowLink] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleVal, setTitleVal] = useState('')
  const [editingDesc, setEditingDesc] = useState(false)
  const [descVal, setDescVal] = useState('')

  const load = async () => {
    const [f, docs, t, at] = await Promise.all([
      getFiche(ficheId!),
      getDocuments(archiveId!),
      getTagsForFiche(ficheId!),
      getTags(),
    ])
    setFiche(f)
    setTitleVal(f.title)
    setDescVal(f.description)
    setAllDocs(docs)
    setTags(t as Tag[])
    setAllTags(at as Tag[])
  }

  useEffect(() => { load() }, [ficheId])

  const linkedDocs: Document[] = (fiche?.documents ?? []).map(d =>
    allDocs.find(a => a.id === (d as Document).id) ?? d
  ) as Document[]

  const linkedIds = new Set(linkedDocs.map(d => d.id))
  const { pairs, singles } = groupDocsByLink(linkedDocs)

  const handleLink = async (docId: string) => { await addDocumentToFiche(ficheId!, docId); load() }
  const handleUnlink = async (docId: string) => {
    if (!confirm('Retirer ce document de la fiche ?')) return
    await removeDocumentFromFiche(ficheId!, docId)
    load()
  }

  const saveTitle = async () => {
    if (!fiche || titleVal === fiche.title) { setEditingTitle(false); return }
    await updateFiche(ficheId!, { title: titleVal, date: fiche.date, description: fiche.description })
    setEditingTitle(false)
    load()
  }

  const saveDesc = async () => {
    if (!fiche) return
    await updateFiche(ficheId!, { title: fiche.title, date: fiche.date, description: descVal })
    setEditingDesc(false)
    load()
  }

  if (!fiche) return <div className="flex items-center justify-center h-full text-slate-500">Chargement…</div>

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(`/archives/${archiveId}/fiches`)}
        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Retour aux fiches
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          {fiche.avatar_zone ? (
            <div className="relative group flex-shrink-0">
              <ZoneAvatar zone={fiche.avatar_zone} size={56} radius={14} />
              <button
                onClick={() => { setFicheAvatar(ficheId!, null); load() }}
                className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold"
                title="Retirer la photo"
              >✕</button>
            </div>
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-violet-400 flex items-center justify-center text-xl font-bold text-navy-900 flex-shrink-0">
              {fiche.title.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'}
            </div>
          )}
          <div>
            {editingTitle ? (
              <input
                autoFocus
                className="text-2xl font-bold bg-navy-600 border border-blue-500 rounded-lg px-3 py-1 text-white focus:outline-none"
                value={titleVal}
                onChange={e => setTitleVal(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setTitleVal(fiche.title); setEditingTitle(false) } }}
              />
            ) : (
              <h1
                className="text-2xl font-bold text-white cursor-pointer hover:text-blue-300 transition-colors"
                onClick={() => setEditingTitle(true)} title="Cliquer pour modifier"
              >
                {fiche.title}
              </h1>
            )}
            {fiche.date && <p className="text-sm text-slate-400 mt-0.5">{fiche.date}</p>}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => printFiche(fiche, linkedDocs, tags)}
            className="flex items-center gap-2 bg-navy-600 hover:bg-navy-500 text-slate-300 hover:text-white rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
            title="Exporter / Imprimer la fiche"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Imprimer
          </button>
          <button
            onClick={() => setShowLink(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Ajouter un document
          </button>
        </div>
      </div>

      {/* Tags */}
      <TagsSection ficheId={ficheId!} tags={tags} allTags={allTags} onRefresh={load} />

      {/* Description */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Notes</h2>
        {editingDesc ? (
          <div className="flex flex-col gap-2">
            <textarea
              autoFocus
              className="w-full max-w-2xl bg-navy-600 border border-blue-500 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none resize-none"
              rows={4}
              value={descVal}
              onChange={e => setDescVal(e.target.value)}
              placeholder="Notes sur cette personne…"
              onKeyDown={e => { if (e.key === 'Escape') { setDescVal(fiche.description); setEditingDesc(false) } }}
            />
            <div className="flex gap-2">
              <button onClick={saveDesc} className="text-xs bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 transition-colors">Enregistrer</button>
              <button onClick={() => { setDescVal(fiche.description); setEditingDesc(false) }} className="text-xs text-slate-400 hover:text-white px-2 py-1.5 transition-colors">Annuler</button>
            </div>
          </div>
        ) : (
          <div
            className="max-w-2xl cursor-pointer group"
            onClick={() => setEditingDesc(true)}
            title="Cliquer pour modifier"
          >
            {fiche.description
              ? <p className="text-sm text-slate-300 group-hover:text-white transition-colors leading-relaxed">{fiche.description}</p>
              : <p className="text-sm text-slate-500 italic group-hover:text-slate-400 transition-colors">Cliquer pour ajouter des notes…</p>
            }
          </div>
        )}
      </div>

      {/* Documents */}
      <div>
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-5">
          Documents liés ({linkedDocs.length})
        </h2>

        {linkedDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-navy-600 rounded-2xl">
            <svg viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.5" className="w-10 h-10 mb-3">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
            </svg>
            <p className="text-slate-400 text-sm">Aucun document lié</p>
            <button onClick={() => setShowLink(true)} className="mt-3 text-blue-400 hover:text-blue-300 text-sm">
              Ajouter un document →
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-5">
            {pairs.map(([recto, verso]) => (
              <PairCard
                key={recto.id}
                recto={recto} verso={verso}
                onRemove={handleUnlink}
                onClick={id => navigate(`/archives/${archiveId}/documents/${id}`)}
              />
            ))}
            {singles.map(doc => (
              <DocPolaroid
                key={doc.id} doc={doc}
                onRemove={() => handleUnlink(doc.id)}
                onClick={() => navigate(`/archives/${archiveId}/documents/${doc.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {showLink && (
        <LinkDocModal allDocs={allDocs} linked={linkedIds} onLink={handleLink} onClose={() => setShowLink(false)} />
      )}
    </div>
  )
}
